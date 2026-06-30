"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const content = fs.readFileSync(path.join(root, "content.js"), "utf8");
const fixture = fs.readFileSync(path.join(__dirname, "legacy-body-regression.html"), "utf8");

assert.doesNotMatch(fixture, /<(?:article|main|section|div)\b/i);
assert.match(fixture, /<body>[\s\S]*<h1>[\s\S]*<p>/i);
assert.match(content, /const legacyBody = document\.body/);
assert.match(content, /textDensity\(legacyBody\) >= 120/);
assert.match(content, /return \[legacyBody\]/);
assert.ok(
  content.indexOf("const legacyBody = document.body") > content.indexOf("const candidates ="),
  "legacy body fallback must run only after modern content roots"
);

process.stdout.write("✓ legacy body-only documents fall back to a translatable content root\n");
