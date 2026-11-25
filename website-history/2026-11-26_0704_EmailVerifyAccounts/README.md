# Burger Chat 官网版本 2026-11-26_0704_EmailVerifyAccounts

- 归档时间：2026-11-26 07:05:09 +08:00
- 线上地址：https://hamburgerwow.top/
- 文件数：98
- 原始体积：24.02 MB
- 本地来源：D:\app1\官网

## 本版包含

- 官网五种语言首页、Director Bao 目标页、开发者页面、插件中心
- 三端统一的邮箱验证注册登录卡片与右下角兜底入口
- Burger music 音乐子站及隔离 Worker 源码（burger-music-isolated）
- 邮箱验证后端 account.js、SMTP 发信、会话与云端同步
- 每个文件的 SHA-256 清单见 VERSION.json

## 本版更新

- 主页、开发者中心、音乐站共用邮箱验证账号体系
- 注册：邮箱 + 密码 + 名称 + 邮箱验证码
- 登录：邮箱 + 密码 + 邮箱验证码
- 验证码 10 分钟有效，60 秒内不能重发，每邮箱每小时最多 5 次
- 公共弹窗样式改为脚本自注入，新页面引入 site-shared.js 即保留登录入口
- 音乐站账号卡同步邮箱、名称、验证码与发送按钮
- 主站部署 burger-chat-live / 6b9707eb-2b15-4682-84fe-c0e8069ca512
- 音乐站部署 burger-music-live / 6c5bed6b-1f05-4856-8b5d-5f94f1325f3f

## 恢复方式

把本目录下 site/ 内的全部文件覆盖到网站发布根目录，再分别部署主 Worker 与 urger-music-isolated Worker。历史版本目录不会互相覆盖。
