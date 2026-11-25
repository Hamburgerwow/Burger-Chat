# Burger Chat 官网版本 2026-11-25_1429_HomePlayerHide

- 归档时间：2026-11-25 14:32:17 +08:00
- 线上地址：https://hamburgerwow.top/
- 文件数：84
- 原始体积：23.31 MB
- 本地来源：D:\app1\官网（部署 staging）

## 本版包含

- 官网五种语言首页、Director Bao 目标页、开发者页面
- 新增 Burger music 音乐子站（burger-music.html）
- assets、api、dl、music、plugins、wallpapers 以及 build-site.js
- 每个文件的 SHA-256 清单见 VERSION.json

## 本版更新

- 主页播放卡片在“播放模式”右侧新增隐藏按钮，点击后整张卡片收纳到顶部标签栏，只保留歌曲封面
- 点击顶部封面可恢复播放卡片；封面、歌名、播放模式、进度等状态保持同步
- 歌词卡片放大入口固定在顶部标签栏，桌面从右上展开，手机进入全屏歌词
- 顶部导航移除 Burger music 入口，统一从“标题选择网页”轮播中的 05 Burger music 卡片进入
- 桌面 1280 / 手机 390 均已验收，Cloudflare 缓存已刷新；独立快照不覆盖历史版本

## 恢复方式

把本目录下 site/ 内的全部文件覆盖到网站发布根目录，再执行部署即可。历史版本目录不会互相覆盖。
