"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const content = fs.readFileSync(path.join(root, "content.js"), "utf8");
const options = fs.readFileSync(path.join(root, "options.js"), "utf8");
const optionsHtml = fs.readFileSync(path.join(root, "options.html"), "utf8");

assert.match(content, /translateComponents:\s*true/);
assert.doesNotMatch(content, /\.filter\(isVisible\)/);
assert.match(content, /\.filter\(\(element\) => isVisible\(element, Core\.PROSE_EXCLUDED_SELECTOR\)\)/);
assert.match(content, /const COMPONENT_SELECTOR/);
assert.match(content, /const UI_CONTEXT_SELECTOR/);
assert.match(content, /function componentSemanticKind/);
assert.match(content, /navigation or menu label/);
assert.match(content, /interactive interface control/);
assert.match(content, /semanticKind === "navigation"/);
assert.match(content, /"by":\s*"作者"/);
assert.match(content, /"summary":\s*"概述"/);
assert.match(content, /"laureates":\s*"获奖者"/);
assert.match(content, /"facts":\s*"事实"/);
assert.match(content, /"biographical":\s*"生平"/);
assert.match(content, /"interview":\s*"采访"/);
assert.match(content, /words\.length < 2 && !semanticControl/);
assert.match(content, /"average rating":\s*"平均评分"/);
assert.match(content, /function looksLikeName/);
assert.match(content, /contentType:\s*decision\.contentType \|\| "short website interface label"/);
assert.match(content, /componentContext:\s*`\$\{decision\.semanticKind \|\| "dictionary"\}: \$\{context\}`/);
assert.match(content, /localBlocks/);
assert.match(content, /Core\.applyTranslations\(block\.records, block\.localTranslations\)/);
assert.match(options, /translateComponents:\s*true/);
assert.match(options, /translateComponents:\s*document\.querySelector\("#translateComponents"\)\.checked/);
assert.match(optionsHtml, /id="translateComponents" type="checkbox"/);

process.stdout.write("✓ default component translation, UI dictionary, and name safeguards are wired\n");
