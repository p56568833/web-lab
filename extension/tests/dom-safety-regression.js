"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const content = fs.readFileSync(path.join(root, "content.js"), "utf8");
const core = fs.readFileSync(path.join(root, "content-core.js"), "utf8");
const floating = fs.readFileSync(path.join(root, "floating-ui.js"), "utf8");
const forumFixture = fs.readFileSync(path.join(root, "tests", "forum-form-regression.html"), "utf8");

assert.match(content, /function safeClosest/);
assert.match(content, /function safeMatches/);
assert.match(content, /function safeQueryAll/);
assert.match(content, /function safeRect/);
assert.match(content, /function safeInnerText/);
assert.match(content, /Core\.PROSE_EXCLUDED_SELECTOR/);
assert.match(core, /const PROSE_EXCLUDED_SELECTOR/);
assert.match(forumFixture, /<form[^>]*>[\s\S]*<article>/);
assert.match(forumFixture, /<textarea/);
assert.match(content, /nativeClosest\.call/);
assert.match(content, /nativeMatches\.call/);
assert.match(content, /catch\s*\{\s*return null;\s*\}/);
assert.match(content, /catch\s*\{\s*return \[\];\s*\}/);
assert.doesNotMatch(content, /\.filter\(isVisible\)/);
assert.doesNotMatch(content, /element\.closest\(/);
assert.doesNotMatch(content, /element\.matches\(/);
assert.doesNotMatch(content, /root\.querySelectorAll\(/);
assert.match(floating, /event\.target instanceof Element/);

process.stdout.write("✓ defensive DOM wrappers prevent one malformed node from aborting page analysis\n");
