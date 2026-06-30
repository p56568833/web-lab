"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const source = fs.readFileSync(path.join(root, "background.js"), "utf8");
const context = vm.createContext({
  console,
  chrome: {
    runtime: {
      onMessage: { addListener() {} }
    }
  }
});
vm.runInContext(
  `${source}
globalThis.__qualityTest = { normalizeTranslationPayload, inspectMeaningSignals };`,
  context
);

const { normalizeTranslationPayload, inspectMeaningSignals } = context.__qualityTest;
const blocks = [
  {
    blockId: "block_1",
    segments: [
      { id: "segment_1" },
      { id: "segment_2" }
    ]
  }
];

assert.deepEqual(
  JSON.parse(JSON.stringify(normalizeTranslationPayload({
    blocks: [{
      id: "block_1",
      translations: [
        { id: "segment_1", text: "完整" },
        { id: "segment_2", text: "译文" }
      ]
    }]
  }, blocks))),
  {
    translations: [
      { id: "segment_1", text: "完整" },
      { id: "segment_2", text: "译文" }
    ]
  }
);

const legacy = {
  translations: [
    { id: "segment_1", text: "旧格式" },
    { id: "segment_2", text: "仍兼容" }
  ]
};
assert.equal(normalizeTranslationPayload(legacy, blocks), legacy);
assert.throws(() => normalizeTranslationPayload({
  blocks: [{
    id: "block_1",
    translations: [{ id: "unknown", text: "错误" }]
  }]
}, blocks), /segment 翻译结构无效/);

assert.ok(inspectMeaningSignals(
  "The price may not rise by 20%.",
  "价格上涨了20%。"
).includes("missing-negation"));
assert.ok(inspectMeaningSignals(
  "The price may rise by 20%.",
  "价格上涨了20%。"
).includes("missing-weak-modality"));
assert.ok(inspectMeaningSignals(
  "The device weighs 12 kg.",
  "这台设备重12。"
).includes("missing-unit-or-currency"));
assert.deepEqual(
  Array.from(inspectMeaningSignals(
    "The price may not rise by 20%.",
    "价格可能不会上涨20%。"
  )),
  []
);

process.stdout.write("✓ grouped block output falls back safely and meaning-risk checks catch omissions\n");
