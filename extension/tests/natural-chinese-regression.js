"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const background = fs.readFileSync(path.join(root, "background.js"), "utf8");
const content = fs.readFileSync(path.join(root, "content.js"), "utf8");

assert.match(background, /PROMPT_VERSION = "yipage-v2-natural-zh"/);
assert.match(background, /中文语序必须符合现代简体中文习惯/);
assert.match(background, /不要照搬英文的主从句顺序/);
assert.match(background, /先在内部完成整段中文表达/);
assert.match(background, /相邻的非链接 segment 之间重新分配/);
assert.match(background, /fullBlockText:\s*block\.fullBlockText/);
assert.match(background, /previousContext:\s*block\.previousContext/);
assert.match(background, /cacheKeysById/);
assert.doesNotMatch(background, /segment\.cacheKey\s*=/);
assert.match(content, /function payloadSegment/);
assert.match(content, /tagName:\s*record\.tagName/);
assert.match(content, /isLink:\s*record\.isLink/);
assert.match(content, /emphasis:\s*record\.emphasis/);
assert.match(content, /translationStyle:\s*"natural Chinese rewrite"/);

process.stdout.write("✓ natural Chinese reordering, DOM semantics, and context-aware cache versioning are wired\n");
