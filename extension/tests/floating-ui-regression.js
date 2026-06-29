"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const manifest = JSON.parse(fs.readFileSync(path.join(root, "manifest.json"), "utf8"));
const floating = fs.readFileSync(path.join(root, "floating-ui.js"), "utf8");
const relay = fs.readFileSync(path.join(root, "ui-relay.js"), "utf8");
const content = fs.readFileSync(path.join(root, "content.js"), "utf8");
const worker = fs.readFileSync(path.join(root, "service-worker.js"), "utf8");

assert.ok(manifest.content_scripts.some((entry) => entry.js.includes("floating-ui.js")));
assert.match(floating, /attachShadow\(\{ mode: "closed" \}\)/);
assert.match(floating, /data-yipage-ui|dataset\.yipageUi/);
assert.match(floating, /SHOW_ORIGINAL/);
assert.match(floating, /SHOW_TRANSLATION/);
assert.match(floating, /TRANSLATE_PAGE/);
assert.match(floating, /STOP_TRANSLATION/);
assert.match(floating, /aria-valuemax="100"/);
assert.match(floating, /completed \/ total \* 100/);
assert.match(floating, /pointerdown/);
assert.match(floating, /pointermove/);
assert.match(floating, /floatingUiPosition/);
assert.match(relay, /FLOATING_COMMAND/);
assert.match(worker, /updates\.maxCharacters = 12000/);
assert.match(content, /translateResiliently/);
assert.match(content, /batch\.length > 1/);
assert.match(content, /个段落失败/);

process.stdout.write("✓ draggable translation UI, 0–100% progress, and resilient retries are wired\n");
