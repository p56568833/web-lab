(() => {
  "use strict";

  if (document.querySelector("[data-yipage-ui]")) return;

  const POSITION_KEY = "floatingUiPosition";
  const COLLAPSED_KEY = "floatingUiCollapsed";
  const EDGE_GAP = 10;
  const host = document.createElement("div");
  host.dataset.yipageUi = "floating-toolbar";
  host.setAttribute("aria-label", "译页翻译控制");
  host.style.visibility = "hidden";
  const shadow = host.attachShadow({ mode: "closed" });
  shadow.innerHTML = `
    <style>
      :host{all:initial;position:fixed;right:22px;bottom:22px;z-index:2147483647}
      .desk{width:286px;padding:8px;background:#f4efe3;border:1px solid #bdb39e;border-radius:5px;
        box-shadow:0 14px 38px rgba(20,28,22,.24),3px 3px 0 #233f31;
        font-family:"Songti SC","Noto Serif SC",Georgia,serif;color:#172019;user-select:none}
      .drag-handle{display:grid;grid-template-columns:14px 29px minmax(0,1fr) 38px 24px;gap:7px;
        align-items:center;cursor:grab;touch-action:none}
      .drag-handle:active{cursor:grabbing}
      .grip{color:#8d897f;font:13px/1 ui-monospace,monospace;letter-spacing:-3px}
      .mark{display:grid;place-items:center;width:29px;height:31px;background:#df4a31;color:#fff;
        font-size:15px;font-weight:800;clip-path:polygon(0 0,100% 0,100% 82%,50% 100%,0 82%)}
      .status{min-width:0;font-size:11px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .status::before{content:"";display:inline-block;width:6px;height:6px;margin-right:6px;border-radius:50%;background:#85877f}
      .status.busy::before{background:#df4a31;animation:pulse 1s infinite}
      .percent{text-align:right;color:#245a43;font:700 10px ui-monospace,monospace}
      button{appearance:none;border:0;border-radius:0;color:#27332b;background:transparent;
        font:700 11px "Songti SC","Noto Serif SC",serif;cursor:pointer}
      button:hover{background:rgba(36,90,67,.1)}
      button.active{background:#245a43;color:#fff}
      button:disabled{opacity:.42;cursor:default}
      .collapse{padding:4px;color:#6e6c63;font:15px/1 sans-serif}
      .progress{height:4px;margin:8px 0;background:#d7cfbf;overflow:hidden;border-radius:3px}
      .progress span{display:block;width:0;height:100%;background:#df4a31;transition:width .25s ease}
      .progress.indeterminate span{width:36%!important;animation:indeterminate 1s ease-in-out infinite}
      .actions{display:grid;grid-template-columns:1.2fr 1fr 1fr;gap:6px}
      .actions button{padding:8px 7px;border:1px solid #bcb39f;background:#e9e2d4}
      .actions button:hover{border-color:#245a43}
      .translate{color:#fff!important;background:#245a43!important;border-color:#245a43!important}
      .translate.stopping{background:#df4a31!important;border-color:#df4a31!important}
      .mini{width:auto;padding:6px}
      .mini .drag-handle{grid-template-columns:29px 24px}
      .mini .grip,.mini .status,.mini .percent,.mini .actions{display:none}
      .mini .progress{display:none;width:60px;height:3px;margin:5px 0 0}
      .mini.mini-progress-active .progress{display:block}
      .mini .drag-handle{cursor:pointer}
      .mini .mark{transition:transform .12s ease,filter .12s ease}
      .mini .drag-handle:hover .mark{filter:brightness(.94);transform:translateY(-1px)}
      @keyframes pulse{50%{opacity:.3}}
      @keyframes indeterminate{0%{transform:translateX(-110%)}100%{transform:translateX(300%)}}
      @media(max-width:520px){.desk{width:258px}}
      @media(prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important}}
    </style>
    <div class="desk">
      <div class="drag-handle" title="拖动">
        <span class="grip" aria-hidden="true">⠿</span>
        <span class="mark" aria-hidden="true">译</span>
        <span class="status">尚未翻译</span>
        <span class="percent">0%</span>
        <button class="collapse" type="button" aria-label="收起翻译控制">−</button>
      </div>
      <div class="progress" role="progressbar" aria-label="翻译进度" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0">
        <span></span>
      </div>
      <div class="actions">
        <button class="translate" type="button">翻译</button>
        <button class="original" type="button">原文</button>
        <button class="translated" type="button">译文</button>
      </div>
    </div>
  `;
  (document.body || document.documentElement).appendChild(host);

  const desk = shadow.querySelector(".desk");
  const dragHandle = shadow.querySelector(".drag-handle");
  const status = shadow.querySelector(".status");
  const percent = shadow.querySelector(".percent");
  const progress = shadow.querySelector(".progress");
  const progressBar = shadow.querySelector(".progress span");
  const translate = shadow.querySelector(".translate");
  const original = shadow.querySelector(".original");
  const translated = shadow.querySelector(".translated");
  const collapse = shadow.querySelector(".collapse");
  let polling = false;
  let busy = false;
  let showing = "original";
  let hasTranslation = false;
  let drag = null;

  function clampPosition(left, top) {
    const rect = host.getBoundingClientRect();
    return {
      left: Math.max(EDGE_GAP, Math.min(left, innerWidth - rect.width - EDGE_GAP)),
      top: Math.max(EDGE_GAP, Math.min(top, innerHeight - rect.height - EDGE_GAP))
    };
  }

  function setPosition(left, top) {
    const next = clampPosition(left, top);
    host.style.right = "auto";
    host.style.bottom = "auto";
    host.style.left = `${next.left}px`;
    host.style.top = `${next.top}px`;
    return next;
  }

  function applyMiniState(mini) {
    desk.classList.toggle("mini", mini);
    collapse.textContent = mini ? "+" : "−";
    collapse.setAttribute("aria-label", mini ? "展开翻译控制" : "收起翻译控制");
    dragHandle.title = mini ? "单击翻译，拖动可调整位置" : "拖动";
    dragHandle.tabIndex = mini ? 0 : -1;
    dragHandle.setAttribute("role", mini ? "button" : "presentation");
    dragHandle.setAttribute("aria-label", mini ? miniActionLabel() : "拖动翻译控制");
    updateMiniAccessibility();
  }

  async function restoreUiState() {
    const stored = await chrome.storage.local.get([POSITION_KEY, COLLAPSED_KEY]);
    applyMiniState(stored[COLLAPSED_KEY] === true);
    await new Promise((resolve) => requestAnimationFrame(resolve));
    const position = stored[POSITION_KEY];
    if (Number.isFinite(position?.left) && Number.isFinite(position?.top)) {
      setPosition(position.left, position.top);
    }
    host.style.visibility = "";
  }

  function render(next = {}) {
    busy = next.phase === "analyzing" || next.phase === "translating";
    showing = next.showing || showing;
    hasTranslation = next.hasTranslation === true;
    const completed = Math.max(0, Number(next.completed) || 0);
    const total = Math.max(0, Number(next.total) || 0);
    const value = total ? Math.min(100, Math.round(completed / total * 100)) : 0;
    status.textContent = next.error || next.label || "尚未翻译";
    status.title = status.textContent;
    status.classList.toggle("busy", busy);
    percent.textContent = `${value}%`;
    progressBar.style.width = `${value}%`;
    progress.setAttribute("aria-valuenow", String(value));
    progress.classList.toggle("indeterminate", busy && !total);
    desk.classList.toggle("mini-progress-active", busy);
    translate.textContent = busy ? "停止" : "翻译";
    translate.classList.toggle("stopping", busy);
    original.classList.toggle("active", next.showing === "original");
    translated.classList.toggle("active", next.showing === "translated");
    translated.disabled = !total;
    updateMiniAccessibility();
  }

  function miniActionLabel() {
    if (busy) return "正在翻译";
    if (!hasTranslation) return "翻译当前页面";
    return showing === "translated" ? "切换为原文" : "切换为译文";
  }

  function updateMiniAccessibility() {
    if (!desk.classList.contains("mini")) return;
    const label = miniActionLabel();
    dragHandle.title = `${label}，拖动可调整位置`;
    dragHandle.setAttribute("aria-label", label);
  }

  async function command(commandName) {
    try {
      const response = await chrome.runtime.sendMessage({
        type: "FLOATING_COMMAND",
        command: commandName
      });
      if (response?.status) render(response.status);
      else if (!response?.ok) render({ label: "操作失败", error: response?.error });
    } catch {
      render({ label: "扩展已更新，请刷新网页" });
    }
  }

  translate.addEventListener("click", () => command(busy ? "STOP_TRANSLATION" : "TRANSLATE_PAGE"));
  original.addEventListener("click", () => command("SHOW_ORIGINAL"));
  translated.addEventListener("click", () => command("SHOW_TRANSLATION"));
  collapse.addEventListener("click", async (event) => {
    event.stopPropagation();
    const before = host.getBoundingClientRect();
    const anchorRight = before.left + before.width / 2 >= innerWidth / 2;
    const anchorBottom = before.top + before.height / 2 >= innerHeight / 2;
    const mini = !desk.classList.contains("mini");
    applyMiniState(mini);
    await chrome.storage.local.set({ [COLLAPSED_KEY]: mini });
    requestAnimationFrame(async () => {
      const after = host.getBoundingClientRect();
      const left = anchorRight ? before.right - after.width : before.left;
      const top = anchorBottom ? before.bottom - after.height : before.top;
      const position = setPosition(left, top);
      await chrome.storage.local.set({ [POSITION_KEY]: position });
    });
  });

  function runMiniAction() {
    if (busy) return Promise.resolve();
    if (!hasTranslation) return command("TRANSLATE_PAGE");
    return command(showing === "translated" ? "SHOW_ORIGINAL" : "SHOW_TRANSLATION");
  }

  dragHandle.addEventListener("keydown", (event) => {
    if (!desk.classList.contains("mini") || (event.key !== "Enter" && event.key !== " ")) return;
    event.preventDefault();
    runMiniAction();
  });

  dragHandle.addEventListener("pointerdown", (event) => {
    if (event.target instanceof Element && event.target.closest("button")) return;
    const rect = host.getBoundingClientRect();
    drag = {
      pointerId: event.pointerId,
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top,
      startX: event.clientX,
      startY: event.clientY,
      moved: false
    };
    dragHandle.setPointerCapture(event.pointerId);
    event.preventDefault();
  });

  dragHandle.addEventListener("pointermove", (event) => {
    if (!drag || drag.pointerId !== event.pointerId) return;
    if (Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY) > 5) {
      drag.moved = true;
    }
    setPosition(event.clientX - drag.offsetX, event.clientY - drag.offsetY);
  });

  async function finishDrag(event) {
    if (!drag || drag.pointerId !== event.pointerId) return;
    const shouldRunMiniAction =
      event.type === "pointerup" && desk.classList.contains("mini") && !drag.moved;
    drag = null;
    const rect = host.getBoundingClientRect();
    const position = setPosition(rect.left, rect.top);
    await chrome.storage.local.set({ [POSITION_KEY]: position });
    if (shouldRunMiniAction) await runMiniAction();
  }
  dragHandle.addEventListener("pointerup", finishDrag);
  dragHandle.addEventListener("pointercancel", finishDrag);
  addEventListener("resize", () => {
    const rect = host.getBoundingClientRect();
    if (host.style.left) setPosition(rect.left, rect.top);
  });

  async function poll() {
    if (polling || document.hidden) return;
    polling = true;
    await command("GET_STATUS");
    polling = false;
  }

  restoreUiState().catch(() => {
    host.style.visibility = "";
  });
  poll();
  setInterval(poll, 750);
})();
