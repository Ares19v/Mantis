# EVAL — Mantis Agent Assist

> **Evaluation Date:** 2026-05-29  
> **Evaluator:** Automated Portfolio Review  
> **Maturity Level:** MVP

---

## 1. Project Purpose & Problem Statement

Mantis is a real-time AI-powered agent assist dashboard for customer service environments. The core problem it addresses is agent reaction latency: in a live call, agents must simultaneously listen, empathize, and formulate a response — a cognitively expensive task that degrades under sustained negative customer emotion. Mantis augments this by running two parallel inference pipelines that deliver real-time emotional state awareness and tactical de-escalation directives to the agent dashboard, reducing cognitive load at the moments of highest stress.

The dual-pipeline design is the central architectural insight: acoustic emotion detection (HuBERT + CNN, local) is separated from natural language tactical advice (LLaMA 3, cloud/Groq), allowing each to optimize for its own latency and accuracy requirements.

---

## 2. Technical Architecture

**Dual-Pipeline Engine:**

| Pipeline | Transport | Model | Output |
|---|---|---|---|
| Acoustic | WebSocket (raw PCM) | HuBERT + RMS/ZCR + CNN | Emotion label + energy level |
| Tactical | HTTP POST | Groq LLaMA-3.1-8b-instant | One-line agent directive |

**Data Flow:**
1. Browser captures microphone audio via Web Audio API → raw PCM bytes streamed over WebSocket to FastAPI backend
2. `transformer_brain.py` pipes PCM through `superb/hubert-large-superb-er` (HuBERT large, pre-trained for emotion recognition) fused with RMS energy and ZCR (zero-crossing rate) features → emotion classification across 6 labels (Angry, Frustrated, Sad, Happy, Content, Neutral)
3. Browser captures live speech via Web Speech API → transcript text `POST /api/advice` → Groq LLaMA-3.1-8b-instant generates one-line tactical directive
4. React dashboard displays emotion state, waveform/sentiment graph toggle, live transcript with speaker diarization, and keyword escalation alerts

**Frontend Stack:** React 19 + Vite + Tailwind CSS v4 + Web Audio API + Web Speech API

**Infrastructure:** Docker Compose with multi-stage Dockerfile (Python 3.10-slim backend + Node.js/Nginx frontend). GitHub Actions CI with Flake8 Python lint and Node.js ESLint + build.

---

## 3. Model / Algorithm Details

**Acoustic Pipeline:**
- `superb/hubert-large-superb-er` — HuBERT Large fine-tuned for speech emotion recognition on SUPERB benchmark. This is a proven pre-trained model rather than a custom architecture, which is the correct choice: training a speech emotion model from scratch requires large labelled datasets (RAVDESS alone has ~1,440 samples which is very small).
- Custom CNN (`emotion_cnn.py`) trained on RAVDESS dataset as an additional classifier. MFCC features extracted via `audio_processor.py`. Trained for 25 epochs via `trainer.py`.
- The two models are fused with RMS energy and ZCR acoustic features in `transformer_brain.py`.

**Pre-trained emotion model:** `emotion_model.pth` (~4 MB) is the custom CNN trained on RAVDESS. This is stored locally and correctly excluded from git.

**RAVDESS limitations:** The RAVDESS dataset contains 1,440 recordings from 24 actors performing scripted emotional speech. This is a clean but small and lab-controlled dataset — real customer service audio is noisier, more variable, and often emotionally ambiguous. Generalisation to real call center audio is the central open question.

---

## 4. Strengths

- **Dual-pipeline design is architecturally sound** — decoupling acoustic (local, low-latency) and semantic (cloud, higher-latency but richer context) into separate transports is the right choice.
- **HuBERT as the acoustic backbone** — using a well-proven pre-trained speech emotion model rather than training from scratch is pragmatic and produces better results on limited hardware.
- **Speaker diarization via Shift key** — simple and effective UX pattern for distinguishing customer vs agent speech without a dedicated diarization model.
- **Post-call analytics** — auto-generated call summary, disposition label (RESOLVED/ESCALATED/CHURN_RISK), and dead-air ratio are genuinely valuable operational metrics.
- **Keyword escalation alerts** — automated slide-in notification on critical words (`manager`, `sue`, `cancel`) is a practical real-world feature.
- **Docker Compose with Nginx reverse proxy** — professional containerization with proper frontend → backend routing.
- **GitHub Actions CI** — both Python (Flake8) and Node.js (ESLint + build) validated; the `journey.md` documents the CI battle honestly including the `npm ci` vs `npm install` native binding issue.
- **Security hygiene** — `.env` properly excluded; API key rotation documented in `journey.md`.

