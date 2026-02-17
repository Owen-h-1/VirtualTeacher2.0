import { buildUrl } from "@/utils/buildUrl";
import { getRequest, postRequest, buildMediaUrl } from "../httpclient/httpclient";


export const voiceData = {
    id: "",
    name: "",
    gender: ""
}
export type Voice = typeof voiceData;

export const ttsTypeData = {
    id: "",
    name: "",
    description: ""
}
export type TTSType = typeof ttsTypeData;

export async function getVoices(tts_type: string): Promise<Voice[]> {
    const headers: Record<string, string> = {
        "Content-Type": "application/json"
    };

    const body = {
        "type": tts_type
    }

    try {
        const chatRes = await postRequest("/speech/tts/voices", headers, body);
        if (chatRes.code !== '200') {
            console.error("Failed to get voices:", chatRes.error);
            return [];
        }
        return chatRes.response || [];
    } catch (error) {
        console.error("Error fetching voices:", error);
        return [];
    }
}

export async function getTTSTypes(): Promise<TTSType[]> {
    const headers: Record<string, string> = {
        "Content-Type": "application/json"
    };

    try {
        const res = await getRequest("/speech/tts/types", headers);
        if (res.code !== '200') {
            console.error("Failed to get TTS types:", res.error);
            return getDefaultTTSTypes();
        }
        return res.response || getDefaultTTSTypes();
    } catch (error) {
        console.error("Error fetching TTS types:", error);
        return getDefaultTTSTypes();
    }
}

function getDefaultTTSTypes(): TTSType[] {
    return [
        { id: "Edge", name: "Edge TTS (微软)", description: "免费、低延迟、多语言支持" },
        { id: "Bert-VITS2", name: "Bert-VITS2", description: "高质量中文语音合成" }
    ];
}

export function getVoiceByGender(voices: Voice[], gender: 'male' | 'female'): Voice[] {
    return voices.filter(voice => voice.gender === gender);
}

export function getRecommendedVoice(voices: Voice[], preferredGender?: 'male' | 'female'): Voice | null {
    if (!voices || voices.length === 0) return null;
    
    if (preferredGender) {
        const filtered = getVoiceByGender(voices, preferredGender);
        if (filtered.length > 0) return filtered[0];
    }
    
    return voices[0];
}
