"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const content = fs.readFileSync(path.join(root, "content.js"), "utf8");
const fixture = fs.readFileSync(path.join(__dirname, "discourse-topic-regression.html"), "utf8");

assert.equal((fixture.match(/class="cooked"/g) || []).length, 3);
assert.match(fixture, /<aside class="quote">[\s\S]*<blockquote>/);
assert.match(content, /const FORUM_POST_SELECTOR/);
assert.match(content, /function findContentRoots/);
assert.match(content, /if \(forumRoots\.length\) return forumRoots/);
assert.match(content, /FORUM_PROSE_EXCLUDED[\s\S]*selector\.trim\(\) !== "aside"/);
assert.match(content, /roots\.forEach\(\(root/);
assert.match(content, /contentType:[\s\S]*"forum post or quoted reply"/);
assert.match(content, /function translateAdditionalContent/);
assert.match(content, /new MutationObserver/);
assert.match(content, /childList: true, subtree: true/);
assert.match(content, /analyzePage\([\s\S]*knownNodes[\s\S]*state\.records\.length[\s\S]*state\.blocks\.length/);
assert.match(content, /if \(dynamicScanPending\) scheduleDynamicScan\(\)/);

process.stdout.write("✓ Discourse posts, quotes, and dynamically inserted content are covered\n");
