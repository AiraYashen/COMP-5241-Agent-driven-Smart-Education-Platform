export interface TTSResult {
  audioUrl: string;
}

export async function synthesizeSpeech(text: string): Promise<TTSResult> {
  const apiKey = process.env.DASHSCOPE_API_KEY;
  if (!apiKey) {
    throw new Error("DASHSCOPE_API_KEY 未配置");
  }

  // 使用百炼平台原生 TTS 接口（CosyVoice 模型专用）
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
          text: text,           // 待合成的文本
          voice: "longanhuan",  // 音色标识符
          format: "wav",        // 音频格式，可选 wav 或 mp3
          sample_rate: 24000,   // 采样率，可选 16000 或 24000
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

  // 1. 打印原始响应结构，确认数据格式
  const responseData = await res.json();
  console.log('=== 阿里云TTS完整响应 ===');
  console.log('响应结构:', JSON.stringify(responseData, null, 2));

  // 2. 检查 audio 字段是否存在
  const audioBase64 = responseData.output?.audio;
  console.log('audioBase64 是否存在:', !!audioBase64);
  console.log('audioBase64 类型:', typeof audioBase64);
  console.log('audioBase64 长度:', audioBase64?.length);

  if (!audioBase64) {
    // 如果音频数据不存在，抛出包含完整响应的错误
    throw new Error(`TTS 返回数据异常: ${JSON.stringify(responseData)}`);
  }

  // 根据请求的 format 字段设置正确的 MIME 类型
  const mimeType = "audio/wav"; // 如果 format 为 mp3，则改为 "audio/mpeg"
  const audioUrl = `data:${mimeType};base64,${audioBase64}`;
  console.log('生成的 audioUrl 长度:', audioUrl.length);

  return { audioUrl };
}