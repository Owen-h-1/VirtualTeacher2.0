"""
TTS功能测试脚本
用于验证语音合成功能的各项指标
"""
import os
import sys
import time
import json

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from apps.speech.tts import single_tts_driver


def test_tts_synthesis():
    """测试TTS合成功能"""
    print("=" * 50)
    print("TTS 功能测试")
    print("=" * 50)
    
    test_cases = [
        {"text": "你好，很高兴见到你。", "desc": "短文本"},
        {"text": "今天天气真不错，适合出去走走。你喜欢什么样的天气呢？", "desc": "中等文本"},
        {"text": "人工智能正在改变我们的生活方式，从智能家居到自动驾驶，从医疗诊断到金融分析，AI技术的应用越来越广泛。", "desc": "长文本"},
    ]
    
    tts_types = single_tts_driver.get_available_tts_types()
    print(f"\n可用的TTS引擎: {[t['id'] for t in tts_types]}")
    
    for tts_type in tts_types:
        print(f"\n{'='*20} 测试 {tts_type['name']} {'='*20}")
        
        voices = single_tts_driver.get_voices(tts_type['id'])
        print(f"可用音色数量: {len(voices)}")
        
        male_voices = [v for v in voices if v.get('gender') == 'male']
        female_voices = [v for v in voices if v.get('gender') == 'female']
        print(f"  - 男声: {len(male_voices)} 个")
        print(f"  - 女声: {len(female_voices)} 个")
        
        if voices:
            test_voice = voices[0]
            print(f"\n使用音色: {test_voice['name']} ({test_voice['id']})")
            
            for case in test_cases:
                print(f"\n测试场景: {case['desc']}")
                print(f"文本: {case['text'][:30]}...")
                
                start_time = time.time()
                try:
                    audio_buffer, audio_format = single_tts_driver.synthesis_to_buffer(
                        type=tts_type['id'],
                        text=case['text'],
                        voice_id=test_voice['id']
                    )
                    elapsed_ms = (time.time() - start_time) * 1000
                    
                    audio_size = len(audio_buffer.getvalue())
                    print(f"  合成耗时: {elapsed_ms:.2f}ms")
                    print(f"  音频格式: {audio_format}")
                    print(f"  音频大小: {audio_size} bytes")
                    
                    if elapsed_ms < 500:
                        print(f"  状态: ✓ 延迟达标 (<500ms)")
                    else:
                        print(f"  状态: ⚠ 延迟超标 (>500ms)")
                        
                except Exception as e:
                    print(f"  错误: {str(e)}")
    
    print("\n" + "=" * 50)
    print("测试完成")
    print("=" * 50)


def test_voice_list():
    """测试音色列表"""
    print("\n音色列表详情:")
    print("-" * 50)
    
    for tts_type in single_tts_driver.get_available_tts_types():
        voices = single_tts_driver.get_voices(tts_type['id'])
        print(f"\n{tts_type['name']}:")
        
        for i, voice in enumerate(voices[:5]):
            gender = voice.get('gender', 'unknown')
            print(f"  {i+1}. {voice['name']} ({gender})")
        
        if len(voices) > 5:
            print(f"  ... 还有 {len(voices) - 5} 个音色")


if __name__ == '__main__':
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'VirtualWife.settings')
    
    import django
    django.setup()
    
    test_voice_list()
    test_tts_synthesis()
