#!/usr/bin/env node
/* Build the five static Burger Chat language pages. Run: node tools/build-site.js */
const fs = require('fs');
const path = require('path');

const VERSION = '0.40.53';
const DATE = '2026-11-24';
const SITE = 'https://hamburgerwow.top';
const GITHUB = 'https://github.com/Hamburgerwow/Burger-Chat/releases/tag/v0.40.53';
const ROOT = path.resolve(__dirname, '..');

const langLinks = [
  ['zh-CN', '简中', 'index.html'],
  ['zh-TW', '繁中', 'index-tw.html'],
  ['en', 'English', 'index-en.html'],
  ['ja', '日本語', 'index-ja.html'],
  ['ko', '한국어', 'index-ko.html']
];

const BC = {
  'zh-CN': {
    kicker: 'PAGE SWITCHER', title: '标题选择网页', hint: '左右切换页面 · 点击卡片进入',
    close: '关闭页面切换', prev: '上一个页面', next: '下一个页面', go: '进入页面',
    switching: '正在切换 Director Bao', entering: '正在进入 Director Bao', to: '正在前往',
    welcomeHome: '欢迎回家', welcomeEnter: '欢迎进入 Burger Chat',
    welcomeHomeSub: '回到你的桌面控制台', welcomeEnterSub: '本地直连 · 即开即用',
    mobileTitle: '切换失败', mobileText: '手机端暂不支持 Director Bao 网页切换', mobileBack: '返回当前页面',
    home: '首页', homeMeta: '动态壁纸 · 本地直连', devMeta: '桌面属性选择器 · 外部链接', devWebMeta: '开发者网页 · 外部链接', store: '插件商店', storeMeta: '在线插件 · 浏览与下载', langAria: '选择语言'
  },
  'zh-TW': {
    kicker: 'PAGE SWITCHER', title: '標題選擇網頁', hint: '左右切換頁面 · 點擊卡片進入',
    close: '關閉頁面切換', prev: '上一個頁面', next: '下一個頁面', go: '進入頁面',
    switching: '正在切換 Director Bao', entering: '正在進入 Director Bao', to: '正在前往',
    welcomeHome: '歡迎回家', welcomeEnter: '歡迎進入 Burger Chat',
    welcomeHomeSub: '回到你的桌面控制台', welcomeEnterSub: '區域網路直連 · 隨開即用',
    mobileTitle: '切換失敗', mobileText: '手機端暫不支援 Director Bao 網頁切換', mobileBack: '返回目前頁面',
    home: '首頁', homeMeta: '動態桌布 · 區域網路直連', devMeta: '桌面屬性選擇器 · 外部連結', devWebMeta: '開發者網頁 · 外部連結', store: '外掛商店', storeMeta: '線上外掛 · 瀏覽與下載', langAria: '選擇語言'
  },
  en: {
    kicker: 'PAGE SWITCHER', title: 'Title Selection Page', hint: 'Swipe between pages · click a card to enter',
    close: 'Close page switcher', prev: 'Previous page', next: 'Next page', go: 'Enter page',
    switching: 'Switching Director Bao', entering: 'Entering Director Bao', to: 'Going to',
    welcomeHome: 'Welcome home', welcomeEnter: 'Welcome to Burger Chat',
    welcomeHomeSub: 'Back to your desktop control surface', welcomeEnterSub: 'Direct over LAN · Ready to go',
    mobileTitle: 'Switch failed', mobileText: 'Director Bao page switching is not supported on mobile yet.', mobileBack: 'Back to this page',
    home: 'Home', homeMeta: 'Dynamic wallpaper · Direct over LAN', devMeta: 'Desktop attribute selector · External page', devWebMeta: 'Developer page · External link', store: 'Plugin Store', storeMeta: 'Online plugins · Browse and download', langAria: 'Choose language'
  },
  ja: {
    kicker: 'PAGE SWITCHER', title: 'タイトル選択ページ', hint: '左右に切り替え · カードをクリックして移動',
    close: 'ページ切り替えを閉じる', prev: '前のページ', next: '次のページ', go: 'このページへ',
    switching: 'Director Bao を切り替え中', entering: 'Director Bao へ移動中', to: '移動先',
    welcomeHome: 'おかえりなさい', welcomeEnter: 'Burger Chat へようこそ',
    welcomeHomeSub: 'デスクトップ・コントロールサーフェスへ', welcomeEnterSub: 'LAN 直結 · すぐ使える',
    mobileTitle: '切り替えに失敗', mobileText: 'スマホでは Director Bao のページ切り替えに対応していません。', mobileBack: '現在のページに戻る',
    home: 'ホーム', homeMeta: '動く壁紙 · LAN 直結', devMeta: 'デスクトップ属性セレクター · 外部ページ', devWebMeta: '開発者ページ · 外部リンク', store: 'プラグインストア', storeMeta: 'オンライン · 閲覧とダウンロード', langAria: '言語を選択'
  },
  ko: {
    kicker: 'PAGE SWITCHER', title: '제목 선택 페이지', hint: '좌우로 전환 · 카드를 눌러 이동',
    close: '페이지 전환 닫기', prev: '이전 페이지', next: '다음 페이지', go: '이 페이지로',
    switching: 'Director Bao 전환 중', entering: 'Director Bao로 이동 중', to: '이동 위치',
    welcomeHome: '다시 오신 것을 환영합니다', welcomeEnter: 'Burger Chat에 오신 것을 환영합니다',
    welcomeHomeSub: '데스크톱 컨트롤 서피스로 돌아왔습니다', welcomeEnterSub: 'LAN 직접 연결 · 바로 시작',
    mobileTitle: '전환 실패', mobileText: '휴대폰에서는 Director Bao 페이지 전환을 지원하지 않습니다.', mobileBack: '현재 페이지로 돌아가기',
    home: '홈', homeMeta: '동적 배경 · LAN 직접 연결', devMeta: '데스크톱 속성 선택기 · 외부 페이지', devWebMeta: '개발자 페이지 · 외부 링크', store: '플러그인 스토어', storeMeta: '온라인 플러그인 · 둘러보기와 다운로드', langAria: '언어 선택'
  }
};

const BC_GLYPHS = {
  home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 11 12 4l8 7v8H4z"/><path d="M9 20v-6h6v6"/></svg>',
  bc: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5h16v11H9l-5 4z"/><path d="M8 9h8M8 12h5"/></svg>',
  about: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5h16v11H9l-5 4z"/><path d="M8 9h8M8 12h5"/></svg>',
  release: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v11"/><path d="m7 10 5 5 5-5"/><path d="M4 20h16"/></svg>',
  ach: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3 2.4 4.9 5.4.8-3.9 3.8.9 5.4L12 15.4 7.2 18l.9-5.4-3.9-3.8 5.4-.8z"/></svg>',
  plug: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5h6v6H4zM14 5h6v6h-6zM4 15h6v6H4zM14 15h6v6h-6z"/></svg>',
  store: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9.5 5.4 4h13.2L20 9.5"/><path d="M4.5 9.5h15v10h-15z"/><path d="M9 19.5v-6h6v6"/><path d="M4 9.5c0 1.6 1.2 2.8 2.7 2.8s2.7-1.2 2.7-2.8c0 1.6 1.2 2.8 2.7 2.8s2.7-1.2 2.7-2.8c0 1.6 1.2 2.8 2.7 2.8S20 11.1 20 9.5"/></svg>',
};

