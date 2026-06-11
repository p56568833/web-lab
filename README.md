# 🧪 web-lab

有趣网页实验集合。每个页面都是一个独立的 `html` 文件，浏览器打开即用，无需安装、无需后端、无需构建工具。

在线入口：https://p56568833.github.io/web-lab/

---

## 📦 当前项目

### 1. 🎨 UI Interaction Lab

**[ui-interaction-lab.html](./ui-interaction-lab.html)** — 交互式 UI 设计术语学习实验室

50 个可交互的 UI/UX 术语演示卡片，覆盖悬停、焦点、弹窗、骨架屏、拖拽排序、嵌套提示、命令面板等完整知识图谱。每张卡片包含真实可操作的交互示例、实时动态反馈和教学解释，用操作理解每个术语的真实含义。

> 🔗 在线体验：https://p56568833.github.io/web-lab/ui-interaction-lab.html

### 2. 🗂 文化大革命因果图谱

**[cultural-revolution-causal-map.html](./cultural-revolution-causal-map.html)** — 交互式历史因果理解页面

一个克制的数字历史展厅，用时间线、因果网络、原因档案卡、角色视角、误解纠正和压力叠加滑块，帮助理解复杂历史事件并非单一原因造成，而是多重结构、决策、组织和社会因素共同作用的结果。

> 🔗 在线体验：https://p56568833.github.io/web-lab/cultural-revolution-causal-map.html

### 3. 🤖 AI 概念透明模拟器

**[ai-concept-simulator.html](./ai-concept-simulator.html)** — 把抽象 AI 概念变成可观察实验

通过 token、temperature、embedding、attention、上下文窗口、采样策略等小型前端实验，让初学者用点击、拖动和观察理解 AI 系统中的关键概念。页面强调“教学近似”，不假装自己是真实模型。

> 🔗 在线体验：https://p56568833.github.io/web-lab/ai-concept-simulator.html

### 4. 🌐 Web 系统交互透明实验室

**[web-system-lab.html](./web-system-lab.html)** — 前端、后端、数据库与系统链路可视化

把一次用户操作背后的完整 Web 链路拆开：浏览器渲染、前端事件、HTTP 请求、后端业务逻辑、数据库、缓存、鉴权、CDN、消息队列、日志监控和部署流程。适合用来建立现代 Web 应用如何协作的整体直觉。

> 🔗 在线体验：https://p56568833.github.io/web-lab/web-system-lab.html

### 5. ⛽ 页岩气勘探开发交互词典

**[shale-gas-glossary-lab.html](./shale-gas-glossary-lab.html)** — 页岩气核心术语的交互学习实验室

面向页岩气勘探开发初学者，把 TOC、Ro、甜点区、水平井、地质导向、分段压裂、支撑剂、SRV、微地震、井距、递减曲线和 EUR 等术语做成可搜索、可点击、可拖动、可计算、可观察的小实验。页面明确标注所有数值和图形均为教学简化模型，不用于真实工程决策。

> 🔗 在线体验：https://p56568833.github.io/web-lab/shale-gas-glossary-lab.html

---

## 🧩 项目特点

- **纯前端单文件**：每个实验都是独立 HTML，包含自己的 HTML、CSS 和 JavaScript。
- **交互优先**：不是静态文章，而是用滑块、弹窗、流程图、动画和模拟器帮助建立直觉。
- **教学简化**：复杂系统会被拆成可观察的小模型，并明确标注边界。
- **开箱即用**：直接打开文件即可运行，也可以通过 GitHub Pages 在线访问。

---

## 🛠 使用方式

```bash
# 克隆
git clone https://github.com/p56568833/web-lab.git

# 进入目录
cd web-lab
```

然后用浏览器直接打开任意 `.html` 文件即可。

如果希望用本地静态服务预览：

```bash
python -m http.server 4177
```

再访问：

```text
http://127.0.0.1:4177/
```
