"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const content = fs.readFileSync(path.join(root, "content.js"), "utf8");
const options = fs.readFileSync(path.join(root, "options.js"), "utf8");
const optionsHtml = fs.readFileSync(path.join(root, "options.html"), "utf8");
const fixture = fs.readFileSync(path.join(root, "tests", "auxiliary-regions.html"), "utf8");
const editorialFixture = fs.readFileSync(path.join(root, "tests", "editorial-card-regression.html"), "utf8");

assert.match(content, /const FULL_PAGE_EXCLUDED/);
assert.match(content, /const FULL_PAGE_BLOCK_SELECTOR/);
assert.match(content, /document\.createTreeWalker\(document\.body, NodeFilter\.SHOW_TEXT/);
assert.match(content, /Core\.hasTranslatableEnglish/);
assert.match(content, /function isAdvertisementText/);
assert.match(content, /\[data-ad\].*\[data-advertisement\]/s);
const fullPageExcluded = content.match(/const FULL_PAGE_EXCLUDED = \[[\s\S]*?\]\.join\(","\);/)[0];
assert.doesNotMatch(fullPageExcluded, /"footer"/);
assert.doesNotMatch(fullPageExcluded, /"aside"/);
assert.match(content, /contentType: kind === "component"/);
assert.match(content, /"related":\s*"相关内容"/);
assert.match(content, /"ft":\s*"全场"/);
assert.match(content, /"venue":\s*"场地"/);
assert.doesNotMatch(content, /bbc\.com|c20ye67xgykt/);
assert.doesNotMatch(options, /translateNavigation/);
assert.doesNotMatch(optionsHtml, /id="translateNavigation"/);
assert.match(optionsHtml, /全部可见英文文字/);
assert.match(fixture, /aria-label="live match summary"/);
assert.match(fixture, /aria-label="Advertisement"/);
assert.match(editorialFixture, /<h2>RELATED<\/h2>/);
assert.match(editorialFixture, /<section>/);
assert.match(editorialFixture, /data-advertisement/);

process.stdout.write("✓ full-page visible-text scanning includes auxiliary regions and excludes ads\n");
