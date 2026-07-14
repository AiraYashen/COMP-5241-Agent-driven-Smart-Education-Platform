export interface TTSResult {
  audioUrl: string;
}

export async function synthesizeSpeech(text: string): Promise<TTSResult> {
  const apiKey = process.env.DASHSCOPE_API_KEY;
  if (!apiKey) {
    throw new Error("DASHSCOPE_API_KEY 未配置");
  }

  const res = await fetch(
    "https://ws-1nmqq81i194rbunc.cn-beijing.maas.aliyuncs.com/api/v1/services/audio/tts/SpeechSynthesizer",
    {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "cosyvoice-v3-flash",
        input: {
          text,
          voice: "longanhuan",
          format: "mp3",
          sample_rate: 24000,
        },
        parameters: {
          volume: 50,
        },
      }),
    }
  );

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`TTS 合成失败: ${res.status} ${errText}`);
  }

  const responseData = await res.json();
  console.log('=== 阿里云TTS完整响应 ===');
  console.log(JSON.stringify(responseData, null, 2));

  const audioUrl = responseData.output?.audio?.url;
  if (!audioUrl) {
    throw new Error(`TTS 返回数据异常: ${JSON.stringify(responseData)}`);
  }

  // 返回代理 URL，避免前端跨域问题
  // return { audioUrl: `/api/audio-proxy?url=${encodeURIComponent(audioUrl)}` };
  return { audioUrl: `/api/audio-proxy?b64=${Buffer.from(audioUrl).toString("base64url")}` };
}