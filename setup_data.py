import os
import requests
import zipfile
from tqdm import tqdm

DATA_DIR = "data"
ZIP_PATH = os.path.join(DATA_DIR, "ravdess.zip")
EXTRACT_PATH = os.path.join(DATA_DIR, "ravdess_raw")
URL = "https://zenodo.org/record/1188976/files/Audio_Speech_Actors_01-24.zip?download=1"

def download_data():
    if not os.path.exists(DATA_DIR):
        os.makedirs(DATA_DIR)
        
    if not os.path.exists(ZIP_PATH):
        print("[SYSTEM] Downloading RAVDESS Dataset (This may take a few minutes)...")
        response = requests.get(URL, stream=True)
        total_size = int(response.headers.get('content-length', 0))
        
        with open(ZIP_PATH, 'wb') as file, tqdm(
            desc="Downloading",
            total=total_size,
            unit='iB',
            unit_scale=True,
            unit_divisor=1024,
        ) as bar:
            for data in response.iter_content(chunk_size=1024):
                size = file.write(data)
                bar.update(size)
    else:
        print("[SYSTEM] RAVDESS zip already found.")

def extract_data():
    if not os.path.exists(EXTRACT_PATH):
        print("\n[SYSTEM] Extracting audio files...")
        with zipfile.ZipFile(ZIP_PATH, 'r') as zip_ref:
            zip_ref.extractall(EXTRACT_PATH)
        print("[SYSTEM] Extraction complete. Data is ready for training.")
    else:
        print("[SYSTEM] Data already extracted.")

if __name__ == "__main__":
    download_data()
    extract_data()