const T = {
  'zh-CN': {
    file: 'index.html', htmlLang: 'zh-CN', locale: 'zh-CN', bodyClass: 'lang-zh', ogLocale: 'zh_CN',
    title: 'Burger Chat · 端更快，更新更顺畅',
    desc: 'Burger Chat 是手机与电脑在自家局域网里直连的聊天与传文件工具。动态壁纸、全幅磨砂窗口、成就与插件生态，一次下载即可使用。',
    brandSub: 'LOCAL-FIRST CHAT', topDownload: '下载',
    navLabel: '站内导航', navAbout: '软件介绍', navRelease: '最新版本', navAch: '成就', navPlugins: '插件',
    heroAlt: 'Burger Chat 猫耳少女图标角色',
    heroKicker: 'LIVE WALLPAPER · LOCAL-FIRST',
    h1a: '端更快，', h1b: '更新更顺畅',
    lead: '手机和电脑在自家局域网里直接聊。消息、图片和文件不经过第三方服务器；动态壁纸、全幅磨砂窗口和插件生态，让每一次连接都更顺手。',
    ctaWin: '下载 Windows 版', ctaAndroid: '下载安卓版', ctaRelease: '看看 0.40.52 更新',
    stat1v: '0.40.52', stat1l: '当前版本', stat2v: '5', stat2l: '种界面语言', stat3v: 'LAN', stat3l: '只走本地网络', stat4v: '2', stat4l: '手机 + 电脑',
    artChip: 'DYNAMIC WALLPAPER', artNoteSmall: '服务端本地运行', artNoteTitle: '无需账号', artNoteSub: '打开就能配对', scrollCue: '向下探索',
    aboutEyebrow: 'SOFTWARE · 01', aboutH2: '一间只属于自己的聊天室',
    aboutLead: 'Burger Chat 不靠云端中转：电脑端打开服务，手机扫码配对，文字、图片和文件就在路由器里走。窗口、壁纸、插件和成就都围绕这一个本地空间展开。',
    panelTitle: '消息不出门，文件不绕路。',
    panelText: '不登录、不中转、不上传云端。电脑是服务端，手机是客户端，所有内容只在你自己的路由器里。',
    features: [
      ['01', '局域网直连', '同一 Wi-Fi 自动发现，消息和文件只经过你家路由器。'],
      ['02', '文件先预览', '图片、文档、安装包都能发，点开预览再保存，原图不压缩。'],
      ['03', '动态壁纸窗口', '全幅磨砂标题栏，静态图、GIF、视频和网页壁纸铺满窗口。'],
      ['04', '五种语言', '简体中文、繁体中文、English、日本語、한국어。']
    ],
    wallName: '动态壁纸已就位', wallDesc: '默认使用会呼吸的动态壁纸；也支持用 ?wall=视频地址 换成你自己的 MP4 / WebM 壁纸。',
    rcKicker: 'CURRENT RELEASE', rcVerSuffix: 'STABLE', rcStable: '已上线', rcPlatforms: 'Windows + Android',
    rcDate: '2026 年 11 月 24 日', releaseTitle: '最新版本与更新内容',
    releaseBullets: [
      "软件内标题栏、左侧栏和配对引导统一使用新版猫耳少女图标",
      "Windows 运行窗口、任务栏和 Alt+Tab 图标改为应用自己的图标，不再使用 PowerShell 默认图标",
      "电脑端源码的 window-host 同步带上 app.ico，整合包重新打包",
      "Windows EXE 0.40.52.0；安卓已更新到 0.40.56 / versionCode 85",
    ],
    dlWinName: 'Windows 电脑版', dlWinSub: '单文件 EXE · 双击即用', dlAndroidName: '安卓手机版', dlAndroidSub: 'APK · 扫码配对', dlBundleName: 'Windows 整合包', dlBundleSub: 'EXE + 电脑端源码',
    rcPrimary: '下载最新版', rcLink: '查看完整更新',
    extrasEyebrow: 'EXTRAS · 03', extrasH2: '成就与插件，一起长大', extrasLead: '记录每一次发送、接收和连接；也可以把插件装进同一个空间。',
    achEyebrow: 'PROGRESS', achTitle: '成就', achTag: '同步进度', achUnit: '个成就', achAdded: '本次新增 500 个成就', achSubRight: '总目录',
    achFoot: '登录邮箱后，手机、电脑与网页端合并进度。实时数据来自 ',
    achGroups: [['发送', 200], ['接收', 120], ['文件', 60], ['天数', 60], ['设备', 60]],
    plugEyebrow: 'ECOSYSTEM', plugTitle: '插件', plugTag: '在线商店', plugUnit: '个插件',
    plugFallback: [
      ['👋', '快捷打招呼', '聊天增强', 'TOP 1'],
      ['📝', '专注便签', '工具', 'TOP 2'],
      ['🖼️', '图片发送助手', '媒体', 'TOP 3']
    ],
    plugRegistry: '查看商店索引', plugDeveloper: 'Castle Developer', plugStoreCta: '进入插件商店',
    footTagline: '端更快，更新更顺畅。', footDownloadLabel: '下载', footMoreLabel: '更多',
    footLinkBundle: 'Windows 整合包', footLinkDeveloper: 'Castle Developer', footLinkGitHub: 'GitHub Release', footLinkApi: '版本接口',
    footNote: '安装包与电脑端源码同步发布。', footMade: '为本地网络而做',
    langLabel: '选择语言 / LANGUAGE', versionLabel: 'v'
  },
  'zh-TW': {
    file: 'index-tw.html', htmlLang: 'zh-Hant-TW', locale: 'zh-TW', bodyClass: 'lang-tw', ogLocale: 'zh_TW',
    title: 'Burger Chat · 端更快，更新更順暢',
    desc: 'Burger Chat 是手機與電腦在自家區域網路裡直連的聊天與傳檔工具。動態桌布、全幅霧面視窗、成就與外掛生態，一次下載即可使用。',
    brandSub: 'LOCAL-FIRST CHAT', topDownload: '下載',
    navLabel: '站內導覽', navAbout: '軟體介紹', navRelease: '最新版本', navAch: '成就', navPlugins: '外掛',
    heroAlt: 'Burger Chat 貓耳少女圖示角色',
    heroKicker: 'LIVE WALLPAPER · LOCAL-FIRST',
    h1a: '端更快，', h1b: '更新更順暢',
    lead: '手機和電腦在自家區域網路裡直接聊。訊息、圖片和檔案不經過第三方伺服器；動態桌布、全幅霧面視窗和外掛生態，讓每一次連線都更順手。',
    ctaWin: '下載 Windows 版', ctaAndroid: '下載 Android 版', ctaRelease: '看看 0.40.52 更新',
    stat1v: '0.40.52', stat1l: '目前版本', stat2v: '5', stat2l: '種介面語言', stat3v: 'LAN', stat3l: '只走區域網路', stat4v: '2', stat4l: '手機 + 電腦',
    artChip: 'DYNAMIC WALLPAPER', artNoteSmall: '服務端本機執行', artNoteTitle: '免帳號', artNoteSub: '打開就能配對', scrollCue: '向下探索',
    aboutEyebrow: 'SOFTWARE · 01', aboutH2: '一間只屬於自己的聊天室',
    aboutLead: 'Burger Chat 不靠雲端中轉：電腦端打開服務，手機掃碼配對，文字、圖片和檔案就在路由器裡走。視窗、桌布、外掛和成就都圍繞這一個本機空間展開。',
    panelTitle: '訊息不出門，檔案不繞路。',
    panelText: '免登入、不中轉、不上傳雲端。電腦是伺服器，手機是客戶端，所有內容只在你自己的路由器裡。',
    features: [
      ['01', '區域網路直連', '同一個 Wi-Fi 自動發現，訊息和檔案只經過你家路由器。'],
      ['02', '檔案先預覽', '圖片、文件、安裝包都能傳，點開預覽再儲存，原圖不壓縮。'],
      ['03', '動態桌布視窗', '全幅霧面標題列，靜態圖、GIF、影片和網頁桌布鋪滿視窗。'],
      ['04', '五種語言', '簡體中文、繁體中文、English、日本語、한국어。']
    ],
    wallName: '動態桌布已就位', wallDesc: '預設使用會呼吸的動態桌布；也支援用 ?wall=影片網址 換成你自己的 MP4 / WebM 桌布。',
    rcKicker: 'CURRENT RELEASE', rcVerSuffix: 'STABLE', rcStable: '已上線', rcPlatforms: 'Windows + Android',
    rcDate: '2026 年 11 月 24 日', releaseTitle: '最新版本與更新內容',
    releaseBullets: [
      "軟體內標題列、左側欄和配對引導統一使用新版貓耳少女圖示",
      "Windows 執行視窗、工作列和 Alt+Tab 圖示改為應用程式自己的圖示，不再使用 PowerShell 預設圖示",
      "電腦端原始碼的 window-host 同步帶上 app.ico，整合包重新打包",
      "Windows EXE 0.40.52.0；Android 已更新到 0.40.56 / versionCode 85",
    ],
    dlWinName: 'Windows 電腦版', dlWinSub: '單檔 EXE · 雙擊即用', dlAndroidName: 'Android 手機版', dlAndroidSub: 'APK · 掃碼配對', dlBundleName: 'Windows 整合包', dlBundleSub: 'EXE + 電腦端原始碼',
    rcPrimary: '下載最新版', rcLink: '查看完整更新',
    extrasEyebrow: 'EXTRAS · 03', extrasH2: '成就與外掛，一起長大', extrasLead: '記錄每一次傳送、接收和連線；也可以把外掛裝進同一個空間。',
    achEyebrow: 'PROGRESS', achTitle: '成就', achTag: '同步進度', achUnit: '個成就', achAdded: '本次新增 500 個成就', achSubRight: '總目錄',
    achFoot: '登入信箱後，手機、電腦與網頁端合併進度。即時資料來自 ',
    achGroups: [['傳送', 200], ['接收', 120], ['檔案', 60], ['天數', 60], ['裝置', 60]],
    plugEyebrow: 'ECOSYSTEM', plugTitle: '外掛', plugTag: '線上商店', plugUnit: '個外掛',
    plugFallback: [
      ['👋', '快速打招呼', '聊天增強', 'TOP 1'],
      ['📝', '專注便籤', '工具', 'TOP 2'],
      ['🖼️', '圖片傳送助手', '媒體', 'TOP 3']
    ],
    plugRegistry: '查看商店索引', plugDeveloper: 'Castle Developer', plugStoreCta: '進入外掛商店',
    footTagline: '端更快，更新更順暢。', footDownloadLabel: '下載', footMoreLabel: '更多',
    footLinkBundle: 'Windows 整合包', footLinkDeveloper: 'Castle Developer', footLinkGitHub: 'GitHub Release', footLinkApi: '版本介面',
    footNote: '安裝包與電腦端原始碼同步發布。', footMade: '為區域網路而做',
    langLabel: '選擇語言 / LANGUAGE', versionLabel: 'v'
  },
  en: {
    file: 'index-en.html', htmlLang: 'en', locale: 'en-US', bodyClass: 'lang-en', ogLocale: 'en_US',
    title: 'Burger Chat · Faster locally. Smoother with every update.',
    desc: 'Burger Chat is private LAN chat and file transfer for phone and desktop, with dynamic wallpapers, a full-width frosted window, achievements, and plugins.',
    brandSub: 'LOCAL-FIRST CHAT', topDownload: 'Download',
    navLabel: 'Site sections', navAbout: 'About', navRelease: 'Release', navAch: 'Achievements', navPlugins: 'Plugins',
    heroAlt: 'Burger Chat cat-ear mascot',
    heroKicker: 'LIVE WALLPAPER · LOCAL-FIRST',
    h1a: 'Faster locally.', h1b: 'Smoother every update.',
    lead: 'Chat and share files between your phone and PC over your own Wi-Fi. No third-party server, no cloud relay — just dynamic wallpapers, a seamless frosted window, and a growing plugin space.',
    ctaWin: 'Download for Windows', ctaAndroid: 'Download for Android', ctaRelease: 'See what’s new in 0.40.52',
    stat1v: '0.40.52', stat1l: 'Current release', stat2v: '5', stat2l: 'Interface languages', stat3v: 'LAN', stat3l: 'Local network only', stat4v: '2', stat4l: 'Phone + desktop',
    artChip: 'DYNAMIC WALLPAPER', artNoteSmall: 'RUNS LOCALLY', artNoteTitle: 'No account needed', artNoteSub: 'Pair and chat', scrollCue: 'SCROLL TO EXPLORE',
    aboutEyebrow: 'SOFTWARE · 01', aboutH2: 'A chat room that belongs to your network.',
    aboutLead: 'Burger Chat skips the cloud. Start the desktop app, scan the code with your phone, and messages, photos, and files travel through your router. The window, wallpapers, plugins, and achievements all live in that same local space.',
    panelTitle: 'Messages stay in. Files go direct.',
    panelText: 'No sign-in, no relay, no cloud upload. Your desktop is the server, your phone is the client, and everything stays on your router.',
    features: [
      ['01', 'Direct over LAN', 'Same Wi-Fi auto-discovery. Messages and files stay on your router.'],
      ['02', 'Preview before saving', 'Send photos, documents, and installers. Preview first; originals stay uncompressed.'],
      ['03', 'Dynamic wallpaper window', 'A full-width frosted title bar with still images, GIFs, video, and web wallpapers filling the window.'],
      ['04', 'Five languages', 'Simplified Chinese, Traditional Chinese, English, Japanese, and Korean.']
    ],
    wallName: 'Dynamic wallpaper, built in', wallDesc: 'The default wallpaper breathes with the page. Load your own MP4 / WebM file with ?wall=.',
    rcKicker: 'CURRENT RELEASE', rcVerSuffix: 'STABLE', rcStable: 'LIVE', rcPlatforms: 'Windows + Android',
    rcDate: 'Nov 24, 2026', releaseTitle: 'Latest release and what changed',
    releaseBullets: [
      "The title bar, left rail, and pairing guide now use the new cat-ear mascot icon",
      "The running window, taskbar, and Alt+Tab icon now use the app icon instead of the PowerShell default",
      "window-host in the desktop source now ships with app.ico, and the bundle is rebuilt",
      "Windows EXE 0.40.52.0 · Android updated to 0.40.56 / versionCode 85",
    ],
    dlWinName: 'Windows desktop', dlWinSub: 'Single EXE · double-click to run', dlAndroidName: 'Android phone', dlAndroidSub: 'APK · pair by QR', dlBundleName: 'Windows bundle', dlBundleSub: 'EXE + desktop source',
    rcPrimary: 'Get the latest build', rcLink: 'Full release notes',
    extrasEyebrow: 'EXTRAS · 03', extrasH2: 'Achievements and plugins, growing together.', extrasLead: 'Track every send, receive, and connection; then make the same space your own with plugins.',
    achEyebrow: 'PROGRESS', achTitle: 'Achievements', achTag: 'SYNCED', achUnit: 'achievements', achAdded: '500 added in this build', achSubRight: 'total',
    achFoot: 'Sign in with email to merge progress across phone, desktop, and web. Live data from ',
    achGroups: [['Send', 200], ['Receive', 120], ['Files', 60], ['Days', 60], ['Devices', 60]],
    plugEyebrow: 'ECOSYSTEM', plugTitle: 'Plugins', plugTag: 'ONLINE STORE', plugUnit: 'plugins indexed',
    plugFallback: [
      ['👋', 'Quick Hello', 'Chat boost', 'TOP 1'],
      ['📝', 'Focus Note', 'Tools', 'TOP 2'],
      ['🖼️', 'Image Send Helper', 'Media', 'TOP 3']
    ],
    plugRegistry: 'Browse the registry', plugDeveloper: 'Castle Developer', plugStoreCta: 'Open plugin store',
    footTagline: 'Faster locally. Smoother with every update.', footDownloadLabel: 'Download', footMoreLabel: 'More',
    footLinkBundle: 'Windows bundle', footLinkDeveloper: 'Castle Developer', footLinkGitHub: 'GitHub Release', footLinkApi: 'Version API',
    footNote: 'Installers and desktop source ship together.', footMade: 'Built for local networks',
    langLabel: 'SELECT LANGUAGE', versionLabel: 'v'
  },
  ja: {
    file: 'index-ja.html', htmlLang: 'ja', locale: 'ja-JP', bodyClass: 'lang-ja', ogLocale: 'ja_JP',
    title: 'Burger Chat · もっと速く、もっと滑らかな更新',
    desc: 'Burger Chat はスマホと PC を自宅 LAN で直接つなぐチャットとファイル転送ツール。動く壁紙、全幅フロスト調ウィンドウ、実績、プラグインをひとつに。',
    brandSub: 'LOCAL-FIRST CHAT', topDownload: 'ダウンロード',
    navLabel: 'ページ内ナビ', navAbout: 'ソフト紹介', navRelease: '最新版', navAch: '実績', navPlugins: 'プラグイン',
    heroAlt: 'Burger Chat の猫耳マスコット',
    heroKicker: 'LIVE WALLPAPER · LOCAL-FIRST',
    h1a: 'もっと速く、', h1b: 'もっと滑らかに。',
    lead: 'スマホと PC を、自宅の LAN だけでつなぐチャットとファイル転送。メッセージや画像は第三者サーバーを通りません。動く壁紙、全幅フロスト調ウィンドウ、プラグイン環境をひとつに。',
    ctaWin: 'Windows 版をダウンロード', ctaAndroid: 'Android 版をダウンロード', ctaRelease: '0.40.52 の更新を見る',
    stat1v: '0.40.52', stat1l: '現在のバージョン', stat2v: '5', stat2l: '画面言語', stat3v: 'LAN', stat3l: 'ローカルネットワークのみ', stat4v: '2', stat4l: 'スマホ + PC',
    artChip: 'DYNAMIC WALLPAPER', artNoteSmall: 'ローカルで動作', artNoteTitle: 'アカウント不要', artNoteSub: '開いてすぐペアリング', scrollCue: '下へスクロール',
    aboutEyebrow: 'SOFTWARE · 01', aboutH2: '自分の LAN に閉じた部屋。',
    aboutLead: 'Burger Chat はクラウドを経由しません。PC でサービスを起動し、スマホでコードを読み取れば、文字・写真・ファイルはルーターの中だけを移動します。ウィンドウ、壁紙、プラグイン、実績も同じローカル空間にあります。',
    panelTitle: 'メッセージもファイルも、外に出ない。',
    panelText: 'ログインなし、中継なし、クラウド送信なし。PC がサーバー、スマホがクライアント。すべては自分のルーターの中だけ。',
    features: [
      ['01', 'LAN 直結', '同じ Wi-Fi なら自動検出。メッセージもファイルもルーター内だけ。'],
      ['02', '保存前にプレビュー', '写真・書類・インストーラーを送信。原画を圧縮せず確認してから保存。'],
      ['03', '動く壁紙ウィンドウ', '全幅フロスト調タイトルバー。静止画・GIF・動画・Web 壁紙がウィンドウ全体に。'],
      ['04', '5 言語', '簡体字中国語、繁体字中国語、English、日本語、한국어。']
    ],
    wallName: '動く壁紙を標準搭載', wallDesc: '標準の壁紙はゆっくり動きます。?wall= で自分の MP4 / WebM 壁紙も読み込めます。',
    rcKicker: 'CURRENT RELEASE', rcVerSuffix: 'STABLE', rcStable: '公開中', rcPlatforms: 'Windows + Android',
    rcDate: '2026年11月24日', releaseTitle: '最新版と更新内容',
    releaseBullets: [
      "アプリ内のタイトルバー・左レール・ペアリング案内を新しい猫耳キャラのアイコンに統一",
      "実行ウィンドウ・タスクバー・Alt+Tab のアイコンをアプリ独自のものに変更し、PowerShell の既定アイコンを廃止",
      "PC 版ソースの window-host に app.ico を同梱し、バンドルを再作成",
      "Windows EXE 0.40.52.0 · Android は 0.40.56 / versionCode 85 に更新",
    ],
    dlWinName: 'Windows デスクトップ版', dlWinSub: '単体 EXE · ダブルクリックで起動', dlAndroidName: 'Android スマホ版', dlAndroidSub: 'APK · QR でペアリング', dlBundleName: 'Windows バンドル', dlBundleSub: 'EXE + PC 版ソース',
    rcPrimary: '最新版をダウンロード', rcLink: '更新内容をすべて見る',
    extrasEyebrow: 'EXTRAS · 03', extrasH2: '実績とプラグインを、ひとつの場所で。', extrasLead: '送信・受信・接続の記録を残し、同じ空間にプラグインを追加できます。',
    achEyebrow: 'PROGRESS', achTitle: '実績', achTag: '同期中', achUnit: '個の実績', achAdded: '今回 500 個追加', achSubRight: '総数',
    achFoot: 'メールでログインするとスマホ・PC・Web の進捗を統合。リアルタイムデータ: ',
    achGroups: [['送信', 200], ['受信', 120], ['ファイル', 60], ['日数', 60], ['端末', 60]],
    plugEyebrow: 'ECOSYSTEM', plugTitle: 'プラグイン', plugTag: 'オンラインストア', plugUnit: '個のプラグイン',
    plugFallback: [
      ['👋', 'クイックあいさつ', 'チャット強化', 'TOP 1'],
      ['📝', '集中メモ', 'ツール', 'TOP 2'],
      ['🖼️', '画像送信ヘルパー', 'メディア', 'TOP 3']
    ],
    plugRegistry: 'ストア索引を見る', plugDeveloper: 'Castle Developer', plugStoreCta: 'プラグインストアを開く',
    footTagline: 'もっと速く、もっと滑らかに。', footDownloadLabel: 'ダウンロード', footMoreLabel: 'その他',
    footLinkBundle: 'Windows バンドル', footLinkDeveloper: 'Castle Developer', footLinkGitHub: 'GitHub Release', footLinkApi: 'バージョン API',
    footNote: 'インストーラーと PC 版ソースを同時に公開。', footMade: 'ローカルネットワークのために',
    langLabel: '言語を選択 / LANGUAGE', versionLabel: 'v'
  },
  ko: {
    file: 'index-ko.html', htmlLang: 'ko', locale: 'ko-KR', bodyClass: 'lang-ko', ogLocale: 'ko_KR',
    title: 'Burger Chat · 더 빠르게, 더 매끄러운 업데이트',
    desc: 'Burger Chat은 휴대폰과 PC를 집 안 LAN으로 바로 연결하는 채팅·파일 전송 도구입니다. 동적 배경, 전체 폭 frosted 창, 업적, 플러그인을 한곳에.',
    brandSub: 'LOCAL-FIRST CHAT', topDownload: '다운로드',
    navLabel: '페이지 내 이동', navAbout: '소개', navRelease: '최신 버전', navAch: '업적', navPlugins: '플러그인',
    heroAlt: 'Burger Chat 고양이귀 마스코트',
    heroKicker: 'LIVE WALLPAPER · LOCAL-FIRST',
    h1a: '더 빠르게,', h1b: '더 매끄럽게.',
    lead: '휴대폰과 PC를 집 안의 LAN으로 바로 연결하는 채팅과 파일 전송. 메시지와 사진은 외부 서버를 거치지 않습니다. 동적 배경, 전체 폭 frosted 창, 플러그인 공간을 한곳에.',
    ctaWin: 'Windows 다운로드', ctaAndroid: 'Android 다운로드', ctaRelease: '0.40.52 업데이트 보기',
    stat1v: '0.40.52', stat1l: '현재 버전', stat2v: '5', stat2l: '인터페이스 언어', stat3v: 'LAN', stat3l: '로컬 네트워크만', stat4v: '2', stat4l: '휴대폰 + PC',
    artChip: 'DYNAMIC WALLPAPER', artNoteSmall: '로컬에서 실행', artNoteTitle: '계정 없이 시작', artNoteSub: '열고 바로 연결', scrollCue: '아래로 살펴보기',
    aboutEyebrow: 'SOFTWARE · 01', aboutH2: '내 네트워크에만 머무는 채팅방.',
    aboutLead: 'Burger Chat은 클라우드를 거치지 않습니다. PC에서 서비스를 열고 휴대폰으로 코드를 스캔하면 메시지·사진·파일이 공유기 안에서만 이동합니다. 창, 배경, 플러그인, 업적도 같은 로컬 공간에 있습니다.',
    panelTitle: '메시지는 밖으로, 파일은 돌아가지 않게.',
    panelText: '로그인도, 중계도, 클라우드 업로드도 없습니다. PC가 서버, 휴대폰이 클라이언트이며 모든 내용은 내 공유기 안에만 있습니다.',
    features: [
      ['01', 'LAN 직접 연결', '같은 Wi-Fi에서 자동 검색. 메시지와 파일은 공유기 안에서만 이동.'],
      ['02', '저장 전 미리보기', '사진·문서·설치 파일 전송. 먼저 본 뒤 저장하고 원본은 압축하지 않음.'],
      ['03', '동적 배경 창', '전체 폭 frosted 제목 표시줄, 정지 이미지·GIF·동영상·웹 배경이 창을 가득 채움.'],
      ['04', '5개 언어', '중국어 간체·번체, English, 日本語, 한국어.']
    ],
    wallName: '동적 배경 기본 탑재', wallDesc: '기본 배경은 천천히 움직입니다. ?wall=로 자신의 MP4 / WebM 배경을 넣을 수 있습니다.',
    rcKicker: 'CURRENT RELEASE', rcVerSuffix: 'STABLE', rcStable: '배포 중', rcPlatforms: 'Windows + Android',
    rcDate: '2026. 11. 24.', releaseTitle: '최신 버전과 변경 내용',
    releaseBullets: [
      "앱 내부 제목 표시줄, 왼쪽 레일, 페어링 안내를 새 고양이귀 캐릭터 아이콘으로 통일",
      "실행 창, 작업 표시줄, Alt+Tab 아이콘을 앱 자체 아이콘으로 변경하고 PowerShell 기본 아이콘 제거",
      "PC 소스의 window-host에 app.ico를 포함하고 번들을 다시 패키징",
      "Windows EXE 0.40.52.0 · Android 0.40.56 / versionCode 85 업데이트",
    ],
    dlWinName: 'Windows 데스크톱', dlWinSub: '단일 EXE · 더블클릭 실행', dlAndroidName: 'Android 휴대폰', dlAndroidSub: 'APK · QR로 연결', dlBundleName: 'Windows 번들', dlBundleSub: 'EXE + PC 소스',
    rcPrimary: '최신 버전 받기', rcLink: '전체 업데이트 보기',
    extrasEyebrow: 'EXTRAS · 03', extrasH2: '업적과 플러그인이 함께 자랍니다.', extrasLead: '보내기·받기·연결을 기록하고, 같은 공간에 플러그인을 더하세요.',
    achEyebrow: 'PROGRESS', achTitle: '업적', achTag: '동기화', achUnit: '개 업적', achAdded: '이번 업데이트 500개 추가', achSubRight: '전체',
    achFoot: '이메일로 로그인하면 휴대폰·PC·웹의 진행도를 합칩니다. 실시간 데이터: ',
    achGroups: [['보내기', 200], ['받기', 120], ['파일', 60], ['일수', 60], ['기기', 60]],
    plugEyebrow: 'ECOSYSTEM', plugTitle: '플러그인', plugTag: '온라인 스토어', plugUnit: '개 플러그인',
    plugFallback: [
      ['👋', '빠른 인사', '채팅 강화', 'TOP 1'],
      ['📝', '집중 메모', '도구', 'TOP 2'],
      ['🖼️', '이미지 전송 도우미', '미디어', 'TOP 3']
    ],
    plugRegistry: '스토어 목록 보기', plugDeveloper: 'Castle Developer', plugStoreCta: '플러그인 스토어 열기',
    footTagline: '더 빠르게, 더 매끄럽게.', footDownloadLabel: '다운로드', footMoreLabel: '더 보기',
    footLinkBundle: 'Windows 번들', footLinkDeveloper: 'Castle Developer', footLinkGitHub: 'GitHub Release', footLinkApi: '버전 API',
    footNote: '설치 파일과 PC 소스를 함께 배포합니다.', footMade: '로컬 네트워크를 위해',
    langLabel: '언어 선택 / LANGUAGE', versionLabel: 'v'
  }
};


