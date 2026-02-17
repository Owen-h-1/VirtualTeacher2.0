import json
import os
import uuid
import time
import logging

import requests
from ..utils.uuid_generator import generate

logger = logging.getLogger(__name__)

url = "https://v2.genshinvoice.top/run/predict"

headers = {
    "authority": "v2.genshinvoice.top",
    "accept": "*/*",
    "accept-language": "zh-CN,zh;q=0.9",
    "content-type": "application/json",
    "origin": "https://v2.genshinvoice.top",
    "referer": "https://v2.genshinvoice.top/",
    "sec-ch-ua": '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
    "sec-ch-ua-mobile": "?0",
    "sec-ch-ua-platform": '"macOS"',
    "sec-fetch-dest": "empty",
    "sec-fetch-mode": "cors",
    "sec-fetch-site": "same-origin",
    "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Accept-Encoding": "deflate, gzip"
}

file_url = "https://v2.genshinvoice.top/file="

bert_vits2_voices = [{
    "id": "派蒙_ZH",
    "name": "派蒙(女声-活泼)",
    "gender": "female"
}, {
    "id": "纳西妲_ZH",
    "name": "纳西妲(女声-可爱)",
    "gender": "female"
}, {
    "id": "凯亚_ZH",
    "name": "凯亚(男声-沉稳)",
    "gender": "male"
}, {
    "id": "阿贝多_ZH",
    "name": "阿贝多(男声-温和)",
    "gender": "male"
}, {
    "id": "温迪_ZH",
    "name": "温迪(男声-少年)",
    "gender": "male"
}, {
    "id": "枫原万叶_ZH",
    "name": "枫原万叶(男声-温柔)",
    "gender": "male"
}, {
    "id": "钟离_ZH",
    "name": "钟离(男声-沉稳)",
    "gender": "male"
}, {
    "id": "荒泷一斗_ZH",
    "name": "荒泷一斗(男声-豪爽)",
    "gender": "male"
}, {
    "id": "八重神子_ZH",
    "name": "八重神子(女声-妩媚)",
    "gender": "female"
}, {
    "id": "艾尔海森_ZH",
    "name": "艾尔海森(男声-冷淡)",
    "gender": "male"
}, {
    "id": "宵宫_ZH",
    "name": "宵宫(女声-开朗)",
    "gender": "female"
}, {
    "id": "那维莱特_ZH",
    "name": "那维莱特(男声-威严)",
    "gender": "male"
}, {
    "id": "芙宁娜_ZH",
    "name": "芙宁娜(女声-活泼)",
    "gender": "female"
}, {
    "id": "雷电将军_ZH",
    "name": "雷电将军(女声-威严)",
    "gender": "female"
}, {
    "id": "神里绫华_ZH",
    "name": "神里绫华(女声-优雅)",
    "gender": "female"
}, {
    "id": "刻晴_ZH",
    "name": "刻晴(女声-干练)",
    "gender": "female"
}, {
    "id": "胡桃_ZH",
    "name": "胡桃(女声-俏皮)",
    "gender": "female"
}, {
    "id": "甘雨_ZH",
    "name": "甘雨(女声-温柔)",
    "gender": "female"
}, {
    "id": "可莉_ZH",
    "name": "可莉(女声-童真)",
    "gender": "female"
}, {
    "id": "流浪者_ZH",
    "name": "流浪者(男声-傲慢)",
    "gender": "male"
}]


class BertVits2API:
    PERFORMANCE_LOG = True
    
    def request(self, params: dict[str, str]) -> str:
        start_time = time.time()
        
        body = json.dumps(params, ensure_ascii=False).encode('utf-8')
        response = requests.post(url, headers=headers, data=body, verify=False, timeout=30)
        voice_result = json.loads(response.text)["data"]
        file_path = voice_result[1]["name"]
        
        response = requests.get(file_url + file_path, headers=headers, verify=False, timeout=30)
        
        file_name = generate() + ".wav"
        full_file_path = os.path.join(os.getcwd(), "tmp", file_name)
        dirPath = os.path.dirname(full_file_path)
        
        if not os.path.exists(dirPath):
            os.makedirs(dirPath)
        
        with open(full_file_path, 'wb') as file:
            file.write(response.content)
        
        elapsed_time = (time.time() - start_time) * 1000
        if self.PERFORMANCE_LOG:
            logger.info(f"Bert-VITS2 synthesis completed in {elapsed_time:.2f}ms")
        
        return file_name


class BertVits2:
    client: BertVits2API

    def __init__(self):
        self.client = BertVits2API()

    def synthesis(self, text: str, speaker: str, noise: str, noisew: str, sdp_ratio: str) -> str:
        params = {
            "data": [text, speaker, sdp_ratio, noise, noisew, 1, "ZH", False, 1, 0.2, None, "Happy", "", 0.7],
            "event_data": None,
            "fn_index": 0,
            "session_hash": str(uuid.uuid4())
        }
        return self.client.request(params=params)

    def get_voices(self) -> list:
        return bert_vits2_voices


if __name__ == '__main__':
    client = BertVits2()
    client.synthesis(text="晚上好，yuki129", speaker="芙宁娜_ZH", noise=0.6, noisew=0.9, sdp_ratio=0.5)
