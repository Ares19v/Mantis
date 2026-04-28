import os
import librosa
import numpy as np
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import TensorDataset, DataLoader
from emotion_cnn import EmotionCNN
from tqdm import tqdm

def extract_features(file_path):
    audio, sr = librosa.load(file_path, sr=16000, duration=3)
    mfccs = librosa.feature.mfcc(y=audio, sr=sr, n_mfcc=40)
    
    if mfccs.shape[1] < 50:
        mfccs = np.pad(mfccs, ((0, 0), (0, 50 - mfccs.shape[1])), mode='constant')
    else:
        mfccs = mfccs[:, :50]
    return mfccs[np.newaxis, ...] # Shape remains (1, 40, 50)

def train():
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"\n[SYSTEM] Initializing Training on {device.type.upper()}...")
    
    model = EmotionCNN(num_classes=8).to(device)
    optimizer = optim.Adam(model.parameters(), lr=0.001)
    criterion = nn.CrossEntropyLoss()

    data_path = "./data/ravdess_raw"
    X, y = [], []

    print("[SYSTEM] Extracting MFCCs from RAVDESS dataset (This takes a few minutes)...")
    
    files_to_process = []
    for root, dirs, files in os.walk(data_path):
        for file in files:
            if file.endswith(".wav"):
                files_to_process.append(os.path.join(root, file))
    
    for path in tqdm(files_to_process):
        filename = os.path.basename(path)
        try:
            emotion_label = int(filename.split("-")[2]) - 1 
            features = extract_features(path)
            X.append(features)
            y.append(emotion_label)
        except Exception:
            continue

    # THE FIX: No .squeeze(1). Shape is now correctly (1440, 1, 40, 50)
    X_tensor = torch.tensor(np.array(X), dtype=torch.float32)
    y_tensor = torch.tensor(np.array(y), dtype=torch.long)

    # THE UPGRADE: Proper DataLoader batching for the RTX 5060
    dataset = TensorDataset(X_tensor, y_tensor)
    loader = DataLoader(dataset, batch_size=64, shuffle=True)

    print(f"\n[SYSTEM] Training Model on {len(X)} audio samples...")
    model.train()
    
    epochs = 25
    for epoch in range(epochs):
        total_loss = 0
        for batch_X, batch_y in loader:
            optimizer.zero_grad()
            outputs = model(batch_X.to(device))
            loss = criterion(outputs, batch_y.to(device))
            loss.backward()
            optimizer.step()
            total_loss += loss.item()
            
        if (epoch + 1) % 5 == 0:
            print(f"Epoch {epoch+1}/{epochs} - Avg Loss: {total_loss/len(loader):.4f}")

    torch.save(model.state_dict(), "emotion_model.pth")
    print("\n[SYSTEM] Training Complete! Brain saved as 'emotion_model.pth'")

if __name__ == "__main__":
    train()
