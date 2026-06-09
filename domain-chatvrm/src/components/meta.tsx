import { buildUrl } from "@/utils/buildUrl";
import Head from "next/head";
export const Meta = () => {
  const title = "灵山景区导览 - AI数字人导游";
  const description =
    "灵山景区AI数字人导览服务——通过多模态交互（语音、文本、表情），为游客提供实时智能问答、个性化路线讲解和沉浸式游览体验。基于大模型技术的智慧景区解决方案。";
  const imageUrl = buildUrl("/ogp.png");
  return (
    <Head>
      <title>{title}</title>
      <meta name="description" content={description} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={imageUrl} />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={imageUrl} />
    </Head>
  );
};
