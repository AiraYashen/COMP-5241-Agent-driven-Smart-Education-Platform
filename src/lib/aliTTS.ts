export interface TTSResult {
  audioUrl: string;
}

/**
 * 调用阿里云 DashScope CosyVoice TTS 合成语音
 * 文档: https://help.aliyun.com/zh/dashscope/developer-reference/cosyvoice-api
 */
export async function synthesizeSpeech(text: string): Promise<TTSResult> {
  const apiKey = process.env.DASHSCOPE_API_KEY;
  if (!apiKey) {
    throw new Error("DASHSCOPE_API_KEY 未配置");
  }

  // 请求任务提交
  const submitRes = await fetch(
    "https://dashscope.aliyuncs.com/api/v1/services/aigc/text2audiogeneration/generation",
    {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "X-DashScope-Async": "enable",
      },
      body: JSON.stringify({
        model: "cosyvoice-v2",
        input: { text },
        parameters: {
          voice: "longshuo",
          format: "mp3",
          sample_rate: 24000,
          volume: 70,
          rate: 1.0,
          pitch: 1.0,
        },
      }),
    }
  );

  if (!submitRes.ok) {
    const errText = await submitRes.text();
    throw new Error(`TTS 提交失败: ${submitRes.status} ${errText}`);
  }

  const submitData = await submitRes.json();

  // 如果直接返回了音频URL（同步模式）
  if (submitData?.output?.audio_url) {
    return { audioUrl: submitData.output.audio_url };
  }

  // 异步任务轮询
  const taskId = submitData?.output?.task_id;
  if (!taskId) {
    throw new Error(`TTS 任务提交无效: ${JSON.stringify(submitData)}`);
  }

  // 轮询任务状态（最多等 30 秒）
  for (let i = 0; i < 30; i++) {
    await new Promise((r) => setTimeout(r, 1000));

    const pollRes = await fetch(
      `https://dashscope.aliyuncs.com/api/v1/tasks/${taskId}`,
      {
        headers: { "Authorization": `Bearer ${apiKey}` },
      }
    );

    if (!pollRes.ok) continue;

    const pollData = await pollRes.json();
    const status = pollData?.output?.task_status;

    if (status === "SUCCEEDED") {
      const audioUrl = pollData?.output?.audio_url;
      if (!audioUrl) throw new Error("TTS 成功但无音频URL");
      return { audioUrl };
    }

    if (status === "FAILED") {
      throw new Error(`TTS 任务失败: ${JSON.stringify(pollData)}`);
    }
  }

  throw new Error("TTS 任务超时（30秒）");
}
