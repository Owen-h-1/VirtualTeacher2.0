import {createContext, useCallback, useContext, useEffect, useRef, useState} from "react";
import VrmViewer from "@/components/vrmViewer";
import {ViewerContext} from "@/features/vrmViewer/viewerContext";
import {EmotionType, Message, Screenplay, textsToScreenplay,} from "@/features/messages/messages";
import {speakCharacter} from "@/features/messages/speakCharacter";
import {MessageInputContainer} from "@/components/messageInputContainer";
import {SYSTEM_PROMPT} from "@/features/constants/systemPromptConstants";
import {DEFAULT_PARAM, KoeiroParam} from "@/features/constants/koeiroParam";
import {chat} from "@/features/chat/openAiChat";
import {connect} from "@/features/blivedm/blivedm";
// import { PhotoFrame } from '@/features/game/photoFrame';
// import { M_PLUS_2, Montserrat } from "next/font/google";
import {Introduction} from "@/components/introduction";
import {Menu} from "@/components/menu";
import {GitHubLink} from "@/components/githubLink";
import {Meta} from "@/components/meta";
import {GlobalConfig, getConfig, initialFormData} from "@/features/config/configApi";
import {buildUrl} from "@/utils/buildUrl";
import {generateMediaUrl, vrmModelData} from "@/features/media/mediaApi";
import { FaceRecognitionPanel } from "@/components/FaceRecognitionPanel";
import { ExpressionData } from "@/features/faceRecognition/faceRecognitionApi";
import { teachingStrategyService, TeachingAdjustment } from "@/features/faceRecognition/teachingStrategy";


// const m_plus_2 = M_PLUS_2({
//   variable: "--font-m-plus-2",
//   display: "swap",
//   preload: false,
// });

// const montserrat = Montserrat({
//   variable: "--font-montserrat",
//   display: "swap",
//   subsets: ["latin"],
// });

let socketInstance: WebSocket | null = null;
let bind_message_event = false;
let webGlobalConfig = initialFormData

// Expression name mapping for display
const expressionNames: Record<string, string> = {
  happy: '开心',
  sad: '悲伤',
  angry: '愤怒',
  surprised: '惊讶',
  neutral: '中性',
  confused: '困惑',
  bored: '无聊',
  focused: '专注'
};

