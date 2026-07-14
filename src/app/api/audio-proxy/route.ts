import { NextRequest } from "next/server";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const b64 = searchParams.get("b64");

  if (!b64) {
    return new Response("缺少 b64 参数", { status: 400 });
  }

  let audioUrl: string;
  try {
    audioUrl = Buffer.from(b64, "base64url").toString("utf-8");
  } catch {
    return new Response("b64 参数无效", { status: 400 });
  }

  // 只允许代理阿里云域名，防止被滥用
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(audioUrl);
  } catch {
    return new Response("url 格式无效", { status: 400 });
  }

  const allowedHosts = [
    "dashscope.aliyuncs.com",
    "dashscope-result.oss-cn-beijing.aliyuncs.com",
    "dashscope-result-bj.oss-cn-beijing.aliyuncs.com",
  ];

  const isAllowed = allowedHosts.some(
    (h) => parsedUrl.hostname === h || parsedUrl.hostname.endsWith("." + h)
  );

  if (!isAllowed) {
    console.warn(`音频代理: 非允许域名 ${parsedUrl.hostname}，仍尝试代理`);
  }

  try {
    const upstream = await fetch(audioUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; AI-Teacher/1.0)",
      },
    });

    if (!upstream.ok) {
      return new Response(`上游音频获取失败: ${upstream.status}`, {
        status: 502,
      });
    }

    const contentType = upstream.headers.get("content-type") ?? "audio/mpeg";
    const body = upstream.body;

    return new Response(body, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=3600",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (err) {
    console.error("音频代理失败:", err);
    return new Response("音频代理内部错误", { status: 500 });
  }
}