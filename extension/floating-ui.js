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
      :host{
        all:initial;
        position:fixed;
        right:22px;
        bottom:22px;
        z-index:2147483647;
        color-scheme:light
      }
      *{box-sizing:border-box}
      .desk{
        position:relative;
        width:306px;
        padding:10px;
        overflow:hidden;
        border:1px solid rgba(197,209,203,.92);
        border-radius:18px;
        color:#39413e;
        background:
          radial-gradient(circle at 92% -15%,rgba(121,207,166,.22),transparent 42%),
          rgba(250,252,251,.94);
        box-shadow:
          inset 0 1px 0 rgba(255,255,255,.96),
          0 18px 50px rgba(52,75,64,.17),
          0 3px 10px rgba(52,75,64,.08);
        backdrop-filter:blur(18px) saturate(1.08);
        -webkit-backdrop-filter:blur(18px) saturate(1.08);
        font-family:"Avenir Next","SF Pro Display","PingFang SC","Microsoft YaHei",sans-serif;
        -webkit-font-smoothing:antialiased;
        user-select:none;
        transition:width .24s ease,padding .24s ease,border-radius .24s ease,box-shadow .24s ease
      }
      .desk::after{
        content:"";
        position:absolute;
        top:-39px;
        right:-30px;
        width:100px;
        height:100px;
        border:1px solid rgba(121,207,166,.18);
        border-radius:50%;
        box-shadow:0 0 0 13px rgba(121,207,166,.025),0 0 0 27px rgba(121,207,166,.018);
        pointer-events:none
      }
      .drag-handle{
        position:relative;
        z-index:1;
        display:grid;
        grid-template-columns:12px 36px minmax(0,1fr) 40px 26px;
        gap:8px;
        align-items:center;
        cursor:grab;
        touch-action:none
      }
      .drag-handle:active{cursor:grabbing}
      .grip{
        width:10px;
        height:16px;
        overflow:hidden;
        color:transparent;
        background:radial-gradient(circle,#9ca7a1 1.2px,transparent 1.4px) 0 0/5px 5px;
        opacity:.7
      }
      .mark{
        position:relative;
        display:grid;
        place-items:center;
        width:36px;
        height:36px;
        border:1px solid rgba(79,159,120,.33);
        border-radius:11px;
        color:#3f7d61;
        background:linear-gradient(145deg,#fff,#e1f5ea);
        box-shadow:inset 0 1px 0 #fff,0 7px 15px rgba(64,103,83,.07);
        font-size:16px;
        font-weight:700
      }
      .mark::after{
        content:"";
        position:absolute;
        inset:3px;
        border:1px solid rgba(121,207,166,.18);
        border-radius:8px
      }
      .status-copy{
        display:grid;
        min-width:0;
        gap:4px
      }
      .overline{
        color:#929c97;
        font:600 7px/1 ui-monospace,"SFMono-Regular",monospace;
        letter-spacing:.13em
      }
      .status{
        min-width:0;
        color:#505a55;
        font-size:11px;
        font-weight:600;
        line-height:1.15;
        white-space:nowrap;
        overflow:hidden;
        text-overflow:ellipsis
      }
      .status::before{
        content:"";
        display:inline-block;
        width:6px;
        height:6px;
        margin-right:6px;
        border-radius:50%;
        background:#abb5b0;
        box-shadow:0 0 0 3px rgba(171,181,176,.12);
        vertical-align:1px
      }
      .status.busy::before{
        background:#4f9f78;
        box-shadow:0 0 0 3px rgba(79,159,120,.13);
        animation:pulse 1.15s ease-in-out infinite
      }
      .percent{
        text-align:right;
        color:#5b7568;
        font:650 10px/1 ui-monospace,"SFMono-Regular",monospace;
        font-variant-numeric:tabular-nums
      }
      button{
        appearance:none;
        border:0;
        color:#56615c;
        background:transparent;
        font-family:inherit;
        font-size:11px;
        font-weight:600;
        cursor:pointer;
        -webkit-tap-highlight-color:transparent;
        transition:color .2s ease,background .2s ease,border-color .2s ease,box-shadow .2s ease,transform .2s ease
      }
      button:focus-visible{outline:2px solid #4f9f78;outline-offset:2px}
      button:active:not(:disabled){transform:scale(.97)}
      button:disabled{opacity:.42;cursor:default}
      .collapse{
        display:grid;
        place-items:center;
        width:26px;
        height:26px;
        padding:0;
        border:1px solid transparent;
        border-radius:8px;
        color:#7b8580;
        font:500 15px/1 sans-serif
      }
      .collapse:hover{border-color:#d9e1dd;background:rgba(255,255,255,.76);color:#48534d}
      .progress{
        position:relative;
        z-index:1;
        height:3px;
        margin:10px 3px 9px;
        overflow:hidden;
        border-radius:99px;
        background:#e7ece9
      }
      .progress span{
        display:block;
        width:0;
        height:100%;
        border-radius:inherit;
        background:linear-gradient(90deg,#a8e1c6,#4f9f78);
        box-shadow:0 0 9px rgba(79,159,120,.32);
        transition:width .28s ease
      }
      .progress.indeterminate span{width:36%!important;animation:indeterminate 1s ease-in-out infinite}
      .actions{
        position:relative;
        z-index:1;
        display:grid;
        grid-template-columns:1.18fr 1fr 1fr;
        gap:4px;
        padding:4px;
        border:1px solid #dce3df;
        border-radius:12px;
        background:rgba(235,240,237,.7)
      }
      .actions button{
        min-height:34px;
        padding:7px 8px;
        border:1px solid transparent;
        border-radius:8px
      }
      .actions button:hover:not(:disabled){
        color:#3e5047;
        background:rgba(255,255,255,.9);
        box-shadow:0 2px 8px rgba(63,86,74,.06)
      }
      .actions button.active{
        border-color:rgba(202,212,207,.8);
        color:#3f6f58;
        background:#fff;
        box-shadow:0 2px 8px rgba(63,86,74,.07)
      }
      .translate{
        display:flex;
        align-items:center;
        justify-content:space-between;
        padding-left:11px!important;
        color:#315e49!important;
        background:linear-gradient(110deg,#e3f6ec,#d8f1e4)!important;
        border-color:#b9dec9!important
      }
      .translate::after{
        content:"→";
        display:grid;
        place-items:center;
        width:20px;
        height:20px;
        border:1px solid rgba(79,159,120,.22);
        border-radius:6px;
        background:rgba(255,255,255,.58);
        transition:transform .2s ease,background .2s ease
      }
      .translate:hover::after{background:#fff;transform:translateX(1px)}
      .translate.stopping{
        color:#9a5555!important;
        background:#f8e9e9!important;
        border-color:#e6bebe!important
      }
      .translate.stopping::after{content:"■";border-color:#e1b8b8;color:#b76767;font-size:7px}
      .mini{
        width:auto;
        padding:7px;
        border-radius:16px;
        box-shadow:inset 0 1px 0 #fff,0 12px 34px rgba(52,75,64,.16),0 2px 8px rgba(52,75,64,.07)
      }
      .mini::after{display:none}
      .mini .drag-handle{grid-template-columns:38px 24px;gap:5px}
      .mini .grip,.mini .status-copy,.mini .percent,.mini .actions{display:none}
      .mini .progress{display:none;width:60px;height:3px;margin:5px 0 0}
      .mini.mini-progress-active .progress{display:block}
      .mini .drag-handle{cursor:pointer}
      .mini .mark{width:38px;height:38px;transition:transform .18s ease,box-shadow .18s ease}
      .mini .drag-handle:hover .mark{box-shadow:inset 0 1px 0 #fff,0 9px 18px rgba(64,103,83,.13);transform:translateY(-1px)}
      @keyframes pulse{50%{opacity:.35;transform:scale(.8)}}
      @keyframes indeterminate{0%{transform:translateX(-110%)}100%{transform:translateX(300%)}}
      @media(max-width:520px){
        :host{right:12px;bottom:12px}
        .desk{width:278px}
        .drag-handle{grid-template-columns:10px 34px minmax(0,1fr) 34px 24px;gap:7px}
        .mark{width:34px;height:34px}
      }
      @media(prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important}}
    </style>
    <div class="desk">
      <div class="drag-handle" title="拖动">
        <span class="grip" aria-hidden="true">⠿</span>
        <span class="mark" aria-hidden="true">译</span>
        <span class="status-copy">
          <span class="overline">PAGE TRANSLATOR</span>
          <span class="status">尚未翻译</span>
        </span>
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
