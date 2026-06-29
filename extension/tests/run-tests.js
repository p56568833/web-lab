"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const Core = require("../content-core.js");
const root = path.resolve(__dirname, "..");

function test(name, fn) {
  try {
    fn();
    process.stdout.write(`✓ ${name}\n`);
  } catch (error) {
    process.stderr.write(`✗ ${name}\n${error.stack}\n`);
    process.exitCode = 1;
  }
}

test("preserves leading and trailing whitespace", () => {
  assert.deepEqual(Core.splitWhitespace(" \n performs better. \t"), {
    leadingWhitespace: " \n ",
    content: "performs better.",
    trailingWhitespace: " \t"
  });
});

test("rejects URLs, email addresses, paths and product codes", () => {
  ["https://example.com/a", "hello@example.com", "/usr/local/bin", "AB-1200"].forEach((value) => {
    assert.equal(Core.isLikelyNonProse(value), true, value);
  });
});

test("accepts English prose and rejects short labels", () => {
  assert.equal(Core.isEnglishProse("The model preserves the original document structure."), true);
  assert.equal(Core.isEnglishProse("Home"), false);
});

test("validates exact segment IDs and count", () => {
  const valid = { translations: [{ id: "a", text: "甲" }, { id: "b", text: "乙" }] };
  assert.equal(Core.validateTranslations(valid, ["a", "b"]).length, 2);
  assert.throws(() => Core.validateTranslations({ translations: [{ id: "a", text: "甲" }] }, ["a", "b"]));
  assert.throws(() => Core.validateTranslations({ translations: [{ id: "x", text: "甲" }, valid.translations[1]] }, ["a", "b"]));
});

test("maps translations to original node objects and restores exact values", () => {
  const parent = { tagName: "P", children: [{ tagName: "STRONG" }] };
  const first = { nodeValue: "The new ", isConnected: true, parent };
  const second = { nodeValue: " AI model ", isConnected: true, parent: parent.children[0] };
  const records = [
    { id: "a", node: first, originalValue: first.nodeValue, leadingWhitespace: "", trailingWhitespace: " ", translatedValue: null },
    { id: "b", node: second, originalValue: second.nodeValue, leadingWhitespace: " ", trailingWhitespace: " ", translatedValue: null }
  ];
  assert.equal(Core.applyTranslations(records, [{ id: "a", text: "新的" }, { id: "b", text: "AI 模型" }]), 2);
  assert.equal(first.nodeValue, "新的 ");
  assert.equal(second.nodeValue, " AI 模型 ");
  assert.equal(records[1].node.parent.tagName, "STRONG");
  Core.restoreRecords(records, "original");
  assert.equal(first.nodeValue, "The new ");
  assert.equal(second.nodeValue, " AI model ");
  Core.restoreRecords(records, "translated");
  assert.equal(second.nodeValue, " AI 模型 ");
});

test("skips detached or concurrently changed text nodes", () => {
  const detached = { nodeValue: "Original", isConnected: false };
  const changed = { nodeValue: "Website changed this", isConnected: true };
  const records = [
    { id: "a", node: detached, originalValue: "Original", leadingWhitespace: "", trailingWhitespace: "" },
    { id: "b", node: changed, originalValue: "Original", leadingWhitespace: "", trailingWhitespace: "" }
  ];
  assert.equal(Core.applyTranslations(records, [{ id: "a", text: "译文" }, { id: "b", text: "译文" }]), 0);
});

test("content pipeline never assigns innerHTML", () => {
  for (const file of ["content.js", "content-core.js"]) {
    const source = fs.readFileSync(path.join(root, file), "utf8");
    assert.equal(/\.innerHTML\s*=/.test(source), false, file);
  }
});

test("excluded selector covers required unsafe regions", () => {
  ["script", "code", "pre", "nav", "footer", "aside", "form", "iframe", "button", "contenteditable", "aria-hidden"].forEach((token) => {
    assert.ok(Core.EXCLUDED_SELECTOR.includes(token), token);
  });
});

test("prose can be discovered inside page-level forms while controls remain excluded", () => {
  assert.doesNotMatch(Core.PROSE_EXCLUDED_SELECTOR, /(^|,)form(,|$)/);
  assert.match(Core.EXCLUDED_SELECTOR, /(^|,)form(,|$)/);
  ["textarea", "input", "select", "button"].forEach((token) => {
    assert.ok(Core.PROSE_EXCLUDED_SELECTOR.includes(token), token);
  });
});

test("manifest is MV3 and loads core before content script", () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(root, "manifest.json"), "utf8"));
  assert.equal(manifest.manifest_version, 3);
  assert.deepEqual(manifest.content_scripts[0].js, ["content-core.js", "content.js"]);
});

if (!process.exitCode) process.stdout.write("\nAll automated checks passed.\n");
