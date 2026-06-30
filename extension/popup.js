"use strict";

const els = {
  status: document.querySelector("#status"),
  progress: document.querySelector("#progress"),
  progressBar: document.querySelector("#progressBar"),
  statusDot: document.querySelector("#statusDot"),
  error: document.querySelector("#error"),
  translate: document.querySelector("#translate"),
  stop: document.querySelector("#stop"),
  original: document.querySelector("#original"),
  translated: document.querySelector("#translated")
};

async function activeTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

function render(status = {}) {
  const busy = status.phase === "analyzing" || status.phase === "translating";
  els.status.textContent = status.label || "尚未翻译";
  els.progress.textContent = `${status.completed || 0} / ${status.total || 0}`;
  els.progressBar.style.width = status.total ? `${Math.min(100, status.completed / status.total * 100)}%` : "0%";
  els.statusDot.classList.toggle("active", busy);
  els.translate.disabled = busy;
  els.stop.disabled = !busy;
  els.error.hidden = !status.error;
  els.error.textContent = status.error || "";
}

function friendlyError(error) {
  const text = error?.message || String(error);
  if (text.includes("Receiving end does not exist") || text.includes("Could not establish connection")) {
    return "扩展已更新，但当前网页仍在使用旧页面状态。请刷新网页后再试。";
  }
  return text;
}

async function send(type) {
  try {
    const tab = await activeTab();
    if (!tab?.id || !/^https?:|^file:/.test(tab.url || "")) {
      throw new Error("当前页面不允许扩展运行");
    }
    const response = await chrome.tabs.sendMessage(tab.id, { type });
    if (!response?.ok) throw new Error(response?.error || "操作失败");
    render(response.status);
  } catch (error) {
    render({ phase: "failed", label: "无法连接当前网页", error: friendlyError(error) });
  }
}

els.translate.addEventListener("click", () => send("TRANSLATE_PAGE"));
els.stop.addEventListener("click", () => send("STOP_TRANSLATION"));
els.original.addEventListener("click", () => send("SHOW_ORIGINAL"));
els.translated.addEventListener("click", () => send("SHOW_TRANSLATION"));
document.querySelector("#settings").addEventListener("click", () => chrome.runtime.openOptionsPage());
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === "STATUS_UPDATE") render(message.status);
});
send("GET_STATUS");
