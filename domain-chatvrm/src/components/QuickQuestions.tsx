import React from "react";

type QuickQuestion = {
  icon: string;
  label: string;
  question: string;
};

type Props = {
  onQuestionClick: (question: string) => void;
  disabled?: boolean;
};

const QUESTIONS: QuickQuestion[] = [
  { icon: "📖", label: "景区历史", question: "请介绍一下这个景区的历史背景和文化底蕴" },
  { icon: "🗺️", label: "游览路线", question: "推荐一条适合我的游览路线吧" },
  { icon: "📸", label: "拍照打卡", question: "景区有哪些最佳拍照打卡点？" },
  { icon: "🏛️", label: "景点讲解", question: "这里最值得看的景点有哪些？" },
  { icon: "🍜", label: "特色美食", question: "景区附近有什么特色美食推荐？" },
  { icon: "🌿", label: "自然风光", question: "景区有哪些自然风光值得一看？" },
];

export const QuickQuestions = ({ onQuestionClick, disabled }: Props) => {
  return (
    <div className="absolute bottom-[200px] left-0 right-0 z-10">
      <div style={{
        display: "flex",
        justifyContent: "center",
        gap: "8px",
        flexWrap: "wrap",
        padding: "0 16px",
      }}>
        {QUESTIONS.map((q, i) => (
          <button
            key={i}
            onClick={() => onQuestionClick(q.question)}
            disabled={disabled}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "4px",
              padding: "8px 14px",
              borderRadius: "20px",
              border: "1px solid rgba(255,255,255,0.25)",
              background: "rgba(255,255,255,0.15)",
              backdropFilter: "blur(8px)",
              color: "#fff",
              fontSize: "13px",
              fontWeight: 500,
              cursor: disabled ? "not-allowed" : "pointer",
              opacity: disabled ? 0.5 : 1,
              transition: "all 0.2s ease",
              textShadow: "0 1px 2px rgba(0,0,0,0.3)",
              whiteSpace: "nowrap",
            }}
            onMouseEnter={(e) => {
              if (!disabled) {
                e.currentTarget.style.background = "rgba(255,255,255,0.25)";
                e.currentTarget.style.borderColor = "rgba(255,255,255,0.5)";
                e.currentTarget.style.transform = "translateY(-1px)";
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(255,255,255,0.15)";
              e.currentTarget.style.borderColor = "rgba(255,255,255,0.25)";
              e.currentTarget.style.transform = "translateY(0)";
            }}
          >
            <span style={{ fontSize: "14px" }}>{q.icon}</span>
            <span>{q.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};
