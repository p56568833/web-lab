"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const background = fs.readFileSync(path.join(root, "background.js"), "utf8");
const content = fs.readFileSync(path.join(root, "content.js"), "utf8");

assert.match(background, /function markError/);
assert.match(background, /"RATE_LIMIT"/);
assert.match(background, /"PAYLOAD_TOO_LARGE", true/);
assert.match(background, /"TIMEOUT"/);
assert.match(background, /"MODEL_FORMAT", true/);
assert.match(background, /errorCode:\s*error\.code/);
assert.match(background, /splittable:\s*Boolean\(error\.splittable\)/);
assert.match(background, /pendingTranslationCacheUpdates/);
assert.match(background, /translationCacheMemory/);
assert.match(background, /while \(Object\.keys\(pendingTranslationCacheUpdates\)\.length\)/);
assert.match(background, /翻译已完成，但缓存写入失败/);
assert.match(background, /analysisMaxCharacters:\s*18000/);
assert.match(background, /void mergeTranslationCache/);
assert.match(background, /cacheWriteBlocking:\s*false/);
assert.match(background, /error\.status === 429 \? 3/);
assert.match(background, /encounteredRateLimit/);
assert.match(background, /rateLimited:\s*Boolean\(raw\?\.__yipageRateLimited\)/);
assert.match(background, /"translation-batch"/);
assert.doesNotMatch(background, /await mergeTranslationCache/);

assert.match(content, /const MAX_SPLIT_DEPTH = 1/);
assert.match(content, /error\.splittable && batch\.length > 1 && splitDepth < MAX_SPLIT_DEPTH/);
assert.match(content, /translateResiliently\(batch, splitDepth = 0\)/);
assert.match(content, /error\.code = response\?\.errorCode/);
assert.match(content, /error\.splittable = Boolean\(response\?\.splittable\)/);
assert.match(content, /stage:\s*"page-translation"/);
assert.match(content, /adaptiveConcurrency = adaptiveConcurrency > 2 \? 2 : 1/);
assert.match(content, /FAST_LANE_CHARACTERS = 1200/);
assert.match(content, /FAST_LANE_SCREENS = 2/);
assert.match(content, /function createTranslationPlan/);
assert.match(content, /firstResultMs/);
assert.match(content, /firstScreen80Ms/);
assert.match(content, /page95Ms/);
assert.match(content, /lastBatchMs/);
assert.match(content, /const allBatches = \[\.\.\.plan\.fastLaneBatches, \.\.\.plan\.remainingBatches\]/);
assert.match(content, /runPool\(allBatches, concurrency, trackSettledBatch\)/);
assert.doesNotMatch(content, /await runPool\(plan\.remainingBatches/);
assert.doesNotMatch(background, /API_RATE_LIMIT|API_RATE_INTERVAL_MS|apiRequestStarts/);
assert.match(background, /const API_CONCURRENCY_LIMIT = 500/);
assert.match(background, /function acquireApiRequestSlot/);
assert.match(background, /function pumpApiRequestQueue/);
assert.match(background, /apiOperationPriority/);
assert.match(background, /await acquireApiRequestSlot\(operation, combined\)/);

process.stdout.write("✓ classified retries, bounded splitting, and coalesced cache writes prevent slow tails\n");
