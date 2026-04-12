import librosa
import numpy as np

class AudioProcessor:
    def __init__(self, sample_rate=16000):
        self.sample_rate = sample_rate

    def process_audio_buffer(self, audio_data):
        """
        Converts raw audio bytes into MFCC features for the CNN.
        Professional tier: Using 40 MFCCs for high-resolution frequency mapping.
        """
        # Convert raw PCM 16-bit data to float32
        audio_array = np.frombuffer(audio_data, dtype=np.int16).astype(np.float32) / 32768.0
        
        # Extract Mel-frequency cepstral coefficients (MFCCs)
        mfccs = librosa.feature.mfcc(y=audio_array, sr=self.sample_rate, n_mfcc=40)
        
        # Standardize shape to (40, 50) - 40 features over 50 time-frames
        # This ensures the CNN always gets the same 'image' size
        target_width = 50
        if mfccs.shape[1] < target_width:
            mfccs = np.pad(mfccs, ((0, 0), (0, target_width - mfccs.shape[1])), mode='constant')
        else:
            mfccs = mfccs[:, :target_width]
            
        # Add channel and batch dimensions for PyTorch: (Batch, Channel, Height, Width)
        # Returns: (1, 1, 40, 50)
        return mfccs[np.newaxis, np.newaxis, ...]

