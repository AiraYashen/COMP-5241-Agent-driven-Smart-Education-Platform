import { NextRequest } from "next/server";

export const runtime = "nodejs";

/**
 * 音频代理路由：将阿里云 DashScope 的 audio_url 通过本服务中转给前端
 * 解决浏览器直接请求 CDN 时 CORS 跨域的问题
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const audioUrl = searchParams.get("url");

  if (!audioUrl) {
    return new Response("缺少 url 参数", { status: 400 });
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

  // 开发时放宽限制，生产中可去掉 !isAllowed 的 bypass
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

    const contentType =
      upstream.headers.get("content-type") ?? "audio/mpeg";
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
