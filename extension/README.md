# 译页

无需构建步骤的 Chrome / Edge Manifest V3 扩展。它通过 DeepSeek 兼容的 Chat Completions API，把英文文章正文和常见页面组件原位翻译为简体中文，并只修改现有文本节点的 `nodeValue`。

## 安装

1. 打开 Chrome 的 `chrome://extensions`，或 Edge 的 `edge://extensions`。
2. 开启“开发者模式”。
3. 点击“加载已解压的扩展程序”，选择本目录 `extension`。
4. 更新源码后，需要在扩展管理页点击“重新加载”，并刷新已经打开的网页。
5. 测试本地 HTML 时，在扩展详情页开启“允许访问文件网址”。

## DeepSeek 配置

1. 打开扩展设置。
2. 填写 API Key。
3. 默认 Base URL 为 `https://api.deepseek.com`，模型为 `deepseek-v4-pro`。
4. 默认单次最大字符数为 12,000，并发数为 2。
5. 点击“测试 API 连接”，确认地址、密钥、模型和响应格式有效。

API Key 保存在 `chrome.storage.local`，只由后台 service worker 读取，不会交给网页脚本。

## 功能

- 翻译正文标题、段落、列表、表格、引用和图片说明，包括由页面级表单包裹的论坛帖子流。
- 默认翻译作者标签、状态、标签页及常见短组件文字。
- 默认扫描正文外的重要辅助区域，例如比分面板、摘要卡、状态面板、相关推荐和延伸阅读卡片；广告、推广和订阅区域会被排除。
- 常见 UI 短语使用本地词典；较长组件文字通过 API 翻译。
- 表单容器中的文章和帖子正文可以翻译，但输入框、选择框、编辑区、按钮及表单组件仍被排除。
- 翻译模型先按完整段落组织自然中文语序，再依据链接、强调和标签语义映射回原文本节点。
- 跳过人名、队名、比分、URL、代码、编辑区和隐藏内容。
- 批次失败时自动拆小重试，单段失败不会中断整页。
- DOM 扫描使用防御式包装；单个异常节点或网站组件不会导致整页分析失败。
- 网页右下角提供可拖动控制器，支持翻译、停止、原文/译文切换和 0–100% 进度显示。
- 控制器收起后，首次单击“译”即可翻译；翻译中显示迷你进度条，完成后自动隐藏。
- 完成翻译后继续单击迷你控制器，会在原文与译文之间循环切换；拖动不会误触发操作。
- 控制器会记住展开或收起状态，新页面和新窗口沿用上一次选择。
- 展开或收起时会锁定距离最近的屏幕边缘，右侧浮窗不会在收起后跳到左边。
- 常见单词型菜单标签使用安全词典翻译，同时继续跳过疑似人名和专有名词。
- 组件会按导航、菜单、标签页、按钮和状态等语义分类翻译，安全词典仅作为短词兜底。
- 翻译进度按实际字符量加权，长段落和短标签不再拥有相同权重。
- 支持正文直接放在 `body` 下、缺少 `article` / `main` 等现代语义容器的早期网页。
- 拖动位置保存在浏览器本地。
- 设置页可以关闭“翻译页面组件”，或单独开启实验性的导航栏翻译。

## DOM 与安全约束

- 不替换正文容器，不重建原有元素。
- 模型译文只写入原文本节点的 `nodeValue`。
- 保留标签层级、属性、链接、图片、表单值、事件监听器和交互。
- API 结果按 segment ID、数量和类型验证。
- 节点被删除或被网站修改后不再写回。
- 不使用 `eval`，不执行模型返回内容。
- 悬浮控制器位于隔离的 Shadow DOM 中，并被正文扫描明确排除。

## 测试

基础测试页面位于 `tests/article.html`、`tests/news.html`、`tests/document.html`、`tests/editorial-card-regression.html` 和 `tests/forum-form-regression.html`。

运行全部自动化检查：

```powershell
node .\tests\run-tests.js
node .\tests\config-regression.js
node .\tests\api-test-regression.js
node .\tests\floating-ui-regression.js
node .\tests\component-translation-regression.js
node .\tests\dom-safety-regression.js
node .\tests\auxiliary-regions-regression.js
node .\tests\natural-chinese-regression.js
node .\tests\legacy-body-regression.js
```

测试覆盖原文恢复、标签结构保护、排除规则、segment 映射、API 配置、悬浮 UI、批次拆分重试和组件翻译保护。

## 已知限制

- 不支持 PDF、图片 OCR、iframe 内容和封闭 Shadow DOM。
- 页面刷新后，当前节点引用和原文/译文显示状态会丢失，但翻译缓存保留。
- 当前只处理点击翻译时已经存在的组件；之后动态插入的新组件需要再次翻译或等待后续 MutationObserver 支持。
- 短词存在语义歧义，因此组件模式会保守跳过疑似人名、队名和单独专有名词。
