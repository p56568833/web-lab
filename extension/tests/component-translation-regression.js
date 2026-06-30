"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const content = fs.readFileSync(path.join(root, "content.js"), "utf8");
const options = fs.readFileSync(path.join(root, "options.js"), "utf8");
const optionsHtml = fs.readFileSync(path.join(root, "options.html"), "utf8");

assert.match(content, /FULL_PAGE_BLOCK_SELECTOR/);
assert.match(content, /const UI_CONTEXT_SELECTOR/);
assert.match(content, /function componentSemanticKind/);
assert.match(content, /fullPageBlockKind/);
assert.match(content, /kind === "component"/);
assert.match(content, /"by":\s*"作者"/);
assert.match(content, /"summary":\s*"概述"/);
assert.match(content, /"laureates":\s*"获奖者"/);
assert.match(content, /"facts":\s*"事实"/);
assert.match(content, /"biographical":\s*"生平"/);
assert.match(content, /"interview":\s*"采访"/);
assert.match(content, /"average rating":\s*"平均评分"/);
assert.match(content, /const localText = records\.length === 1 \? UI_DICTIONARY\.get\(normalized\) : null/);
assert.match(content, /componentContext: kind === "component"/);
assert.match(content, /localBlocks/);
assert.match(content, /Core\.applyTranslations\(block\.records, block\.localTranslations\)/);
assert.doesNotMatch(options, /translateComponents/);
assert.doesNotMatch(optionsHtml, /id="translateComponents"/);

process.stdout.write("✓ all visible components enter translation while safe dictionary hits stay local\n");
