(() => {
  "use strict";

  if (document.querySelector("[data-yipage-ui]")) return;

  const POSITION_KEY = "floatingUiPosition";
  const EDGE_GAP = 10;
  const host = document.createElement("div");
  host.dataset.yipageUi = "floating-toolbar";
  host.setAttribute("aria-label", "译页翻译控制");
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
      .actions{display:grid;grid-template-columns:1.2fr 1fr 1fr;gap:6px}
      .actions button{padding:8px 7px;border:1px solid #bcb39f;background:#e9e2d4}
      .actions button:hover{border-color:#245a43}
      .translate{color:#fff!important;background:#245a43!important;border-color:#245a43!important}
      .translate.stopping{background:#df4a31!important;border-color:#df4a31!important}
      .mini{width:auto;padding:6px}
      .mini .drag-handle{grid-template-columns:29px 24px}
      .mini .grip,.mini .status,.mini .percent,.mini .progress,.mini .actions{display:none}
      @keyframes pulse{50%{opacity:.3}}
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

  async function restorePosition() {
    const stored = await chrome.storage.local.get(POSITION_KEY);
    const position = stored[POSITION_KEY];
    if (Number.isFinite(position?.left) && Number.isFinite(position?.top)) {
      setPosition(position.left, position.top);
    }
  }

  function render(next = {}) {
    busy = next.phase === "analyzing" || next.phase === "translating";
    const completed = Math.max(0, Number(next.completed) || 0);
    const total = Math.max(0, Number(next.total) || 0);
    const value = total ? Math.min(100, Math.round(completed / total * 100)) : 0;
    status.textContent = next.error || next.label || "尚未翻译";
    status.title = status.textContent;
    status.classList.toggle("busy", busy);
    percent.textContent = `${value}%`;
    progressBar.style.width = `${value}%`;
    progress.setAttribute("aria-valuenow", String(value));
    translate.textContent = busy ? "停止" : "翻译";
    translate.classList.toggle("stopping", busy);
    original.classList.toggle("active", next.showing === "original");
    translated.classList.toggle("active", next.showing === "translated");
    translated.disabled = !total;
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
  collapse.addEventListener("click", (event) => {
    event.stopPropagation();
    const mini = desk.classList.toggle("mini");
    collapse.textContent = mini ? "+" : "−";
    collapse.setAttribute("aria-label", mini ? "展开翻译控制" : "收起翻译控制");
    requestAnimationFrame(() => {
      const rect = host.getBoundingClientRect();
      setPosition(rect.left, rect.top);
    });
  });

  dragHandle.addEventListener("pointerdown", (event) => {
    if (event.target instanceof Element && event.target.closest("button")) return;
    const rect = host.getBoundingClientRect();
    drag = { pointerId: event.pointerId, offsetX: event.clientX - rect.left, offsetY: event.clientY - rect.top };
    dragHandle.setPointerCapture(event.pointerId);
    event.preventDefault();
  });

  dragHandle.addEventListener("pointermove", (event) => {
    if (!drag || drag.pointerId !== event.pointerId) return;
    setPosition(event.clientX - drag.offsetX, event.clientY - drag.offsetY);
  });

  async function finishDrag(event) {
    if (!drag || drag.pointerId !== event.pointerId) return;
    drag = null;
    const rect = host.getBoundingClientRect();
    const position = setPosition(rect.left, rect.top);
    await chrome.storage.local.set({ [POSITION_KEY]: position });
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

  restorePosition();
  poll();
  setInterval(poll, 750);
})();
