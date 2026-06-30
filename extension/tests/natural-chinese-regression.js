"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const background = fs.readFileSync(path.join(root, "background.js"), "utf8");
const content = fs.readFileSync(path.join(root, "content.js"), "utf8");

assert.match(background, /PROMPT_VERSION = "yipage-v9-background-context-refine"/);
assert.match(background, /自然、简洁的现代简体中文/);
assert.match(background, /导航和控件使用功能性中文/);
assert.match(background, /没有可靠译名的品牌、人名和产品名保留英文/);
assert.match(background, /每个 block 必须先作为一个完整段落重组为自然中文/);
assert.match(background, /普通相邻 segment 之间可以移动文字或留空/);
assert.match(background, /function normalizeTranslationPayload/);
assert.match(background, /Array\.isArray\(payload\.translations\)/);
assert.match(background, /Array\.isArray\(payload\.blocks\)/);
assert.match(background, /const LEGACY_SEGMENT_PROMPT/);
assert.match(background, /block 输出映射失败，回退到扁平 segment 格式/);
assert.match(background, /content:\s*LEGACY_SEGMENT_PROMPT/);
assert.match(background, /fullBlockText:\s*block\.fullBlockText/);
assert.doesNotMatch(background, /previousContext:\s*block\.previousContext/);
assert.doesNotMatch(background, /documentContextId:\s*context\.documentContextId/);
assert.match(background, /cacheKeysByBlockId/);
assert.match(background, /translations\.every\(Boolean\)/);
assert.doesNotMatch(background, /segment\.cacheKey\s*=/);
assert.match(content, /function payloadSegment/);
assert.match(content, /tagName:\s*record\.tagName/);
assert.match(content, /isLink:\s*record\.isLink/);
assert.match(content, /emphasis:\s*record\.emphasis/);
assert.match(content, /translationStyle:\s*"natural Chinese rewrite"/);

process.stdout.write("✓ natural Chinese reordering, DOM semantics, and reusable paragraph cache keys are wired\n");
