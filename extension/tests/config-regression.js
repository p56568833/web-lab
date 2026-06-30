"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const background = fs.readFileSync(path.join(root, "background.js"), "utf8");
const options = fs.readFileSync(path.join(root, "options.js"), "utf8");

assert.match(background, /const DEFAULTS\s*=\s*\{[\s\S]*?apiKey:\s*""/);
assert.match(options, /chrome\.storage\.local\.set\(values\)/);
assert.match(options, /apiKey:\s*document\.querySelector\("#apiKey"\)\.value\.trim\(\)/);

process.stdout.write("✓ API Key is saved and included in background configuration reads\n");