function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function langNav(current) {
  return langLinks.map(([code, label, href]) =>
    `<a class="lang-link${code === current ? ' is-current' : ''}" href="${href}" hreflang="${code}" role="button"${code === current ? ' aria-current="page"' : ''}>${label}</a>`
  ).join('\n          ');
}

function langSelect(current, bc) {
  const cur = langLinks.filter(function (l) { return l[0] === current; })[0] || langLinks[0];
  const options = langLinks.map(function (l) {
    return `<option value="${l[2]}"${l[0] === current ? ' selected' : ''}>${l[1]}</option>`;
  }).join('');
  return `<label class="lang-select" title="${esc(bc.langAria)}">
      <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.5"/><path d="M3.8 12h16.4M12 3.5c2.2 2.3 3.3 5.2 3.3 8.5S14.2 18.7 12 20.5M12 3.5c-2.2 2.3-3.3 5.2-3.3 8.5S9.8 18.7 12 20.5"/></svg>
      <span>${esc(cur[1])}</span>
      <select data-lang-select aria-label="${esc(bc.langAria)}">${options}</select>
    </label>`;
}

function bcPages(t, bc) {
  return [
    { id: 'home', target: '#top', label: bc.home, title: t.h1a + t.h1b, meta: bc.homeMeta, theme: 'home' },
    { id: 'bc', target: 'https://hamburgerwow.top/developer', label: 'Burger Chat', title: 'Burger Chat', meta: bc.devWebMeta, theme: 'bc', external: true },
    { id: 'bc', target: 'https://hamburgerwow.top/fort-selector', label: 'Director Bao', title: 'Director Bao', meta: bc.devMeta, theme: 'bc', external: true },
    { id: 'store', target: '/plugins', label: bc.store, title: bc.store, meta: bc.storeMeta, theme: 'plug', external: true }
  ];
}

