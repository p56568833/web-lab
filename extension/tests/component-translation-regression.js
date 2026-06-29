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
assert.match(content, /"by":\s*"作者"/);
assert.match(content, /"average rating":\s*"平均评分"/);
assert.match(content, /function looksLikeName/);
assert.match(content, /contentType:\s*"short website interface label"/);
assert.match(content, /componentContext:\s*context/);
assert.match(content, /localBlocks/);
assert.match(content, /Core\.applyTranslations\(block\.records, block\.localTranslations\)/);
assert.match(options, /translateComponents:\s*true/);
assert.match(options, /translateComponents:\s*document\.querySelector\("#translateComponents"\)\.checked/);
assert.match(optionsHtml, /id="translateComponents" type="checkbox"/);

process.stdout.write("✓ default component translation, UI dictionary, and name safeguards are wired\n");
