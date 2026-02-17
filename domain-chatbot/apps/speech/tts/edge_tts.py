import logging
import os
import asyncio
import time
import re
import subprocess
import sys
from io import BytesIO

from ..utils.uuid_generator import generate

logger = logging.getLogger(__name__)

edge_voices = [
    {"id": "zh-CN-XiaoxiaoNeural", "name": "晓晓(女声-温柔)", "gender": "female"},
    {"id": "zh-CN-XiaoyiNeural", "name": "晓伊(女声-活泼)", "gender": "female"},
    {"id": "zh-CN-YunjianNeural", "name": "云健(男声-沉稳)", "gender": "male"},
    {"id": "zh-CN-YunxiNeural", "name": "云希(男声-阳光)", "gender": "male"},
    {"id": "zh-CN-YunxiaNeural", "name": "云夏(男声-年轻)", "gender": "male"},
    {"id": "zh-CN-YunyangNeural", "name": "云扬(男声-专业)", "gender": "male"},
    {"id": "zh-CN-liaoning-XiaobeiNeural", "name": "晓北(女声-东北)", "gender": "female"},
    {"id": "zh-CN-shaanxi-XiaoniNeural", "name": "晓妮(女声-陕西)", "gender": "female"},
    {"id": "en-US-JennyNeural", "name": "Jenny(女声-英语)", "gender": "female"},
    {"id": "en-US-GuyNeural", "name": "Guy(男声-英语)", "gender": "male"},
    {"id": "ja-JP-NanamiNeural", "name": "Nanami(女声-日语)", "gender": "female"},
    {"id": "ja-JP-KeitaNeural", "name": "Keita(男声-日语)", "gender": "male"},
    {"id": "zh-HK-HiuGaaiNeural", "name": "HiuGaai(女声-粤语)", "gender": "female"},
    {"id": "zh-HK-HiuMaanNeural", "name": "HiuMaan(女声-粤语)", "gender": "female"},
    {"id": "zh-HK-WanLungNeural", "name": "WanLung(男声-粤语)", "gender": "male"},
    {"id": "zh-TW-HsiaoChenNeural", "name": "晓臻(女声-台湾)", "gender": "female"},
    {"id": "zh-TW-HsiaoYuNeural", "name": "晓雨(女声-台湾)", "gender": "female"},
    {"id": "zh-TW-YunJheNeural", "name": "云哲(男声-台湾)", "gender": "male"}
]


class Edge:
    PERFORMANCE_LOG = True

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
    
    def _get_proxy_args(self) -> list:
        proxy_args = []
        http_proxy = os.environ.get('HTTP_PROXY', '') or os.environ.get('http_proxy', '')
        https_proxy = os.environ.get('HTTPS_PROXY', '') or os.environ.get('https_proxy', '')
        
        if https_proxy:
            proxy_args.extend(['--proxy', https_proxy])
        elif http_proxy:
            proxy_args.extend(['--proxy', http_proxy])
        
        return proxy_args

    def create_audio(self, text: str, voiceId: str) -> str:
        start_time = time.time()
        
        new_text = self.remove_html(text)
        tmp_dir = self._ensure_tmp_dir()
        file_name = generate() + ".mp3"
        filePath = os.path.join(tmp_dir, file_name)
        
        cmd = ["edge-tts", "--voice", voiceId, "--text", new_text, "--write-media", filePath]
        cmd.extend(self._get_proxy_args())
        
        try:
            result = subprocess.run(
                cmd,
                capture_output=True,
                timeout=60,
                text=True
            )
            
            if result.returncode != 0:
                error_msg = result.stderr or "Unknown error"
                if "403" in error_msg or "Invalid response status" in error_msg:
                    logger.error(f"Edge TTS API access denied (403). This may be due to network restrictions.")
                    logger.error("Please try: 1) Configure proxy in settings 2) Use Bert-VITS2 instead")
                    raise Exception("Edge TTS API access denied. Please configure proxy or use Bert-VITS2.")
                logger.error(f"edge-tts error: {error_msg}")
                raise Exception(f"edge-tts failed: {error_msg}")
                
            if not os.path.exists(filePath):
                raise Exception("Audio file was not created")
                
        except subprocess.TimeoutExpired:
            logger.error("edge-tts timeout")
            raise Exception("TTS synthesis timeout")
        except FileNotFoundError:
            logger.error("edge-tts command not found")
            raise Exception("edge-tts is not installed")
        
        elapsed_time = (time.time() - start_time) * 1000
        if self.PERFORMANCE_LOG:
            logger.info(f"TTS Edge synthesis completed in {elapsed_time:.2f}ms for text length: {len(text)}")
        
        return file_name

    async def create_audio_stream(self, text: str, voiceId: str) -> bytes:
        import edge_tts
        
        new_text = self.remove_html(text)
        communicate = edge_tts.Communicate(new_text, voiceId)
        
        audio_data = BytesIO()
        async for chunk in communicate.stream():
            if chunk["type"] == "audio":
                audio_data.write(chunk["data"])
        
        return audio_data.getvalue()
