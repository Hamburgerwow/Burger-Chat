# Burger Chat 插件规范 v1

Burger Chat 电脑端和手机端共用一套插件格式。插件是一个 JSON 文件，安装后由客户端在本地执行；不匹配当前平台或当前版本的插件会直接安装失败。

**插件开发只适配电脑网页端。** 开发者资料、图形化编程、AI 生成、审核和上架全部在 `https://hamburgerwow.top/developer` 完成；电脑端和手机端只负责安装、评分、查看与插件设置。

## 1. 插件包命名

文件名为 `<插件ID>-<版本号>.bcp.json`，例如：

```
bcp.hamburgerwow.hello-1.0.0.bcp.json
```

- 插件 ID：`bcp.<开发者标识>.<插件名>`，全部小写，只能使用字母、数字和短横线。
- 开发者标识与插件名各 2–24 个字符。
- 版本号必须是 `x.y.z`，每段 0–999，不允许 `v` 前缀或预发布后缀。

## 2. 必填字段

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `schema` | string | 固定为 `burger-chat-plugin/v1` |
| `id` | string | 插件唯一 ID，格式见上 |
| `name` | string | 插件名称，2–32 个字 |
| `version` | string | 插件版本，`x.y.z` |
| `developer` | string | 开发人员，2–40 个字 |
| `target` | string | `pc`、`phone` 或 `both` |
| `minApp` | string | 最低适配的 Burger Chat 版本 |
| `maxApp` | string | 适配到哪个版本号以下（包含该版本） |
| `apiVersion` | number | 固定为 `1` |
| `memoryMB` | number | 插件运行需要的内存，1–64 的整数（MB） |
| `category` | string | 分类，见第 3 节 |
| `description` | string | 插件介绍，8–300 个字 |
| `main` | string | 插件主代码，最大 200KB |

可选字段：

- `icon`：一个 emoji 或 1–8 个字符的图标。
- `ui`：插件按钮，最多 8 个。
- `permissions`：权限声明字符串数组，最多 12 项。
- `homepage`：插件主页或说明地址，最长 300 个字符。

## 3. 插件分类

分类固定为以下五类，不能自造：

- `聊天增强`：快捷回复、消息整理、聊天辅助。
- `媒体`：图片、视频、音频相关工具。
- `工具`：便签、计算、格式转换等通用工具。
- `主题`：配色、壁纸、界面装饰。
- `集成`：对接外部服务或开放 API。

## 4. 平台与版本校验

- `target=pc` 只能安装在电脑端，`target=phone` 只能安装在手机端，`target=both` 两端都可安装。
- 在手机端导入 `target=pc` 插件，或在电脑端导入 `target=phone` 插件，会返回“平台不匹配，安装失败”。
- 当前 App 版本高于 `maxApp` 或低于 `minApp` 时，安装失败。
- 已安装插件的总内存不得超过 256MB；单个插件不得超过 64MB。
- 重装和更新会沿用原插件包，但仍会重新执行平台、版本与内存校验。

## 5. UI 插槽

`ui` 中每一项的字段：

```json
{
  "id": "hello",
  "slot": "header",
  "label": "打招呼",
  "icon": "👋",
  "order": 10
}
```

支持的插槽：

- `compose`：聊天输入栏，显示为一个小按钮。
- `header`：聊天页顶部，显示为文字按钮。
- `settings`：预留给插件设置入口，当前版本仅注册按钮，不单独占一行。

插件按钮的 `id` 只能使用小写字母、数字和短横线，同一插件内不能重复；`label` 为 1–12 个字；`order` 越小越靠前。

插件加载后可以用 `api.ui.addButton()` 动态追加按钮，用 `api.ui.addSettingsPanel()` 在插件中心追加设置面板。

## 6. 插件 API v1

插件主代码通过 `new Function('api', code)` 执行，函数体内可以直接使用传入的 `api` 对象。

```js
api.app.version                  // 当前 App 版本，例如 0.40.29
api.app.platform                 // pc 或 phone
api.plugin.id / name / version   // 当前插件信息
api.log(...args)                 // 写控制台
api.toast(text)                  // 客户端轻提示
api.storage.get(key, fallback)   // 插件独立本地存储
api.storage.set(key, value)
api.storage.remove(key)
api.chat.sendText(text)          // 在当前聊天页发送文本
api.chat.currentPeer()           // 当前会话 ID
api.chat.onMessage(fn)           // 收到消息时回调
api.ui.onButton(buttonId, fn)    // 绑定插件按钮
api.ui.addButton(button, fn)     // 动态添加按钮
api.ui.addSettingsPanel({...})   // 添加设置面板
api.ui.refresh()                 // 刷新按钮与面板
api.net.get(url, options)        // GET 文本
api.net.post(url, body, headers) // POST 文本
api.events.on(name, fn)          // 插件间事件
api.events.emit(name, data)
```

插件代码在客户端本地执行，必须自行处理异常；建议只在用户点击按钮时执行耗时操作。

## 7. 在线商店

商店索引地址：`https://hamburgerwow.top/plugins/registry.json`

索引格式：

```json
{
  "schema": "burger-plugin-store/v1",
  "updated": 1795363085000,
  "weekly": {
    "week": "2026-W48",
    "top": ["bcp.hamburgerwow.hello", "bcp.hamburgerwow.focus-note", "bcp.hamburgerwow.media-tip"],
    "updated": 1795363085000
  },
  "plugins": [
    {
      "id": "bcp.hamburgerwow.hello",
      "name": "快捷打招呼",
      "version": "1.0.0",
      "developer": "Hamburgerwow",
      "target": "both",
      "minApp": "0.40.31",
      "maxApp": "0.40.99",
      "apiVersion": 1,
      "memoryMB": 4,
      "category": "聊天增强",
      "description": "……",
      "icon": "👋",
      "download": "plugins/bcp.hamburgerwow.hello-1.0.0.bcp.json",
      "sha256": "……",
      "rating": 4.7,
      "ratingCount": 32,
      "tags": ["快捷", "聊天"],
      "updated": 1795363085000
    }
  ]
}
```

