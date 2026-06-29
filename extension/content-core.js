(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.YiPageCore = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const BLOCK_SELECTOR = "h1,h2,h3,h4,h5,h6,p,li,blockquote,figcaption,td,th,dt,dd";
  const HARD_EXCLUDED_SELECTORS = [
    "script", "style", "noscript", "code", "pre", "kbd", "samp", "textarea",
    "input", "select", "option", "svg", "canvas", "math", "iframe", "video",
    "audio", "button", "nav", "footer", "aside",
    "[contenteditable]:not([contenteditable='false'])", "[aria-hidden='true']", "[data-yipage-ui]"
  ];
  const PROSE_EXCLUDED_SELECTOR = HARD_EXCLUDED_SELECTORS.join(",");
  const EXCLUDED_SELECTOR = [...HARD_EXCLUDED_SELECTORS, "form"].join(",");

  function splitWhitespace(value) {
    const text = String(value ?? "");
    const leadingWhitespace = (text.match(/^\s*/) || [""])[0];
    const trailingWhitespace = (text.match(/\s*$/) || [""])[0];
    return {
      leadingWhitespace,
      content: text.slice(leadingWhitespace.length, text.length - trailingWhitespace.length),
      trailingWhitespace
    };
  }

  function isLikelyNonProse(text) {
    const value = text.trim();
    if (!value) return true;
    if (/^(?:https?:\/\/|www\.)\S+$/i.test(value)) return true;
    if (/^[\w.+-]+@[\w.-]+\.[a-z]{2,}$/i.test(value)) return true;
    if (/^(?:[a-z]:\\|\/)[^\s]+$/i.test(value)) return true;
    if (/^[.#]?[a-z][\w-]*(?:\s+[.#]?[a-z][\w-]*)*$/i.test(value) && value.length < 18) {
      return !/\s(?:is|are|was|the|a|an|to|of|in)\s/i.test(` ${value} `);
    }
    if (/^[A-Z]{1,5}[-_]?\d{2,}[A-Z0-9-]*$/.test(value)) return true;
    return false;
  }

  function isEnglishProse(text) {
    const value = text.replace(/\s+/g, " ").trim();
    if (value.length < 8 || isLikelyNonProse(value)) return false;
    const letters = value.match(/[A-Za-z]/g) || [];
    const meaningful = value.match(/[\p{L}\p{N}]/gu) || [];
    return letters.length >= 4 && meaningful.length > 0 && letters.length / meaningful.length >= 0.45;
  }

  function validateTranslations(payload, expectedIds) {
    if (!payload || !Array.isArray(payload.translations)) {
      throw new Error("API 返回内容缺少 translations 数组");
    }
    if (payload.translations.length !== expectedIds.length) {
      throw new Error("API 返回的 segment 数量不匹配");
    }
    const expected = new Set(expectedIds);
    const seen = new Set();
    for (let index = 0; index < payload.translations.length; index += 1) {
      const item = payload.translations[index];
      if (!item || typeof item.id !== "string" || typeof item.text !== "string") {
        throw new Error("API 返回的 segment 格式无效");
      }
      if (!expected.has(item.id)) throw new Error(`API 返回了未知 ID: ${item.id}`);
      if (seen.has(item.id)) throw new Error(`API 返回了重复 ID: ${item.id}`);
      if (item.id !== expectedIds[index]) throw new Error("API 返回的 segment 顺序不匹配");
      seen.add(item.id);
    }
    if (seen.size !== expected.size) throw new Error("API 返回内容不完整");
    return payload.translations;
  }

  function applyTranslations(records, translations) {
    const byId = new Map(translations.map((item) => [item.id, item.text]));
    let applied = 0;
    for (const record of records) {
      if (!byId.has(record.id)) continue;
      const node = record.node;
      if (!node || node.isConnected === false || node.nodeValue !== record.originalValue) continue;
      record.translatedValue = record.leadingWhitespace + byId.get(record.id) + record.trailingWhitespace;
      node.nodeValue = record.translatedValue;
      applied += 1;
    }
    return applied;
  }

  function restoreRecords(records, mode) {
    for (const record of records) {
      if (!record.node || record.node.isConnected === false) continue;
      const value = mode === "translated" ? record.translatedValue : record.originalValue;
      if (typeof value === "string") record.node.nodeValue = value;
    }
  }

  function createBatches(blocks, maxCharacters) {
    const limit = Math.max(1000, Number(maxCharacters) || 6000);
    const batches = [];
    let current = [];
    let size = 0;
    for (const block of blocks) {
      const blockSize = JSON.stringify(block.payload).length;
      if (current.length && size + blockSize > limit) {
        batches.push(current);
        current = [];
        size = 0;
      }
      current.push(block);
      size += blockSize;
      if (size >= limit) {
        batches.push(current);
        current = [];
        size = 0;
      }
    }
    if (current.length) batches.push(current);
    return batches;
  }

  return {
    BLOCK_SELECTOR, EXCLUDED_SELECTOR, PROSE_EXCLUDED_SELECTOR, splitWhitespace, isLikelyNonProse,
    isEnglishProse, validateTranslations, applyTranslations, restoreRecords, createBatches
  };
});
