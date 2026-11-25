# Burger Chat 官网版本 2026-11-25_2120_TopbarMusic12-centered

- 归档时间：2026-11-25 21:01:31 +08:00
- 线上地址：https://hamburgerwow.top/
- 文件数：88
- 原始体积：23.67 MB
- 本地来源：D:\app1\官网

## 本版包含

- 官网五种语言首页、Director Bao 目标页、开发者页面、插件中心
- Burger music 音乐子站及隔离 Worker 源码（burger-music-isolated）
- assets、api、dl、music、plugins、wallpapers、worker.js 与 build-site.js
- 每个文件的 SHA-256 清单见 VERSION.json

## 本版更新

- 顶栏不再支持整条拖动，移除拖动手柄和浮动位置逻辑
- 顶栏菜单可添加或取消开发者中心、插件中心、音乐网站入口
- 三个入口固定在顶栏居中图标区域内，可用左右按钮调整顺序
- 关闭顶栏、右上角恢复、子网站管理保留
- 主站版本 20261125-topbar-music12，Burger music bm22-1

## 恢复方式

把本目录下 site/ 内的全部文件覆盖到网站发布根目录，再分别部署主 Worker 与 urger-music-isolated Worker。历史版本目录不会互相覆盖。
