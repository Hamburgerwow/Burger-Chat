# Burger Chat 官网版本 2026-11-25_2050_TopbarMusic10-drag

- 归档时间：2026-11-25 20:25:49 +08:00
- 线上地址：https://hamburgerwow.top/
- 文件数：88
- 原始体积：23.66 MB
- 本地来源：D:\app1\官网

## 本版包含

- 官网五种语言首页、Director Bao 目标页、开发者页面、插件中心
- Burger music 音乐子站及隔离 Worker 源码（burger-music-isolated）
- assets、api、dl、music、plugins、wallpapers、worker.js 与 build-site.js
- 每个文件的 SHA-256 清单见 VERSION.json

## 本版更新

- 修复 Burger music 当前音源无法播放：改为网易云官方直链优先，meting 仅兜底
- 音频中转支持 Range，并在 meting 不可用时快速失败，避免 45 秒挂起
- 顶栏菜单加入开发者中心、插件中心、音乐网站三个快捷入口
- 顶栏支持拖动位置、关闭与恢复，并提供专用拖动手柄
- 主站版本 20261125-topbar-music10，Burger music bm22-1

## 恢复方式

把本目录下 site/ 内的全部文件覆盖到网站发布根目录，再分别部署主 Worker 与 urger-music-isolated Worker。历史版本目录不会互相覆盖。
