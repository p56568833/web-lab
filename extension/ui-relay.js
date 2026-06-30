(() => {
  "use strict";

  const allowedCommands = new Set([
    "GET_STATUS",
    "TRANSLATE_PAGE",
    "STOP_TRANSLATION",
    "SHOW_ORIGINAL",
    "SHOW_TRANSLATION"
  ]);

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type !== "FLOATING_COMMAND" || !allowedCommands.has(message.command)) return;
    if (!sender.tab?.id) {
      sendResponse({ ok: false, error: "无法确定当前标签页" });
      return;
    }
    chrome.tabs.sendMessage(sender.tab.id, { type: message.command })
      .then(sendResponse)
      .catch((error) => sendResponse({ ok: false, error: error.message }));
    return true;
  });
})();