---

## 5. Limitations & Known Gaps

- **RAVDESS generalisation is unproven.** RAVDESS is scripted, lab-quality speech from actors. Real customer service audio has background noise, code-switching, accents, and compressed VoIP audio that will degrade HuBERT-RAVDESS accuracy significantly. No real-call evaluation exists.
- **No quantitative emotion classification metrics reported.** There is no accuracy, F1, or confusion matrix for the emotion model on a validation set. The model's actual performance is unknown.
- **Web Speech API is browser-specific.** Chrome/Edge only — Safari and Firefox do not support the API. This is a hard deployment constraint that limits the platform to specific browsers.
- **Groq API dependency** — the tactical directive pipeline requires a live Groq API key. Network outages or Groq downtime degrade the system to acoustic-only mode with no graceful fallback message.
- **`.env` must not be staged** — confirmed properly excluded per `.gitignore`.
- **No call recording or audit logging.** In a real call center deployment, calls must be recorded for compliance. No logging infrastructure exists.
- **Dead-air ratio measurement** — the metric is present but the threshold for what constitutes "engagement drop-off" is not documented or configurable.

---

## 6. Code Quality Assessment

**Structure:** Clean separation — `main.py`, `transformer_brain.py`, `emotion_cnn.py`, `audio_processor.py`, `trainer.py`, `setup_data.py` each have a single responsibility. `mantis_ui/` is a separate Vite project with its own Dockerfile.

**Documentation:** README covers architecture, tech stack, quickstart, Docker, project structure, and retraining. `journey.md` is an honest retrospective covering CI battles, security hygiene, and platform engineering lessons.

**Test Coverage:** GitHub Actions CI runs Flake8 and ESLint + build. No functional tests for the emotion pipeline.

**Docker:** Multi-stage Dockerfiles for backend and frontend. Nginx reverse proxy routes `/api/*` and `/ws/*` to backend. Proper Docker volume for HuBERT model cache.

---

## 7. Maturity Breakdown

| Dimension | Score | Notes |
|-----------|-------|-------|
| Functionality | 7/10 | Dual pipeline works; real-world accuracy unvalidated |
| Code Quality | 7/10 | Clean single-responsibility modules; CI configured |
| Documentation | 7/10 | Good README + honest journey retrospective |
| Scalability | 5/10 | Browser-specific (Chrome/Edge); Groq dependency; no load testing |
| Security | 6/10 | .env excluded; no auth on WebSocket endpoints; no call logging |
| **Overall** | **6.4/10** | Strong architectural concept; needs real-world validation |

---

## 8. Suggested Next Steps

1. **Evaluate on real call center audio.** Record or obtain a sample of real customer service calls (RAVDESS is not representative). Compute confusion matrix and F1 per emotion class on real audio. This is the most critical gap — without it, the system's actual utility is unknown.
2. **Add a Groq API fallback mode.** When the Groq API is unavailable, display a "tactical engine offline" notice and continue running the acoustic pipeline. Document the degraded mode behavior in the UI.
3. **Resolve Web Speech API browser dependency.** Evaluate `whisper.cpp` running client-side via WASM, or a server-side Whisper endpoint, to eliminate the Chrome/Edge-only constraint and enable Firefox and Safari support.

---

## 9. Verdict

Mantis is one of the more conceptually ambitious projects in the portfolio — the dual-pipeline acoustic + LLM agent assist architecture is a real product category with commercial deployments (companies like Cogito and Cresta operate in this space). The technical execution is clean: the HuBERT + CNN fusion, the speaker diarization UX, the Docker Compose deployment, and the CI pipeline all demonstrate production engineering instincts. The primary gap is validation against real-world audio — RAVDESS is a known benchmark with limited transferability to actual call center conditions, and without a real-call accuracy study, the system's practical value cannot be assessed.
