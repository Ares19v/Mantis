# 🎙️ Mantis Agent Assist v2.0

Mantis is a real-time, AI-powered customer service agent assist dashboard. It utilizes a **dual-pipeline architecture** to process live audio and text simultaneously, equipping support agents with real-time acoustic emotion inference and tactical dialogue directives.

## 🧠 Architecture Overview

The system decouples heavy audio processing from Natural Language Understanding (NLU) to ensure zero-latency UI updates and prevent API rate-limiting:

1. **The Acoustic Pipeline (Local):** Raw microphone PCM bytes are streamed via WebSockets to a FastAPI backend. A local **PyTorch Convolutional Neural Network (CNN)** processes MFCC features using librosa to infer the customer's emotional state (Angry, Sad, Happy, Neutral) in real-time.
2. **The Tactical Pipeline (Cloud):** The browser's native Web Speech API transcribes the conversation. The text, combined with the current acoustic emotion, is securely POSTed to **Groq's LLaMA 3 8B model**, which generates actionable, de-escalation directives for the agent.

## 🚀 Key Features

* **Real-Time Emotion Inference:** Live acoustic analysis mapped to a glowing UI waveform.
* **Tactical AI Directives:** Context-aware suggestions generated instantly upon sentence completion.
* **Shift-Key Diarization:** Hold Shift to toggle the active speaker between Customer and Agent in the transcript log.
* **Keyword Escalation Triggers:** Automated UI pop-ups when critical keywords (e.g., "manager", "sue", "cancel") or heavy negative emotions are detected.
* **Post-Call Analytics:** Automated call summarization, disposition reporting, and dead-air ratio tracking.

## 🛠 Tech Stack

* **Frontend:** React (Vite), Tailwind CSS, Web Audio API, Web Speech API
* **Backend:** Python, FastAPI, WebSockets
* **Machine Learning:** PyTorch, Librosa
* **LLM Engine:** Groq API (LLaMA-3-8b-8192)

---

## ⚙️ Installation & Setup

### Prerequisites
* **Node.js** (v18+ recommended)
* **Python** (3.10+ recommended)
* **Groq API Key**

### 1. Clone the Repository
\\\ash
git clone https://github.com/Ares19v/Mantis.git
cd Mantis
\\\

### 2. Backend Environment Setup
Create a virtual environment and install dependencies:
\\\ash
python -m venv venv

# Windows
venv\Scripts\activate
# Mac/Linux
source venv/bin/activate

pip install -r requirements.txt
\\\

Create a .env file in the root directory and add your API key:
\\\env
GROQ_API_KEY=your_groq_api_key_here
\\\

*(Ensure emotion_model.pth is placed in the root directory prior to startup).*

### 3. Frontend Environment Setup
Open a new terminal and prepare the React UI:
\\\ash
cd mantis_ui
npm install
\\\

---

## 🏃‍♂️ Running the Application

You will need two terminal windows running simultaneously.

**Terminal 1 (Backend):**
\\\ash
# Ensure your venv is activated
python main.py
\\\

**Terminal 2 (Frontend):**
\\\ash
cd mantis_ui
npm run dev
\\\

Navigate to http://localhost:5173 in Chrome or Edge to access the dashboard. Click **CALL** to engage the microphone pipelines.
