from io import BytesIO

from django.shortcuts import render
import os
import json
import logging
import time
from django.http import FileResponse
from .translation import translationClient
from rest_framework.decorators import api_view
from rest_framework.response import Response
from .tts import single_tts_driver
from django.http import HttpResponse, StreamingHttpResponse

logger = logging.getLogger(__name__)

AUDIO_MIME_TYPES = {
    'mp3': 'audio/mpeg',
    'wav': 'audio/wav',
    'ogg': 'audio/ogg',
    'webm': 'audio/webm'
}


@api_view(['POST'])
def generate(request):
    """
    Generate audio from text.
    Supports both MP3 and WAV formats.
    """
    start_time = time.time()
    
    try:
        data = json.loads(request.body.decode('utf-8'))
        text = data.get("text", "")
        voice_id = data.get("voice_id", "zh-CN-XiaoxiaoNeural")
        tts_type = data.get("type", "Edge")
        
        if not text or not text.strip():
            return HttpResponse(status=400, content="Text cannot be empty")
        
        text = text.strip()
        
        logger.info(f"TTS Request - Type: {tts_type}, Voice: {voice_id}, Text length: {len(text)}")
        
        audio_buffer, audio_format = single_tts_driver.synthesis_to_buffer(
            type=tts_type, 
            text=text, 
            voice_id=voice_id
        )
        
        elapsed_time = (time.time() - start_time) * 1000
        logger.info(f"TTS generation completed in {elapsed_time:.2f}ms")
        
        content_type = AUDIO_MIME_TYPES.get(audio_format, 'audio/mpeg')
        
        response = HttpResponse(content_type=content_type)
        response['Content-Disposition'] = f'attachment; filename="speech.{audio_format}"'
        response['X-TTS-Latency-Ms'] = f'{elapsed_time:.2f}'
        response['X-Audio-Format'] = audio_format
        response.write(audio_buffer.getvalue())
        
        return response
        
    except json.JSONDecodeError:
        logger.error("Invalid JSON in request body")
        return HttpResponse(status=400, content="Invalid JSON format")
    except ValueError as e:
        logger.error(f"TTS configuration error: {e}")
        return HttpResponse(status=400, content=str(e))
    except Exception as e:
        logger.error(f"generate_audio error: {e}", exc_info=True)
        return HttpResponse(status=500, content=f"Failed to generate audio: {str(e)}")


@api_view(['POST'])
def generate_stream(request):
    """
    Generate audio with streaming response for lower latency.
    """
    try:
        data = json.loads(request.body.decode('utf-8'))
        text = data.get("text", "")
        voice_id = data.get("voice_id", "zh-CN-XiaoxiaoNeural")
        tts_type = data.get("type", "Edge")
        
        if not text or not text.strip():
            return HttpResponse(status=400, content="Text cannot be empty")
        
        def generate_audio_chunks():
            audio_buffer, audio_format = single_tts_driver.synthesis_to_buffer(
                type=tts_type,
                text=text.strip(),
                voice_id=voice_id
            )
            chunk_size = 8192
            while True:
                chunk = audio_buffer.read(chunk_size)
                if not chunk:
                    break
                yield chunk
        
        content_type = AUDIO_MIME_TYPES.get('mp3', 'audio/mpeg')
        response = StreamingHttpResponse(generate_audio_chunks(), content_type=content_type)
        response['Content-Disposition'] = 'attachment; filename="speech.mp3"'
        return response
        
    except Exception as e:
        logger.error(f"generate_stream error: {e}", exc_info=True)
        return HttpResponse(status=500, content=f"Failed to generate audio: {str(e)}")


def delete_file(file_path):
    try:
        if os.path.exists(file_path):
            os.remove(file_path)
    except Exception as e:
        logger.warning(f"Failed to delete file {file_path}: {e}")


@api_view(['POST'])
def get_voices(request):
    try:
        data = json.loads(request.body.decode('utf-8'))
        tts_type = data.get("type", "Edge")
        voices = single_tts_driver.get_voices(type=tts_type)
        return Response({"response": voices, "code": "200"})
    except Exception as e:
        logger.error(f"get_voices error: {e}")
        return Response({"response": [], "code": "500", "error": str(e)})


@api_view(['GET'])
def get_tts_types(request):
    """Get available TTS engine types"""
    try:
        types = single_tts_driver.get_available_tts_types()
        return Response({"response": types, "code": "200"})
    except Exception as e:
        logger.error(f"get_tts_types error: {e}")
        return Response({"response": [], "code": "500", "error": str(e)})


@api_view(['POST'])
def translation(request):
    """
    translation
    """
    try:
        data = json.loads(request.body.decode('utf-8'))
        text = data.get("text", "")
        target_language = data.get("target_language", "en")
        
        if not text:
            return Response({"response": "", "code": "400", "error": "Text is required"})
            
        target_result = translationClient.translation(
            text=text, target_language=target_language)
        return Response({"response": target_result, "code": "200"})
    except Exception as e:
        logger.error(f"translation error: {e}")
        return HttpResponse(status=500, content="Failed to translation error.")
