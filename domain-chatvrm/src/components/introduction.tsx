import { useState, useCallback } from "react";
import { Link } from "./link";

type Props = {
  openAiKey: string;
  onChangeAiKey: (openAiKey: string) => void;
};
export const Introduction = ({ openAiKey, onChangeAiKey }: Props) => {
  const [opened, setOpened] = useState(false);

  const handleAiKeyChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      onChangeAiKey(event.target.value);
    },
    [onChangeAiKey]
  );

  return opened ? (
    <div className="absolute z-40 w-full h-full px-24 py-40  bg-black/30 font-M_PLUS_2">
      <div className="mx-auto my-auto max-w-3xl max-h-full p-24 overflow-auto bg-white rounded-16">
        <div className="my-24">
          <div className="my-8 font-bold typography-20 text-secondary ">
            关于灵山景区AI数字人导游
          </div>
          <div>
            本系统是为&quot;中国软件杯&quot;A5赛题——景区导览服务AI数字人而开发的智能导览平台。
            您可以通过语音或文本与3D数字人导游进行实时对话，了解景区历史文化、景点特色，
            获取个性化游览路线推荐。系统支持多模态交互，数字人导游能以逼真的表情、口型
            同步和语音为您提供沉浸式导览体验。
          </div>
        </div>
        <div className="my-24">
          <div className="my-8 font-bold typography-20 text-secondary">
            核心功能
          </div>
          <div>
            <p>（1）多模态交互：支持语音输入和文本输入，数字人以语音、表情和口型同步进行回答</p>
            <p>（2）智能问答：准确回答关于景区历史、文化、景点特色等问题</p>
            <p>（3）个性化推荐：根据游客兴趣偏好推荐不同的游览路线和讲解重点</p>
            <p>（4）知识库驱动：基于本地景区知识库，确保回答准确可靠</p>
          </div>
        </div>
        <div className="my-24">
          <div className="my-8 font-bold typography-20 text-secondary">
            技术介绍
          </div>
          <div>
            <p>（1）3D数字人渲染：
            <Link
              url={"https://github.com/pixiv/three-vrm"}
              label={"@pixiv/three-vrm"}
            /></p>
            <p>（2）对话生成：基于多模态大模型
            <Link
              url={"https://openai.com/blog/introducing-chatgpt-and-whisper-apis"}
              label={"大模型API"}
            /></p>
            <p>（3）语音合成：
            <Link url={"http://koeiromap.rinna.jp/"} label={"Koeiro API"} />
            及<br/>Edge TTS、Bert-VITS2方案</p>
          </div>
        </div>

        <div className="my-24">
          <div className="my-8 font-bold typography-20 text-secondary">
            注意事项
          </div>
          <div>
            请不要故意引导差异性、暴力言论或贬低特定人物。此外更换角色模型时，请遵循模型的使用条款。
          </div>
        </div>
        <div className="my-24">
          <div className="my-8 font-bold typography-20 text-secondary">
            API密钥配置
          </div>
          <input
            type="text"
            placeholder="sk-..."
            value={openAiKey}
            onChange={handleAiKeyChange}
            className="my-4 px-16 py-8 w-full h-40 bg-surface3 hover:bg-surface3-hover rounded-4 text-ellipsis"
          ></input>
        </div>
        <div className="my-24">
          <button
            onClick={() => {
              setOpened(false);
            }}
            className="font-bold bg-secondary hover:bg-secondary-hover active:bg-secondary-press disabled:bg-secondary-disabled text-white px-24 py-8 rounded-oval"
          >
            开始导览体验
          </button>
        </div>
      </div>
    </div>
  ) : null;
};