function bcSwitcher(t, bc) {
  const pages = bcPages(t, bc);
  const cards = pages.map(function (p, i) {
    return `<button class="bc-card bc-theme-${p.theme}" type="button" data-bc-target="${p.target}" data-bc-title="${esc(p.title)}"${p.external ? ' data-bc-external="true"' : ''} aria-label="${esc(p.label)}">
          <span class="bc-card-top"><span class="bc-num">${String(i + 1).padStart(2, '0')}</span><span class="bc-label">${esc(p.label)}</span></span>
          <span class="bc-thumb">${BC_GLYPHS[p.id]}<span class="bc-thumb-word">${esc(p.label)}</span></span>
          <span class="bc-card-body"><strong>${esc(p.title)}</strong><small>${esc(p.meta)}</small></span>
          <span class="bc-enter">${esc(bc.go)} <i aria-hidden="true">→</i></span>
        </button>`;
  }).join('\n        ');
  const dots = pages.map(function (p, i) {
    return `<button class="bc-dot${i === 0 ? ' is-active' : ''}" type="button" data-bc-dot="${i}" aria-label="${esc(p.label)}"></button>`;
  }).join('');
  return `<div class="bc-switcher" id="bcSwitcher" role="dialog" aria-modal="true" aria-label="${esc(bc.title)}" aria-hidden="true" inert>
  <div class="bc-scrim" data-bc-close></div>
  <section class="bc-panel" tabindex="-1">
    <header class="bc-head">
      <div><span class="bc-kicker">${esc(bc.kicker)}</span><h2>${esc(bc.title)}</h2></div>
      <button class="bc-close" type="button" data-bc-close aria-label="${esc(bc.close)}">✕</button>
    </header>
    <div class="bc-stage">
      <button class="bc-arrow bc-arrow-prev" type="button" data-bc-prev aria-label="${esc(bc.prev)}">‹</button>
      <div class="bc-viewport" id="bcViewport"><div class="bc-track" id="bcTrack">
        ${cards}
      </div></div>
      <button class="bc-arrow bc-arrow-next" type="button" data-bc-next aria-label="${esc(bc.next)}">›</button>
    </div>
    <footer class="bc-foot">
      <div class="bc-dots" id="bcDots">${dots}</div>
      <div class="bc-count"><b id="bcNow">01</b><span>/ ${String(pages.length).padStart(2, '0')}</span></div>
      <p class="bc-hint">${esc(bc.hint)}</p>
    </footer>
  </section>
</div>

<div class="bc-mobile" id="bcMobile" role="alertdialog" aria-modal="true" aria-hidden="true" inert>
  <div class="bc-mobile-scrim" data-bc-mobile-close></div>
  <div class="bc-mobile-card">
    <div class="bc-mobile-x" aria-hidden="true">✕</div>
    <span class="bc-mobile-kicker">Director Bao · MOBILE</span>
    <h2>${esc(bc.mobileTitle)}</h2>
    <p>${esc(bc.mobileText)}</p>
    <button type="button" data-bc-mobile-close>${esc(bc.mobileBack)}</button>
  </div>
</div>

<div class="bc-toast" id="bcToast" aria-live="polite">
  <span class="bc-toast-spin" aria-hidden="true"></span>
  <div><b id="bcToastTitle">${esc(bc.switching)}</b><small id="bcToastSub"></small></div>
</div>

<div class="bc-transition" id="bcTransition" aria-hidden="true" data-switching="${esc(bc.switching)}" data-entering="${esc(bc.entering)}" data-welcome-home="${esc(bc.welcomeHome)}" data-welcome-enter="${esc(bc.welcomeEnter)}" data-welcome-home-sub="${esc(bc.welcomeHomeSub)}" data-welcome-enter-sub="${esc(bc.welcomeEnterSub)}">
  <div class="bc-wipe"></div>
  <div class="bc-welcome-orbit" aria-hidden="true"></div>
  <div class="bc-transition-copy"><span id="bcTransitionKicker">BURGER CHAT</span><b id="bcTransitionTitle">${esc(bc.switching)}</b><small id="bcTransitionSub"></small></div>
</div>`;
}

