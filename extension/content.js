(() => {
  "use strict";

  const Core = globalThis.YiPageCore;
  const DEFAULTS = {
    maxCharacters: 12000,
    concurrency: 2,
    translateComponents: true,
    translateNavigation: false
  };
  const COMPONENT_SELECTOR = `${Core.BLOCK_SELECTOR},span,div,a,time,label,button,[role='tab'],[role='status']`;
  const COMPONENT_HARD_EXCLUDED = [
    "script", "style", "noscript", "code", "pre", "kbd", "samp", "textarea",
    "input", "select", "option", "svg", "canvas", "math", "iframe", "video",
    "audio", "footer", "form", "[contenteditable]:not([contenteditable='false'])",
    "[aria-hidden='true']", "[data-yipage-ui]", "[data-ad]", "[data-advertisement]",
    "[aria-label*='advertisement' i]"
  ];
  const COMPONENT_EXCLUDED = [...COMPONENT_HARD_EXCLUDED, "nav"].join(",");
  const NAV_COMPONENT_EXCLUDED = COMPONENT_HARD_EXCLUDED.join(",");
  const nativeClosest = Element.prototype.closest;
  const nativeMatches = Element.prototype.matches;
  const nativeElementQueryAll = Element.prototype.querySelectorAll;
  const nativeDocumentQueryAll = Document.prototype.querySelectorAll;
  const UI_DICTIONARY = new Map(Object.entries({
    "by": "作者",
    "show": "展开",
    "hide": "收起",
    "home": "首页",
    "news": "新闻",
    "search": "搜索",
    "search bbc": "搜索 BBC",
    "more": "更多",
    "sport": "体育",
    "football": "足球",
    "world cup": "世界杯",
    "fifa world cup": "国际足联世界杯",
    "tables & schedule": "积分榜与赛程",
    "scores & fixtures": "比分与赛程",
    "knockouts as it stands": "淘汰赛形势",
    "teams": "球队",
    "team guides": "球队指南",
    "top scorers": "射手榜",
    "cricket": "板球",
    "formula 1": "一级方程式",
    "rugby u": "橄榄球",
    "tennis": "网球",
    "golf": "高尔夫",
    "cycling": "自行车",
    "athletics": "田径",
    "business": "商业",
    "technology": "科技",
    "health": "健康",
    "culture": "文化",
    "sign in": "登录",
    "live": "直播",
    "report": "战报",
    "scores": "比分",
    "tables": "积分榜",
    "line-ups": "阵容",
    "lineups": "阵容",
    "match stats": "比赛统计",
    "head-to-head": "交锋记录",
    "full time": "全场结束",
    "half time": "中场休息",
    "ft": "全场",
    "ht": "半场",
    "group stage": "小组赛",
    "key events": "关键事件",
    "assists": "助攻",
    "venue": "场地",
    "attendance": "观众人数",
    "average rating": "平均评分",
    "number": "号码",
    "published": "发布于",
    "goal": "进球",
    "penalty": "点球",
    "back to team tabs": "返回球队标签",
    "at a glance": "概览",
    "player of the match": "全场最佳球员",
    "related": "相关内容",
    "recommended": "推荐内容",
    "related topics": "相关主题",
    "more on this story": "相关报道"
  }));
  const state = {
    phase: "idle", completed: 0, total: 0, error: "", records: [], blocks: [],
    jobId: null, stopped: false, showing: "original"
  };
  const labels = {
    idle: "尚未翻译", analyzing: "正在分析正文", translating: "正在翻译",
    completed: "已完成", stopped: "已停止", failed: "翻译失败", empty: "未找到可翻译正文"
  };

  function publicState() {
    return {
      phase: state.phase, label: labels[state.phase] || state.phase,
      completed: state.completed, total: state.total, error: state.error, showing: state.showing
    };
  }

  function publish() {
    chrome.runtime.sendMessage({ type: "STATUS_UPDATE", status: publicState() }).catch(() => {});
  }

  function setPhase(phase, error = "") {
    state.phase = phase;
    state.error = error;
    publish();
  }

  function safeClosest(element, selector) {
    if (!(element instanceof Element) || typeof selector !== "string") return null;
    try {
      return nativeClosest.call(element, selector);
    } catch {
      return null;
    }
  }

  function safeMatches(element, selector) {
    if (!(element instanceof Element) || typeof selector !== "string") return false;
    try {
      return nativeMatches.call(element, selector);
    } catch {
      return false;
    }
  }

  function safeQueryAll(root, selector) {
    if (!root || typeof selector !== "string") return [];
    try {
      const method = root instanceof Document ? nativeDocumentQueryAll : nativeElementQueryAll;
      return Array.from(method.call(root, selector));
    } catch {
      return [];
    }
  }

  function safeRect(element) {
    try {
      return element.getBoundingClientRect();
    } catch {
      return { top: 0, bottom: 0, width: 0, height: 0 };
    }
  }

  function safeInnerText(element) {
    try {
      return typeof element?.innerText === "string" ? element.innerText : "";
    } catch {
      return "";
    }
  }

  function safeContains(container, node) {
    try {
      return container instanceof Element && node instanceof Node && container.contains(node);
    } catch {
      return false;
    }
  }

  function safeAttribute(element, name) {
    try {
      return element instanceof Element ? element.getAttribute(name) || "" : "";
    } catch {
      return "";
    }
  }

  function isVisible(element, excludedSelector = Core.EXCLUDED_SELECTOR) {
    if (!(element instanceof Element) || safeClosest(element, excludedSelector)) return false;
    try {
      const style = getComputedStyle(element);
      if (style.display === "none" || style.visibility === "hidden" || Number(style.opacity) === 0) return false;
      return element.getClientRects().length > 0;
    } catch {
      return false;
    }
  }

  function textDensity(element) {
    if (!isVisible(element, Core.PROSE_EXCLUDED_SELECTOR)) return 0;
    const text = safeInnerText(element);
    if (!Core.isEnglishProse(text)) return 0;
    const links = safeQueryAll(element, "a")
      .reduce((sum, link) => sum + safeInnerText(link).length, 0);
    return Math.max(0, text.length - links * 0.7);
  }

  function findContentRoot() {
    const preferred = safeQueryAll(document, "article, main")
      .filter((element) => isVisible(element, Core.PROSE_EXCLUDED_SELECTOR))
      .sort((a, b) => textDensity(b) - textDensity(a));
    if (preferred[0] && textDensity(preferred[0]) >= 80) return preferred[0];
    const candidates = safeQueryAll(document, "section, [role='main'], div")
      .filter((element) => !safeClosest(element, Core.PROSE_EXCLUDED_SELECTOR))
      .map((element) => ({ element, score: textDensity(element) }))
      .filter((item) => item.score >= 120).sort((a, b) => b.score - a.score);
    return candidates[0]?.element || null;
  }

  function collectTextNodes(blockElement, excludedSelector = Core.PROSE_EXCLUDED_SELECTOR) {
    const nodes = [];
    try {
      const walker = document.createTreeWalker(blockElement, NodeFilter.SHOW_TEXT, {
        acceptNode(node) {
          const parent = node.parentElement;
          if (!parent || !isVisible(parent, excludedSelector) || safeClosest(parent, excludedSelector)) {
            return NodeFilter.FILTER_REJECT;
          }
          return Core.splitWhitespace(node.nodeValue).content
            ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
        }
      });
      while (walker.nextNode()) nodes.push(walker.currentNode);
    } catch {
      return [];
    }
    return nodes;
  }

  function normalizeUiLabel(text) {
    return text.trim().toLowerCase().replace(/[：:]+$/, "").replace(/\s+/g, " ");
  }

  function looksLikeName(text) {
    const value = text.trim();
    if (/^[A-Z]\.\s*[A-ZÀ-ÖØ-Þ][\p{L}'’-]+$/u.test(value)) return true;
    if (/^[A-ZÀ-ÖØ-Þ][\p{L}'’-]+(?:\s+[A-ZÀ-ÖØ-Þ][\p{L}'’.-]+){1,3}$/u.test(value)) return true;
    if (/^[A-Z]{2,}(?:\s+[A-Z][\p{L}'’-]+)+$/u.test(value)) return true;
    return false;
  }

  function componentTranslation(text, element) {
    const value = text.replace(/\s+/g, " ").trim();
    const normalized = normalizeUiLabel(value);
    if (UI_DICTIONARY.has(normalized)) return { local: UI_DICTIONARY.get(normalized) };
    if (value.length < 4 || value.length > 120 || !/[A-Za-z]/.test(value)) return null;
    if (/^(?:https?:\/\/|www\.|[\w.+-]+@)/i.test(value)) return null;
    if (/^[\d\s.,:%'’()+/-]+$/.test(value) || looksLikeName(value)) return null;
    const words = value.match(/[A-Za-z][A-Za-z'’-]*/g) || [];
    if (words.length < 2) return null;
    let role = "";
    try {
      role = element.getAttribute("role") || "";
    } catch {
      return null;
    }
    const semanticControl = /^(tab|status|menuitem|option)$/.test(role) || safeMatches(element, "button,label");
    const hasLowercasePhrase = words.some((word) => /^[a-z]/.test(word));
    if (!semanticControl && value.length < 10) return null;
    if (!hasLowercasePhrase && words.length <= 3) return null;
    return { local: null };
  }

  function auxiliaryScore(element, primaryRoot) {
    if (!isVisible(element, COMPONENT_EXCLUDED)) return -1;
    if (safeContains(primaryRoot, element) || safeContains(element, primaryRoot)) return -1;
    const text = safeInnerText(element).replace(/\s+/g, " ").trim();
    if (text.length < 4 || text.length > 3000 || !/[A-Za-z]/.test(text)) return -1;
    const marker = [
      safeAttribute(element, "aria-label"),
      safeAttribute(element, "role"),
      safeAttribute(element, "id"),
      safeAttribute(element, "class"),
      text.slice(0, 180)
    ].join(" ");
    if (/\b(advert|advertisement|cookie|consent|newsletter|subscribe|promotion|sponsor)\b/i.test(marker)) {
      return -1;
    }

    const links = safeQueryAll(element, "a");
    const linkLength = links.reduce((sum, link) => sum + safeInnerText(link).length, 0);
    const headingCount = safeQueryAll(element, "h1,h2,h3,h4").length;
    const paragraphCount = safeQueryAll(element, "p,li").length;
    const looksEditorial = headingCount >= 2 || (headingCount >= 1 && paragraphCount >= 1);
    const label = safeAttribute(element, "aria-label");
    const role = safeAttribute(element, "role");
    let score = 0;
    if (role === "complementary") score += 35;
    if (safeMatches(element, "aside")) score += 20;
    if (safeMatches(element, "header") && !safeQueryAll(element, "nav").length) score += 12;
    if (/(live|match|score|summary|event|result|detail|header)/i.test(label)) score += 45;
    if (headingCount) score += 12;
    if (looksEditorial) score += 15;
    if (headingCount >= 2 && links.length >= 2) score += 10;
    if (safeQueryAll(element, "time").length) score += 6;
    if (text.length >= 30 && text.length <= 1800) score += 10;
    if (linkLength / Math.max(1, text.length) > 0.72 && score < 40 && !looksEditorial) return -1;

    const rect = safeRect(element);
    const primaryRect = safeRect(primaryRoot);
    if (rect.bottom <= primaryRect.top + 240 || Math.abs(rect.top - primaryRect.top) < innerHeight) score += 8;
    return score;
  }

  function findAuxiliaryRoots(primaryRoot) {
    const candidates = safeQueryAll(document, "aside,[role='complementary'],header,section")
      .map((element) => ({ element, score: auxiliaryScore(element, primaryRoot) }))
      .filter((item) => item.score >= 30)
      .sort((a, b) => b.score - a.score);
    const selected = [];
    for (const candidate of candidates) {
      if (selected.some((existing) =>
        safeContains(existing, candidate.element) || safeContains(candidate.element, existing)
      )) continue;
      selected.push(candidate.element);
      if (selected.length >= 4) break;
    }
    return selected;
  }

  function createRecord(node, id) {
    const parent = node.parentElement;
    const emphasisElement = safeClosest(parent, "strong,b,em,i,mark");
    return {
      id, node, originalValue: node.nodeValue, translatedValue: null,
      tagName: parent?.tagName?.toLowerCase() || "",
      role: safeAttribute(parent, "role"),
      isLink: Boolean(safeClosest(parent, "a[href]")),
      emphasis: emphasisElement?.tagName?.toLowerCase() || "",
      ...Core.splitWhitespace(node.nodeValue)
    };
  }

  function payloadSegment(record) {
    return {
      id: record.id,
      text: record.content,
      tagName: record.tagName,
      role: record.role,
      isLink: record.isLink,
      emphasis: record.emphasis
    };
  }

  function analyzePage(settings) {
    const root = findContentRoot();
    if (!root) return [];
    const elements = safeQueryAll(root, Core.BLOCK_SELECTOR);
    if (safeMatches(root, Core.BLOCK_SELECTOR)) elements.unshift(root);
    const claimed = new WeakSet();
    const blocks = [];
    let segmentNumber = 0;

    elements.forEach((element, blockIndex) => {
      try {
        const nodes = collectTextNodes(element).filter((node) => {
          if (claimed.has(node)) return false;
          return safeClosest(node.parentElement, Core.BLOCK_SELECTOR) === element;
        });
        const fullText = nodes.map((node) => node.nodeValue).join("").replace(/\s+/g, " ").trim();
        if (!Core.isEnglishProse(fullText)) return;
        const records = nodes.map((node) => {
          claimed.add(node);
          segmentNumber += 1;
          return createRecord(node, `segment_${segmentNumber}`);
        }).filter((record) => record.content);
        if (!records.length) return;
        const rect = safeRect(element);
        blocks.push({
          id: `block_${blocks.length + 1}`, element, records, order: blockIndex, kind: "prose",
          viewportDistance: rect.bottom < 0 ? Math.abs(rect.bottom) : rect.top > innerHeight ? rect.top - innerHeight : 0,
          payload: {
            blockId: `block_${blocks.length + 1}`, fullBlockText: fullText, contentType: "article prose",
            translationStyle: "natural Chinese rewrite",
            segments: records.map(payloadSegment)
          }
        });
      } catch {
        return;
      }
    });

    function scanComponentScope(scope, orderOffset, excludedSelector) {
      const componentElements = safeQueryAll(scope, COMPONENT_SELECTOR);
      if (safeMatches(scope, COMPONENT_SELECTOR)) componentElements.unshift(scope);
      componentElements.forEach((element, componentIndex) => {
        try {
          if (!isVisible(element, excludedSelector)) return;
          const nodes = Array.from(element.childNodes || []).filter((node) =>
            node.nodeType === 3 && !claimed.has(node) && Core.splitWhitespace(node.nodeValue).content
          );
          for (const node of nodes) {
            const decision = componentTranslation(node.nodeValue, element);
            if (!decision) continue;
            claimed.add(node);
            segmentNumber += 1;
            const record = createRecord(node, `segment_${segmentNumber}`);
            const rect = safeRect(element);
            const context = (safeInnerText(element.parentElement) || safeInnerText(element) || record.content)
              .replace(/\s+/g, " ").trim().slice(0, 300);
            blocks.push({
              id: `block_${blocks.length + 1}`, element, records: [record],
              order: orderOffset + componentIndex, kind: "component",
              localTranslations: decision.local ? [{ id: record.id, text: decision.local }] : null,
              viewportDistance: rect.bottom < 0 ? Math.abs(rect.bottom) : rect.top > innerHeight ? rect.top - innerHeight : 0,
              payload: {
                blockId: `block_${blocks.length + 1}`, fullBlockText: record.content,
                contentType: "short website interface label", componentContext: context,
                translationStyle: "natural Chinese interface wording",
                segments: [payloadSegment(record)]
              }
            });
          }
        } catch {
          return;
        }
      });
    }

    function scanAuxiliaryProseScope(scope, orderOffset) {
      const proseElements = safeQueryAll(scope, Core.BLOCK_SELECTOR);
      if (safeMatches(scope, Core.BLOCK_SELECTOR)) proseElements.unshift(scope);
      proseElements.forEach((element, proseIndex) => {
        try {
          const nodes = collectTextNodes(element, COMPONENT_EXCLUDED).filter((node) => {
            if (claimed.has(node)) return false;
            return safeClosest(node.parentElement, Core.BLOCK_SELECTOR) === element;
          });
          const fullText = nodes.map((node) => node.nodeValue).join("").replace(/\s+/g, " ").trim();
          if (!Core.isEnglishProse(fullText)) return;
          const records = nodes.map((node) => {
            claimed.add(node);
            segmentNumber += 1;
            return createRecord(node, `segment_${segmentNumber}`);
          }).filter((record) => record.content);
          if (!records.length) return;
          const rect = safeRect(element);
          blocks.push({
            id: `block_${blocks.length + 1}`, element, records,
            order: orderOffset + proseIndex, kind: "auxiliary-prose",
            viewportDistance: rect.bottom < 0 ? Math.abs(rect.bottom) : rect.top > innerHeight ? rect.top - innerHeight : 0,
            payload: {
              blockId: `block_${blocks.length + 1}`, fullBlockText: fullText,
              contentType: "related or supplementary page content",
              translationStyle: "natural Chinese rewrite",
              segments: records.map(payloadSegment)
            }
          });
        } catch {
          return;
        }
      });
    }

    if (settings.translateComponents !== false) {
      scanComponentScope(root, elements.length, COMPONENT_EXCLUDED);
      const auxiliaryRoots = findAuxiliaryRoots(root);
      auxiliaryRoots.forEach((auxiliaryRoot, index) => {
        const orderOffset = elements.length + 10000 + index * 1000;
        scanAuxiliaryProseScope(auxiliaryRoot, orderOffset);
        scanComponentScope(auxiliaryRoot, orderOffset + 500, COMPONENT_EXCLUDED);
      });
    }

    if (settings.translateNavigation === true) {
      const navigationRoots = safeQueryAll(document, "nav").filter((element) =>
        isVisible(element, NAV_COMPONENT_EXCLUDED)
      );
      navigationRoots.slice(0, 6).forEach((navigationRoot, index) => {
        scanComponentScope(navigationRoot, elements.length + 20000 + index * 1000, NAV_COMPONENT_EXCLUDED);
      });
    }

    const ordered = blocks.sort((a, b) => a.order - b.order);
    const contextText = ordered.map((block) => block.payload.fullBlockText);
    ordered.forEach((block, index) => {
      block.payload.previousContext = block.payload.componentContext || contextText[index - 1]?.slice(-500) || "";
      block.payload.nextContext = contextText[index + 1]?.slice(0, 500) || "";
    });
    return blocks.sort((a, b) => a.viewportDistance - b.viewportDistance || a.order - b.order);
  }

  async function translateBatch(batch) {
    const response = await chrome.runtime.sendMessage({
      type: "TRANSLATE_BATCH", jobId: state.jobId, pageTitle: document.title,
      pageDomain: location.hostname, blocks: batch.map((block) => block.payload)
    });
    if (!response?.ok) throw new Error(response?.error || "翻译请求失败");
    const records = batch.flatMap((block) => block.records);
    Core.validateTranslations(response.data, records.map((record) => record.id));
    Core.applyTranslations(records, response.data.translations);
  }

  async function translateResiliently(batch) {
    if (state.stopped) return { successes: 0, errors: [] };
    try {
      await translateBatch(batch);
      state.completed += batch.length;
      publish();
      return { successes: batch.length, errors: [] };
    } catch (error) {
      if (state.stopped) return { successes: 0, errors: [] };
      if (batch.length > 1) {
        const middle = Math.ceil(batch.length / 2);
        const left = await translateResiliently(batch.slice(0, middle));
        const right = await translateResiliently(batch.slice(middle));
        return { successes: left.successes + right.successes, errors: [...left.errors, ...right.errors] };
      }
      state.completed += 1;
      publish();
      return { successes: 0, errors: [`${batch[0]?.id || "段落"}：${error.message}`] };
    }
  }

  async function runPool(batches, concurrency) {
    let cursor = 0;
    let successes = 0;
    const errors = [];
    async function worker() {
      while (!state.stopped) {
        const index = cursor++;
        if (index >= batches.length) return;
        const result = await translateResiliently(batches[index]);
        successes += result.successes;
        errors.push(...result.errors);
      }
    }
    await Promise.all(Array.from({ length: Math.min(concurrency, batches.length) }, () => worker()));
    return { errors, successes };
  }

  async function startTranslation() {
    if (state.phase === "analyzing" || state.phase === "translating") return publicState();
    if (state.records.some((record) => typeof record.translatedValue === "string")) {
      Core.restoreRecords(state.records, "translated");
      state.showing = "translated";
      publish();
      return publicState();
    }
    state.stopped = false;
    state.completed = 0;
    state.total = 0;
    state.error = "";
    state.records = [];
    state.blocks = [];
    state.jobId = crypto.randomUUID();
    setPhase("analyzing");
    await new Promise((resolve) => setTimeout(resolve, 0));

    const settings = await chrome.storage.local.get(DEFAULTS);
    const blocks = analyzePage(settings);
    if (!blocks.length) {
      setPhase("empty");
      return publicState();
    }
    state.blocks = blocks;
    state.records = blocks.flatMap((block) => block.records);
    state.total = blocks.length;
    state.showing = "translated";

    const localBlocks = blocks.filter((block) => block.localTranslations);
    for (const block of localBlocks) {
      Core.applyTranslations(block.records, block.localTranslations);
      state.completed += 1;
    }
    publish();

    const remoteBlocks = blocks.filter((block) => !block.localTranslations);
    const batches = Core.createBatches(remoteBlocks, settings.maxCharacters);
    setPhase("translating");
    const result = batches.length
      ? await runPool(batches, Math.max(1, Math.min(5, Number(settings.concurrency) || 2)))
      : { errors: [], successes: 0 };
    result.successes += localBlocks.length;

    if (state.stopped) setPhase("stopped");
    else if (result.errors.length && result.successes === 0) setPhase("failed", result.errors[0]);
    else if (result.errors.length) {
      const details = [...new Set(result.errors)].slice(0, 2).join("；");
      setPhase("completed", `${result.errors.length} 个段落失败：${details}`);
    } else setPhase("completed");
    return publicState();
  }

  async function stopTranslation() {
    state.stopped = true;
    if (state.jobId) {
      await chrome.runtime.sendMessage({ type: "CANCEL_JOB", jobId: state.jobId }).catch(() => {});
    }
    setPhase("stopped");
    return publicState();
  }

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.type === "GET_STATUS") sendResponse({ ok: true, status: publicState() });
    else if (message.type === "TRANSLATE_PAGE") {
      startTranslation().then((status) => sendResponse({ ok: true, status }))
        .catch((error) => {
          setPhase("failed", error.message);
          sendResponse({ ok: false, error: error.message, status: publicState() });
        });
      return true;
    } else if (message.type === "STOP_TRANSLATION") {
      stopTranslation().then((status) => sendResponse({ ok: true, status }));
      return true;
    } else if (message.type === "SHOW_ORIGINAL") {
      Core.restoreRecords(state.records, "original");
      state.showing = "original";
      publish();
      sendResponse({ ok: true, status: publicState() });
    } else if (message.type === "SHOW_TRANSLATION") {
      Core.restoreRecords(state.records, "translated");
      state.showing = "translated";
      publish();
      sendResponse({ ok: true, status: publicState() });
    }
  });
})();
