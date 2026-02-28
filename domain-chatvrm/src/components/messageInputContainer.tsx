import { MessageInput } from "@/components/messageInput";
import { GlobalConfig } from "@/features/config/configApi";
import { useState, useEffect, useCallback } from "react";

type Props = {
  isChatProcessing: boolean;
  onChatProcessStart: (globalConfig: GlobalConfig,type: string, user_name: string, content: string) => void;
  onCallStart: (globalConfig: GlobalConfig) => void;
  onCallEnd: () => void;
  isCallActive: boolean;
  globalConfig: GlobalConfig;
};

export const MessageInputContainer = ({
  isChatProcessing,
  onChatProcessStart,
  onCallStart,
  onCallEnd,
  isCallActive,
  globalConfig,
}: Props) => {
  const [userMessage, setUserMessage] = useState("");
  const [speechRecognition, setSpeechRecognition] =
    useState<SpeechRecognition>();
  const [isMicRecording, setIsMicRecording] = useState(false);

  const handleRecognitionResult = useCallback(
    (event: SpeechRecognitionEvent) => {
      const text = event.results[0][0].transcript;
      setUserMessage(text);
      if (event.results[0].isFinal) {
        setUserMessage(text);
        onChatProcessStart(globalConfig,"","",text);
      }
    },
    [onChatProcessStart]
  );

  const handleRecognitionEnd = useCallback(() => {
    setIsMicRecording(false);
  }, []);

  const handleClickMicButton = useCallback(() => {
    if (isMicRecording) {
      speechRecognition?.abort();
      setIsMicRecording(false);

      return;
    }

    speechRecognition?.start();
    setIsMicRecording(true);
  }, [isMicRecording, speechRecognition]);

  const handleClickSendButton = useCallback(() => {
    onChatProcessStart(globalConfig,"","",userMessage);
  }, [onChatProcessStart, userMessage]);

  const handleClickCallButton = useCallback(() => {
    if (isCallActive) {
      onCallEnd();
    } else {
      onCallStart(globalConfig);
    }
  }, [isCallActive, onCallStart, onCallEnd, globalConfig]);

  useEffect(() => {
    const SpeechRecognition =
      window.webkitSpeechRecognition || window.SpeechRecognition;

    if (!SpeechRecognition) {
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = "zh-cn";
    recognition.interimResults = true;
    recognition.continuous = false;

    recognition.addEventListener("result", handleRecognitionResult);
    recognition.addEventListener("end", handleRecognitionEnd);

    setSpeechRecognition(recognition);
  }, [handleRecognitionResult, handleRecognitionEnd]);

  useEffect(() => {
    if (!isChatProcessing) {
      setUserMessage("");
    }
  }, [isChatProcessing]);

  return (
    <MessageInput
      userMessage={userMessage}
      isChatProcessing={isChatProcessing}
      isMicRecording={isMicRecording}
      isCallActive={isCallActive}
      onChangeUserMessage={(e) => setUserMessage(e.target.value)}
      onClickMicButton={handleClickMicButton}
      onClickSendButton={handleClickSendButton}
      onClickCallButton={handleClickCallButton}
    />
  );
};
