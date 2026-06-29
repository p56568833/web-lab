(() => {
  "use strict";

  const TEST_DEFAULTS = {
    apiKey: "",
    apiBaseUrl: "https://api.deepseek.com",
    model: "deepseek-v4-pro",
    timeoutMs: 45000
  };

  function chatEndpoint(baseUrl) {
    const clean = String(baseUrl || TEST_DEFAULTS.apiBaseUrl).replace(/\/+$/, "");
    return clean.endsWith("/chat/completions") ? clean : `${clean}/chat/completions`;
  }

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.type !== "TEST_API_CONNECTION") return;

    (async () => {
      const settings = await chrome.storage.local.get(TEST_DEFAULTS);
      if (!settings.apiKey?.trim()) throw new Error("请先填写并保存 API Key");
      if (!settings.model?.trim()) throw new Error("请填写模型名称");

      const startedAt = performance.now();
      const response = await fetch(chatEndpoint(settings.apiBaseUrl), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${settings.apiKey.trim()}`
        },
        body: JSON.stringify({
          model: settings.model.trim(),
          messages: [{ role: "user", content: "Reply with OK only." }],
          max_tokens: 8,
          temperature: 0
        }),
        signal: AbortSignal.timeout(Number(settings.timeoutMs) || TEST_DEFAULTS.timeoutMs)
      });

      if (!response.ok) {
        const detail = (await response.text()).slice(0, 500);
        throw new Error(`HTTP ${response.status}${detail ? `：${detail}` : ""}`);
      }

      const data = await response.json();
      if (!Array.isArray(data?.choices) || typeof data.choices[0]?.message?.content !== "string") {
        throw new Error("API 已响应，但返回格式不是兼容的 Chat Completions");
      }
      return {
        model: data.model || settings.model,
        latencyMs: Math.round(performance.now() - startedAt)
      };
    })()
      .then((result) => sendResponse({ ok: true, result }))
      .catch((error) => {
        const text = error.name === "TimeoutError" ? "连接超时，请检查网络或 Base URL" : error.message;
        sendResponse({ ok: false, error: text });
      });
    return true;
  });
})();
