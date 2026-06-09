import React from "react";

type Props = {
  scenicName?: string;
  guideName?: string;
};

export const ScenicHeader = ({
  scenicName = "灵山景区",
  guideName = "小灵"
}: Props) => {
  return (
    <div className="absolute top-0 left-0 right-0 z-20">
      <div
        style={{
          background: "linear-gradient(180deg, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.2) 60%, transparent 100%)",
          padding: "12px 20px 24px 20px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{
            width: "36px",
            height: "36px",
            borderRadius: "10px",
            background: "linear-gradient(135deg, rgba(255,255,255,0.3) 0%, rgba(255,255,255,0.1) 100%)",
            backdropFilter: "blur(10px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "18px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
          }}>
            🏔️
          </div>

          <div>
            <div style={{
              fontSize: "18px",
              fontWeight: 700,
              color: "#fff",
              lineHeight: "1.2",
              textShadow: "0 2px 6px rgba(0,0,0,0.4)",
            }}>
              {scenicName}
            </div>
            <div style={{
              fontSize: "12px",
              color: "rgba(255,255,255,0.8)",
              fontWeight: 400,
              textShadow: "0 1px 3px rgba(0,0,0,0.3)",
              display: "flex",
              alignItems: "center",
              gap: "5px",
            }}>
              <span style={{
                display: "inline-block",
                width: "5px",
                height: "5px",
                borderRadius: "50%",
                background: "#4ade80",
                boxShadow: "0 0 4px #4ade80",
              }}></span>
              智能导游 · {guideName} 为您服务
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
