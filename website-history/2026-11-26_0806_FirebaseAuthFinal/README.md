# Burger Chat 官网版本 2026-11-26_0806_FirebaseAuthFinal

- 归档时间：2026-11-26 08:07:14 +08:00
- 线上地址：https://hamburgerwow.top/
- 文件数：97
- 原始体积：24.03 MB
- 本地来源：D:\app1\官网

## 本版包含

- 官网五种语言首页、Director Bao 目标页、开发者页面、插件中心
- 主站与音乐站的 Firebase 邮箱密码登录/注册弹窗
- Firebase Identity Toolkit REST 后端 account.js（Cloudflare Worker 中转）
- Burger music 音乐子站及隔离 Worker 源码（burger-music-isolated）
- 每个文件的 SHA-256 清单见 VERSION.json
- Windows/安卓大文件不重复归档，从 v0.40.54 Release 下载

## 本版更新

- 账号体系整体替换为 Firebase Authentication
- 注册后必须点击 Firebase 验证邮件链接才能登录
- 登录、重发验证邮件、忘记密码全部改为 Firebase
- 旧自建邮箱验证码账号停用，用原邮箱重新注册
- 主站部署 burger-chat-live / 56243b2e-c5cc-446d-a7e8-04b206047092
- 音乐站部署 burger-music-live / dd9e8802-eced-468f-81da-7b524f14e770

## 恢复方式

把本目录下 site/ 内的全部文件覆盖到网站发布根目录，再分别部署主 Worker 与 urger-music-isolated Worker。历史版本目录不会互相覆盖。

## 完整快照包

- GitHub Release 资产：`Burger-Chat-Website-2026-11-26_0806_FirebaseAuthFinal.zip`
- SHA-256：`c4b5a3dd3788dc2ac12a6b200281a298690290d76dad22debfeb07775e983705`