function noteList(items) {
  return items.map(function (x) { return `<li>${esc(x)}</li>`; }).join('\n            ');
}

function featureCards(items) {
  return items.map(function (f) {
    return `<article class="feature"><span class="num">${esc(f[0])}</span><b>${esc(f[1])}</b><p>${esc(f[2])}</p></article>`;
  }).join('\n          ');
}

const UNIT = { 'zh-CN': '个', 'zh-TW': '個', 'en': '', 'ja': '個', 'ko': '개' };
const ACH_UNITS = {
  'zh-CN': ['条', '条', '个', '天', '台'],
  'zh-TW': ['則', '則', '個', '天', '台'],
  'en': ['messages', 'messages', 'files', 'days', 'devices'],
  'ja': ['通', '通', '個', '日', '台'],
  'ko': ['개', '개', '개', '일', '대']
};

function achCells(items, key) {
  const units = ACH_UNITS[key] || ACH_UNITS['zh-CN'];
  return items.map(function (g, i) {
    const unit = units[i] || UNIT[key] || '';
    return `<div class="ach-cat"><b>${esc(g[0])}</b><span>${g[1]} ${unit}</span></div>`;
  }).join('\n            ');
}

function pluginFallback(items) {
  return items.map(function (p, i) {
    return `<div class="plug-row"><span class="plug-ico">${esc(p[0])}</span><div class="plug-info"><b>${esc(p[1])}</b><span>${esc(p[2])}</span></div><span class="plug-rate">${esc(p[3])}</span></div>`;
  }).join('\n              ');
}

