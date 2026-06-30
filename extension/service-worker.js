"use strict";

importScripts("background.js", "api-test.js", "ui-relay.js");

chrome.runtime.onInstalled.addListener(async () => {
  const values = await chrome.storage.local.get({
    model: "",
    maxCharacters: 6000,
    concurrency: 2
  });
  const updates = {};
  if (!values.model || values.model === "deepseek-chat") updates.model = "deepseek-v4-pro";
  if (Number(values.maxCharacters) !== 1200) {
    updates.maxCharacters = 1200;
  }
  if (Number(values.concurrency) !== 500) updates.concurrency = 500;
  if (Object.keys(updates).length) await chrome.storage.local.set(updates);
});
