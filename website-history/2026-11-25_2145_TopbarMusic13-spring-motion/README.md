# Burger Chat 官网版本 2026-11-25_2145_TopbarMusic13-spring-motion

- 归档时间：2026-11-25 21:29:08 +08:00
- 线上地址：https://hamburgerwow.top/
- 文件数：88
- 原始体积：23.71 MB
- 本地来源：D:\app1\官网

## 本版包含

- 官网五种语言首页、Director Bao 目标页、开发者页面、插件中心
- Burger music 音乐子站及隔离 Worker 源码（burger-music-isolated）
- assets、api、dl、music、plugins、wallpapers、worker.js 与 build-site.js
- 每个文件的 SHA-256 清单见 VERSION.json

## 本版更新

- 顶栏快捷入口、自定义子网站增加滑入/滑出与弹性动画
- 手机端顶部菜单栏改为全透明
- 版本号支持悬停或点击弹出更新卡片，显示当前版本与更新内容
- 关闭顶栏时音乐卡片缩放成歌曲封面，点击封面可恢复
- 歌词、Fort、语言、版本、下载、子网站、播放器封面均可单独隐藏
- 主站版本 20261125-topbar-music13，Burger music bm22-1

## 恢复方式

把本目录下 site/ 内的全部文件覆盖到网站发布根目录，再分别部署主 Worker 与 urger-music-isolated Worker。历史版本目录不会互相覆盖。
