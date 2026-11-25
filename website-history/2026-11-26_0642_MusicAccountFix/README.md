# Burger Chat 官网版本 2026-11-26_0642_MusicAccountFix

- 归档时间：2026-11-26 06:41:04 +08:00
- 线上地址：https://hamburgerwow.top/
- 文件数：97
- 原始体积：23.97 MB
- 本地来源：D:\app1\官网

## 本版包含

- 官网五种语言首页、Director Bao 目标页、开发者页面、插件中心
- Burger music 音乐子站及隔离 Worker 源码（burger-music-isolated）
- assets、api、dl、music、plugins、wallpapers、worker.js 与 build-site.js
- 每个文件的 SHA-256 清单见 VERSION.json

## 本版更新

- 修复音乐站 /burger-music 无尾斜杠时相对路径解析到 /assets 旧脚本，注册/登录请求被发到 /api/account 返回 not_found
- 音乐站账号脚本改从 /burger-music/assets 加载并升到 bm37，API 固定为 /burger-music/api/account/
- 同步音乐站 site-shared.js 到最新版，登录卡片与账号入口保持一致
- 线上实测注册、退出、再次登录成功，桌面与手机尺寸通过
- Burger music Worker 58e6d5ed-dda2-4e3f-a2bf-f8d1a101ba05

## 恢复方式

把本目录下 site/ 内的全部文件覆盖到网站发布根目录，再分别部署主 Worker 与 urger-music-isolated Worker。历史版本目录不会互相覆盖。
