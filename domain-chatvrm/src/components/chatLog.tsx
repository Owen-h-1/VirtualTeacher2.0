import { useEffect, useRef } from "react";
import { Message } from "@/features/messages/messages";
import { GlobalConfig } from "@/features/config/configApi";
type Props = {
  globalConfig: GlobalConfig;
  messages: Message[];
};
export const ChatLog = ({ messages, globalConfig }: Props) => {
  const chatScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatScrollRef.current?.scrollIntoView({
      behavior: "auto",
      block: "center",
    });
  }, []);

  useEffect(() => {
    chatScrollRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  }, [messages]);
  return (
    <div className="absolute w-col-span-6 max-w-full h-[100svh] pb-64">
      <div className="max-h-full px-16 pt-24 pb-64 overflow-y-auto scroll-hidden">
        {messages.map((msg, i) => {
          return (
            <div key={i} ref={messages.length - 1 === i ? chatScrollRef : null} className="my-20">
              <Chat role={msg.role} message={msg.content} user_name={msg.user_name} globalConfig={globalConfig} />
            </div>
          );
        })}
      </div>
    </div>
  );
};

const Chat = ({ role, message, user_name,globalConfig }: { role: string; message: string; user_name: string; globalConfig:GlobalConfig}) => {
  const roleColor =
    role === "assistant" ? "bg-secondary text-white " : "bg-base text-primary";
  const roleText = role === "assistant" ? "text-secondary" : "text-primary";
  const offsetX = role === "user" ? "pl-40" : "pr-40";

  return (
    <div className={`mx-auto max-w-sm my-20 ${offsetX}`}>
      <div
        className={`px-20 py-6 rounded-t-8 font-Montserrat font-bold tracking-wider text-sm ${roleColor}`}
      >
        {role === "assistant" ? globalConfig.characterConfig.character_name : user_name}
      </div>
      <div className="px-20 py-12 bg-white rounded-b-8">
        <div className={`typography-15 font-M_PLUS_2 ${roleText}`}>
          {message}
        </div>
      </div>
    </div>
  );
};
