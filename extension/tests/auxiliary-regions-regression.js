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

assert.match(content, /function auxiliaryScore/);
assert.match(content, /function findAuxiliaryRoots/);
assert.match(content, /aside,\[role='complementary'\],header,section/);
assert.match(content, /\[data-ad\].*\[data-advertisement\]/s);
assert.match(content, /advertisement\|cookie\|consent\|newsletter\|subscribe/);
assert.doesNotMatch(content, /subscribe\|recommended\|related/);
assert.match(content, /const looksEditorial = headingCount >= 2/);
assert.match(content, /function scanAuxiliaryProseScope/);
assert.match(content, /collectTextNodes\(element, COMPONENT_EXCLUDED\)/);
assert.match(content, /contentType: "related or supplementary page content"/);
assert.match(content, /"related":\s*"相关内容"/);
assert.match(content, /selected\.length >= 4/);
assert.match(content, /translateNavigation:\s*false/);
assert.match(content, /NAV_COMPONENT_EXCLUDED/);
assert.match(content, /"ft":\s*"全场"/);
assert.match(content, /"venue":\s*"场地"/);
assert.doesNotMatch(content, /bbc\.com|c20ye67xgykt/);
assert.match(options, /translateNavigation:\s*false/);
assert.match(optionsHtml, /id="translateNavigation" type="checkbox"/);
assert.match(fixture, /aria-label="live match summary"/);
assert.match(fixture, /aria-label="Advertisement"/);
assert.match(editorialFixture, /<h2>RELATED<\/h2>/);
assert.match(editorialFixture, /<section>/);
assert.match(editorialFixture, /data-advertisement/);

process.stdout.write("✓ generic auxiliary-region scoring and optional navigation translation are wired\n");
