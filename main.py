import asyncio
import numpy as np
import torch
import os
from concurrent.futures import ThreadPoolExecutor
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from groq import AsyncGroq
from dotenv import load_dotenv

load_dotenv()

from transformer_brain import TransformerBrain

# Thread pool so HuBERT inference doesn't block the async event loop
executor = ThreadPoolExecutor(max_workers=2)

app = FastAPI()
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

GROQ_KEY = os.environ.get("GROQ_API_KEY", "").strip()
if not GROQ_KEY:
    print("[CRITICAL] GROQ_API_KEY not found in .env — advice endpoint will fail!")
client = AsyncGroq(api_key=GROQ_KEY)

try:
    brain = TransformerBrain()
except Exception as e:
    print(f"[SYSTEM] Failed to load TransformerBrain: {e}")
    brain = None

# --- HTTP ENDPOINTS FOR GROQ ---
class AdviceRequest(BaseModel):
    transcript: str
    emotion: str

@app.post("/api/advice")
async def get_advice(req: AdviceRequest):
    print(f"\n[GROQ] Fetching advice for: '{req.transcript[-50:]}'")
    prompt = f"""
    The customer's acoustic emotion is currently: {req.emotion}.
    Recent transcript: '{req.transcript[-250:]}'
    
    Provide exactly ONE actionable directive for the agent. 
    Format your response strictly as "[EMOTION] -> [ACTION]".
    """
    try:
        response = await client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[{"role": "system", "content": "You are a rigid tactical formatting AI."},
                      {"role": "user", "content": prompt}],
            temperature=0.1,
            max_tokens=50
        )
        action = response.choices[0].message.content
        print(f"[ACTION] {action}")
        return {"action": action}
    except Exception as e:
        print(f"[GROQ ERROR] {e}")
        return {"action": "ERROR -> Verification failed."}

class SummaryRequest(BaseModel):
    text: str

@app.post("/api/summarize")
async def summarize_call(req: SummaryRequest):
    if len(req.text) < 10:
        return {"summary": "Call too short for analytics."}
        
    prompt = f"""
    Analyze this customer service transcript:
    {req.text}
    
    Provide a post-call report formatted EXACTLY like this:
    DISPOSITION: [1 Word (e.g., ESCALATED, RESOLVED, CHURN_RISK)]
    SUMMARY:
    - [Bullet point 1]
    - [Bullet point 2]
    """
    try:
        response = await client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[{"role": "system", "content": "You are a post-call analytics AI."},
                      {"role": "user", "content": prompt}],
            temperature=0.2,
            max_tokens=150
        )
        return {"summary": response.choices[0].message.content}
    except Exception as e:
        return {"summary": f"API ERROR: {e}"}

# --- WEBSOCKET STRICTLY FOR AUDIO BYTES ---
@app.websocket("/ws/audio")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    print("\n[SYSTEM] Audio WebSocket Connected. Listening...")
    
    audio_chunk_buffer = []
    current_emotion = "WAITING..."
    current_energy = "LOW"
    
    try:
        while True:
            data = await websocket.receive_bytes()
            audio_chunk_buffer.append(data)
            
            # HuBERT needs ~2-4 seconds of audio. 10 chunks x 4096 samples @ 16kHz = ~2.5s
            if len(audio_chunk_buffer) >= 10:
                combined_audio = b"".join(audio_chunk_buffer)
                audio_chunk_buffer = []
                
                pcm_data = np.frombuffer(combined_audio, dtype=np.int16)
                waveform = pcm_data.astype(np.float32) / 32768.0
                
                if brain is not None:
                    try:
                        # Run HuBERT in a thread so it doesn't block the async event loop
                        loop = asyncio.get_event_loop()
                        current_emotion, current_energy = await loop.run_in_executor(
                            executor, brain.predict, waveform
                        )
                        print(f"[EMOTION] {current_emotion} [{current_energy} ENERGY]")
                    except Exception as e:
                        print(f"[EMOTION ERROR] {type(e).__name__}: {e}")
                
                await websocket.send_json({
                    "emotion": f"{current_emotion.upper()} [{current_energy} ENERGY]"
                })
                
    except WebSocketDisconnect:
        print("\n[LINK] Browser Disconnected.")
    except Exception as e:
        print(f"\n[WS ERROR] {e}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