function page(t, key) {
  const bc = BC[key] || BC['zh-CN'];
  const alternates = langLinks.map(([code, , href]) => `<link rel="alternate" hreflang="${code}" href="${SITE}/${href}">`).join('\n');
  const achCellsHtml = achCells(t.achGroups, key);
  return `<!doctype html>
<html lang="${t.htmlLang}">
<head>
<meta name="bc-build" content="20261125-music-final7">
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(t.title)}</title>
<meta name="description" content="${esc(t.desc)}">
<meta name="theme-color" content="#0f0a08">
<meta name="color-scheme" content="dark">
<link rel="canonical" href="${SITE}/${t.file}">
${alternates}
<link rel="alternate" hreflang="x-default" href="${SITE}/">
<link rel="icon" href="assets/favicon.ico?v=050" sizes="any">
<link rel="icon" type="image/png" sizes="32x32" href="assets/icon-32.png?v=050">
<link rel="icon" type="image/png" sizes="192x192" href="assets/icon-192.png?v=050">
<link rel="apple-touch-icon" sizes="180x180" href="assets/apple-touch-icon.png?v=050">
<link rel="manifest" href="assets/site.webmanifest">
<meta name="msapplication-config" content="assets/browserconfig.xml">
<meta name="msapplication-TileColor" content="#0f0a08">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta property="og:type" content="website">
<meta property="og:title" content="${esc(t.title)}">
<meta property="og:description" content="${esc(t.desc)}">
<meta property="og:url" content="${SITE}/${t.file}">
<meta property="og:image" content="${SITE}/assets/hero-girl.png">
<meta property="og:locale" content="${t.ogLocale}">
<meta name="twitter:card" content="summary_large_image">
<link rel="stylesheet" href="assets/site-v4.css?v=27i">
</head>
<body class="${t.bodyClass}" data-lang="${key}" data-locale="${t.locale}" data-fallback-version="${VERSION}">
<div id="progress" aria-hidden="true"></div>
<div class="wall-aura" id="wallAura" aria-hidden="true"></div>

<header class="topbar">
  <div class="wrap topbar-inner">
    <a class="brand" href="#top" aria-label="Burger Chat">
      <img src="assets/icon-192.png?v=050" alt="" width="40" height="40">
      <span class="brand-text"><strong>Burger Chat</strong><small>DESKTOP CONTROL SURFACE</small></span>
    </a>
    <div class="top-actions">
      <a class="bc-open top-bc" href="/developer" aria-label="Fort Selector" data-enter-copy="${bc.entering.replace('Director Bao','Fort Selector')}">
        <span class="bc-open-ico" aria-hidden="true"><img src="assets/fort-selector-icon.png?v=1" alt="" width="26" height="26"></span>
        <span class="bc-open-label">Fort Selector</span><span aria-hidden="true">↗</span>
      </a>
      ${langSelect(key, bc)}
      <span class="ver-pill"><i></i>${t.versionLabel}<span data-version>${VERSION}</span></span>
      <a class="top-link" href="#release">${esc(t.topDownload)} ↓</a>
    </div>
  </div>
</header>

<div class="dock" id="dock" aria-label="${esc(t.navLabel)}">
  <a class="dock-brand" href="#top">
    <img src="assets/icon-192.png?v=050" alt="" width="42" height="42">
    <span><strong>Burger Chat</strong><span>DESKTOP CONTROL SURFACE</span></span>
  </a>
  <nav class="dock-links" aria-label="${esc(t.navLabel)}">
    <button class="bc-open dock-bc" type="button" data-bc-open aria-haspopup="dialog" aria-controls="bcSwitcher"><span class="bc-open-ico" aria-hidden="true"><img src="assets/fort-selector-icon.png?v=1" alt="" width="26" height="26"></span>Director Bao</button>
    <a href="#about">${esc(t.navAbout)}</a>
    <a href="#release">${esc(t.navRelease)}</a>
    <a href="#achievements">${esc(t.navAch)}</a>
    <a href="#plugins">${esc(t.navPlugins)}</a>
  </nav>
  <div class="dock-right">
    <span class="dock-ver">${t.versionLabel}<span data-version>${VERSION}</span></span>
    <a class="dock-dl" href="#release">${esc(t.topDownload)} <span aria-hidden="true">↗</span></a>
  </div>
</div>

<main>
<section class="hero" id="top">
  <div class="hero-wall" id="heroWall" aria-hidden="true">
    <video class="wall-portrait" id="wallPortrait" src="assets/wallpaper-vertical.mp4?v=048" poster="assets/wallpaper-vertical-poster.jpg?v=048" muted loop playsinline preload="none"></video>
    <video class="wall-landscape" id="wallImage" src="assets/wallpaper-horizontal.mp4?v=048" poster="assets/wallpaper-horizontal-poster.jpg?v=048" muted loop playsinline preload="none"></video>
  </div>
  <div class="wrap hero-inner">
    <div class="hero-copy">
      <span class="eyebrow"><i class="live-dot"></i>${esc(t.heroKicker)}</span>
      <h1><span class="l1">${esc(t.h1a)}</span><span class="l2">${esc(t.h1b)}</span></h1>
      <p class="hero-lead">${esc(t.lead)}</p>
      <div class="hero-cta">
        <a class="cta cta-fort" href="/fort-selector" aria-label="Director Bao">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M4 4h7v7H4V4Zm9 0h7v7h-7V4ZM4 13h7v7H4v-7Zm9 0h7v7h-7v-7Z"/></svg>
          Director Bao
        </a>
        <a class="cta cta-primary" href="#release">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M3 4.7 10.5 3v7.3H3V4.7Zm8.9-2 10.1-1.5v9.1H11.9V2.7ZM3 12.3h7.5v8L3 18.8v-6.5Zm8.9 0h10.1v9.3l-10.1-1.5v-7.8Z"/></svg>
          ${esc(t.ctaWin)}
        </a>
        <a class="cta cta-ghost" href="/f/android">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M7.2 8.3h9.6c.7 0 1.2.5 1.2 1.2v6.4c0 .7-.5 1.2-1.2 1.2h-.8v2.2c0 .4-.3.7-.7.7s-.7-.3-.7-.7v-2.2h-1.7v2.2c0 .4-.3.7-.7.7s-.7-.3-.7-.7v-2.2H7.4v2.2c0 .4-.3.7-.7.7s-.7-.3-.7-.7v-2.2h-.8c-.7 0-1.2-.5-1.2-1.2V9.5c0-.7.5-1.2 1.2-1.2Zm-1.5-1c0-.5.4-.9.9-.9s.9.4.9.9-.4.9-.9.9-.9-.4-.9Zm12.6 0c0-.5.4-.9.9-.9s.9.4.9.9-.4.9-.9.9-.9-.4-.9Zm-11.1-2.2 1.1-1.8c.1-.2.3-.2.5-.1.2.1.2.3.1.5L7.9 5.4c1.3-.6 2.8-.9 4.1-.9s2.8.3 4.1.9l1.1-1.7c.1-.2.3-.2.5-.1.2.1.2.3.1.5l1.1 1.8c1.3.7 2.2 1.7 2.6 2.9H4.3c.4-1.2 1.3-2.2 2.6-2.9Z"/></svg>
          ${esc(t.ctaAndroid)}
        </a>
      </div>
      <div class="hero-stats">
        <div class="stat"><strong data-version>${VERSION}</strong><span>${esc(t.stat1l)}</span></div>
        <div class="stat"><strong>${esc(t.stat2v)}</strong><span>${esc(t.stat2l)}</span></div>
        <div class="stat"><strong>${esc(t.stat3v)}</strong><span>${esc(t.stat3l)}</span></div>
        <div class="stat"><strong>${esc(t.stat4v)}</strong><span>${esc(t.stat4l)}</span></div>
      </div>
    </div>
  </div>
  <a class="scroll-cue" href="#about">${esc(t.scrollCue)}</a>
</section>

<section class="section" id="about">
  <div class="wrap">
    <div class="section-head slide-item slide-title" data-dir="left">
      <div><span class="eyebrow">${esc(t.aboutEyebrow)}</span><h2>${esc(t.aboutH2)}</h2></div>
      <p>${esc(t.aboutLead)}</p>
    </div>
    <div class="split">
      <div class="about-panel slide-item" data-dir="left">
        <div class="about-panel-head">
          <span class="panel-kicker">LOCAL · PRIVATE · DIRECT</span>
          <h3>${esc(t.panelTitle)}</h3>
          <p>${esc(t.panelText)}</p>
        </div>
        <div class="feature-grid">
          ${featureCards(t.features)}
        </div>
        <div class="wall-note">
          <span class="wi" aria-hidden="true">✦</span>
          <div><b>${esc(t.wallName)}</b><p>${esc(t.wallDesc)}</p></div>
        </div>
      </div>
      <aside class="release-card slide-item" data-dir="right" id="release">
        <div class="rc-top"><span class="rc-kicker">${esc(t.rcKicker)}</span><span class="rc-live"><i></i>${esc(t.rcStable)}</span></div>
        <div class="rc-ver"><strong data-version>${VERSION}</strong><span>${esc(t.rcVerSuffix)}</span></div>
        <div class="rc-date"><span data-date>${esc(t.rcDate)}</span> · ${esc(t.rcPlatforms)}</div>
        <div class="rc-divider"></div>
        <a class="dl-row" href="/f/windows">
          <span class="dl-ico" aria-hidden="true"><svg viewBox="0 0 24 24" width="15" height="15"><path fill="currentColor" d="M3 4.7 10.5 3v7.3H3V4.7Zm8.9-2 10.1-1.5v9.1H11.9V2.7ZM3 12.3h7.5v8L3 18.8v-6.5Zm8.9 0h10.1v9.3l-10.1-1.5v-7.8Z"/></svg></span>
          <span><b class="dl-name">${esc(t.dlWinName)}</b><span class="dl-sub">${esc(t.dlWinSub)}</span></span>
          <span class="dl-size"><span data-size="exe">88.85 MB</span><small>EXE</small></span>
        </a>
        <a class="dl-row" href="/f/android">
          <span class="dl-ico" aria-hidden="true">▣</span>
          <span><b class="dl-name">${esc(t.dlAndroidName)}</b><span class="dl-sub">${esc(t.dlAndroidSub)}</span></span>
          <span class="dl-size"><span data-size="apk">1.98 MB</span><small>APK</small></span>
        </a>
        <a class="dl-row" href="/f/bundle">
          <span class="dl-ico" aria-hidden="true">⌸</span>
          <span><b class="dl-name">${esc(t.dlBundleName)}</b><span class="dl-sub">${esc(t.dlBundleSub)}</span></span>
          <span class="dl-size"><span data-size="zip">36.55 MB</span><small>ZIP</small></span>
        </a>
        <ul class="rc-notes">
            ${noteList(t.releaseBullets)}
        </ul>
        <div class="rc-actions">
          <a class="rc-primary" href="/f/windows">${esc(t.rcPrimary)} <span aria-hidden="true">↗</span></a>
          <a class="rc-link" href="${GITHUB}" target="_blank" rel="noopener">${esc(t.rcLink)}</a>
        </div>
      </aside>
    </div>
  </div>
</section>

<section class="section" id="achievements">
  <div class="wrap">
    <div class="section-head slide-item slide-title" data-dir="right">
      <div><span class="eyebrow">${esc(t.extrasEyebrow)}</span><h2>${esc(t.extrasH2)}</h2></div>
      <p>${esc(t.extrasLead)}</p>
    </div>
    <div class="extras-grid">
      <article class="ext-card slide-item" data-dir="left">
        <div class="ext-head">
          <div class="ext-title"><small>${esc(t.achEyebrow)}</small><b>${esc(t.achTitle)}</b></div>
          <span class="ext-tag">${esc(t.achTag)}</span>
        </div>
        <div class="ach-big"><strong data-ach-total>515</strong><span>${esc(t.achUnit)}</span></div>
        <div class="ach-bar"><i id="achBar" style="width:97%"></i></div>
        <div class="ach-sub"><span data-ach-added>${esc(t.achAdded)}</span><span>${esc(t.achSubRight)}</span></div>
        <div class="ach-cats" id="achGroups">
            ${achCellsHtml}
        </div>
        <p class="ach-foot">${esc(t.achFoot)}<a href="/api/achievements" target="_blank" rel="noopener">/api/achievements</a></p>
      </article>
      <article class="ext-card slide-item" data-dir="right" id="plugins">
        <div class="ext-head">
          <div class="ext-title"><small>${esc(t.plugEyebrow)}</small><b>${esc(t.plugTitle)}</b></div>
          <span class="ext-tag">${esc(t.plugTag)}</span>
        </div>
        <div class="plug-count"><strong data-plugin-count>5</strong><span>${esc(t.plugUnit)}</span></div>
        <div class="plug-list" id="plugList">
              ${pluginFallback(t.plugFallback)}
        </div>
        <div class="plug-links">
          <a class="plug-store-link" href="/plugins">${esc(t.plugStoreCta)} ↗</a>
          <a href="/plugins/registry.json" target="_blank" rel="noopener">${esc(t.plugRegistry)} ↗</a>
          <a href="/developer">${esc(t.plugDeveloper)} ↗</a>
        </div>
      </article>
    </div>
  </div>
</section>
</main>

<footer>
  <div class="wrap">
    <div class="foot-top">
      <div class="foot-brand">
        <img src="assets/icon-192.png?v=050" alt="" width="44" height="44">
        <div><b>Burger Chat</b><p>${esc(t.footTagline)}</p></div>
      </div>
      <div class="foot-col">
        <small>${esc(t.footDownloadLabel)}</small>
        <a href="/f/windows">Windows EXE</a>
        <a href="/f/android">Android APK</a>
        <a href="/f/bundle">${esc(t.footLinkBundle)}</a>
      </div>
      <div class="foot-col">
        <small>${esc(t.footMoreLabel)}</small>
        <a href="/developer">${esc(t.footLinkDeveloper)}</a>
        <a href="${GITHUB}" target="_blank" rel="noopener">${esc(t.footLinkGitHub)}</a>
        <a href="/api/latest" target="_blank" rel="noopener">${esc(t.footLinkApi)}</a>
      </div>
    </div>
    <div class="foot-bottom">
      <span>© <span data-year>2026</span> Burger Chat</span>
      <span>${esc(t.footNote)}</span>
      <span class="sp"></span>
      <span>${esc(t.footMade)}</span>
    </div>
  </div>
</footer>

${bcSwitcher(t, bc)}

<div class="music-stack" id="musicStack">
<div class="music-now-card" id="musicNowCard" aria-live="polite">
  <div class="mn-cover"><img id="musicNowCover" alt=""><span class="mn-note">♪</span></div>
  <div class="mn-body">
    <div class="mn-top"><small id="musicNowKicker">NOW PLAYING</small><span id="musicNowBadge">正在播放</span></div>
    <b id="musicNowTitle">萤火之森</b>
    <span id="musicNowBy">上传者 · CMJ</span>
    <div class="mn-lyric" id="musicNowLyric">正在读取歌词…</div>
    <div class="mn-bar"><i id="musicNowBar"></i></div>
  </div>
</div>
<div class="music-dock" id="musicDock" aria-live="polite">
  <audio id="musicAudio" preload="auto" playsinline src="assets/music/firefly-cmj.mp3?v=0.40.52r3"></audio>
  <div class="md-kicker"><b>NOW PLAYING</b><i></i><span>背景音乐</span></div>
  <div class="md-head">
    <button class="md-cover" id="musicCover" type="button" aria-label="播放或暂停背景音乐">
      <img id="musicCoverImg" alt="">
      <span class="md-disc"><i></i></span>
      <span class="md-eq" aria-hidden="true"><i></i><i></i><i></i><i></i></span>
    </button>
    <div class="md-info">
      <b id="musicTitle">萤火之森</b>
      <span id="musicBy">上传者 · CMJ</span>
    </div>
    <button class="md-play" id="musicPlay" type="button" aria-label="播放背景音乐">
      <svg class="md-ico-play" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>
      <svg class="md-ico-pause" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z"/></svg>
    </button>
  </div>
  <div class="md-detail">
    <div class="md-progress">
      <span class="md-time" id="musicTime">0:00</span>
      <input class="md-range" id="musicProgress" type="range" min="0" max="1000" step="1" value="0" aria-label="播放进度">
      <span class="md-time" id="musicTotal">0:00</span>
    </div>
    <div class="md-quality" id="musicQualityBar" role="group" aria-label="音质选择">
      <span class="mdq-now"><small>QUALITY</small><b id="musicQualityNow">标准</b></span>
      <span class="mdq-options">
        <button class="mdq-btn" type="button" data-quality="lossless" aria-pressed="false"><i></i><span>无损</span></button>
        <button class="mdq-btn is-on" type="button" data-quality="standard" aria-pressed="true"><i></i><span>标准</span></button>
        <button class="mdq-btn" type="button" data-quality="low" aria-pressed="false"><i></i><span>最低</span></button>
      </span>
    </div>
    <div class="md-source" id="musicSourceBar" role="group" aria-label="播放源">
      <span class="mds-label"><small>MUSIC SOURCE</small><b>播放源</b></span>
      <button class="mds-btn is-on" type="button" aria-pressed="true">默认</button>
      <a class="mds-btn mds-burger" href="/burger-music">Burger music <i>↗</i></a>
    </div>
    <div class="md-transport">
      <button class="md-mode" id="musicMode" type="button" aria-label="播放模式：循环">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M17 2l4 4-4 4M3 11V9a3 3 0 013-3h15M7 22l-4-4 4-4M21 13v2a3 3 0 01-3 3H3"/></svg>
        <span>循环</span>
      </button>
      <button class="md-step" id="musicPrev" type="button" aria-label="上一曲"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 5h2v14H6zM19 5v14L9 12z"/></svg></button>
      <button class="md-play-big" id="musicPlayBig" type="button" aria-label="播放背景音乐">
        <svg class="md-ico-play" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>
        <svg class="md-ico-pause" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z"/></svg>
      </button>
      <button class="md-step" id="musicNext" type="button" aria-label="下一曲"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M16 5h2v14h-2zM5 5v14l10-7z"/></svg></button>
      <button class="md-lyrics-btn" id="musicLyricsBtn" type="button" aria-label="歌词" aria-expanded="false"><span>歌词</span></button>
    </div>
  </div>
</div>
<div class="md-lyrics" id="musicLyricsPanel" aria-hidden="true" aria-label="流体云歌词">
  <div class="ml-fluid" aria-hidden="true"><i></i><i></i><i></i><i></i><span></span></div>
  <div class="ml-bg" aria-hidden="true"><img id="musicLyricsBg" alt=""></div>
  <div class="ml-head">
    <span class="ml-art" id="musicLyricsArt"><img id="musicLyricsCover" alt=""><i>♪</i></span>
    <span class="ml-meta"><small>FLUID CLOUD · LYRICS</small><b id="musicLyricsTitle">萤火之森</b><em id="musicLyricsBy">CMJ</em></span>
    <span class="ml-actions">
      <button class="ml-play" id="musicLyricsPlay" type="button" aria-label="播放背景音乐" aria-pressed="false">
        <svg class="ml-ico-play" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>
        <svg class="ml-ico-pause" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z"/></svg>
      </button>
      <button class="ml-expand" id="musicLyricsExpand" type="button" aria-label="放大歌词" aria-pressed="false"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5"/></svg><span>放大</span></button>
      <button class="ml-close" id="musicLyricsClose" type="button" aria-label="收起歌词">×</button>
    </span>
  </div>
  <div class="ml-scroll"><div class="md-lyrics-inner" id="musicLyricsInner">正在读取歌词…</div></div>
  <div class="ml-foot"><span id="musicLyricsSource">LOCAL · LRC</span><span id="musicLyricsTime">0:00 / 0:00</span></div>
  <div class="ml-track" aria-hidden="true"><i id="musicLyricsBar"></i></div>
</div>
</div>

<script src="assets/site-v4.js?v=27f" defer></script>
</body>
</html>
`;
}

for (const key of Object.keys(T)) {
  const t = T[key];
  const html = page(t, key);
  fs.writeFileSync(path.join(ROOT, t.file), html, 'utf8');
  console.log(t.file + '  ' + Buffer.byteLength(html) + ' bytes');
}





