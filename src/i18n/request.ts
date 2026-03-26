import { getRequestConfig } from "next-intl/server";

export default getRequestConfig(async () => {
  const locale = "zh";

  return {
    locale,
    messages: (await import("../messages/zh.json")).default,
  };
});
