# Burger Chat 官网版本 2026-11-26_0925_ChinaFirebaseMail

- 归档时间：2026-11-26 09:13:34 +08:00
- 线上地址：https://hamburgerwow.top/
- 文件数：99
- 原始体积：24.04 MB
- 本地来源：D:\app1\官网

## 本版包含

- 官网五种语言首页、Director Bao 目标页、开发者页面、插件中心
- 主站与音乐站的 Firebase 邮箱密码登录/注册弹窗
- 国内可访问的官网域名验证邮件与重置邮件流程
- Firebase Admin 服务账号后端 account.js（Cloudflare Worker 中转）
- Burger music 音乐子站及隔离 Worker 源码（burger-music-isolated）
- verify-email.html 与 reset-password.html
- 每个文件的 SHA-256 清单见 VERSION.json

## 本版更新

- 验证邮件、重置邮件改由官网域名发送，彻底移除 firebaseapp.com 链接
- 点击邮件链接后由 Worker 使用 Admin 服务账号完成 Firebase 邮箱验证或改密
- 新增邮箱验证成功页与设置新密码页
- 修正重置密码必须按 localId 更新的问题
- 主站部署 burger-chat-live / 0ce29a82-c76d-47c5-8155-31d87d63b675
- 音乐站部署 burger-music-live / 7d0c0e5c-ee27-49db-8f81-04f9748ddcb5

## 恢复方式

把本目录下 site/ 内的全部文件覆盖到网站发布根目录，再分别部署主 Worker 与 urger-music-isolated Worker。历史版本目录不会互相覆盖。

## 完整快照包

- GitHub Release 资产：`Burger-Chat-Website-2026-11-26_0925_ChinaFirebaseMail.zip`
- SHA-256：`d3d3f905b3459398abbde45457b758f91108ed3505064742444d90cfc5947660`
