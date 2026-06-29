"use strict";

const DEFAULTS = {
  apiKey: "",
  apiBaseUrl: "https://api.deepseek.com",
  model: "deepseek-v4-pro",
  maxCharacters: 12000,
  concurrency: 2,
  translateComponents: true,
  translateNavigation: false
};
const fields = Object.keys(DEFAULTS);
const message = document.querySelector("#message");
const testButton = document.querySelector("#testApi");
const testResult = document.querySelector("#testResult");
const testTitle = document.querySelector("#testTitle");
const testDetail = document.querySelector("#testDetail");

function readForm() {
  return {
    apiKey: document.querySelector("#apiKey").value.trim(),
    apiBaseUrl: document.querySelector("#apiBaseUrl").value.trim().replace(/\/+$/, ""),
    model: document.querySelector("#model").value.trim(),
    maxCharacters: Number(document.querySelector("#maxCharacters").value),
    concurrency: Number(document.querySelector("#concurrency").value),
    translateComponents: document.querySelector("#translateComponents").checked,
    translateNavigation: document.querySelector("#translateNavigation").checked
  };
}

async function save() {
  const values = readForm();
  if (!values.apiKey) throw new Error("请填写 API Key");
  await chrome.storage.local.set(values);
  return values;
}

async function load() {
  const values = await chrome.storage.local.get(DEFAULTS);
  fields.forEach((field) => {
    const input = document.querySelector(`#${field}`);
    if (input.type === "checkbox") input.checked = Boolean(values[field]);
    else input.value = values[field];
  });
}

function showTest(stateName, title, detail) {
  testResult.hidden = false;
  testResult.className = `test-result ${stateName}`;
  testTitle.textContent = title;
  testDetail.textContent = detail;
}

document.querySelector("#settingsForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    await save();
    message.textContent = "已保存";
  } catch (error) {
    message.textContent = error.message;
  }
  setTimeout(() => { message.textContent = ""; }, 1800);
});

testButton.addEventListener("click", async () => {
  testButton.disabled = true;
  testButton.textContent = "正在测试…";
  showTest("testing", "正在连接 API", "正在验证地址、密钥和模型，请稍候。");
  try {
    const values = await save();
    const response = await chrome.runtime.sendMessage({ type: "TEST_API_CONNECTION" });
    if (!response?.ok) throw new Error(response?.error || "未知连接错误");
    showTest("success", "API 连接成功", `${response.result.model || values.model} · ${response.result.latencyMs} ms`);
  } catch (error) {
    showTest("failure", "API 连接失败", error.message);
  } finally {
    testButton.disabled = false;
    testButton.textContent = "测试 API 连接";
  }
});

document.querySelector("#clearCache").addEventListener("click", async () => {
  const response = await chrome.runtime.sendMessage({ type: "CLEAR_CACHE" });
  message.textContent = response?.ok ? "缓存已清空" : "清空失败";
});

load();
