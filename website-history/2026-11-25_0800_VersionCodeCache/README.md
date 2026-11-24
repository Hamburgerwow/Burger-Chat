# Burger Chat 官网版本 2026-11-25_0800_VersionCodeCache

- 归档时间：2026-11-25 05:56:12 +08:00
- 线上地址：https://hamburgerwow.top/
- 文件数：68
- 原始体积：22.22 MB
- 本地来源：D:\app1\官网

## 本版包含

- 官网五种语言首页、Director Bao 目标页、开发者页面
- assets、api、dl、music、plugins、wallpapers 以及 build-site.js
- 每个文件的 SHA-256 清单见 VERSION.json

## 本版修复

- 安卓页面地址加入 versionCode 缓存参数，安装新包后不会再复用旧 WebView 页面
- 版本号改为读取已安装 APK 的 versionName，连接诊断页直接显示实际 App 版本
- 手机更新清单最新版为 0.40.58 / versionCode 87，APK 直链带版本参数
- 官网五种语言版本说明与下载入口同步

## 恢复方式

把本目录下 site/ 内的全部文件覆盖到网站发布根目录，再执行部署即可。历史版本目录不会互相覆盖。
