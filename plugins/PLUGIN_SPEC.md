# Burger Chat 插件规范 v1

Burger Chat 电脑端和手机端共用一套插件格式。插件是一个 JSON 文件，安装后由客户端在本地执行；不匹配当前平台或当前版本的插件会直接安装失败。

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
  "plugins": [
    {
      "id": "bcp.hamburgerwow.hello",
      "name": "快捷打招呼",
      "version": "1.0.0",
      "developer": "Hamburgerwow",
      "target": "both",
      "minApp": "0.40.29",
      "maxApp": "0.40.99",
      "apiVersion": 1,
      "memoryMB": 4,
      "category": "聊天增强",
      "description": "……",
      "icon": "👋",
      "download": "plugins/bcp.hamburgerwow.hello-1.0.0.bcp.json",
      "sha256": "……",
      "updated": 1795363085000
    }
  ]
}
```

商店下载时会校验 `sha256`；客户端优先走 HTTP 商店地址，失败后回退 HTTPS。

## 8. 上传与发布

客户端「插件 → 上传插件」支持两种方式：

1. 填 GitHub Token，校验通过后直接写入 GitHub 仓库的 `plugins/` 目录，并更新 `plugins/registry.json`。
2. 没有 Token 时，导出插件文件，再点「在 GitHub 提交」发起上架申请。

上传前必须填写开发人员、适配版本上限、需要内存、分类和插件介绍；ID、版本与包名由清单决定并强制校验。

## 9. 安全边界

- 插件只能访问 `api` 暴露的能力，不直接获得 Node 或系统权限。
- 插件存储在客户端本地，删除插件会同时移除它的本地存储入口。
- 不要安装来源不明的插件；发布到商店的插件应保留可核对的开发者信息与版本号。
