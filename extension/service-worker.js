"use strict";

importScripts("background.js", "api-test.js", "ui-relay.js");

chrome.runtime.onInstalled.addListener(async () => {
  const values = await chrome.storage.local.get({ model: "", maxCharacters: 6000 });
  const updates = {};
  if (!values.model || values.model === "deepseek-chat") updates.model = "deepseek-v4-pro";
  if (Number(values.maxCharacters) <= 6000) updates.maxCharacters = 12000;
  if (Object.keys(updates).length) await chrome.storage.local.set(updates);
});
