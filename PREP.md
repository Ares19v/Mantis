# 🎙️ Mantis Agent Assist Study Guide (From-Scratch)

Welcome to the beginner's learning guide for **Mantis Agent Assist**, a real-time AI-powered customer service companion. This guide will walk you through how acoustic emotion classification, large language model (LLM) suggestion engines, WebSockets, and real-time frontend interfaces work together.

---

## 🗺️ Architectural Map

Mantis uses a unique **Dual-Pipeline Engine** to maximize speed and analytical depth during a live customer call.

```
                  ┌──────────────────────────────────────┐
                  │          Vite + React UI             │
                  │  - Renders live waveform graphs       │
                  │  - Displays de-escalation tips       │
                  └──────────▲────────────────▲──────────┘
                             │                │
          WebSocket (PCM)    │                │ HTTP POST (Text Transcript)
┌────────────────────────────▼─────┐    ┌─────▼─────────────────────────────┐
│       Acoustic Pipeline          │    │         Tactical Pipeline         │
│  - FastAPI server                │    │  - Groq API                       │
│  - HuBERT (Speech Emotion Rec.)  │    │  - LLaMA-3.1-8b-instant LLM       │
│  - Custom CNN (RAVDESS weights)  │    │  - Generates instant advice       │
└──────────────────────────────────┘    └───────────────────────────────────┘
```

---

## ⚙️ The Dual-Pipeline Strategy

During a phone call, customer support agents need to process a lot of information. Mantis solves this by running two specialized pipelines:

### 1. Acoustic Pipeline (Emotion Detection)
*   **Transport**: Raw PCM audio bytes streamed constantly over a **WebSocket**.
*   **Speech Model**: `superb/hubert-large-superb-er`. HuBERT (Hidden-Unit BERT) is an advanced self-supervised speech representation learning framework. This pre-trained model excels at understanding speech acoustics.
*   **Custom CNN**: A Convolutional Neural Network trained on the **RAVDESS** dataset (a gold-standard dataset containing scripted actor speech representing various emotions).
*   **Output**: Real-time emotion labels (e.g. Angry, Frustrated, Sad, Content) and voice energy levels.

### 2. Tactical Pipeline (De-escalation Advice)
*   **Transport**: HTTP POST requests sent dynamically.
*   **Transcription**: The browser's native **Web Speech API** captures the microphone feed and generates live transcripts.
*   **Semantic Model**: `LLaMA-3.1-8b-instant` hosted on Groq for sub-second text completions.
*   **Output**: A highly tactical, single-line advice directive (e.g. *"Acknowledge their frustration, apologize for the delay, and offer a refund"*).

---

## 💻 Codebase Tour

*   `main.py`: The entry-point FastAPI server that coordinates REST endpoints and WebSocket pipelines.
*   `transformer_brain.py`: Coordinates the HuBERT model and features (like Root Mean Square (RMS) energy) to make acoustic classifications.
*   `emotion_cnn.py` & `audio_processor.py`: Defines the custom CNN classifier and extracts MFCC (Mel-Frequency Cepstral Coefficients) features from audio bytes.
*   `trainer.py` & `setup_data.py`: Code to download the RAVDESS dataset and train the CNN classifier.

---

## 🛠️ Step-by-Step Local Deployment

### 1. Windows One-Click Execution
*   **Install**: Double-click `INSTALL.bat`. This builds the backend Python environment, downloads dependencies, and installs React frontend modules.
*   **Run**: Double-click `Run_Project.bat`. This starts the backend FastAPI server and launches the frontend development workspace.
*   **Uninstall**: Double-click `UNINSTALL.bat` to clear environment structures and recover disk space.

### 2. Standard Manual Commands
To run individual services via CLI:

**Backend Setup:**
```bash
# Install libraries
pip install -r requirements.txt

# Run FastAPI webserver
uvicorn main:app --host 127.0.0.1 --port 8000
```

**Frontend Setup:**
```bash
cd mantis_ui
npm install
npm run dev
```

### 3. API Key Requirement
To enable the **Tactical Pipeline**, configure your Groq API key inside a `.env` file (copy `.env.example` as a template):
```env
GROQ_API_KEY=your_groq_api_key_here
```
*(The system will gracefully run in acoustic-only mode if no Groq API Key is configured).*