商店下载时会校验 `sha256`；客户端优先走 HTTP 商店地址，失败后回退 HTTPS。

### 7.1 评分与本周精选

- `rating`：商店榜单平均分（0–5），`ratingCount`：评分人数。
- `weekly.top`：本周精选的插件 ID 数组，最多 3 个；两端商店固定置顶并显示 TOP1–3 徽章。
- `weekly.week`：ISO 周编号，例如 `2026-W48`；跨周后由开发者中心重新结算。
- 客户端评分先保存在本机 `bcp.rating.v1`，并同步更新详情页的本地展示。
- 如需跨设备汇总评分，在 registry 里增加 `rateApi` 地址；客户端会把 `{id, score, client, ts}` POST 过去，由服务端聚合后回写 `rating` / `ratingCount`。
- 排序规则：本周精选优先，其次按 `rating` 降序，再按 `ratingCount` 降序。

### 7.2 商店三级菜单

两端客户端的插件商店使用三级结构：

1. 插件中心
2. 在线商店（搜索、分类、本周精选）
3. 插件详情（介绍、评分、安装进度、插件设置）

详情页底部提供安装按钮；安装时显示下载、哈希校验、平台校验三个阶段和进度条。已安装插件在详情页和已安装列表里都有「插件设置」入口，可停用、启用、重装、导出和删除。

## 8. 开发者中心与上架

插件上架完全依赖电脑网页端开发者中心：`https://hamburgerwow.top/developer`。客户端已移除上传入口，只保留导入本地插件和安装商店插件。

首次进入开发者中心需要建立开发者名片：

- 开发者名称
- 头像（本地压缩为 128×128）
- 开发心情
- 邮箱 + 邮箱验证码
- 开发者标识（用于插件 ID 的 `bcp.<标识>.<插件名>`）

邮箱验证码默认走本机邮件网关 `http://127.0.0.1:8787/email/send`，真实发送到邮箱；网关未启动时页面会明确提示并给出本地演示码。生产环境也可在设置里改成其他邮件网关地址，客户端会 POST `{email, code, scene}`，由网关真实发送验证码邮件；网关返回 `{ok:true}` 即视为发送成功。

上架流程：

1. 在「AI 插件工坊」填插件资料和图形化功能块，写需求提示词。
2. 已有 `.bcp.json` 可直接点「导入 .bcp.json」：读取 JSON 后校验 `schema`、`id`、`main`，载入草稿并自动编译；适合继续修改、重新审核或再发布。
3. 点「生成并编译」：默认调用在线开源模型（Pollinations GPT-OSS 20B，免 Key）输出 manifest + main；也可在设置里切换硅基流动 Qwen2.5、OpenRouter Llama 3.3、Hugging Face Qwen2.5 或本机 Ollama。
4. 编译阶段校验 manifest 字段、JavaScript 语法、API 调用和危险代码模式。
5. 在「上架审核」运行本地规则 + 开源模型复核；审核通过后代码不能再次修改，否则审核失效。
6. 审核通过后自动执行发布：生成并导出 `.bcp.json`，同时打开 GitHub 上传页；没有 Token 时把包拖入 `plugins/` 提交即可。若配置了 `PUBLISH_API` 代发后端，则可直接写入 GitHub。
7. 本周精选点「导出本周精选 registry」生成 `registry.json` 并覆盖上传；Cloudflare 构建完成后，两端商店生效。

AI 工坊已移除动态壁纸同步，不再读取电脑端 `GET http://127.0.0.1:8080/api/wall`，也不会在工坊里加载壁纸层。设置页的「网页外观」可自定义开发者中心背景色和字体颜色，保存在本机 `bcp.dev.settings.v1`；颜色深浅会自动切换深色或浅色卡片，保证正文可读。

## 9. AI 审核

审核分两层：

1. 本地规则：扫描名称、介绍、提示词和代码，拦截暴力血腥、色情低俗、未成年人性化、违法危险、赌博毒品、仇恨歧视、隐私窃取和恶意代码；同时检查 `eval`、动态 `Function`、`document.cookie`、直接 `localStorage`、`XMLHttpRequest`、`WebSocket`、顶层跳转等危险写法。
2. 开源模型复核：默认通过在线 OpenAI 兼容接口调用 GPT-OSS 20B（Pollinations，免 Key）；可在设置里切到硅基流动 Qwen2.5、OpenRouter Llama 3.3、Hugging Face Qwen2.5 或本机 Ollama，要求只返回 `{pass, categories, reason, score}` JSON。免费接口有额度冷却（约每 45 秒一次），页面会自动等待并重试；模型持续不可用时不得发布。

审核不通过、编译不通过或审核后代码被修改，都不允许发布。

## 10. 安全边界

- 插件只能访问 `api` 暴露的能力，不直接获得 Node 或系统权限。
- 插件代码在独立函数作用域内执行，禁止 `eval`、动态 `Function`、直接读写 cookie、直接访问 `localStorage`、`XMLHttpRequest`、`WebSocket`、顶层跳转和外链脚本注入。
- 插件存储在客户端本地，删除插件会同时移除它的本地存储入口。
- 已安装插件可以停用；停用后不加载代码、不显示按钮。
- 不要安装来源不明的插件；发布到商店的插件必须保留可核对的开发者信息、版本号、审核记录和哈希。
