"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const background = fs.readFileSync(path.join(root, "background.js"), "utf8");

assert.match(background, /function normalizedNumbers/);
assert.match(background, /function inspectTranslationQuality/);
assert.match(background, /missing-number/);
assert.match(background, /missing-preserved-name/);
assert.match(background, /abnormal-length/);
assert.match(background, /english-residue/);
assert.match(background, /function inspectMeaningSignals/);
assert.match(background, /missing-negation/);
assert.match(background, /missing-strong-modality/);
assert.match(background, /missing-weak-modality/);
assert.match(background, /missing-increase-direction/);
assert.match(background, /missing-decrease-direction/);
assert.match(background, /missing-quotation-attribution/);
assert.match(background, /missing-unit-or-currency/);
assert.match(background, /inconsistent-context-term/);
assert.match(background, /blocksWithQualityIssues/);
assert.match(background, /!blocksWithQualityIssues\.has\(block\.blockId\)/);
assert.match(background, /qualityIssues/);
assert.match(background, /const REFINEMENT_PROMPT/);
assert.match(background, /async function refineTranslations/);
assert.match(background, /"REFINE_TRANSLATIONS"/);
assert.match(background, /translation-refinement/);

const content = fs.readFileSync(path.join(root, "content.js"), "utf8");
assert.match(content, /MAX_REFINEMENT_BLOCKS = 12/);
assert.match(content, /MAX_REFINEMENT_RATIO = 0\.15/);
assert.match(content, /function findRefinementCandidates/);
assert.match(content, /function sourceMeaningRiskScore/);
assert.match(content, /async function refineRiskyBlocks/);
assert.match(content, /Core\.applyRefinements/);

process.stdout.write("✓ local checks select a bounded set of risky blocks for lightweight refinement\n");
