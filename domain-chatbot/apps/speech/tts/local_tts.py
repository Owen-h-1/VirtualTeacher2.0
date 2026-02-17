import logging
import os
import time
import re
import subprocess

from ..utils.uuid_generator import generate

logger = logging.getLogger(__name__)

local_voices = [
    {"id": "default", "name": "默认语音", "gender": "neutral"},
]


class LocalTTS:
    PERFORMANCE_LOG = True
    
    def __init__(self):
        self.voice = "default"

    def remove_html(self, text: str) -> str:
        clean_text = re.sub(r'\[.*?\]', '', text)
        clean_text = re.sub(r'<.*?>', '', clean_text)
        return clean_text.strip()

    def _ensure_tmp_dir(self) -> str:
        pwdPath = os.getcwd()
        tmp_dir = os.path.join(pwdPath, "tmp")
        if not os.path.exists(tmp_dir):
            os.makedirs(tmp_dir)
        return tmp_dir

    def synthesis(self, text: str, speaker: str = "default", noise: float = 0.6, noisew: float = 0.9, sdp_ratio: float = 0.2) -> str:
        start_time = time.time()
        
        new_text = self.remove_html(text)
        tmp_dir = self._ensure_tmp_dir()
        file_name = generate() + ".wav"
        filePath = os.path.join(tmp_dir, file_name)
        
        try:
            import pyttsx3
            engine = pyttsx3.init()
            engine.save_to_file(new_text, filePath)
            engine.runAndWait()
            
            if os.path.exists(filePath):
                elapsed_time = (time.time() - start_time) * 1000
                if self.PERFORMANCE_LOG:
                    logger.info(f"Local TTS synthesis completed in {elapsed_time:.2f}ms")
                return file_name
        except ImportError:
            logger.warning("pyttsx3 not installed, trying espeak")
        except Exception as e:
            logger.warning(f"pyttsx3 failed: {e}")
        
        try:
            result = subprocess.run(
                ["espeak", "-v", "zh", "-w", filePath, new_text],
                capture_output=True,
                timeout=30
            )
            if result.returncode == 0 and os.path.exists(filePath):
                elapsed_time = (time.time() - start_time) * 1000
                if self.PERFORMANCE_LOG:
                    logger.info(f"Espeak TTS synthesis completed in {elapsed_time:.2f}ms")
                return file_name
        except FileNotFoundError:
            logger.warning("espeak not found")
        except Exception as e:
            logger.warning(f"espeak failed: {e}")
        
        return self._generate_silent_audio(filePath, file_name, start_time)

    def _generate_silent_audio(self, filePath: str, file_name: str, start_time: float) -> str:
        import wave
        import struct
        
        duration = 1
        sample_rate = 22050
        n_channels = 1
        sampwidth = 2
        n_frames = duration * sample_rate
        
        with wave.open(filePath, 'w') as wav_file:
            wav_file.setparams((n_channels, sampwidth, sample_rate, n_frames, 'NONE', 'not compressed'))
            for _ in range(n_frames):
                wav_file.writeframes(struct.pack('<h', 0))
        
        elapsed_time = (time.time() - start_time) * 1000
        if self.PERFORMANCE_LOG:
            logger.info(f"Silent audio generated in {elapsed_time:.2f}ms (TTS unavailable)")
        
        return file_name

    def get_voices(self) -> list:
        return local_voices
