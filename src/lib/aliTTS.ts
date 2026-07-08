export interface TTSResult {
  audioUrl: string;
}

export async function synthesizeSpeech(text: string): Promise<TTSResult> {
  const apiKey = process.env.DASHSCOPE_API_KEY;
  if (!apiKey) {
    throw new Error("DASHSCOPE_API_KEY 未配置");
  }

  // 使用 OpenAI 兼容接口，与 OpenAI TTS API 格式完全一致
  const res = await fetch(
    "https://dashscope.aliyuncs.com/compatible-mode/v1/audio/speech",
    {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "cosyvoice-v2",
        input: text,
        voice: "longshuo",
      }),
    }
  );

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`TTS 合成失败: ${res.status} ${errText}`);
  }

  // 直接返回音频二进制流，转成 base64 data URL
  const arrayBuffer = await res.arrayBuffer();
  const base64 = Buffer.from(arrayBuffer).toString("base64");
  const audioUrl = `data:audio/mpeg;base64,${base64}`;
  return { audioUrl };
}