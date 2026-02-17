from abc import ABC, abstractmethod
import logging
import time
import os
from typing import Optional, Tuple
from io import BytesIO

from .edge_tts import Edge, edge_voices
from .bert_vits2 import BertVits2
from .local_tts import LocalTTS, local_voices

logger = logging.getLogger(__name__)

TTS_PERFORMANCE_THRESHOLD_MS = 500


class BaseTTS(ABC):
    '''合成语音统一抽象类'''

    @abstractmethod
    def synthesis(self, text: str, voice_id: str, **kwargs) -> str:
        '''合成语音'''
        pass

    @abstractmethod
    def get_voices(self) -> list[dict[str, str]]:
        '''获取声音列表'''
        pass

    @abstractmethod
    def get_audio_format(self) -> str:
        '''获取音频格式'''
        pass

    def synthesis_with_timing(self, text: str, voice_id: str, **kwargs) -> Tuple[str, float]:
        '''合成语音并返回耗时'''
        start_time = time.time()
        file_name = self.synthesis(text=text, voice_id=voice_id, **kwargs)
        elapsed_ms = (time.time() - start_time) * 1000
        return file_name, elapsed_ms


class EdgeTTS(BaseTTS):
    '''Edge 微软语音合成类'''
    client: Edge

    def __init__(self):
        self.client = Edge()

    def synthesis(self, text: str, voice_id: str, **kwargs) -> str:
        return self.client.create_audio(text=text, voiceId=voice_id)

    def get_voices(self) -> list[dict[str, str]]:
        return edge_voices

    def get_audio_format(self) -> str:
        return "mp3"


class BertVITS2TTS(BaseTTS):
    '''Bert-VITS2 语音合成类'''
    client: BertVits2

    def __init__(self):
        self.client = BertVits2()

    def synthesis(self, text: str, voice_id: str, **kwargs) -> str:
        noise = kwargs.get("noise", 0.6)
        noisew = kwargs.get("noisew", 0.9)
        sdp_ratio = kwargs.get("sdp_ratio", 0.2)
        return self.client.synthesis(text=text, speaker=voice_id, noise=noise, noisew=noisew, sdp_ratio=sdp_ratio)

    def get_voices(self) -> list[dict[str, str]]:
        return self.client.get_voices()

    def get_audio_format(self) -> str:
        return "wav"


class LocalTTSEngine(BaseTTS):
    '''本地TTS引擎'''
    client: LocalTTS

    def __init__(self):
        self.client = LocalTTS()

    def synthesis(self, text: str, voice_id: str, **kwargs) -> str:
        return self.client.synthesis(text=text, speaker=voice_id)

    def get_voices(self) -> list[dict[str, str]]:
        return local_voices

    def get_audio_format(self) -> str:
        return "wav"


class TTSDriver:
    '''TTS驱动类'''
    
    _instance = None
    _tts_cache = {}

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def synthesis(self, type: str, text: str, voice_id: str, **kwargs) -> str:
        tts = self.get_strategy(type)
        file_name, elapsed_ms = tts.synthesis_with_timing(text=text, voice_id=voice_id, kwargs=kwargs)
        
        if elapsed_ms > TTS_PERFORMANCE_THRESHOLD_MS:
            logger.warning(f"TTS synthesis exceeded threshold: {elapsed_ms:.2f}ms > {TTS_PERFORMANCE_THRESHOLD_MS}ms")
        else:
            logger.info(f"TTS synthesis completed in {elapsed_ms:.2f}ms")
        
        logger.debug(f"TTS synthesis # type:{type} text:{text[:50]}... => file_name: {file_name} #")
        return file_name

    def synthesis_to_buffer(self, type: str, text: str, voice_id: str, **kwargs) -> Tuple[BytesIO, str]:
        '''合成语音到内存缓冲区，避免文件IO'''
        try:
            file_name = self.synthesis(type=type, text=text, voice_id=voice_id, kwargs=kwargs)
        except Exception as e:
            logger.warning(f"TTS {type} failed, falling back to Local: {e}")
            file_name = self.synthesis(type="Local", text=text, voice_id="default", kwargs=kwargs)
        
        file_path = os.path.join("tmp", file_name)
        
        audio_buffer = BytesIO()
        with open(file_path, 'rb') as f:
            audio_buffer.write(f.read())
        audio_buffer.seek(0)
        
        try:
            os.remove(file_path)
            logger.debug(f"Cleaned up temp file: {file_path}")
        except Exception as e:
            logger.warning(f"Failed to clean up temp file: {e}")
        
        audio_format = self.get_strategy(type).get_audio_format()
        return audio_buffer, audio_format

    def get_voices(self, type: str) -> list[dict[str, str]]:
        tts = self.get_strategy(type)
        return tts.get_voices()

    def get_available_tts_types(self) -> list[dict[str, str]]:
        '''获取可用的TTS类型列表'''
        return [
            {"id": "Edge", "name": "Edge TTS (微软)", "description": "免费、低延迟、多语言支持(需代理)"},
            {"id": "Bert-VITS2", "name": "Bert-VITS2", "description": "高质量中文语音合成(需网络)"},
            {"id": "Local", "name": "本地TTS", "description": "离线可用，无需网络"}
        ]

    def get_strategy(self, type: str) -> BaseTTS:
        cache_key = type
        if cache_key in self._tts_cache:
            return self._tts_cache[cache_key]
        
        if type == "Edge":
            tts = EdgeTTS()
        elif type == "Bert-VITS2":
            tts = BertVITS2TTS()
        elif type == "Local":
            tts = LocalTTSEngine()
        else:
            raise ValueError(f"Unknown TTS type: {type}. Available types: Edge, Bert-VITS2, Local")
        
        self._tts_cache[cache_key] = tts
        return tts
