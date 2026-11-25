# Burger Chat 官网版本 2026-11-26_0401_PinkTheme-MusicModal-AISource

- 归档时间：2026-11-26 04:02:01 +08:00
- 线上地址：https://hamburgerwow.top/
- 文件数：89
- 原始体积：23.63 MB
- 本地来源：D:\app1\官网

## 本版包含

- 官网五种语言首页、Director Bao 目标页、开发者页面、插件中心
- Burger music 音乐子站及隔离 Worker 源码（burger-music-isolated）
- assets、api、dl、music、plugins、wallpapers、worker.js 与 build-site.js
- 每个文件的 SHA-256 清单见 VERSION.json

## 本版更新

- 默认粉红皮肤，5 套预设、字体颜色、0–32px 顶栏模糊可调
- 顶栏按键透明玻璃，播放器胶囊与次级按钮跟随主题色
- 今日歌单 / 我的歌单改为弹窗卡片，手机端弹窗不再被侧栏遮挡
- 酷狗真实封面与播放时长修复（嵌套 union_cover + 时长秒化）
- 导入歌单数量归一化，最多 2000 首并写回脏数据
- AI 音源雷达支持在线 HTTP 音源与本机 LX Music API 自动发现
- 主站版本 20261126-pinktheme17，Burger music 20261126-burger-music28

## 恢复方式

把本目录下 site/ 内的全部文件覆盖到网站发布根目录，再分别部署主 Worker 与 urger-music-isolated Worker。历史版本目录不会互相覆盖。
