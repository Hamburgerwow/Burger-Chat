# Burger Chat 官网版本 2026-11-26_0620_BurgerHomeCardFix

- 归档时间：2026-11-26 06:20:53 +08:00
- 线上地址：https://hamburgerwow.top/
- 文件数：97
- 原始体积：23.94 MB
- 本地来源：D:\app1\官网

## 本版包含

- 官网五种语言首页、Director Bao 目标页、开发者页面、插件中心
- Burger music 音乐子站及隔离 Worker 源码（burger-music-isolated）
- assets、api、dl、music、plugins、wallpapers、worker.js 与 build-site.js
- 每个文件的 SHA-256 清单见 VERSION.json

## 本版更新

- 修复登录/注册卡片模板缺少 </p>，资料、登录/注册/扫码页签、输入框与按钮恢复完整并居中
- 登录入口改用独立样式类，关闭「版本号」不再连带隐藏登录按钮
- 版本号卡片改为读取 /api/latest，显示真实发布日期、Windows / Android 版本与最新更新
- 版本卡支持内容滚动、手机点按开合、桌面悬停缓冲；打开账号卡自动收起
- 修复未登录时误显示「退出登录」，支持 Esc 与点击遮罩关闭
- 主站 build 20261126-home36，site-v4 v32h，site-shared v32h

## 恢复方式

把本目录下 site/ 内的全部文件覆盖到网站发布根目录，再分别部署主 Worker 与 urger-music-isolated Worker。历史版本目录不会互相覆盖。
