import torch
import numpy as np
from transformers import Wav2Vec2FeatureExtractor, HubertForSequenceClassification
import warnings
warnings.filterwarnings("ignore")

class TransformerBrain:
    def __init__(self):
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self.model_name = "superb/hubert-large-superb-er"
        print(f"\n[SYSTEM] Initializing HuBERT & Acoustic Fusion on {self.device.type.upper()}...")
        
        self.processor = Wav2Vec2FeatureExtractor.from_pretrained(self.model_name)
        self.model = HubertForSequenceClassification.from_pretrained(self.model_name).to(self.device)
        self.model.eval()
        
        self.labels = ["Neutral", "Happy", "Angry", "Sad"]
        print("[SYSTEM] Intelligence core online.")

    def extract_acoustic_features(self, waveform):
        # Calculate Root Mean Square Energy (Volume/Intensity)
        rms = np.sqrt(np.mean(waveform**2))
        
        # Calculate Zero Crossing Rate (Volatility/Harshness)
        zcr = ((waveform[:-1] * waveform[1:]) < 0).sum() / len(waveform)
        
        energy_level = "HIGH" if rms > 0.05 else ("LOW" if rms < 0.01 else "MEDIUM")
        return energy_level, float(rms), float(zcr)

    def predict(self, audio_waveform):
        inputs = self.processor(audio_waveform, sampling_rate=16000, return_tensors="pt", padding=True)
        input_values = inputs.input_values.to(self.device)
        
        with torch.no_grad():
            logits = self.model(input_values).logits
            
        predicted_id = torch.argmax(logits, dim=-1).item()
        base_emotion = self.labels[predicted_id]
        
        # Fuse with Acoustic data
        energy, rms_val, zcr_val = self.extract_acoustic_features(audio_waveform)
        
        # Nuance Logic: If HuBERT says Angry but energy is very low, it's likely passive-aggressive/frustrated
        if base_emotion == "Angry" and energy == "LOW":
            final_emotion = "Frustrated"
        # If HuBERT says Happy but energy is very low, it's likely just calm/content
        elif base_emotion == "Happy" and energy == "LOW":
            final_emotion = "Content"
        else:
            final_emotion = base_emotion
            
        return final_emotion, energy
