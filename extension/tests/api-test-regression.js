"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const apiTest = fs.readFileSync(path.join(root, "api-test.js"), "utf8");
const options = fs.readFileSync(path.join(root, "options.js"), "utf8");
const popup = fs.readFileSync(path.join(root, "popup.js"), "utf8");
const worker = fs.readFileSync(path.join(root, "service-worker.js"), "utf8");

assert.match(worker, /importScripts\("background\.js", "api-test\.js", "ui-relay\.js"\)/);
assert.match(apiTest, /message\.type !== "TEST_API_CONNECTION"/);
assert.match(apiTest, /Authorization.*Bearer/);
assert.match(apiTest, /AbortSignal\.timeout/);
assert.match(options, /type:\s*"TEST_API_CONNECTION"/);
assert.match(popup, /Receiving end does not exist/);
assert.match(popup, /请刷新网页后再试/);

process.stdout.write("✓ API connection test UI and page-refresh guidance are wired\n");
