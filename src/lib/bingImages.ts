export interface ImageResult {
  thumbnailUrl: string;
  contentUrl: string;
  name: string;
}

/**
 * 使用 Pixabay API 搜索配图（目前未被主流程调用，保留备用）
 */
export async function searchImages(keywords: string[]): Promise<ImageResult[]> {
  const apiKey = process.env.PIXABAY_API_KEY;
  if (!apiKey) {
    console.warn("PIXABAY_API_KEY 未配置，跳过图片搜索");
    return [];
  }

  const query = keywords.join(" ");
  const params = new URLSearchParams({
    key: apiKey,
    q: query,
    image_type: "photo",
    per_page: "4",
    safesearch: "true",
    lang: "en",
  });

  const res = await fetch(
    `https://pixabay.com/api/?${params.toString()}`
  );

  if (!res.ok) {
    console.error(`Pixabay 图片搜索失败: ${res.status}`);
    return [];
  }

  const data = await res.json();
  const items = (data?.hits ?? []) as Array<{
    tags: string;
    webformatURL: string;
    largeImageURL: string;
  }>;

  return items.slice(0, 3).map((item) => ({
    thumbnailUrl: item.webformatURL,
    contentUrl: item.largeImageURL,
    name: item.tags,
  }));
}
