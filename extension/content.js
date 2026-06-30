(() => {
  "use strict";

  const Core = globalThis.YiPageCore;
  const DEFAULTS = {
    maxCharacters: 1200,
    concurrency: 500
  };
  const MAX_REFINEMENT_BLOCKS = 12;
  const MAX_REFINEMENT_RATIO = 0.15;
  const FAST_LANE_CHARACTERS = 1200;
  const FAST_LANE_SCREENS = 2;
  const BACKGROUND_REFINEMENT_DELAY = 1500;
  const COMPONENT_SELECTOR = `${Core.BLOCK_SELECTOR},span,div,a,time,label,button,[role='tab'],[role='status']`;
  const UI_CONTEXT_SELECTOR = [
    "nav", "[role='navigation']", "[role='menu']", "[role='menubar']", "[role='tablist']",
    "[aria-label*='navigation' i]", "[aria-label*='menu' i]", "[aria-label*='tabs' i]"
  ].join(",");
  const FORUM_POST_SELECTOR = [
    ".topic-post .cooked", "article[id^='post_'] .cooked", "article[data-post-id] .cooked",
    "[data-post-id] .cooked", "[role='article'] .cooked"
  ].join(",");
  const FORUM_CONTAINER_SELECTOR = "article[id^='post_'],article[data-post-id],[data-post-id],.topic-post";
  const FORUM_PROSE_EXCLUDED = Core.PROSE_EXCLUDED_SELECTOR
    .split(",").filter((selector) => selector.trim() !== "aside").join(",");
  const DYNAMIC_SCAN_DELAY = 700;
  const MAX_SPLIT_DEPTH = 1;
  const COMPONENT_HARD_EXCLUDED = [
    "script", "style", "noscript", "code", "pre", "kbd", "samp", "textarea",
    "input", "select", "option", "svg", "canvas", "math", "iframe", "video",
    "audio", "footer", "form", "[contenteditable]:not([contenteditable='false'])",
    "[aria-hidden='true']", "[data-yipage-ui]", "[data-ad]", "[data-advertisement]",
    "[aria-label*='advertisement' i]"
  ];
  const COMPONENT_EXCLUDED = [...COMPONENT_HARD_EXCLUDED, "nav"].join(",");
  const NAV_COMPONENT_EXCLUDED = COMPONENT_HARD_EXCLUDED.join(",");
  const FULL_PAGE_EXCLUDED = [
    "script", "style", "noscript", "code", "pre", "kbd", "samp", "textarea",
    "input", "select", "option", "svg", "canvas", "math", "iframe", "video",
    "audio", "[contenteditable]:not([contenteditable='false'])", "[aria-hidden='true']",
    "[data-yipage-ui]", "[data-ad]", "[data-advertisement]",
    "[aria-label*='advertisement' i]", "[aria-label*='sponsored' i]"
  ].join(",");
  const FULL_PAGE_BLOCK_SELECTOR = [
    Core.BLOCK_SELECTOR, "button", "label", "a", "time", "[role='tab']",
    "[role='status']", "[role='menuitem']", "[role='button']"
  ].join(",");
  const nativeClosest = Element.prototype.closest;
  const nativeMatches = Element.prototype.matches;
  const nativeElementQueryAll = Element.prototype.querySelectorAll;
  const nativeDocumentQueryAll = Document.prototype.querySelectorAll;
  const UI_DICTIONARY = new Map(Object.entries({
    "by": "作者",
    "about": "关于",
    "biographical": "生平",
    "careers": "招聘",
    "chemistry": "化学",
    "contact": "联系我们",
    "educational": "教育",
    "explore": "探索",
    "facts": "事实",
    "show": "展开",
    "hide": "收起",
    "home": "首页",
    "interview": "采访",
    "laureates": "获奖者",
    "literature": "文学",
    "medicine": "生理学或医学",
    "news": "新闻",
    "overview": "概览",
    "peace": "和平",
    "physics": "物理学",
    "press": "新闻中心",
    "profile": "简介",
    "publications": "出版物",
    "resources": "资源",
    "search": "搜索",
    "search bbc": "搜索 BBC",
    "stories": "故事",
    "summary": "概述",
    "video": "视频",
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
    jobId: null, stopped: false, showing: "original",
    documentContext: null, documentContextId: ""
  };
  let dynamicScanTimer = null;
  let dynamicScanPending = false;
  const labels = {
    idle: "尚未翻译", analyzing: "正在理解全文", translating: "正在翻译",
    refining: "正在快速精校", completed: "已完成", stopped: "已停止",
    failed: "翻译失败", empty: "未找到可翻译正文"
  };

  function publicState() {
    return {
      phase: state.phase, label: labels[state.phase] || state.phase,
      completed: state.completed, total: state.total, error: state.error, showing: state.showing,
      hasTranslation: state.records.some((record) => typeof record.translatedValue === "string")
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

  function isForumContentRoot(element) {
    return safeMatches(element, ".cooked") && Boolean(safeClosest(element, FORUM_CONTAINER_SELECTOR));
  }

  function findContentRoots() {
    const forumRoots = safeQueryAll(document, FORUM_POST_SELECTOR)
      .filter((element) => isVisible(element, FORUM_PROSE_EXCLUDED))
      .filter((element) => safeInnerText(element).trim().length >= 4);
    if (forumRoots.length) return forumRoots;

    const preferred = safeQueryAll(document, "article, main")
      .filter((element) => isVisible(element, Core.PROSE_EXCLUDED_SELECTOR))
      .sort((a, b) => textDensity(b) - textDensity(a));
    if (preferred[0] && textDensity(preferred[0]) >= 80) return [preferred[0]];
    const candidates = safeQueryAll(document, "section, [role='main'], div")
      .filter((element) => !safeClosest(element, Core.PROSE_EXCLUDED_SELECTOR))
      .map((element) => ({ element, score: textDensity(element) }))
      .filter((item) => item.score >= 120).sort((a, b) => b.score - a.score);
    if (candidates[0]) return [candidates[0].element];

    // Early web documents often place their complete article directly in <body>
    // without article/main/section/div wrappers. Keep this as a final fallback so
    // modern pages still use the narrower, safer content roots above.
    const legacyBody = document.body;
    if (
      legacyBody
      && isVisible(legacyBody, Core.PROSE_EXCLUDED_SELECTOR)
      && textDensity(legacyBody) >= 120
    ) {
      return [legacyBody];
    }
    return [];
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

  function componentSemanticKind(element) {
    const role = safeAttribute(element, "role");
    if (/^(tab|status|menuitem|option|button)$/.test(role) || safeMatches(element, "button,label")) {
      return "control";
    }
    if (safeClosest(element, UI_CONTEXT_SELECTOR)) return "navigation";
    if (safeMatches(element, "a") && safeClosest(element, "aside,[role='complementary']")) {
      return "navigation";
    }
    return "generic";
  }

  function componentTranslation(text, element) {
    const value = text.replace(/\s+/g, " ").trim();
    const normalized = normalizeUiLabel(value);
    if (UI_DICTIONARY.has(normalized)) return { local: UI_DICTIONARY.get(normalized) };
    if (value.length < 4 || value.length > 120 || !/[A-Za-z]/.test(value)) return null;
    if (/^(?:https?:\/\/|www\.|[\w.+-]+@)/i.test(value)) return null;
    if (/^[\d\s.,:%'’()+/-]+$/.test(value) || looksLikeName(value)) return null;
    const words = value.match(/[A-Za-z][A-Za-z'’-]*/g) || [];
    let role = "";
    try {
      role = element.getAttribute("role") || "";
    } catch {
      return null;
    }
    const semanticKind = componentSemanticKind(element);
    const semanticControl = semanticKind !== "generic";
    if (words.length < 2 && !semanticControl) return null;
    if (
      words.length === 1
      && /^[A-Z][\p{L}'’-]+$/u.test(value)
      && semanticKind === "navigation"
    ) {
      return null;
    }
    const hasLowercasePhrase = words.some((word) => /^[a-z]/.test(word));
    if (!semanticControl && value.length < 10) return null;
    if (!hasLowercasePhrase && words.length <= 3 && semanticKind === "generic") return null;
    return {
      local: null,
      semanticKind,
      contentType: semanticKind === "navigation"
        ? "navigation or menu label"
        : semanticKind === "control"
          ? "interactive interface control"
          : "short website interface label"
    };
  }

  function auxiliaryScore(element, primaryRoots) {
    if (!isVisible(element, COMPONENT_EXCLUDED)) return -1;
    if (primaryRoots.some((primaryRoot) =>
      safeContains(primaryRoot, element) || safeContains(element, primaryRoot)
    )) return -1;
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
    if (primaryRoots.some((primaryRoot) => {
      const primaryRect = safeRect(primaryRoot);
      return rect.bottom <= primaryRect.top + 240 || Math.abs(rect.top - primaryRect.top) < innerHeight;
    })) score += 8;
    return score;
  }

  function findAuxiliaryRoots(primaryRoots) {
    const candidates = safeQueryAll(document, "aside,[role='complementary'],header,section")
      .map((element) => ({ element, score: auxiliaryScore(element, primaryRoots) }))
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

  function blockProgressWeight(block) {
    const text = block?.payload?.fullBlockText
      || block?.records?.map((record) => record.content).join("")
      || "";
    return Math.max(1, Array.from(text).length);
  }

  function blocksProgressWeight(blocks) {
    return blocks.reduce((sum, block) => sum + blockProgressWeight(block), 0);
  }

  function compareDocumentOrder(a, b) {
    if (a.element === b.element) return a.order - b.order;
    try {
      const position = a.element.compareDocumentPosition(b.element);
      if (position & Node.DOCUMENT_POSITION_FOLLOWING) return -1;
      if (position & Node.DOCUMENT_POSITION_PRECEDING) return 1;
    } catch {
      return a.order - b.order;
    }
    return a.order - b.order;
  }

  function assignNeighborContexts(blocks) {
    ["prose", "auxiliary-prose"].forEach((kind) => {
      const proseBlocks = blocks.filter((block) => block.kind === kind).sort(compareDocumentOrder);
      const contextText = proseBlocks.map((block) => block.payload.fullBlockText);
      proseBlocks.forEach((block, index) => {
        block.payload.previousContext = contextText[index - 1]?.slice(-800) || "";
        block.payload.nextContext = contextText[index + 1]?.slice(0, 800) || "";
      });
    });
    blocks.filter((block) => block.kind === "component").forEach((block) => {
      block.payload.previousContext = block.payload.componentContext || "";
      block.payload.nextContext = "";
    });
    return blocks;
  }

  function analyzePageLegacy(settings, knownNodes = null, segmentOffset = 0, blockOffset = 0) {
    const roots = findContentRoots();
    if (!roots.length) return [];
    const claimed = knownNodes || new WeakSet();
    const blocks = [];
    let segmentNumber = 0;
    const rootEntries = [];

    roots.forEach((root, rootIndex) => {
      const excludedSelector = isForumContentRoot(root)
        ? FORUM_PROSE_EXCLUDED : Core.PROSE_EXCLUDED_SELECTOR;
      const rootElements = safeQueryAll(root, Core.BLOCK_SELECTOR);
      if (safeMatches(root, Core.BLOCK_SELECTOR)) rootElements.unshift(root);
      const headingStack = [];
      rootElements.forEach((element) => {
        const headingMatch = /^H([1-6])$/.exec(element.tagName || "");
        if (headingMatch) {
          const level = Number(headingMatch[1]);
          headingStack.length = level - 1;
          headingStack[level - 1] = safeInnerText(element).replace(/\s+/g, " ").trim().slice(0, 300);
        }
        rootEntries.push({
          element,
          excludedSelector,
          rootIndex,
          sectionPath: headingStack.filter(Boolean).join(" > ")
        });
      });
    });

    rootEntries.forEach(({ element, excludedSelector, sectionPath }, blockIndex) => {
      try {
        const nodes = collectTextNodes(element, excludedSelector).filter((node) => {
          if (claimed.has(node)) return false;
          return safeClosest(node.parentElement, Core.BLOCK_SELECTOR) === element;
        });
        const fullText = nodes.map((node) => node.nodeValue).join("").replace(/\s+/g, " ").trim();
        if (!Core.isEnglishProse(fullText)) return;
        const records = nodes.map((node) => {
          claimed.add(node);
          segmentNumber += 1;
          return createRecord(node, `segment_${segmentOffset + segmentNumber}`);
        }).filter((record) => record.content);
        if (!records.length) return;
        const rect = safeRect(element);
        const blockNumber = blockOffset + blocks.length + 1;
        blocks.push({
          id: `block_${blockNumber}`, element, records,
          order: blockIndex, kind: "prose",
          viewportDistance: rect.bottom < 0 ? Math.abs(rect.bottom) : rect.top > innerHeight ? rect.top - innerHeight : 0,
          payload: {
            blockId: `block_${blockNumber}`, fullBlockText: fullText,
            blockRole: /^h[1-6]$/i.test(element.tagName || "") ? "heading" : "prose",
            sectionPath,
            contentType: excludedSelector === FORUM_PROSE_EXCLUDED
              ? "forum post or quoted reply" : "article prose",
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
            const record = createRecord(node, `segment_${segmentOffset + segmentNumber}`);
            const rect = safeRect(element);
            const context = (safeInnerText(element.parentElement) || safeInnerText(element) || record.content)
              .replace(/\s+/g, " ").trim().slice(0, 300);
            const blockNumber = blockOffset + blocks.length + 1;
            blocks.push({
              id: `block_${blockNumber}`, element, records: [record],
              order: orderOffset + componentIndex, kind: "component",
              localTranslations: decision.local ? [{ id: record.id, text: decision.local }] : null,
              viewportDistance: rect.bottom < 0 ? Math.abs(rect.bottom) : rect.top > innerHeight ? rect.top - innerHeight : 0,
              payload: {
                blockId: `block_${blockNumber}`, fullBlockText: record.content,
                blockRole: "component",
                sectionPath: "",
                contentType: decision.contentType || "short website interface label",
                componentContext: `${decision.semanticKind || "dictionary"}: ${context}`,
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
            return createRecord(node, `segment_${segmentOffset + segmentNumber}`);
          }).filter((record) => record.content);
          if (!records.length) return;
          const rect = safeRect(element);
          const blockNumber = blockOffset + blocks.length + 1;
          blocks.push({
            id: `block_${blockNumber}`, element, records,
            order: orderOffset + proseIndex, kind: "auxiliary-prose",
            viewportDistance: rect.bottom < 0 ? Math.abs(rect.bottom) : rect.top > innerHeight ? rect.top - innerHeight : 0,
            payload: {
              blockId: `block_${blockNumber}`, fullBlockText: fullText,
              blockRole: /^h[1-6]$/i.test(element.tagName || "") ? "heading" : "prose",
              sectionPath: "",
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
      roots.forEach((root, index) => {
        scanComponentScope(root, rootEntries.length + index * 1000, COMPONENT_EXCLUDED);
      });
      const auxiliaryRoots = findAuxiliaryRoots(roots);
      auxiliaryRoots.forEach((auxiliaryRoot, index) => {
        const orderOffset = rootEntries.length + 10000 + index * 1000;
        scanAuxiliaryProseScope(auxiliaryRoot, orderOffset);
        scanComponentScope(auxiliaryRoot, orderOffset + 500, COMPONENT_EXCLUDED);
      });
    }

    if (settings.translateNavigation === true) {
      const navigationRoots = safeQueryAll(document, "nav").filter((element) =>
        isVisible(element, NAV_COMPONENT_EXCLUDED)
      );
      navigationRoots.slice(0, 6).forEach((navigationRoot, index) => {
        scanComponentScope(
          navigationRoot,
          rootEntries.length + 20000 + index * 1000,
          NAV_COMPONENT_EXCLUDED
        );
      });
    }

    assignNeighborContexts(blocks);
    return blocks.sort((a, b) => a.viewportDistance - b.viewportDistance || a.order - b.order);
  }

  function isAdvertisementText(element) {
    for (let current = element; current instanceof Element; current = current.parentElement) {
      const marker = [
        safeAttribute(current, "id"),
        safeAttribute(current, "class"),
        safeAttribute(current, "aria-label"),
        safeAttribute(current, "data-testid")
      ].join(" ");
      if (/\b(ad|ads|advert|advertisement|sponsored|sponsor)\b/i.test(marker)) return true;
    }
    return false;
  }

  function fullPageBlockFor(node) {
    const parent = node.parentElement;
    return safeClosest(parent, FULL_PAGE_BLOCK_SELECTOR) || parent || document.body;
  }

  function fullPageBlockKind(element) {
    if (safeMatches(element, Core.BLOCK_SELECTOR)) return "prose";
    if (
      safeMatches(element, "button,label,a,time,[role='tab'],[role='status'],[role='menuitem'],[role='button']")
      || safeClosest(element, UI_CONTEXT_SELECTOR)
    ) return "component";
    return "auxiliary-prose";
  }

  function sectionPathFor(element, headings) {
    const preceding = [];
    for (const heading of headings) {
      try {
        const position = heading.compareDocumentPosition(element);
        if (!(position & Node.DOCUMENT_POSITION_FOLLOWING) && heading !== element) continue;
      } catch {
        continue;
      }
      const level = Number((/^H([1-6])$/.exec(heading.tagName || "") || [0, 6])[1]);
      preceding.length = level - 1;
      preceding[level - 1] = safeInnerText(heading).replace(/\s+/g, " ").trim().slice(0, 300);
    }
    return preceding.filter(Boolean).join(" > ");
  }

  function analyzePage(settings, knownNodes = null, segmentOffset = 0, blockOffset = 0) {
    if (!document.body) return [];
    const claimed = knownNodes || new WeakSet();
    const grouped = new Map();
    const orderedElements = [];
    const eligibleParents = new WeakMap();
    let order = 0;

    try {
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
        acceptNode(node) {
          const parent = node.parentElement;
          if (!parent || claimed.has(node)) return NodeFilter.FILTER_REJECT;
          if (!Core.hasTranslatableEnglish(Core.splitWhitespace(node.nodeValue).content)) {
            return NodeFilter.FILTER_REJECT;
          }
          if (!eligibleParents.has(parent)) {
            eligibleParents.set(
              parent,
              !safeClosest(parent, FULL_PAGE_EXCLUDED)
              && !isAdvertisementText(parent)
              && isVisible(parent, FULL_PAGE_EXCLUDED)
            );
          }
          if (!eligibleParents.get(parent)) return NodeFilter.FILTER_REJECT;
          return NodeFilter.FILTER_ACCEPT;
        }
      });
      while (walker.nextNode()) {
        const node = walker.currentNode;
        const element = fullPageBlockFor(node);
        if (!grouped.has(element)) {
          grouped.set(element, []);
          orderedElements.push({ element, order: order++ });
        }
        grouped.get(element).push(node);
      }
    } catch {
      return [];
    }

    const headings = safeQueryAll(document.body, "h1,h2,h3,h4,h5,h6");
    let segmentNumber = 0;
    const blocks = [];
    for (const { element, order: documentOrder } of orderedElements) {
      const nodes = grouped.get(element) || [];
      const records = nodes.map((node) => {
        claimed.add(node);
        segmentNumber += 1;
        return createRecord(node, `segment_${segmentOffset + segmentNumber}`);
      }).filter((record) => record.content);
      if (!records.length) continue;

      const fullText = records.map((record) => record.content).join(" ")
        .replace(/\s+/g, " ").trim();
      const kind = fullPageBlockKind(element);
      const semanticKind = kind === "component" ? componentSemanticKind(element) : "content";
      const normalized = normalizeUiLabel(fullText);
      const localText = records.length === 1 ? UI_DICTIONARY.get(normalized) : null;
      const rect = safeRect(element);
      const blockNumber = blockOffset + blocks.length + 1;
      blocks.push({
        id: `block_${blockNumber}`,
        element,
        records,
        order: documentOrder,
        kind,
        localTranslations: localText ? [{ id: records[0].id, text: localText }] : null,
        viewportDistance: rect.bottom < 0
          ? Math.abs(rect.bottom)
          : rect.top > innerHeight ? rect.top - innerHeight : 0,
        payload: {
          blockId: `block_${blockNumber}`,
          fullBlockText: fullText,
          blockRole: /^h[1-6]$/i.test(element.tagName || "")
            ? "heading"
            : kind === "component" ? "component" : "prose",
          sectionPath: sectionPathFor(element, headings),
          contentType: kind === "component"
            ? `${semanticKind} website interface text`
            : "visible page content",
          componentContext: kind === "component"
            ? `${semanticKind}: ${(safeInnerText(element) || fullText)
              .replace(/\s+/g, " ").trim().slice(0, 300)}`
            : "",
          translationStyle: kind === "component"
            ? "natural Chinese interface wording"
            : "natural Chinese rewrite",
          segments: records.map(payloadSegment)
        }
      });
    }

    assignNeighborContexts(blocks);
    return blocks.sort((a, b) => a.viewportDistance - b.viewportDistance || a.order - b.order);
  }

  async function analyzeDocument(blocks) {
    const analysisBlocks = [...blocks]
      .sort(compareDocumentOrder)
      .map((block) => ({
        blockId: block.payload.blockId,
        blockRole: block.payload.blockRole,
        sectionPath: block.payload.sectionPath,
        contentType: block.payload.contentType,
        text: block.payload.fullBlockText
      }));
    if (!analysisBlocks.length) {
      return { documentContext: null, documentContextId: "" };
    }
    const response = await chrome.runtime.sendMessage({
      type: "ANALYZE_DOCUMENT",
      jobId: state.jobId,
      pageTitle: document.title,
      pageDomain: location.hostname,
      blocks: analysisBlocks
    });
    if (!response?.ok) throw new Error(response?.error || "全文分析失败");
    return response.data || { documentContext: null, documentContextId: "" };
  }

  function createBatchesByKind(blocks, maxCharacters) {
    const proseBlocks = blocks
      .filter((block) => block.kind === "prose")
      .sort(compareDocumentOrder);
    const auxiliaryBlocks = blocks
      .filter((block) => block.kind === "auxiliary-prose")
      .sort(compareDocumentOrder);
    const componentBlocks = blocks
      .filter((block) => block.kind === "component")
      .sort(compareDocumentOrder);
    const batches = [
      ...Core.createBatches(proseBlocks, maxCharacters),
      ...Core.createBatches(auxiliaryBlocks, maxCharacters),
      ...Core.createBatches(componentBlocks, maxCharacters)
    ];
    const distance = (batch) => Math.min(...batch.map((block) => block.viewportDistance));
    return batches.sort((a, b) => distance(a) - distance(b));
  }

  function createTranslationPlan(blocks, maxCharacters) {
    const regularCharacters = Math.min(1200, Math.max(1000, Number(maxCharacters) || 1200));
    const fastLaneDistance = Math.max(1, innerHeight) * FAST_LANE_SCREENS;
    const fastLaneBlocks = blocks.filter((block) =>
      block.viewportDistance <= fastLaneDistance
    );
    const fastLaneSet = new Set(fastLaneBlocks);
    const remainingBlocks = blocks.filter((block) => !fastLaneSet.has(block));
    return {
      fastLaneBatches: createBatchesByKind(fastLaneBlocks, FAST_LANE_CHARACTERS),
      remainingBatches: createBatchesByKind(remainingBlocks, regularCharacters)
    };
  }

  function createTranslationBatches(blocks, maxCharacters) {
    const plan = createTranslationPlan(blocks, maxCharacters);
    return [...plan.fastLaneBatches, ...plan.remainingBatches];
  }

  async function translateBatch(batch) {
    const response = await chrome.runtime.sendMessage({
      type: "TRANSLATE_BATCH", jobId: state.jobId, pageTitle: document.title,
      pageDomain: location.hostname,
      documentContext: state.documentContext,
      documentContextId: state.documentContextId,
      blocks: batch.map((block) => block.payload)
    });
    if (!response?.ok) {
      const error = new Error(response?.error || "翻译请求失败");
      error.code = response?.errorCode || "UNKNOWN";
      error.splittable = Boolean(response?.splittable);
      throw error;
    }
    const records = batch.flatMap((block) => block.records);
    Core.validateTranslations(response.data, records.map((record) => record.id));
    Core.applyTranslations(records, response.data.translations);
    return {
      qualityIssues: response.data.qualityIssues || [],
      rateLimited: Boolean(response.data.rateLimited)
    };
  }

  async function translateResiliently(batch, splitDepth = 0) {
    if (state.stopped) return { successes: 0, errors: [], translatedWeight: 0 };
    try {
      const batchResult = await translateBatch(batch);
      state.completed += blocksProgressWeight(batch);
      publish();
      return {
        successes: batch.length,
        errors: [],
        qualityIssues: batchResult.qualityIssues,
        riskyBlockIds: batchResult.qualityIssues.map((issue) => issue.blockId),
        rateLimited: batchResult.rateLimited,
        translatedWeight: blocksProgressWeight(batch)
      };
    } catch (error) {
      if (state.stopped) return { successes: 0, errors: [] };
      if (error.splittable && batch.length > 1 && splitDepth < MAX_SPLIT_DEPTH) {
        const middle = Math.ceil(batch.length / 2);
        const left = await translateResiliently(batch.slice(0, middle), splitDepth + 1);
        const right = await translateResiliently(batch.slice(middle), splitDepth + 1);
        return {
          successes: left.successes + right.successes,
          errors: [...left.errors, ...right.errors],
          qualityIssues: [...(left.qualityIssues || []), ...(right.qualityIssues || [])],
          riskyBlockIds: [...(left.riskyBlockIds || []), ...(right.riskyBlockIds || [])],
          rateLimited: Boolean(left.rateLimited || right.rateLimited),
          translatedWeight: (left.translatedWeight || 0) + (right.translatedWeight || 0)
        };
      }
      state.completed += blockProgressWeight(batch[0]);
      publish();
      return {
        successes: 0,
        errors: [`${batch[0]?.id || "段落"}：${error.message}`],
        qualityIssues: [],
        riskyBlockIds: [],
        rateLimited: error.code === "RATE_LIMIT",
        translatedWeight: 0
      };
    }
  }

  async function runPool(batches, concurrency, onBatchSettled = null) {
    let cursor = 0;
    let successes = 0;
    const errors = [];
    const qualityIssues = [];
    const riskyBlockIds = [];
    let adaptiveConcurrency = concurrency;
    async function worker(workerIndex) {
      while (!state.stopped) {
        if (workerIndex >= adaptiveConcurrency) return;
        const index = cursor++;
        if (index >= batches.length) return;
        const result = await translateResiliently(batches[index]);
        successes += result.successes;
        errors.push(...result.errors);
        qualityIssues.push(...(result.qualityIssues || []));
        riskyBlockIds.push(...(result.riskyBlockIds || []));
        if (onBatchSettled) onBatchSettled({
          batch: batches[index],
          index,
          result
        });
        if (result.rateLimited) {
          adaptiveConcurrency = adaptiveConcurrency > 2 ? 2 : 1;
          console.warn("[译页] 检测到 API 限流，后续批次并发自动降为", adaptiveConcurrency);
        }
      }
    }
    await Promise.all(
      Array.from(
        { length: Math.min(concurrency, batches.length) },
        (_, workerIndex) => worker(workerIndex)
      )
    );
    return { errors, successes, qualityIssues, riskyBlockIds, finalConcurrency: adaptiveConcurrency };
  }

  function currentBlockTranslation(block) {
    return block.records.map((record) =>
      typeof record.translatedValue === "string"
        ? record.translatedValue.trim()
        : ""
    ).join("");
  }

  function sourceMeaningRiskScore(source) {
    let score = 0;
    if (/\b(?:not|never|neither|nor|without|unless|no longer|hardly|rarely)\b/i.test(source)) {
      score += 18;
    }
    if (/\b(?:must|required|requires?|shall|may|might|could|possibly|likely|unlikely)\b/i.test(source)) {
      score += 12;
    }
    if (/\b(?:increase[sd]?|rise[sn]?|rose|grew|higher|decrease[sd]?|fell|drop(?:s|ped)?|lower)\b/i.test(source)) {
      score += 10;
    }
    if (
      /["“”][^"“”]{2,}["“”]/.test(source)
      && /\b(?:said|says|told|according to|wrote|asked|argued|claimed)\b/i.test(source)
    ) score += 14;
    if (/(?:%|\b(?:USD|EUR|GBP|kg|km|GB|MB|GHz|MHz|ms)\b|°[CF])/.test(source)) {
      score += 8;
    }
    const clauses = source.match(/[,;:]|\b(?:which|that|while|although|because|unless|whereas)\b/gi) || [];
    if (source.length >= 220 && clauses.length >= 3) score += 8;
    return score;
  }

  function findRefinementCandidates(blocks, documentContext, riskyBlockIds = []) {
    const explicitlyRisky = new Set(riskyBlockIds);
    const terms = [
      ...(documentContext?.terms || []),
      ...(documentContext?.entities || [])
    ].filter((item) =>
      item
      && typeof item.source === "string"
      && typeof item.preferredChinese === "string"
      && item.preferredChinese
      && item.preferredChinese.toLowerCase() !== item.source.toLowerCase()
    );
    const scored = [];

    for (const block of blocks) {
      const translated = currentBlockTranslation(block);
      if (!translated) continue;
      const source = String(block.payload.fullBlockText || "");
      let score = explicitlyRisky.has(block.payload.blockId) ? 100 : 0;
      score += sourceMeaningRiskScore(source);
      for (const term of terms) {
        if (
          source.toLowerCase().includes(term.source.toLowerCase())
          && !translated.toLowerCase().includes(term.preferredChinese.toLowerCase())
        ) score += 40;
      }
      if (
        block.kind !== "component"
        && /\b(it|they|them|their|this|that|these|those|he|she|his|her)\b/i.test(source)
      ) score += 4;
      if (score > 0) scored.push({ block, score });
    }

    const proportionalLimit = Math.max(1, Math.ceil(blocks.length * MAX_REFINEMENT_RATIO));
    const limit = Math.min(MAX_REFINEMENT_BLOCKS, proportionalLimit);
    return scored
      .sort((a, b) => b.score - a.score || a.block.viewportDistance - b.block.viewportDistance)
      .slice(0, limit)
      .map((item) => item.block);
  }

  async function refineBatch(batch) {
    const response = await chrome.runtime.sendMessage({
      type: "REFINE_TRANSLATIONS",
      jobId: state.jobId,
      pageTitle: document.title,
      pageDomain: location.hostname,
      documentContext: state.documentContext,
      documentContextId: state.documentContextId,
      blocks: batch.map((block) => ({
        ...block.payload,
        currentTranslations: block.records.map((record) => ({
          id: record.id,
          text: typeof record.translatedValue === "string"
            ? record.translatedValue.trim()
            : ""
        }))
      }))
    });
    if (!response?.ok) throw new Error(response?.error || "精校请求失败");
    const records = batch.flatMap((block) => block.records);
    Core.validateTranslations(response.data, records.map((record) => record.id));
    return Core.applyRefinements(records, response.data.translations);
  }

  async function refineRiskyBlocks(blocks) {
    if (!blocks.length || state.stopped) return { refined: 0, errors: [] };
    const batches = createBatchesByKind(blocks, 1200);
    let cursor = 0;
    let refined = 0;
    const errors = [];
    async function worker() {
      while (!state.stopped) {
        const index = cursor++;
        if (index >= batches.length) return;
        try {
          refined += await refineBatch(batches[index]);
        } catch (error) {
          errors.push(error.message);
        }
      }
    }
    await Promise.all(
      Array.from({ length: Math.min(2, batches.length) }, () => worker())
    );
    return { refined, errors };
  }

  function scheduleBackgroundRefinement(blocks, riskyBlockIds, analysisPromise) {
    void (async () => {
      await analysisPromise;
      await new Promise((resolve) => setTimeout(resolve, BACKGROUND_REFINEMENT_DELAY));
      if (
        state.stopped
        || state.showing !== "translated"
      ) return;
      const candidates = findRefinementCandidates(
        blocks,
        state.documentContext,
        riskyBlockIds
      );
      if (!candidates.length) return;
      const startedAt = performance.now();
      const result = await refineRiskyBlocks(candidates);
      console.info("[译页] 后台精校", {
        elapsedMs: Math.round((performance.now() - startedAt) * 10) / 10,
        changedSegments: result.refined,
        errors: result.errors.length
      });
    })().catch((error) => {
      console.warn("[译页] 后台精校失败，不影响初译结果", { message: error.message });
    });
  }

  async function startTranslation() {
    const translationStartedAt = performance.now();
    if (
      state.phase === "analyzing"
      || state.phase === "translating"
      || state.phase === "refining"
    ) return publicState();
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
    state.documentContext = null;
    state.documentContextId = "";
    state.jobId = crypto.randomUUID();
    setPhase("analyzing");
    await new Promise((resolve) => setTimeout(resolve, 0));

    const scanStartedAt = performance.now();
    const settings = await chrome.storage.local.get(DEFAULTS);
    const blocks = analyzePage(settings);
    const scanMs = Math.round((performance.now() - scanStartedAt) * 10) / 10;
    if (!blocks.length) {
      setPhase("empty");
      return publicState();
    }
    state.blocks = blocks;
    state.records = blocks.flatMap((block) => block.records);
    state.total = blocksProgressWeight(blocks);
    state.showing = "translated";

    const localBlocks = blocks.filter((block) => block.localTranslations);
    for (const block of localBlocks) {
      Core.applyTranslations(block.records, block.localTranslations);
      state.completed += blockProgressWeight(block);
    }
    publish();

    const remoteBlocks = blocks.filter((block) => !block.localTranslations);
    const plan = createTranslationPlan(remoteBlocks, settings.maxCharacters);
    const concurrency = Math.max(1, Math.min(500, Number(settings.concurrency) || 500));
    setPhase("translating");
    const batchesStartedAt = performance.now();
    const allBatches = [...plan.fastLaneBatches, ...plan.remainingBatches];
    const fastLaneSet = new Set(plan.fastLaneBatches);
    const fastLaneWeight = plan.fastLaneBatches.reduce(
      (sum, batch) => sum + blocksProgressWeight(batch),
      0
    );
    const pageWeight = allBatches.reduce(
      (sum, batch) => sum + blocksProgressWeight(batch),
      0
    );
    let translatedFastLaneWeight = 0;
    let translatedPageWeight = 0;
    let firstResultMs = null;
    let firstScreen80Ms = null;
    let page95Ms = null;
    const trackSettledBatch = ({ batch, result }) => {
      const timingMs = Math.round((performance.now() - batchesStartedAt) * 10) / 10;
      const translatedWeight = result.translatedWeight || 0;
      translatedPageWeight += translatedWeight;
      if (translatedWeight > 0 && firstResultMs === null) firstResultMs = timingMs;
      if (
        page95Ms === null
        && pageWeight > 0
        && translatedPageWeight >= pageWeight * 0.95
      ) page95Ms = timingMs;
      if (fastLaneSet.has(batch)) {
        translatedFastLaneWeight += translatedWeight;
        if (
          firstScreen80Ms === null
          && fastLaneWeight > 0
          && translatedFastLaneWeight >= fastLaneWeight * 0.8
        ) firstScreen80Ms = timingMs;
      }
    };

    const resultPromise = allBatches.length
      ? runPool(allBatches, concurrency, trackSettledBatch)
      : Promise.resolve({ errors: [], successes: 0, qualityIssues: [], riskyBlockIds: [] });
    const analysisStartedAt = performance.now();
    let analysisMs = 0;
    const analysisPromise = analyzeDocument(blocks)
      .then((analysis) => {
        analysisMs = Math.round((performance.now() - analysisStartedAt) * 10) / 10;
        state.documentContext = analysis.documentContext;
        state.documentContextId = analysis.documentContextId;
        return analysis;
      })
      .catch((error) => {
        analysisMs = Math.round((performance.now() - analysisStartedAt) * 10) / 10;
        console.warn("[译页] 全文上下文分析失败，继续使用初译结果", { message: error.message });
        return { documentContext: null, documentContextId: "" };
      });

    const result = await resultPromise;
    const lastBatchMs = Math.round((performance.now() - batchesStartedAt) * 10) / 10;
    result.successes += localBlocks.length;

    if (state.stopped) setPhase("stopped");
    else if (result.errors.length && result.successes === 0) setPhase("failed", result.errors[0]);
    else if (result.errors.length) {
      const details = [...new Set(result.errors)].slice(0, 2).join("；");
      setPhase("completed", `${result.errors.length} 个段落失败：${details}`);
    } else setPhase("completed");
    if (!state.stopped) {
      scheduleBackgroundRefinement(
        remoteBlocks,
        result.riskyBlockIds,
        analysisPromise
      );
    }
    console.info("[译页] 性能", {
      stage: "page-translation",
      elapsedMs: Math.round((performance.now() - translationStartedAt) * 10) / 10,
      scanMs,
      analysisMs,
      analysisPending: analysisMs === 0,
      firstResultMs,
      firstScreen80Ms,
      page95Ms,
      lastBatchMs,
      blocks: blocks.length,
      fastLaneBatches: plan.fastLaneBatches.length,
      remainingBatches: plan.remainingBatches.length,
      errors: result.errors.length
    });
    if (dynamicScanPending) scheduleDynamicScan();
    return publicState();
  }

  async function translateAdditionalContent() {
    if (
      state.phase === "analyzing"
      || state.phase === "translating"
      || state.phase === "refining"
      || state.showing !== "translated"
      || !state.records.length
    ) return;

    const settings = await chrome.storage.local.get(DEFAULTS);
    const knownNodes = new WeakSet(
      state.records.map((record) => record.node).filter((node) => node instanceof Node)
    );
    const blocks = analyzePage(
      settings,
      knownNodes,
      state.records.length,
      state.blocks.length
    );
    if (!blocks.length) return;

    state.stopped = false;
    state.error = "";
    state.jobId = crypto.randomUUID();
    state.blocks.push(...blocks);
    assignNeighborContexts(state.blocks);
    state.records.push(...blocks.flatMap((block) => block.records));
    state.total += blocksProgressWeight(blocks);

    const localBlocks = blocks.filter((block) => block.localTranslations);
    for (const block of localBlocks) {
      Core.applyTranslations(block.records, block.localTranslations);
      state.completed += blockProgressWeight(block);
    }
    publish();

    const remoteBlocks = blocks.filter((block) => !block.localTranslations);
    const batches = createTranslationBatches(remoteBlocks, settings.maxCharacters);
    setPhase("translating");
    const result = batches.length
      ? await runPool(batches, Math.max(1, Math.min(500, Number(settings.concurrency) || 500)))
      : { errors: [], successes: 0, qualityIssues: [], riskyBlockIds: [] };
    result.successes += localBlocks.length;

    if (state.stopped) setPhase("stopped");
    else if (result.errors.length) {
      const details = [...new Set(result.errors)].slice(0, 2).join("；");
      setPhase("completed", `${result.errors.length} 个新增段落失败：${details}`);
    } else setPhase("completed");
    if (!state.stopped) {
      scheduleBackgroundRefinement(
        remoteBlocks,
        result.riskyBlockIds,
        Promise.resolve({
          documentContext: state.documentContext,
          documentContextId: state.documentContextId
        })
      );
    }
  }

  function mutationAddsPageContent(mutations) {
    return mutations.some((mutation) => Array.from(mutation.addedNodes || []).some((node) => {
      const element = node instanceof Element ? node : node.parentElement;
      if (!(element instanceof Element)) return false;
      if (
        safeMatches(element, "script,style,noscript,[data-yipage-ui]")
        || safeClosest(element, "script,style,noscript,[data-yipage-ui]")
      ) return false;
      return true;
    }));
  }

  async function runDynamicScan() {
    dynamicScanTimer = null;
    if (!dynamicScanPending) return;
    if (
      state.phase === "analyzing"
      || state.phase === "translating"
      || state.phase === "refining"
    ) {
      dynamicScanTimer = setTimeout(runDynamicScan, DYNAMIC_SCAN_DELAY);
      return;
    }
    if (!state.records.length || state.showing !== "translated") return;
    dynamicScanPending = false;
    try {
      await translateAdditionalContent();
    } catch (error) {
      setPhase("completed", `新增内容翻译失败：${error.message}`);
    }
    if (dynamicScanPending) scheduleDynamicScan();
  }

  function scheduleDynamicScan() {
    dynamicScanPending = true;
    if (dynamicScanTimer) clearTimeout(dynamicScanTimer);
    dynamicScanTimer = setTimeout(runDynamicScan, DYNAMIC_SCAN_DELAY);
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
      if (dynamicScanPending) scheduleDynamicScan();
      sendResponse({ ok: true, status: publicState() });
    }
  });

  const dynamicObserver = new MutationObserver((mutations) => {
    if (mutationAddsPageContent(mutations)) scheduleDynamicScan();
  });
  if (document.documentElement) {
    dynamicObserver.observe(document.documentElement, { childList: true, subtree: true });
  }
})();
