"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const background = fs.readFileSync(path.join(root, "background.js"), "utf8");
const content = fs.readFileSync(path.join(root, "content.js"), "utf8");

assert.match(background, /const DOCUMENT_ANALYSIS_PROMPT/);
assert.match(background, /ANALYSIS_PROMPT_VERSION/);
assert.match(background, /sectionBriefs/);
assert.match(background, /referenceMap/);
assert.match(background, /speakerMap/);
assert.match(background, /preserveList/);
assert.match(background, /styleProfile/);
assert.match(background, /async function analyzeDocument/);
assert.match(background, /validateDocumentContext/);
assert.match(background, /documentAnalysisCache/);
assert.match(background, /message\.type === "ANALYZE_DOCUMENT"/);
assert.match(background, /function selectDocumentContext/);
assert.match(background, /documentContext,/);
assert.match(background, /chrome\.storage\.local\.remove\(\["translationCache", "documentAnalysisCache"\]\)/);

assert.match(content, /analyzing:\s*"正在理解全文"/);
assert.match(content, /async function analyzeDocument\(blocks\)/);
assert.match(content, /type:\s*"ANALYZE_DOCUMENT"/);
assert.match(content, /documentContext:\s*state\.documentContext/);
assert.match(content, /documentContextId:\s*state\.documentContextId/);
assert.match(content, /sectionPath/);
assert.match(content, /function compareDocumentOrder/);
assert.match(content, /function assignNeighborContexts/);
assert.match(content, /function createTranslationBatches/);
assert.match(content, /assignNeighborContexts\(state\.blocks\)/);
assert.doesNotMatch(content, /CONTEXT_ANALYSIS_DELAY/);
assert.match(content, /const resultPromise = allBatches\.length/);
assert.match(content, /runPool\(allBatches, concurrency, trackSettledBatch\)/);
assert.match(content, /const analysisPromise = analyzeDocument\(blocks\)/);
assert.match(content, /await analysisPromise/);
assert.ok(
  content.indexOf("const resultPromise") < content.indexOf("const analysisPromise"),
  "all translation batches must start before background document analysis"
);
assert.ok(
  content.indexOf("const result = await resultPromise")
    < content.lastIndexOf("scheduleBackgroundRefinement("),
  "the page must finish initial translation before background refinement is scheduled"
);
assert.match(content, /scheduleBackgroundRefinement/);
assert.match(content, /BACKGROUND_REFINEMENT_DELAY = 1500/);

process.stdout.write("✓ all translation batches start immediately while context analysis refines in background\n");