export default function Home() {

    const {viewer} = useContext(ViewerContext);
    const [systemPrompt, setSystemPrompt] = useState(SYSTEM_PROMPT);
    const [openAiKey, setOpenAiKey] = useState("");
    const [koeiroParam, setKoeiroParam] = useState<KoeiroParam>(DEFAULT_PARAM);
    const [chatProcessing, setChatProcessing] = useState(false);
    const [chatLog, setChatLog] = useState<Message[]>([]);
    const [assistantMessage, setAssistantMessage] = useState("");
    const [imageUrl, setImageUrl] = useState('');
    const [globalConfig, setGlobalConfig] = useState<GlobalConfig>(initialFormData);
    const [subtitle, setSubtitle] = useState("");
    const [displayedSubtitle, setDisplayedSubtitle] = useState("");
    const [backgroundImageUrl, setBackgroundImageUrl] = useState<string>(buildUrl("/bg-c.png"));
    const [isCallActive, setIsCallActive] = useState(false);
    const [callError, setCallError] = useState<string | null>(null);
    
    // Face Recognition Integration States
    const [currentExpression, setCurrentExpression] = useState<ExpressionData | null>(null);
    const [teachingAdjustment, setTeachingAdjustment] = useState<TeachingAdjustment | null>(null);
    const [showFacePanel, setShowFacePanel] = useState(false);
    const callSpeechRecognitionRef = useRef<SpeechRecognition | null>(null);
    const isCallActiveRef = useRef(false);
    const isAISpeakingRef = useRef(false);
    const lastProcessedTextRef = useRef<string>("");
    const lastProcessTimeRef = useRef<number>(0);
    const typingDelay = 100; // 每个字的延迟时间，可以根据需要进行调整
    const MAX_SUBTITLES = 30;
    const handleSubtitle = (newSubtitle: string) => {

        setDisplayedSubtitle((prevSubtitle: string) => {
            const updatedSubtitle = prevSubtitle + newSubtitle;
            if (updatedSubtitle.length > MAX_SUBTITLES) {
                const startIndex = updatedSubtitle.length - MAX_SUBTITLES;
                return updatedSubtitle.substring(startIndex);
            }
            return updatedSubtitle;
        });
    };


    useEffect(() => {
        if (socketInstance != null) {
            socketInstance.close()
        }
        if (!bind_message_event) {
            console.log(">>>> setupWebSocket")
            bind_message_event = true;
            setupWebSocket(); // Set up WebSocket when component mounts
        }
        getConfig().then(data => {
            webGlobalConfig = data
            setGlobalConfig(data)
            if (data.background_url != '') {
                setBackgroundImageUrl(generateMediaUrl(data.background_url))
            }
        })
        if (window.localStorage.getItem("chatVRMParams")) {
            const params = JSON.parse(
                window.localStorage.getItem("chatVRMParams") as string
            );
            setSystemPrompt(params.systemPrompt);
            setKoeiroParam(params.koeiroParam);
            setChatLog(params.chatLog);
        }
    }, []);


    useEffect(() => {
        process.nextTick(() =>
            window.localStorage.setItem(
                "chatVRMParams",
                JSON.stringify({systemPrompt, koeiroParam, chatLog})
            )
        );
    }, [systemPrompt, koeiroParam, chatLog]);

    const handleChangeChatLog = useCallback(
        (targetIndex: number, text: string) => {
            const newChatLog = chatLog.map((v: Message, i) => {
                return i === targetIndex ? {role: v.role, content: text, user_name: v.user_name} : v;
            });
            setChatLog(newChatLog);
        },
        [chatLog]
    );

    /**
     * 文ごとに音声を直列でリクエストしながら再生する
     */
    const handleSpeakAi = useCallback(
        async (
            globalConfig: GlobalConfig,
            screenplay: Screenplay,
            onStart?: () => void,
            onEnd?: () => void
        ) => {
            speakCharacter(globalConfig, screenplay, viewer, onStart, onEnd);
        },
        [viewer]
    );

    const handleUserMessage = useCallback((
        globalConfig: GlobalConfig,
        type: string,
        user_name: string,
        content: string,
        emote: string) => {

        console.log("RobotMessage:" + content + " emote:" + emote)
        if (content == null || content == '' || content == ' ') {
            return
        }
        
        isAISpeakingRef.current = true;
        
        if (callSpeechRecognitionRef.current && isCallActiveRef.current) {
            try {
                callSpeechRecognitionRef.current.abort();
            } catch (e) {
                console.error("Failed to abort recognition:", e);
            }
        }
        
        let aiTextLog = "";
        const sentences = new Array<string>();
        const aiText = content;
        const aiTalks = textsToScreenplay([aiText], koeiroParam, emote);
        aiTextLog += aiText;
        const currentAssistantMessage = sentences.join(" ");
        setSubtitle(aiTextLog);
        handleSpeakAi(globalConfig, aiTalks[0], () => {
            setAssistantMessage(currentAssistantMessage);
            startTypewriterEffect(aiTextLog);

            const params = JSON.parse(
                window.localStorage.getItem("chatVRMParams") as string
            );
            const messageLogAssistant: Message[] = [
                ...params.chatLog,
                {role: "assistant", content: aiTextLog, "user_name": user_name},
            ];
            setChatLog(messageLogAssistant);
        }, () => {
            setTimeout(() => {
                isAISpeakingRef.current = false;
                if (callSpeechRecognitionRef.current && isCallActiveRef.current) {
                    try {
                        callSpeechRecognitionRef.current.start();
                    } catch (e) {
                        console.error("Failed to restart recognition after speech:", e);
                    }
                }
            }, 500);
        });
    }, [])

    const handleDanmakuMessage = (
        globalConfig: GlobalConfig,
        type: string,
        user_name: string,
        content: string,
        emote: string,
        action: string) => {

        console.log("DanmakuMessage:" + content + " emote:" + emote)
        if (content == null || content == '' || content == ' ') {
            return
        }

        isAISpeakingRef.current = true;

        if (callSpeechRecognitionRef.current && isCallActiveRef.current) {
            try {
                callSpeechRecognitionRef.current.abort();
            } catch (e) {
                console.error("Failed to abort recognition:", e);
            }
        }

        let aiTextLog = "";
        const sentences = new Array<string>();
        const aiText = content;
        const aiTalks = textsToScreenplay([aiText], koeiroParam, emote);
        aiTextLog += aiText;
        setSubtitle(aiTextLog);
        handleSpeakAi(globalConfig, aiTalks[0], () => {

            if (action != null && action != '') {
                handleBehaviorAction(
                    "behavior_action",
                    action,
                    emote,
                );
            }

            startTypewriterEffect(aiTextLog);
            const params = JSON.parse(
                window.localStorage.getItem("chatVRMParams") as string
            );
            const messageLog: Message[] = [
                ...params.chatLog,
                {role: "user", content: content, "user_name": user_name},
            ];
            setChatLog(messageLog);

        }, () => {
            if (action != null && action != '') {
                handleBehaviorAction(
                    "behavior_action",
                    "idle_01",
                    "neutral",
                );
            }
            setTimeout(() => {
                isAISpeakingRef.current = false;
                if (callSpeechRecognitionRef.current && isCallActiveRef.current) {
                    try {
                        callSpeechRecognitionRef.current.start();
                    } catch (e) {
                        console.error("Failed to restart recognition after danmaku:", e);
                    }
                }
            }, 500);
        });
    }

    const handleBehaviorAction = (
        type: string,
        content: string,
        emote: string) => {

        console.log("BehaviorActionMessage:" + content + " emote:" + emote)

        viewer.model?.emote(emote as EmotionType)
        viewer.model?.loadFBX(buildUrl(content))
    }

    const startTypewriterEffect = (text: string) => {
        let currentIndex = 0;
        const subtitleInterval = setInterval(() => {
            const newSubtitle = text[currentIndex];
            handleSubtitle(newSubtitle);
            currentIndex++;
            if (currentIndex >= text.length) {
                clearInterval(subtitleInterval);
            }
        }, 100); // 每个字符的间隔时间
    };

    /**
     * アシスタントとの会話を行う
     */
    const handleSendChat = useCallback(
        async (globalConfig: GlobalConfig, type: string, user_name: string, content: string) => {

            console.log("UserMessage:" + content)

            setChatProcessing(true);

            // handleBehaviorAction(
            //     "behavior_action",
            //     "thinking",
            //     "happy",
            // );

            const yourName = user_name == null || user_name == '' ? globalConfig?.characterConfig?.yourName : user_name
            // ユーザーの発言を追加して表示
            const messageLog: Message[] = [
                ...chatLog,
                {role: "user", content: content, "user_name": yourName},
            ];
            setChatLog(messageLog);

            await chat(content, yourName).catch(
                (e) => {
                    console.error(e);
                    return null;
                }
            );

            // handleBehaviorAction(
            //     "behavior_action",
            //     "idle_01",
            //     "neutral",
            // );

            setChatProcessing(false);
        },
        [systemPrompt, chatLog, setChatLog, handleSpeakAi, setImageUrl, openAiKey, koeiroParam]
    );

    const handleCallRecognitionResult = useCallback(
        (event: SpeechRecognitionEvent) => {
            if (isAISpeakingRef.current) {
                console.log("AI is speaking, ignoring recognition result");
                return;
            }
            
            const text = event.results[0][0].transcript.trim();
            if (!text) {
                return;
            }
            
            if (!event.results[0].isFinal) {
                return;
            }
            
            const now = Date.now();
            const timeSinceLastProcess = now - lastProcessTimeRef.current;
            
            if (timeSinceLastProcess < 1000) {
                console.log("Too soon since last process, ignoring:", text);
                return;
            }
            
            if (text === lastProcessedTextRef.current) {
                console.log("Duplicate text, ignoring:", text);
                return;
            }
            
            lastProcessedTextRef.current = text;
            lastProcessTimeRef.current = now;
            
            console.log("Call message:" + text);
            handleSendChat(globalConfig, "", "", text);
        },
        [handleSendChat, globalConfig]
    );

    const handleCallEnd = useCallback(() => {
        setCallError(null);
        isAISpeakingRef.current = false;
        lastProcessedTextRef.current = "";
        lastProcessTimeRef.current = 0;
        if (callSpeechRecognitionRef.current) {
            callSpeechRecognitionRef.current.abort();
        }
        isCallActiveRef.current = false;
        setIsCallActive(false);
        console.log("Call ended");
    }, []);

    const handleCallStart = useCallback(
        (globalConfig: GlobalConfig) => {
            setCallError(null);
            
            const SpeechRecognition = window.webkitSpeechRecognition || window.SpeechRecognition;
            if (!SpeechRecognition) {
                setCallError("浏览器不支持语音识别功能");
                return;
            }

            try {
                const recognition = new SpeechRecognition();
                recognition.lang = "zh-cn";
                recognition.interimResults = true;
                recognition.continuous = true;
                
                recognition.addEventListener("result", handleCallRecognitionResult);
                recognition.addEventListener("end", () => {
                    if (isCallActiveRef.current && !isAISpeakingRef.current) {
                        console.log("Recognition ended, restarting...");
                        setTimeout(() => {
                            if (isCallActiveRef.current && !isAISpeakingRef.current && callSpeechRecognitionRef.current) {
                                try {
                                    callSpeechRecognitionRef.current.start();
                                } catch (e) {
                                    console.error("Failed to restart recognition:", e);
                                }
                            }
                        }, 300);
                    }
                });
                recognition.addEventListener("error", (event) => {
                    console.error("Speech recognition error:", event.error);
                    if (event.error !== 'no-speech' && event.error !== 'aborted') {
                        setCallError(`语音识别错误: ${event.error}`);
                    }
                });

                recognition.start();
                callSpeechRecognitionRef.current = recognition;
                isCallActiveRef.current = true;
                isAISpeakingRef.current = false;
                lastProcessedTextRef.current = "";
                lastProcessTimeRef.current = 0;
                setIsCallActive(true);
                console.log("Call started");
            } catch (error) {
                console.error("Failed to start call:", error);
                setCallError("启动通话失败，请检查浏览器权限");
            }
        },
        [handleCallRecognitionResult]
    );

    // Face Recognition Integration Handlers
    const handleExpressionUpdate = useCallback((expressionData: ExpressionData) => {
        setCurrentExpression(expressionData);
        
        // Feed data to teaching strategy service
        teachingStrategyService.addExpressionData(expressionData);
        
        // Get teaching adjustment suggestion
        const adjustment = teachingStrategyService.getTeachingAdjustment();
        if (adjustment && adjustment.priority !== 'low') {
            setTeachingAdjustment(adjustment);
            
            // Log the adjustment for teacher awareness
            console.log(`[FaceRec] Teaching Adjustment: ${adjustment.action} - ${adjustment.reason}`);
            
            // If high priority, could auto-adjust behavior
            if (adjustment.priority === 'high' && adjustment.suggestedResponse) {
                console.log(`[FaceRec] Suggested: ${adjustment.suggestedResponse}`);
            }
            
            // Auto-clear after 10 seconds
            setTimeout(() => setTeachingAdjustment(null), 10000);
        }
    }, []);

    const handleInterventionTrigger = useCallback((intervention: NonNullable<ExpressionData['intervention']>) => {
        console.log(`[FaceRec] Intervention Triggered: ${intervention.state}`, intervention.suggestions);
        
        // Could trigger automatic behavior changes based on intervention
        // Map intervention states to supported emote types: neutral, happy, angry, sad, relaxed
        switch (intervention.state) {
            case 'confused':
                viewer.model?.emote('neutral');
                break;
            case 'frustrated':
                viewer.model?.emote('sad');
                break;
            case 'disengaged':
                viewer.model?.emote('neutral');
                break;
            default:
                break;
        }
    }, [viewer]);

    let lastSwitchTime = 0;

    const onChangeGlobalConfig = useCallback((
        globalConfig: GlobalConfig) => {
        setGlobalConfig(globalConfig);
        webGlobalConfig = globalConfig;
    }, [])

    const handleWebSocketMessage = (event: MessageEvent) => {
        const data = event.data;
        const chatMessage = JSON.parse(data);
        const type = chatMessage.message.type;
        if (type === "user") {
            handleUserMessage(
                webGlobalConfig,
                chatMessage.message.type,
                chatMessage.message.user_name,
                chatMessage.message.content,
                chatMessage.message.emote,
            );
        } else if (type === "behavior_action") {
            handleBehaviorAction(
                chatMessage.message.type,
                chatMessage.message.content,
                chatMessage.message.emote,
            );
        } else if (type === "danmaku" || type === "welcome") {
            handleDanmakuMessage(
                webGlobalConfig,
                chatMessage.message.type,
                chatMessage.message.user_name,
                chatMessage.message.content,
                chatMessage.message.emote,
                chatMessage.message.action
            );
        }
    };

    const setupWebSocket = () => {

        connect().then((webSocket) => {
            socketInstance = webSocket;
            socketInstance.onmessage = handleWebSocketMessage; // Set onmessage listener
            socketInstance.onclose = (event) => {
                console.log('WebSocket connection closed:', event);
                console.log('Reconnecting...');
                setupWebSocket(); // 重新调用connect()函数进行连接
            };
        });
    }

    return (
        <div
            style={{
                backgroundImage: `url(${backgroundImageUrl})`,
                backgroundSize: 'cover',
                width: '100%',
                height: '100vh',
                position: 'relative',
                zIndex: 1,
            }}>
            <div>
                <Meta/>
                <Introduction openAiKey={openAiKey} onChangeAiKey={setOpenAiKey}/>
                <VrmViewer globalConfig={globalConfig}/>
                <div className="flex items-center justify-center">
                    <div className="absolute bottom-1/4 z-10" style={{
                        fontFamily: "fzfs",
                        fontSize: "24px",
                        color: "#555",
                    }}>
                        {displayedSubtitle}
                    </div>
                    {isCallActive && (
                        <div className="absolute top-10 left-1/2 transform -translate-x-1/2 z-20 bg-green-500 text-white px-4 py-2 rounded-full flex items-center">
                            <div className="w-3 h-3 bg-white rounded-full animate-pulse mr-2"></div>
                            通话中...
                        </div>
                    )}
                    {callError && (
                        <div className="absolute top-10 left-1/2 transform -translate-x-1/2 z-20 bg-red-500 text-white px-4 py-2 rounded-full">
                            {callError}
                        </div>
                    )}
                    
                    {/* Teaching Adjustment Indicator */}
                    {teachingAdjustment && (
                        <div className="absolute top-16 left-1/2 transform -translate-x-1/2 z-20 max-w-md">
                            <div className={`px-4 py-3 rounded-lg shadow-lg text-white text-sm ${
                                teachingAdjustment.priority === 'high' ? 'bg-orange-500 animate-pulse' :
                                teachingAdjustment.priority === 'medium' ? 'bg-yellow-500' : 'bg-blue-500'
                            }`}>
                                <div className="font-semibold">💡 {teachingAdjustment.action.toUpperCase()}</div>
                                <div className="text-xs opacity-90 mt-1">{teachingAdjustment.reason}</div>
                                {teachingAdjustment.suggestedResponse && (
                                    <div className="mt-2 p-2 bg-white bg-opacity-20 rounded text-xs italic">
                                        「{teachingAdjustment.suggestedResponse}」
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                    
                    {/* Face Recognition Toggle Button - Enhanced & Reliable */}
                    <button
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            console.log('[FaceRec] Button clicked, current state:', showFacePanel);
                            setShowFacePanel(!showFacePanel);
                            console.log('[FaceRec] New state:', !showFacePanel);
                        }}
                        className="fixed top-4 right-4 z-[9999] px-6 py-4 rounded-2xl shadow-2xl transition-all duration-300 transform hover:scale-110 active:scale-95 cursor-pointer"
                        style={{
                            background: showFacePanel 
                                ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                                : 'linear-gradient(135deg, #00c6fb 0%, #005bea 100%)',
                            color: 'white',
                            fontWeight: 'bold',
                            fontSize: '16px',
                            border: 'none',
                            outline: 'none',
                            boxShadow: showFacePanel 
                                ? '0 10px 30px rgba(102, 126, 234, 0.5)'
                                : '0 10px 40px rgba(0, 198, 251, 0.6), 0 0 20px rgba(0, 198, 251, 0.4)',
                            animation: showFacePanel ? 'none' : 'glow 2s ease-in-out infinite, float 3s ease-in-out infinite'
                        }}
                        title={showFacePanel ? "隐藏表情监控" : "启动人脸情绪识别"}
                    >
                        <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ 
                                fontSize: '28px', 
                                animation: showFacePanel ? 'none' : 'bounce 1s ease-in-out infinite'
                            }}>
                                {showFacePanel ? '🎭' : '📷'}
                            </span>
                            <span>{showFacePanel ? '监控中' : '表情识别'}</span>
                        </span>
                        
                        {!showFacePanel && (
                            <span style={{
                                position: 'absolute',
                                top: '-8px',
                                right: '-8px',
                                width: '20px',
                                height: '20px'
                            }}>
                                <span style={{
                                    position: 'absolute',
                                    width: '100%',
                                    height: '100%',
                                    borderRadius: '50%',
                                    backgroundColor: '#10b981',
                                    animation: 'ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite'
                                }}></span>
                                <span style={{
                                    position: 'relative',
                                    width: '20px',
                                    height: '20px',
                                    borderRadius: '50%',
                                    backgroundColor: '#059669',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}></span>
                            </span>
                        )}
                    </button>
                </div>
                <MessageInputContainer
                    isChatProcessing={chatProcessing}
                    onChatProcessStart={handleSendChat}
                    onCallStart={handleCallStart}
                    onCallEnd={handleCallEnd}
                    isCallActive={isCallActive}
                    globalConfig={globalConfig}
                />
                <Menu
                    globalConfig={globalConfig}
                    openAiKey={openAiKey}
                    systemPrompt={systemPrompt}
                    chatLog={chatLog}
                    koeiroParam={koeiroParam}
                    assistantMessage={assistantMessage}
                    onChangeAiKey={setOpenAiKey}
                    onChangeBackgroundImageUrl={data =>
                        setBackgroundImageUrl(generateMediaUrl(data))
                    }
                    onChangeSystemPrompt={setSystemPrompt}
                    onChangeChatLog={handleChangeChatLog}
                    onChangeKoeiromapParam={setKoeiroParam}
                    onChangeGlobalConfig={onChangeGlobalConfig}
                    handleClickResetChatLog={() => setChatLog([])}
                    handleClickResetSystemPrompt={() => setSystemPrompt(SYSTEM_PROMPT)}
                />
                
                {/* Face Recognition Panel (Slide-in) */}
                {showFacePanel && (
                    <div className="fixed top-20 right-4 z-40 w-80 animate-slideIn">
                        <FaceRecognitionPanel
                            onExpressionUpdate={handleExpressionUpdate}
                            onInterventionTrigger={handleInterventionTrigger}
                        />
                        
                        {/* Quick Stats */}
                        {currentExpression && (
                            <div className="mt-3 bg-white rounded-lg shadow p-3 text-xs">
                                <div className="font-semibold text-gray-700 mb-2">📊 实时状态</div>
                                <div className="space-y-1 text-gray-600">
                                    <div className="flex justify-between">
                                        <span>表情:</span>
                                        <span className="font-medium">{expressionNames[currentExpression.expression] || currentExpression.expression}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>参与度:</span>
                                        <span className="font-medium">{(currentExpression.engagement_score * 100).toFixed(0)}%</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>学习状态:</span>
                                        <span className="font-medium">{currentExpression.learning_state.description}</span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}
                
                <GitHubLink/>
            </div>
        </div>
    )
}
