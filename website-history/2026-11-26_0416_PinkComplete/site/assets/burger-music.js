(function () {
  "use strict";

  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));
  const audio = $("#audio");

  const SOURCE_NAMES = {
    netease: "网易云",
    tencent: "QQ 音乐",
    kugou: "酷狗",
    local: "本地",
    lx: "LX",
  };
  const SOURCE_FULL = {
    netease: "NETEASE",
    tencent: "QQ MUSIC",
    kugou: "KUGOU",
    local: "LOCAL",
    lx: "LX MUSIC",
  };
  const MODES = [
    { id: "loop", label: "列表循环", short: "循环", icon: '<path d="M17 2l4 4-4 4M3 11V9a3 3 0 0 1 3-3h15M7 22l-4-4 4-4M21 13v2a3 3 0 0 1-3 3H3"/>' },
    { id: "single", label: "单曲循环", short: "单曲", icon: '<path d="M17 2l4 4-4 4M3 11V9a3 3 0 0 1 3-3h15M7 22l-4-4 4-4M21 13v2a3 3 0 0 1-3 3H3"/><path d="M11 9.5v5M11 9.5l-1.6 1.1" stroke-width="1.4"/>' },
    { id: "shuffle", label: "随机播放", short: "随机", icon: '<path d="M3 7h3c5 0 7 10 12 10h3M17 3l4 4-4 4M3 17h3c5 0 7-10 12-10h3M17 13l4 4-4 4"/>' },
  ];

  const CURATED = [
    { key: "netease-hot", source: "netease", id: "3778678", display: "热歌榜", sub: "网易云 · 此刻最多人听", art: "HOT 100", accent: "#ff7847" },
    { key: "netease-rise", source: "netease", id: "19723756", display: "飙升榜", sub: "网易云 · 正在上升", art: "RISING", accent: "#c9ff68" },
    { key: "tencent-pick", source: "tencent", id: "7011691570", display: "QQ 热歌", sub: "QQ 音乐 · 编辑精选", art: "QQ PICK", accent: "#6fd3ff" },
    { key: "kugou-midnight", source: "kugou", id: "3280341", display: "深夜 emo", sub: "酷狗 · 伤感情歌精选", art: "MIDNIGHT", accent: "#ffd166" },
  ];

  const DEFAULT_TRACK = {
    id: "firefly-cmj",
    source: "local",
    name: "萤火之森",
    artist: "CMJ",
    album: "BURGER CHAT · LOCAL",
    cover: "",
    url: "/assets/music/firefly-cmj.mp3?v=0.40.52r3",
    duration: 0,
  };

  const state = {
    mode: "burger",
    current: null,
    queue: [],
    index: 0,
    listTracks: [],
    listContext: "",
    listKind: "home",
    homeData: {},
    homeLoaded: 0,
    onlineTracks: [],
    imported: [],
    lxSources: [],
    favorites: [],
    lx: { base: "http://127.0.0.1:23330", connected: false, name: "" },
    lyricLines: [],
    lyricEls: [],
    lyricActive: -1,
    lyricAuto: true,
    lyricToken: 0,
    lyricDuration: 0,
    seeking: false,
    muted: false,
    modeIndex: 0,
    searchActive: false,
    toastTimer: 0,
    saveTimer: 0,
    importPlatform: "netease",
    importBusy: false,
    localScanned: false,
    lxAiBusy: false,
    recovering: false,
    recoveryTried: false,
    recoveryTrack: "",
    candidates: [],
    candidateIndex: 0,
    streamFailAt: 0,
    lyricTime: 0,
    lyricRaf: 0,
    lyricTrans: {},
    lyricTransOn: true,
    quality: "standard",
    view: "rows",
    history: [],
    stats: { plays: 0, sources: {}, days: [], searches: 0, imports: 0, quality: 0, lyrics: 0, nights: 0, mornings: 0 },
    achievements: {},
    sync: { enabled: true, sources: true, playlists: true, prefs: true },
    playerMini: false,
  };

  function readJSON(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (error) {
      return fallback;
    }
  }
  function writeJSON(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {}
  }
  function esc(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }
  function safeImage(url, raw) {
    let value = String(url || "").trim();
    if (value.startsWith("//")) value = "https:" + value;
    value = value.replace(/^http:\/\/([^/]*(?:gtimg|kugou|music\.126|126\.net|qq\.com))/i, "https://$1");
    if (/^https?:\/\//i.test(value)) {
      return raw ? value : "/burger-music/api/bm/image?url=" + encodeURIComponent(value);
    }
    if (value.startsWith("/")) return value;
    return "";
  }
  function coverHTML(track, cls, fallbackLabel) {
    const raw = safeImage(track && track.cover, true);
    const src = safeImage(track && track.cover);
    const label = fallbackLabel || initials(track && track.name);
    const retry = raw && raw !== src ? ' data-direct="' + esc(raw) + '"' : "";
    const onerror = raw && raw !== src
      ? "if(this.dataset.direct&&!this.dataset.retried){this.dataset.retried='1';this.src=this.dataset.direct;}else{this.remove()}"
      : "this.remove()";
    return '<div class="cover-fallback"><b>' + esc(label) + '</b></div>' +
      (src ? '<img src="' + esc(src) + '" alt="" loading="lazy" referrerpolicy="no-referrer"' + retry + ' onerror="' + esc(onerror) + '">' : "");
  }
  function fmt(sec) {
    const value = Math.max(0, Number(sec) || 0);
    const m = Math.floor(value / 60);
    const s = Math.floor(value % 60);
    return m + ":" + (s < 10 ? "0" : "") + s;
  }
  function fmtStamp(sec) {
    const value = Math.max(0, Number(sec) || 0);
    const m = Math.floor(value / 60);
    const s = value % 60;
    return m + ":" + (s < 10 ? "0" : "") + s.toFixed(2);
  }
  function initials(name) {
    return Array.from(String(name || "BM")).slice(0, 2).join("");
  }
  function sourceClass(source) {
    return String(source || "local").replace(/[^a-z]/g, "");
  }
  const MAX_PLAYLIST_TRACKS = 2000;
  function secondsOf(value) {
    let seconds = Number(value) || 0;
    if (!Number.isFinite(seconds) || seconds <= 0) return 0;
    if (seconds > 10000) seconds = seconds / 1000;
    return seconds > 86400 ? 0 : seconds;
  }
  function playlistCount(item) {
    if (!item) return 0;
    const tracks = Array.isArray(item.tracks) ? item.tracks.length : 0;
    const raw = Number(item.count);
    const fallback = Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : 0;
    return Math.min(MAX_PLAYLIST_TRACKS, Math.max(tracks, fallback));
  }
  function normalizeImported(item) {
    if (!item || !item.id) return null;
    const tracks = Array.isArray(item.tracks) ? item.tracks.slice(0, MAX_PLAYLIST_TRACKS).map((track) => {
      if (!track || typeof track !== "object") return track;
      track.duration = secondsOf(track.duration);
      return track;
    }) : [];
    const rawCount = Number(item.count);
    const count = tracks.length || (Number.isFinite(rawCount) && rawCount > 0 ? Math.min(MAX_PLAYLIST_TRACKS, Math.floor(rawCount)) : 0);
    return Object.assign({}, item, { tracks: tracks, count: count });
  }
  function toast(text) {
    const box = $("#toast");
    $("#toastText").textContent = text;
    box.classList.add("is-on");
    clearTimeout(state.toastTimer);
    state.toastTimer = setTimeout(() => box.classList.remove("is-on"), 2200);
  }
  function setRangeFill(input, pct) {
    if (!input) return;
    const value = Math.max(0, Math.min(100, Number(pct) || 0));
    input.style.setProperty("--fill", value + "%");
  }
  function setBusy(button, busy, label) {
    if (!button) return;
    if (!button.dataset.normal) button.dataset.normal = button.textContent;
    button.disabled = !!busy;
    button.textContent = busy ? (label || "处理中…") : button.dataset.normal;
  }

  const QUALITY_NAMES = { lossless: "无损", standard: "标准", low: "最低" };
  const QUALITY_TAGS = { lossless: "LOSSLESS · 无损", standard: "HQ · 标准", low: "LQ · 最低" };

  const ACHIEVEMENTS = [
    { id: "first", icon: "▶", name: "初次按下播放", desc: "播放第一首歌", goal: 1, value: () => state.stats.plays },
    { id: "ten", icon: "♫", name: "第十首歌", desc: "累计播放 10 首歌", goal: 10, value: () => state.stats.plays },
    { id: "fifty", icon: "❖", name: "五十首", desc: "累计播放 50 首歌", goal: 50, value: () => state.stats.plays },
    { id: "fav", icon: "♥", name: "收藏家", desc: "收藏 3 首歌", goal: 3, value: () => state.favorites.length },
    { id: "importer", icon: "⇩", name: "歌单搬家", desc: "导入 1 张歌单", goal: 1, value: () => Math.max(state.imported.length, state.stats.imports) },
    { id: "trio", icon: "◎", name: "三平台通", desc: "网易云 / QQ / 酷狗都听过", goal: 3, value: () => ["netease", "tencent", "kugou"].filter((k) => state.stats.sources[k]).length },
    { id: "night", icon: "☾", name: "夜猫子", desc: "在 0–5 点听过歌", goal: 1, value: () => state.stats.nights },
    { id: "morning", icon: "☀", name: "早起鸟", desc: "在 5–8 点听过歌", goal: 1, value: () => state.stats.mornings },
    { id: "lyric", icon: "文", name: "歌词党", desc: "打开歌词 5 次", goal: 5, value: () => state.stats.lyrics },
    { id: "quality", icon: "◈", name: "音质控", desc: "切换音质 3 次", goal: 3, value: () => state.stats.quality },
    { id: "days3", icon: "▤", name: "常来常往", desc: "累计使用 3 天", goal: 3, value: () => state.stats.days.length },
    { id: "explorer", icon: "⌕", name: "探索者", desc: "搜索 5 次", goal: 5, value: () => state.stats.searches },
  ];

  function dayKey(date) {
    const d = date || new Date();
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }
  function bumpStat(key, amount) {
    const step = amount == null ? 1 : amount;
    state.stats[key] = (Number(state.stats[key]) || 0) + step;
    if (!state.stats.days.includes(dayKey())) state.stats.days.push(dayKey());
    writeJSON("bm:stats", state.stats);
  }
  function trackSourceStat(source) {
    if (!source) return;
    state.stats.sources[source] = (Number(state.stats.sources[source]) || 0) + 1;
  }
  function addHistory(track) {
    if (!track || !track.name) return;
    const key = (track.source || "") + ":" + (track.id || track.name);
    state.history = state.history.filter((row) => row && row.key !== key);
    state.history.unshift({ key, at: Date.now(), track: {
      id: track.id, source: track.source, name: track.name, artist: track.artist,
      album: track.album, cover: track.cover, url: track.url, lrc: track.lrc,
      duration: Number(track.duration) || 0,
    } });
    state.history = state.history.slice(0, 30);
    writeJSON("bm:history", state.history);
    renderHistory();
  }

  function mineArt(track) {
    const src = safeImage(track && track.cover);
    const label = initials(track && track.name);
    return '<span class="mm-art"><span class="cover-fallback"><b>' + esc(label) + "</b></span>" +
      (src ? '<img src="' + esc(src) + '" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.style.display=&quot;none&quot;">' : "") +
      "</span>";
  }

  function renderHistory() {
    const box = $("#mineHistory");
    if (!box) return;
    const count = $("#mineHistoryCount");
    if (count) count.textContent = state.history.length + " 首";
    if (!state.history.length) {
      box.innerHTML = '<div class="mine-empty">还没有播放记录<br>播放一首歌就会出现在这里</div>';
      return;
    }
    box.innerHTML = state.history.slice(0, 12).map((row, index) =>
      '<button class="mine-mini" type="button" data-history="' + index + '" title="' + esc(row.track.name) + '">' +
        mineArt(row.track) +
        "<b>" + esc(row.track.name) + "</b><small>" + esc(row.track.artist || SOURCE_NAMES[row.track.source] || "未知") + "</small>" +
      "</button>"
    ).join("");
  }

  function renderMinePlaylists() {
    const box = $("#minePlaylists");
    const count = $("#minePlaylistCount");
    if (count) count.textContent = state.imported.length + " 张";
    if (!box) return;
    if (!state.imported.length) {
      box.innerHTML = '<div class="mine-empty">还没有导入歌单<br>粘贴分享链接就能搬进来</div>';
      return;
    }
    box.innerHTML = state.imported.slice(0, 8).map((item, index) =>
      '<button class="mine-mini" type="button" data-mine-playlist="' + index + '" title="' + esc(item.title || "歌单") + '">' +
        mineArt({ name: item.title || "歌单", cover: item.cover }) +
        "<b>" + esc(item.title || "歌单") + "</b><small>" + esc((SOURCE_NAMES[item.source] || "歌单") + " · " + playlistCount(item) + " 首") + "</small>" +
      "</button>"
    ).join("");
  }

  function readAccount() {
    const keys = ["bm:account", "bcAccount", "bcUser", "bcEmail"];
    for (const key of keys) {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      try {
        const data = JSON.parse(raw);
        if (data && typeof data === "object") {
          const email = data.email || data.mail || data.name || "";
          if (email) return { email: String(email), name: String(data.name || data.nickname || email) };
        }
      } catch (error) {
        if (/@/.test(raw)) return { email: raw.trim(), name: raw.trim() };
      }
    }
    return null;
  }
  function renderLogin() {
    const account = readAccount();
    const name = $("#mineLoginName");
    const sub = $("#mineLoginSub");
    const stateEl = $("#mineLoginState");
    const avatar = $("#mineAvatar");
    const btn = $("#mineLoginBtn");
    if (!name) return;
    if (account) {
      name.textContent = account.name;
      sub.textContent = "已登录 · 歌单与成就会跟随账号";
      stateEl.textContent = "SIGNED IN";
      avatar.textContent = initials(account.name).toUpperCase();
      btn.textContent = "退出";
      btn.setAttribute("href", "#mine");
    } else {
      name.textContent = "本机访客";
      sub.textContent = "登录后可同步账号与歌单";
      stateEl.textContent = "LOCAL SESSION";
      avatar.textContent = "B";
      btn.textContent = "登录";
      btn.setAttribute("href", "/");
    }
  }

  function renderAchievements() {
    const grid = $("#mineAchGrid");
    if (!grid) return;
    let unlocked = 0;
    const total = ACHIEVEMENTS.length;
    grid.innerHTML = ACHIEVEMENTS.map((item) => {
      const value = Math.max(0, Number(item.value()) || 0);
      const on = !!state.achievements[item.id] || value >= item.goal;
      if (on) unlocked += 1;
      return '<div class="ach-badge' + (on ? " is-on" : "") + '" title="' + esc(item.desc) + '">' +
        "<i>" + esc(item.icon) + "</i><b>" + esc(item.name) + "</b>" +
        "<small>" + Math.min(value, item.goal) + "/" + item.goal + "</small></div>";
    }).join("");
    const count = $("#mineAchCount");
    if (count) count.textContent = unlocked + " / " + total;
    const bar = $("#mineAchBar");
    if (bar) bar.style.width = (total ? (unlocked / total) * 100 : 0) + "%";
  }

  function checkAchievements() {
    let changed = false;
    ACHIEVEMENTS.forEach((item) => {
      if (state.achievements[item.id]) return;
      if ((Number(item.value()) || 0) >= item.goal) {
        state.achievements[item.id] = Date.now();
        changed = true;
        toast("成就解锁 · " + item.name);
      }
    });
    if (changed) {
      writeJSON("bm:ach", state.achievements);
      renderAchievements();
    }
  }

  function renderQuality() {
    $$(".dq-btn").forEach((btn) => {
      const on = btn.dataset.quality === state.quality;
      btn.classList.toggle("is-on", on);
      btn.setAttribute("aria-pressed", on ? "true" : "false");
    });
    const now = $("#detailQualityNow");
    if (now) now.textContent = QUALITY_NAMES[state.quality] || "标准";
    const tag = $("#detailQuality");
    if (tag) {
      tag.textContent = QUALITY_TAGS[state.quality] || QUALITY_TAGS.standard;
      tag.setAttribute("data-quality", state.quality);
    }
  }
  function setQuality(quality, silent) {
    state.quality = QUALITY_NAMES[quality] ? quality : "standard";
    try { localStorage.setItem("bm:quality", state.quality); } catch (error) {}
    renderQuality();
    if (!silent) {
      bumpStat("quality");
      checkAchievements();
      toast("音质 · " + QUALITY_NAMES[state.quality] + "（源不支持时自动回退）");
    }
  }

  async function api(path, timeout) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout || 12000);
    try {
      const res = await fetch(path, { signal: controller.signal, headers: { Accept: "application/json" } });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.ok === false) throw new Error(data.error || ("HTTP " + res.status));
      return data;
    } finally {
      clearTimeout(timer);
    }
  }

  function loadStored() {
    state.mode = localStorage.getItem("bm:mode") === "default" ? "default" : "burger";
    state.imported = readJSON("bm:playlists", []).map(normalizeImported).filter(Boolean).slice(0, 12);
    writeJSON("bm:playlists", state.imported);
    state.lxSources = readJSON("bm:lx-sources", []).filter((item) => item && item.url);
    state.favorites = readJSON("bm:favorites", []).filter(Boolean);
    const lx = readJSON("bm:lx", {});
    if (lx && lx.base) state.lx.base = lx.base;
    const sync = readJSON("bm:sync", null);
    if (sync && typeof sync === "object") {
      state.sync = {
        enabled: sync.enabled !== false,
        sources: sync.sources !== false,
        playlists: sync.playlists !== false,
        prefs: sync.prefs !== false,
      };
    }
    const mini = readJSON("bm:player-mini", false);
    state.playerMini = mini === true;
    const storedQuality = localStorage.getItem("bm:quality");
    if (QUALITY_NAMES[storedQuality]) state.quality = storedQuality;
    state.history = readJSON("bm:history", []).filter((row) => row && row.track && row.track.name).slice(0, 30);
    const stats = readJSON("bm:stats", null);
    if (stats && typeof stats === "object") {
      state.stats = Object.assign({ plays: 0, sources: {}, days: [], searches: 0, imports: 0, quality: 0, lyrics: 0, nights: 0, mornings: 0 }, stats);
      state.stats.sources = state.stats.sources && typeof state.stats.sources === "object" ? state.stats.sources : {};
      state.stats.days = Array.isArray(state.stats.days) ? state.stats.days : [];
    }
    state.achievements = readJSON("bm:ach", {}) || {};
    const transPref = localStorage.getItem("bm:lyric-trans");
    state.lyricTransOn = transPref === null ? true : transPref === "1";
    const storedVolume = localStorage.getItem("bm:volume");
    const volume = storedVolume === null ? NaN : Number(storedVolume);
    if (Number.isFinite(volume) && volume >= 0 && volume <= 1) {
      audio.volume = volume;
      $("#playerVolume").value = String(Math.round(volume * 100));
      $("#detailVolume").value = String(Math.round(volume * 100));
      $("#detailVolText").textContent = String(Math.round(volume * 100));
      $("#detailVolPopText").textContent = String(Math.round(volume * 100));
      setRangeFill($("#playerVolume"), volume * 100);
      setRangeFill($("#detailVolume"), volume * 100);
    } else {
      audio.volume = 0.72;
      $("#playerVolume").value = "72";
      $("#detailVolume").value = "72";
      $("#detailVolText").textContent = "72";
      $("#detailVolPopText").textContent = "72";
      setRangeFill($("#playerVolume"), 72);
      setRangeFill($("#detailVolume"), 72);
    }
  }

  function saveSession() {
    if (!state.current) return;
    try {
      localStorage.setItem("bm:last", JSON.stringify({
        track: state.current,
        queue: state.queue.slice(0, 80),
        index: state.index,
        time: audio.currentTime || 0,
        context: state.listContext,
      }));
    } catch (error) {}
  }
  function queueSave() {
    clearTimeout(state.saveTimer);
    state.saveTimer = setTimeout(saveSession, 700);
  }

  function renderSkeletonCards() {
    const grid = $("#playlistGrid");
    grid.innerHTML = CURATED.map((item) => (
      '<article class="playlist-card is-loading" data-key="' + esc(item.key) + '">' +
        '<div class="pl-card-art">' +
          '<div class="cover-fallback" style="--accent:' + esc(item.accent) + '"><b>' + esc(item.art) + '</b><small>BURGER MUSIC</small></div>' +
          '<span class="pl-card-badge">' + esc(SOURCE_NAMES[item.source]) + '</span>' +
        '</div>' +
        '<div class="pl-card-body"><b>' + esc(item.display) + '</b><span>' + esc(item.sub) + '</span>' +
          '<div class="pl-card-progress"><i></i></div></div>' +
      '</article>'
    )).join("");
  }

  function updatePlaylistCard(item, data, error) {
    const card = $('#playlistGrid .playlist-card[data-key="' + item.key + '"]');
    if (!card) return;
    card.classList.remove("is-loading");
    if (error) {
      card.classList.add("is-error");
      const status = $(".pl-card-body span", card);
      if (status) status.textContent = "接口暂时不可用 · 点击重试";
      return;
    }
    const art = $(".pl-card-art", card);
    const cover = safeImage((data.tracks && data.tracks[0] && data.tracks[0].cover) || data.cover);
    if (cover) {
      const img = document.createElement("img");
      img.src = cover;
      img.alt = "";
      img.loading = "lazy";
      img.onerror = function () { this.remove(); };
      art.insertBefore(img, art.querySelector(".pl-card-badge"));
    } else {
      const fallback = $(".cover-fallback b", art);
      if (fallback) fallback.textContent = item.art;
    }
    const badge = $(".pl-card-badge", card);
    if (badge) badge.textContent = SOURCE_FULL[item.source] || SOURCE_NAMES[item.source];
    const title = $(".pl-card-body b", card);
    if (title) title.textContent = data.title && data.title.length < 16 ? data.title : item.display;
    const sub = $(".pl-card-body span", card);
    if (sub) sub.textContent = sourceSub(data);
    const progress = $(".pl-card-progress i", card);
    if (progress) progress.style.width = "100%";
    card.dataset.tracks = String((data.tracks || []).length);
    state.homeData[item.key] = { item: item, data: data };
  }

  function sourceSub(data) {
    const name = data.sourceName || SOURCE_NAMES[data.source] || "在线";
    return name + " · " + (data.count || (data.tracks || []).length) + " 首";
  }

  async function loadHome() {
    renderSkeletonCards();
    state.homeLoaded = 0;
    state.homeData = {};
    const status = $("#homeStatus");
    if (status) status.textContent = "正在连接曲库…";
    let firstOnline = null;

    await Promise.all(CURATED.map(async (item) => {
      try {
        const data = await api("/burger-music/api/bm/playlist?source=" + encodeURIComponent(item.source) + "&id=" + encodeURIComponent(item.id) + "&v=26", 16000);
        if (!data.tracks || !data.tracks.length) throw new Error("empty");
        updatePlaylistCard(item, data);
        state.homeLoaded += 1;
        if (!firstOnline) firstOnline = { item: item, data: data };
      } catch (error) {
        updatePlaylistCard(item, null, error);
      }
    }));

    if (status) status.textContent = state.homeLoaded ? ("已连接 " + state.homeLoaded + " / " + CURATED.length + " 张歌单") : "接口暂时不可用 · 可稍后刷新";
    if (firstOnline) {
      state.onlineTracks = firstOnline.data.tracks.slice(0, 12);
      state.listTracks = state.onlineTracks;
      state.listKind = "home";
      state.listContext = firstOnline.data.title;
      renderTracks();
      updateHero(firstOnline.data);
      $("#tracksTitle").textContent = "在线热歌";
      $("#trackContext").textContent = firstOnline.data.title + " · " + firstOnline.data.tracks.length + " 首";
      $("#resumeSide").textContent = "LIVE · " + (firstOnline.data.sourceName || "ONLINE");
    } else {
      renderTracksEmpty("曲库暂时没有响应", "检查网络后点右上角刷新，或先播放本地默认音乐。");
    }
    renderResume();
  }

  function updateHero(data) {
    const track = (data.tracks || [])[0];
    if (!track) return;
    const cover = $("#heroCover");
    const src = safeImage(track.cover);
    if (src) {
      cover.innerHTML = '<div class="cover-fallback"><b>BM</b><small>PLAY IT LOUD</small></div>' +
        '<img src="' + esc(src) + '" alt="" onerror="this.remove()">';
    }
    $("#fcNet").textContent = data.sourceName || "网易云";
    $("#heroNow").textContent = (data.title || "今日推荐") + " · 001";
    $("#heroPlay").dataset.trackKey = data.id || "";
  }

  function renderTracksEmpty(title, sub) {
    $("#trackList").innerHTML = '<div class="track-empty"><b>' + esc(title) + '</b>' + esc(sub) + '</div>';
  }

  function durationText(track) {
    let seconds = secondsOf(track && track.duration);
    if (!seconds && track && isCurrent(track)) seconds = secondsOf(audio.duration);
    return seconds > 0 ? fmt(seconds) : "—";
  }

  function syncTrackDuration(track, value) {
    const seconds = secondsOf(value);
    if (!seconds) return;
    if (track) track.duration = seconds;
    if (state.current && (!track || isCurrent(track))) state.current.duration = seconds;
    if (state.queue[state.index] && (!track || isCurrent(state.queue[state.index]))) state.queue[state.index].duration = seconds;
    if (state.listTracks) {
      state.listTracks.forEach((row) => {
        if (row && track && String(row.id) === String(track.id) && row.source === track.source) row.duration = seconds;
      });
    }
    state.imported.forEach((item) => {
      if (!item || !Array.isArray(item.tracks) || !track) return;
      item.tracks.forEach((row) => {
        if (row && String(row.id) === String(track.id) && row.source === track.source) row.duration = seconds;
      });
    });
    const player = $("#playerDuration");
    const detail = $("#detailDuration");
    if (player && state.current && isCurrent(state.current)) player.textContent = fmt(seconds);
    if (detail && state.current && isCurrent(state.current)) detail.textContent = fmt(seconds);
  }

  function renderTracks() {
    const list = state.listTracks || [];
    const wrap = $("#trackList");
    if (!list.length) {
      wrap.classList.remove("is-cards");
      renderTracksEmpty("还没有歌曲", "导入一张歌单，或从今日推荐开始。");
      return;
    }
    if (state.view === "cards") {
      wrap.classList.add("is-cards");
      wrap.innerHTML = '<div class="track-cards">' + list.map((track, index) => {
        hydrateCover(track);
        const playing = isCurrent(track);
        return '<article class="tc-card' + (playing ? " is-playing" : "") + '" data-index="' + index + '" tabindex="0" role="button" aria-label="播放 ' + esc(track.name) + '">' +
          '<div class="tc-art">' + coverHTML(track) +
            '<span class="tc-src">' + esc(SOURCE_NAMES[track.source] || "在线") + '</span>' +
            '<span class="tc-dur">' + esc(durationText(track)) + '</span>' +
            '<button class="tc-play" type="button" aria-label="播放"><svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg></button>' +
          '</div>' +
          '<b class="tc-name">' + esc(track.name) + '</b>' +
          '<span class="tc-artist">' + esc(track.artist || "未知歌手") + '</span>' +
        '</article>';
      }).join("") + '</div>';
      return;
    }
    wrap.classList.remove("is-cards");
    wrap.innerHTML = list.map((track, index) => {
      hydrateCover(track);
      const playing = isCurrent(track);
      return '<div class="track-row' + (playing ? ' is-playing' : '') + '" data-index="' + index + '" tabindex="0" role="button" aria-label="播放 ' + esc(track.name) + '">' +
        '<span class="tr-index">' + String(index + 1).padStart(2, "0") + '</span>' +
        '<span class="tr-cover">' + coverHTML(track) + '</span>' +
        '<span class="tr-meta"><b>' + esc(track.name) + '</b><span>' + esc(track.artist || "未知歌手") + '</span></span>' +
        '<span class="tr-album">' + esc(track.album || "—") + '</span>' +
        '<span class="tr-source ' + sourceClass(track.source) + '"><i></i>' + esc(SOURCE_NAMES[track.source] || "在线") + '</span>' +
        '<span class="tr-time">' + esc(durationText(track)) + '</span>' +
        '<button class="tr-play" type="button" aria-label="播放"><svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg></button>' +
      '</div>';
    }).join("");
  }

  function isCurrent(track) {
    return !!(state.current && track && state.current.source === track.source && String(state.current.id) === String(track.id));
  }

  function renderResume() {
    const track = state.current || (state.listTracks && state.listTracks[0]) || DEFAULT_TRACK;
    const cover = $("#resumeCard .resume-cover");
    if (cover) cover.innerHTML = coverHTML(track);
    $("#resumeName").textContent = track.name || "从一首歌开始";
    $("#resumeMeta").textContent = track.artist ? (track.artist + " · " + (track.album || SOURCE_NAMES[track.source] || "在线")) : "导入歌单，或直接播放今日推荐";
    $("#resumeBadge").textContent = state.current ? (audio.paused ? "PAUSED" : "PLAYING") : "READY";
    $("#queueCount").textContent = String(state.queue.length || 0);
    updateResumeBar();
  }
  function updateResumeBar() {
    const bar = $("#resumeBar");
    if (!bar) return;
    const duration = audio.duration || (state.current && state.current.duration) || 0;
    const pct = duration > 0 ? (audio.currentTime / duration) * 100 : 0;
    bar.style.width = Math.max(0, Math.min(100, pct)) + "%";
  }

  function hydrateCover(track) {
    if (!track) return track;
    try {
      if (track.source === "kugou") {
        if (track.cover) return track;
        const albumId = new URL(track.url || "", location.origin).searchParams.get("album_id") || "";
        if (track.id) {
          track.cover = "/burger-music/api/bm/image?source=kugou&hash=" + encodeURIComponent(track.id) + (albumId ? "&album_id=" + encodeURIComponent(albumId) : "");
        } else if (albumId) {
          track.cover = "https://imge.kugou.com/stdmusic/400/" + encodeURIComponent(albumId) + ".jpg";
        }
      } else if (track.cover) {
        return track;
      } else if (track.source === "tencent" && track.id) {
        if (!track.cover || /meting.*type=pic/i.test(track.cover)) {
          track.cover = "/burger-music/api/bm/image?source=tencent&id=" + encodeURIComponent(track.id);
        }
      } else if (track.source === "netease" && track.id) {
        if (!track.cover || /meting.*type=pic/i.test(track.cover)) {
          track.cover = "https://api.injahow.cn/meting/?server=netease&type=pic&id=" + encodeURIComponent(track.id);
        }
      }
    } catch (error) {}
    return track;
  }

  function paintCompactArt(imgSelector, fallbackSelector, src, name) {
    const img = document.querySelector(imgSelector);
    const fallback = document.querySelector(fallbackSelector);
    if (!img || !fallback) return;
    const letter = fallback.querySelector("b");
    if (letter) letter.textContent = initials(name);
    fallback.style.display = "grid";
    img.onload = function () {
      fallback.style.display = "none";
      img.style.display = "block";
    };
    img.onerror = function () {
      img.removeAttribute("src");
      img.style.display = "none";
      fallback.style.display = "grid";
    };
    img.referrerPolicy = "no-referrer";
    if (src) {
      img.src = src;
      img.style.display = "block";
    } else {
      img.removeAttribute("src");
      img.style.display = "none";
    }
  }

  function setPlayerTrack(track) {
    state.current = hydrateCover(track);
    const source = SOURCE_FULL[track.source] || "BURGER MUSIC";
    $("#playerTitle").textContent = track.name || "未知歌曲";
    $("#playerArtist").textContent = track.artist || "未知歌手";
    $("#playerSource").textContent = source;
    const cover = $("#playerCover");
    const coverFallback = $("#playerCoverFallback");
    const src = safeImage(track.cover);
    coverFallback.style.display = "grid";
    $("#playerCoverFallback b").textContent = initials(track.name);
    cover.onload = function () {
      coverFallback.style.display = "none";
      cover.style.display = "block";
    };
    cover.onerror = function () {
      cover.removeAttribute("src");
      cover.style.display = "none";
      coverFallback.style.display = "grid";
    };
    cover.referrerPolicy = "no-referrer";
    if (src) {
      cover.src = src;
      cover.style.display = "block";
    } else {
      cover.removeAttribute("src");
      cover.style.display = "none";
    }
    if (!state.playerMini) $("#playerCoverBtn").setAttribute("aria-label", "打开 " + (track.name || "播放") + " 播放详情");

    const compactTitle = $("#miniTitle");
    if (compactTitle) compactTitle.textContent = track.name || "未知歌曲";
    const compactArtist = $("#miniArtist");
    if (compactArtist) compactArtist.textContent = track.artist || "未知歌手";
    const compactSource = $("#miniSource");
    if (compactSource) compactSource.textContent = source;
    const sideCoverBtn = $("#sideCoverBtn");
    if (sideCoverBtn) {
      sideCoverBtn.setAttribute("aria-label", "打开 " + (track.name || "播放") + " 迷你播放器");
      sideCoverBtn.title = track.name || "播放器";
    }
    paintCompactArt("#sideCoverImg", ".side-player .cover-fallback", src, track.name);
    paintCompactArt("#miniCover", ".mini-cover .cover-fallback", src, track.name);

    $("#detailTitle").textContent = track.name || "未知歌曲";
    $("#detailArtist").textContent = track.artist || "未知歌手";
    $("#detailSource").textContent = source;
    $("#detailAlbum").textContent = track.album || "ONLINE RADIO";
    $("#detailQuality").textContent = track.source === "local" ? "LOCAL · HQ" : "HQ · ONLINE";
    renderQuality();
    const detailCover = $("#detailCover");
    const detailSrc = safeImage(track.cover);
    detailCover.innerHTML = '<div class="cover-fallback"><b>' + esc(initials(track.name)) + '</b><small>BURGER MUSIC</small></div>' +
      (detailSrc ? '<img src="' + esc(detailSrc) + '" alt="" referrerpolicy="no-referrer" onerror="this.remove()">' : "");
    if (detailSrc) $("#detailBg").style.backgroundImage = 'url("' + detailSrc.replace(/"/g, "%22") + '")';
    else $("#detailBg").style.backgroundImage = "";
    $("#playerDuration").textContent = secondsOf(track.duration) ? fmt(secondsOf(track.duration)) : "0:00";
    $("#detailDuration").textContent = secondsOf(track.duration) ? fmt(secondsOf(track.duration)) : "0:00";
    $("#playerTime").textContent = "0:00";
    $("#detailTime").textContent = "0:00";
    updateRangeUI(0, secondsOf(track.duration));
    updateFavorite();
    renderResume();
    renderUpNext();
    renderTracks();
    updateLyrics(track);
    setMediaSession(track);
    $("#resumeSide").textContent = state.listContext ? "FROM · " + state.listContext : "LAST SESSION";
    $("#detailContext").textContent = state.listContext || "BURGER MUSIC";

    addHistory(track);
    bumpStat("plays");
    trackSourceStat(track.source);
    const hour = new Date().getHours();
    if (hour < 5) bumpStat("nights");
    else if (hour >= 5 && hour < 8) bumpStat("mornings");
    checkAchievements();
  }

  function setMediaSession(track) {
    if (!("mediaSession" in navigator)) return;
    try {
      const artwork = [];
      const src = safeImage(track.cover);
      if (src) artwork.push({ src: new URL(src, location.href).href, sizes: "512x512" });
      navigator.mediaSession.metadata = new MediaMetadata({
        title: track.name || "Burger music",
        artist: track.artist || "Burger music",
        album: track.album || "Burger music",
        artwork: artwork,
      });
      navigator.mediaSession.setActionHandler("play", () => playAudio());
      navigator.mediaSession.setActionHandler("pause", () => pauseAudio());
      navigator.mediaSession.setActionHandler("previoustrack", () => prevTrack());
      navigator.mediaSession.setActionHandler("nexttrack", () => nextTrack());
    } catch (error) {}
  }

  function updateFavorite() {
    const on = state.current && state.favorites.includes(state.current.source + ":" + state.current.id);
    $("#detailFav").textContent = on ? "♥" : "♡";
    $("#detailFav").style.color = on ? "var(--brand-2)" : "";
    $("#detailFav").setAttribute("aria-label", on ? "取消收藏" : "收藏");
  }

  function renderUpNext() {
    const list = [];
    if (state.queue.length > 1) {
      for (let i = 1; i <= Math.min(3, state.queue.length - 1); i += 1) {
        const index = (state.index + i) % state.queue.length;
        list.push({ track: state.queue[index], index: index });
      }
    }
    $("#upnextCount").textContent = (state.queue.length || 0) + " TRACKS";
    if (!list.length) {
      $("#upnextList").innerHTML = '<div class="muted" style="padding:6px 0">队列里还没有下一首</div>';
      return;
    }
    $("#upnextList").innerHTML = list.map((row) => (
      '<div class="u-row" data-index="' + row.index + '">' +
        '<span class="u-cover">' + coverHTML(row.track) + '</span>' +
        '<span class="u-copy"><b>' + esc(row.track.name) + '</b><span>' + esc(row.track.artist || "未知歌手") + '</span></span>' +
        '<span class="u-time">' + (secondsOf(row.track.duration) ? fmt(secondsOf(row.track.duration)) : "--:--") + '</span>' +
      '</div>'
    )).join("");
    $$(".u-row", $("#upnextList")).forEach((row) => {
      row.addEventListener("click", () => playAt(Number(row.dataset.index)));
    });
  }

  function setPlayIcon(playing) {
    const btns = [$("#playerPlay"), $("#detailPlay"), $("#miniPlay")];
    btns.forEach((btn) => {
      if (!btn) return;
      btn.classList.toggle("is-playing", playing);
      btn.setAttribute("aria-label", playing ? "暂停" : "播放");
    });
    const sideCover = $("#sideCoverBtn");
    if (sideCover) sideCover.classList.toggle("is-paused", !playing);
    const resumeBadge = $("#resumeBadge");
    if (resumeBadge) resumeBadge.textContent = playing ? "PLAYING" : (state.current ? "PAUSED" : "READY");
  }

  function handlePlayError(error) {
    if (!error) return;
    if (error.name === "NotAllowedError") {
      toast("浏览器拦截了自动播放，点一下播放键继续");
      return;
    }
    if (error.name === "AbortError") return;
    toast("当前音源加载失败，正在自动换源…");
    recoverCurrent();
  }

  function safePlay() {
    if (!audio.src) return;
    audio.play().catch(handlePlayError);
  }

  function playAudio() {
    if (!state.current) {
      const track = (state.listTracks && state.listTracks[0]) || (state.mode === "default" ? DEFAULT_TRACK : null);
      if (track) setQueue([track], 0, state.listContext || "Burger music", true);
      return;
    }
    if (!audio.src) {
      loadAudio(state.current, true);
      return;
    }
    safePlay();
  }
  function pauseAudio() {
    audio.pause();
  }
  function togglePlay() {
    if (!audio.paused) pauseAudio();
    else playAudio();
  }

  function trackQuery(track) {
    const query = new URLSearchParams({
      source: track.source || "netease",
      id: track.id || "",
      name: track.name || "",
      artist: track.artist || "",
      hash: track.id || "",
    });
    if (track.source === "kugou") {
      try { query.set("album_id", new URL(track.url, location.origin).searchParams.get("album_id") || ""); } catch (error) {}
    }
    return query.toString();
  }

  function isMetingUrl(value) {
    return /api\.injahow\.cn\/meting|\/meting\//i.test(String(value || ""));
  }

  async function findNeteaseAlt(track) {
    try {
      const keyword = [track.name, track.artist].filter(Boolean).join(" ");
      const data = await api("/burger-music/api/bm/search?server=netease&keyword=" + encodeURIComponent(keyword) + "&limit=6", 12000);
      const norm = (value) => String(value || "").toLowerCase().replace(/[\s·・\-_—()（）[\]【】,.，。!！?？'"“”]/g, "");
      const pick = (data.tracks || []).find((item) => norm(item.name) === norm(track.name) && String(item.id) !== String(track.id));
      if (!pick || !pick.id) return "";
      const resolved = await api("/burger-music/api/bm/resolve?source=netease&id=" + encodeURIComponent(pick.id), 12000);
      return resolved && resolved.url && !isMetingUrl(resolved.url) ? resolved.url : "";
    } catch (error) {
      return "";
    }
  }

  async function findKugouViaJina(track) {
    try {
      const cached = readJSON("bm:jina:" + track.id, null);
      if (cached && cached.url && cached.expires > Date.now()) return cached.url;
      let albumId = "";
      try { albumId = new URL(track.url, location.origin).searchParams.get("album_id") || ""; } catch (error) {}
      const target = "https://m.kugou.com/app/i/getSongInfo.php?cmd=playInfo" +
        "&hash=" + encodeURIComponent(track.id) + (albumId ? "&album_id=" + encodeURIComponent(albumId) : "");
      const res = await fetch("https://r.jina.ai/" + encodeURIComponent(target), {
        headers: { Accept: "text/plain" },
      });
      if (!res.ok) return "";
      const text = await res.text();
      const start = text.indexOf("{");
      const end = text.lastIndexOf("}");
      if (start < 0 || end <= start) return "";
      const data = JSON.parse(text.slice(start, end + 1));
      const url = String(data.url || (Array.isArray(data.backup_url) ? data.backup_url[0] : data.backup_url) || "").replace(/^http:/i, "https:");
      if (!url) return "";
      writeJSON("bm:jina:" + track.id, { url, expires: Date.now() + 10 * 60 * 1000 });
      return url;
    } catch (error) {
      return "";
    }
  }

  async function resolvePlayUrl(track, force) {
    if (!track) return "";
    if (track.source === "local") return track.url || "";
    if (track.source === "netease") {
      if (!force && track.url && !isMetingUrl(track.url)) return track.url;
      try {
        const data = await api("/burger-music/api/bm/resolve?" + trackQuery(track), 15000);
        if (data && data.ok && data.url && !isMetingUrl(data.url)) {
          if (state.current === track && data.matched && data.matched !== track.name) {
            toast("已自动匹配可播放音源 · " + data.matched);
          }
          return data.url;
        }
      } catch (error) { /* fall through */ }
      return await findNeteaseAlt(track);
    }
    try {
      const data = await api("/burger-music/api/bm/resolve?" + trackQuery(track), 15000);
      if (data && data.ok && data.url) {
        if (state.current === track && data.matched && data.matched !== track.name) {
          toast("已切换到同曲 · " + data.matched);
        }
        return data.url;
      }
    } catch (error) { /* fall through */ }
    if (track.source === "kugou") {
      const jinaUrl = await findKugouViaJina(track);
      if (jinaUrl) return jinaUrl;
      const stored = String(track.url || "");
      return /^\/api\/bm\/kugou-stream/i.test(stored) ? "" : stored;
    }
    return "";
  }

  function streamProxy(url, track) {
    const value = String(url || "");
    if (!value) return "";
    if (/^\/api\/bm\/stream/i.test(value)) return value;
    if (/^\/api\/bm\/kugou-stream/i.test(value)) {
      try {
        const params = new URL(value, location.origin).searchParams;
        const hash = params.get("hash") || "";
        const albumId = params.get("album_id") || "";
        return "/burger-music/api/bm/stream?source=kugou&hash=" + encodeURIComponent(hash) +
          (albumId ? "&album_id=" + encodeURIComponent(albumId) : "");
      } catch (error) {
        return value;
      }
    }
    if (/^https?:\/\//i.test(value)) return "/burger-music/api/bm/stream?url=" + encodeURIComponent(value);
    return value;
  }

  function kugouProxy(track) {
    if (!track) return "";
    const url = String(track.url || "");
    if (/^\/api\/bm\/kugou-stream/i.test(url)) return streamProxy(url, track);
    return "/burger-music/api/bm/stream?source=kugou&hash=" + encodeURIComponent(track.id || "");
  }

  function setSource(proxyUrl, autoplay) {
    audio.src = proxyUrl;
    audio.load();
    if (autoplay) safePlay();
    $("#playerTime").textContent = "0:00";
    $("#detailTime").textContent = "0:00";
    updateRangeUI(0, state.current && state.current.duration || 0);
  }

  function applyAudioSource(track, url, autoplay, candidates) {
    state.recovering = false;
    state.recoveryTried = false;
    state.recoveryTrack = track.id || track.name;
    state.candidates = (candidates && candidates.length ? candidates : [url]).filter(Boolean);
    state.candidateIndex = 0;
    const first = state.candidates[0] || url;
    setSource(first, autoplay);
    clearTimeout(state.loadFailTimer);
    state.loadFailTimer = setTimeout(() => {
      if (!state.current || String(state.current.id) !== String(track.id)) return;
      if (audio.readyState < 2 && !audio.paused) {
        toast("音源加载超时，正在自动换源…");
        if (!tryNextCandidate()) recoverCurrent();
      }
    }, 9000);
  }

  async function loadAudio(track, autoplay) {
    if (!track) return;
    const token = (state.loadToken = (state.loadToken || 0) + 1);
    clearTimeout(state.loadFailTimer);
    let first = "";
    if (track.source === "local") first = track.url || "";
    else if (track.source === "netease" && track.url && !isMetingUrl(track.url)) first = streamProxy(track.url, track);
    if (!first && track.source !== "local" && track.source !== "netease") {
      const ai = await findAiSource(track, false);
      if (token !== state.loadToken) return;
      if (ai && ai.url) {
        first = streamProxy(ai.url, track);
        toast("AI 已匹配音源：" + ai.provider);
      }
    }
    if (!first && track.source !== "local") {
      const resolved = await resolvePlayUrl(track, false);
      if (token !== state.loadToken) return;
      first = streamProxy(resolved, track);
    }
    if (!first) {
      toast("这首歌暂无可播放地址，正在自动换源…");
      recoverCurrent();
      return;
    }
    const firstProxy = track.source === "local" ? first : streamProxy(first, track);
    applyAudioSource(track, firstProxy, autoplay, [firstProxy]);
    if (token !== state.loadToken) return;
  }

  function failCurrentTrack() {
    setPlayIcon(false);
    clearTimeout(state.loadFailTimer);
    if (state.queue.length > 1) {
      toast("当前音源无法播放，自动切换下一首");
      state.failNextTimer = setTimeout(() => { state.failNextTimer = 0; nextTrack(true); }, 900);
    } else {
      toast("当前音源无法播放，请稍后重试或切换音源");
    }
  }

  function tryNextCandidate() {
    if (!state.candidates || state.candidateIndex >= state.candidates.length - 1) return false;
    state.candidateIndex += 1;
    setSource(state.candidates[state.candidateIndex], true);
    toast("换用备用音源…");
    return true;
  }

  const aiSourceCache = new Map();

  async function findAiSource(track, force) {
    if (!track || track.source === "local") return null;
    const key = track.source + ":" + (track.id || track.name || "");
    if (!force && aiSourceCache.has(key)) return aiSourceCache.get(key);
    const params = new URLSearchParams({
      source: track.source || "",
      id: String(track.id || ""),
      name: String(track.name || ""),
      artist: String(track.artist || ""),
      duration: String(Math.round(Number(track.duration) || 0)),
    });
    try {
      const res = await fetch("/burger-music/api/bm/auto?" + params.toString(), { cache: "no-store" });
      const data = await res.json();
      const result = data && data.ok && data.url ? { url: String(data.url), provider: String(data.provider || "在线音源") } : null;
      aiSourceCache.set(key, result);
      return result;
    } catch (error) {
      return null;
    }
  }

  async function recoverCurrent() {
    const track = state.current;
    if (!track || state.recovering) return;
    if (state.recoveryTried) {
      failCurrentTrack();
      return;
    }
    state.recovering = true;
    state.recoveryTried = true;
    clearTimeout(state.loadFailTimer);
    const candidates = [];
    const push = (value) => {
      if (!value) return;
      const proxied = track.source === "local" ? value : streamProxy(value, track);
      if (proxied && !candidates.includes(proxied)) candidates.push(proxied);
    };
    try {
      const ai = await findAiSource(track, true);
      if (ai && ai.url) {
        push(ai.url);
        toast("AI 已匹配音源：" + ai.provider);
      }
      if (track.source === "kugou") {
        push(await findKugouViaJina(track));
        push(await findNeteaseAlt(track));
        push(await resolvePlayUrl(track, true));
        push("/burger-music/api/bm/stream?source=kugou&hash=" + encodeURIComponent(track.id || ""));
      } else if (track.source !== "local") {
        const resolved = await resolvePlayUrl(track, true);
        push(resolved);
        push(await findNeteaseAlt(track));
      }
      if (candidates.length) {
        setSource(candidates[0], true);
        state.candidates = candidates;
        state.candidateIndex = 0;
        toast("已自动切换到备用音源");
        state.loadFailTimer = setTimeout(() => {
          if (audio.readyState < 2) {
            if (!tryNextCandidate()) recoverCurrent();
          }
        }, 9000);
      } else {
        failCurrentTrack();
      }
    } finally {
      state.recovering = false;
    }
  }

  function setQueue(tracks, index, context, autoplay) {
    state.queue = Array.isArray(tracks) ? tracks.slice() : [];
    state.index = Math.max(0, Math.min(Number(index) || 0, state.queue.length - 1));
    state.listTracks = state.queue.slice();
    state.listKind = "queue";
    state.listContext = context || "Burger music";
    setPlayerTrack(state.queue[state.index]);
    renderTracks();
    $("#tracksTitle").textContent = context || "正在播放";
    $("#trackContext").textContent = state.queue.length + " 首 · " + (SOURCE_NAMES[state.queue[state.index].source] || "在线");
    $("#tracksKicker").textContent = "QUEUE · 03";
    $("#clearSearch").hidden = true;
    loadAudio(state.queue[state.index], !!autoplay);
    queueSave();
  }

  function playAt(index) {
    if (!state.queue.length) return;
    state.index = (index + state.queue.length) % state.queue.length;
    state.current = state.queue[state.index];
    setPlayerTrack(state.current);
    loadAudio(state.current, true);
    renderTracks();
    renderUpNext();
    queueSave();
    window.scrollTo({ top: Math.max(0, $("#player").offsetTop - 200), behavior: "smooth" });
  }

  function nextTrack(auto) {
    if (!state.queue.length) return;
    if (state.modeIndex === 1 && auto) {
      audio.currentTime = 0;
      audio.play().catch(() => {});
      return;
    }
    let index;
    if (state.modeIndex === 2) {
      if (state.queue.length === 1) index = 0;
      else {
        index = state.index;
        while (index === state.index) index = Math.floor(Math.random() * state.queue.length);
      }
    } else {
      index = (state.index + 1) % state.queue.length;
    }
    playAt(index);
  }
  function prevTrack() {
    if (!state.queue.length) return;
    if (audio.currentTime > 3.2) {
      audio.currentTime = 0;
      return;
    }
    playAt((state.index - 1 + state.queue.length) % state.queue.length);
  }

  function updateRangeUI(time, duration) {
    const max = 1000;
    const pct = duration > 0 ? Math.max(0, Math.min(1, time / duration)) : 0;
    const value = Math.round(pct * max);
    if (!state.seeking) {
      $("#playerProgress").value = String(value);
      $("#detailProgress").value = String(value);
      $("#playerTime").textContent = fmt(time);
      $("#detailTime").textContent = fmt(time);
      $("#playerDuration").textContent = duration ? fmt(duration) : "0:00";
      $("#detailDuration").textContent = duration ? fmt(duration) : "0:00";
      setRangeFill($("#playerProgress"), pct * 100);
      setRangeFill($("#detailProgress"), pct * 100);
    }
    updateResumeBar();
  }

  function seekTo(value) {
    const duration = audio.duration || (state.current && state.current.duration) || 0;
    if (!duration) return;
    audio.currentTime = (Math.max(0, Math.min(1000, Number(value) || 0)) / 1000) * duration;
  }

  function bindRange(input, onChange) {
    if (!input) return;
    input.addEventListener("pointerdown", () => { state.seeking = true; });
    input.addEventListener("input", () => {
      state.seeking = true;
      const value = Number(input.value);
      const duration = audio.duration || (state.current && state.current.duration) || 0;
      setRangeFill(input, value / 10);
      const time = duration > 0 ? (value / 1000) * duration : 0;
      const other = input === $("#playerProgress") ? $("#detailProgress") : $("#playerProgress");
      if (other) other.value = String(value);
      $("#playerTime").textContent = fmt(time);
      $("#detailTime").textContent = fmt(time);
    });
    const done = () => {
      onChange(Number(input.value));
      state.seeking = false;
      const duration = audio.duration || (state.current && state.current.duration) || 0;
      updateRangeUI(audio.currentTime, duration);
    };
    input.addEventListener("change", done);
    input.addEventListener("pointerup", done);
  }

  function changeMode() {
    state.modeIndex = (state.modeIndex + 1) % MODES.length;
    const mode = MODES[state.modeIndex];
    $("#modeText").textContent = mode.short;
    $("#detailModeText").textContent = mode.label;
    const svg = $("#playerMode svg");
    if (svg) svg.innerHTML = mode.icon;
    $("#playerMode").setAttribute("aria-label", "播放模式：" + mode.label);
    $("#playerMode").title = "播放模式：" + mode.label;
    const miniText = $("#miniModeText");
    if (miniText) miniText.textContent = mode.short;
    const miniSvg = $("#miniMode svg");
    if (miniSvg) miniSvg.innerHTML = mode.icon;
    const miniMode = $("#miniMode");
    if (miniMode) {
      miniMode.setAttribute("aria-label", "播放模式：" + mode.label);
      miniMode.title = "播放模式：" + mode.label;
    }
    toast("播放模式 · " + mode.label);
    queueSave();
  }

  function updateVolume(value) {
    const v = Math.max(0, Math.min(100, Number(value) || 0));
    audio.volume = v / 100;
    audio.muted = false;
    state.muted = false;
    $("#playerVolume").value = String(v);
    $("#detailVolume").value = String(v);
    $("#detailVolText").textContent = String(v);
    const popText = $("#detailVolPopText");
    if (popText) popText.textContent = String(v);
    setRangeFill($("#playerVolume"), v);
    setRangeFill($("#detailVolume"), v);
    try { localStorage.setItem("bm:volume", String(audio.volume)); } catch (error) {}
  }
  function toggleMute() {
    state.muted = !state.muted;
    audio.muted = state.muted;
    toast(state.muted ? "已静音" : "已恢复音量");
    $("#detailVolText").textContent = state.muted ? "0" : String(Math.round(audio.volume * 100));
  }

  function applyMode(mode, silent) {
    state.mode = mode === "default" ? "default" : "burger";
    document.body.dataset.mode = state.mode;
    $$("[data-mode]").forEach((btn) => {
      const on = btn.dataset.mode === state.mode;
      btn.classList.toggle("is-on", on);
      btn.setAttribute("aria-pressed", on ? "true" : "false");
    });
    $("#sourceHint").textContent = state.mode === "burger"
      ? "在线曲库 · Meting + 落雪音源"
      : "本地曲库 · 站点默认背景音乐";
    $("#crumbNow").textContent = state.mode === "burger" ? "BURGER MUSIC" : "DEFAULT PLAYER";
    try { localStorage.setItem("bm:mode", state.mode); } catch (error) {}
    if (!silent) toast(state.mode === "burger" ? "播放源 · Burger music" : "播放源 · 默认");
  }

  function switchMode(mode) {
    if (mode === state.mode) return;
    applyMode(mode);
    if (state.mode === "default") {
      state.queue = [DEFAULT_TRACK];
      state.index = 0;
      state.listTracks = state.queue;
      state.listKind = "default";
      state.listContext = "默认播放器";
      setPlayerTrack(DEFAULT_TRACK);
      renderTracks();
      $("#tracksTitle").textContent = "默认播放器";
      $("#trackContext").textContent = "站点本地音乐";
      $("#tracksKicker").textContent = "LOCAL · 03";
      $("#clearSearch").hidden = true;
      loadAudio(DEFAULT_TRACK, false);
    } else {
      if (state.onlineTracks.length) {
        state.queue = state.onlineTracks.slice();
        state.index = 0;
        state.listTracks = state.queue;
        state.listKind = "home";
        state.listContext = "今日推荐";
        setPlayerTrack(state.queue[0]);
        renderTracks();
        $("#tracksTitle").textContent = "在线热歌";
        $("#trackContext").textContent = "今日推荐队列";
        $("#tracksKicker").textContent = "ONLINE · 03";
        loadAudio(state.queue[0], false);
      } else {
        loadHome();
      }
    }
  }

  async function loadPlaylist(item, autoplay) {
    try {
      let data = null;
      if (item.tracks && item.tracks.length) {
        data = { source: item.source, sourceName: SOURCE_NAMES[item.source], title: item.title, cover: item.cover, tracks: item.tracks };
      } else {
        const cached = state.homeData[item.key];
        if (cached) data = cached.data;
      }
      if (!data) {
        toast("正在解析《" + (item.title || item.display || "歌单") + "》…");
        data = await api("/burger-music/api/bm/playlist?source=" + encodeURIComponent(item.source) + "&id=" + encodeURIComponent(item.id) + "&v=26", 18000);
        state.homeData[item.key] = { item: item, data: data };
      }
      if (!data.tracks || !data.tracks.length) throw new Error("empty playlist");
      state.onlineTracks = data.tracks.slice(0, 12);
      state.queue = data.tracks.slice();
      state.index = 0;
      state.listTracks = state.queue;
      state.listKind = "playlist";
      state.view = "cards";
      state.listContext = data.title || item.title;
      setPlayerTrack(state.queue[0]);
      renderTracks();
      const tracksBox = $("#tracks");
      if (tracksBox) tracksBox.scrollIntoView({ behavior: "smooth", block: "start" });
      $("#tracksTitle").textContent = data.title || item.title || "歌单";
      $("#trackContext").textContent = data.tracks.length + " 首 · " + (data.sourceName || SOURCE_NAMES[data.source]);
      $("#tracksKicker").textContent = "PLAYLIST · 03";
      $("#clearSearch").hidden = true;
      $("#resumeSide").textContent = "FROM · " + (data.sourceName || "ONLINE");
      loadAudio(state.queue[0], !!autoplay);
      toast("已载入《" + (data.title || item.title) + "》 · " + data.tracks.length + " 首");
    } catch (error) {
      toast("歌单解析失败：" + (error.message || "请稍后重试"));
    }
  }

  function bindCardEvents() {
    $("#playlistGrid").addEventListener("click", (event) => {
      const card = event.target.closest(".playlist-card");
      if (!card) return;
      const key = card.dataset.key;
      const item = CURATED.find((row) => row.key === key);
      if (!item) return;
      const isPlay = event.target.closest(".pl-card-play");
      if (card.classList.contains("is-error")) {
        loadHome();
        return;
      }
      loadPlaylist(item, !!isPlay);
      closeModal("shelf");
    });
  }

  /* ---------- lyrics ---------- */
  function parseTs(min, sec, frac) {
    const m = Number(min) || 0;
    const s = Number(sec) || 0;
    let ms = 0;
    if (frac != null) ms = Number(String(frac).padEnd(3, "0").slice(0, 3)) / 1000;
    return m * 60 + s + ms;
  }

  function parseLrc(raw, duration) {
    const text = String(raw || "").replace(/\r/g, "").replace(/\uFEFF/g, "");
    const offsetMatch = /\[offset:([+-]?\d+)\]/i.exec(text);
    const offset = offsetMatch ? Number(offsetMatch[1]) / 1000 : 0;
    const lines = [];
    const tagRe = /\[(\d{1,3}):(\d{1,2})(?:[.:](\d{1,3}))?\]/g;
    const wordRe = /<(\d{1,3}):(\d{1,2})(?:[.:](\d{1,3}))?>/g;
    text.split("\n").forEach((line) => {
      if (!line.trim()) return;
      if (/^\[(ti|ar|al|by|offset|re|ve|id|kana|language):/i.test(line.trim())) return;
      const tags = [];
      let match;
      tagRe.lastIndex = 0;
      while ((match = tagRe.exec(line))) {
        tags.push({ time: parseTs(match[1], match[2], match[3]) + offset, end: tagRe.lastIndex });
      }
      if (!tags.length) return;
      const startAt = tags[tags.length - 1].end;
      let content = line.slice(startAt).trim();
      if (!content) return;
      const words = [];
      let lastWordTime = null;
      let cursor = 0;
      let wm;
      wordRe.lastIndex = 0;
      while ((wm = wordRe.exec(content))) {
        const chunk = content.slice(cursor, wm.index);
        if (chunk) words.push({ text: chunk, time: lastWordTime });
        lastWordTime = parseTs(wm[1], wm[2], wm[3]) + offset;
        cursor = wm.index + wm[0].length;
      }
      const tail = content.slice(cursor);
      if (tail) words.push({ text: tail, time: lastWordTime });
      const plain = content.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
      if (!plain) return;
      tags.forEach((tag) => {
        if (!Number.isFinite(tag.time)) return;
        lines.push({
          time: Math.max(0, tag.time),
          text: plain,
          words: words.map((word) => ({ text: word.text, time: word.time == null ? 0 : word.time })),
          hasExact: words.some((word) => word.time != null && word.time > 0),
          chars: [],
          end: 0,
        });
      });
    });

    lines.sort((a, b) => a.time - b.time);
    const deduped = [];
    lines.forEach((line) => {
      const prev = deduped[deduped.length - 1];
      if (!prev || Math.abs(prev.time - line.time) > 0.04 || prev.text !== line.text) deduped.push(line);
    });
    deduped.forEach((line, index) => {
      const next = deduped[index + 1];
      line.end = next ? Math.max(line.time + 0.3, next.time) : (duration > line.time ? duration : line.time + 6);
      line.chars = buildChars(line);
    });
    return deduped;
  }

  function buildChars(line) {
    const chars = Array.from(String(line.text || ""));
    const result = chars.map((ch) => ({ ch: ch, start: line.time, end: line.end }));
    if (!chars.length) return result;
    if (line.hasExact && line.words.length) {
      let cursorTime = line.time;
      const wordChars = [];
      line.words.forEach((word, wi) => {
        const start = word.time > 0 ? word.time : cursorTime;
        const next = line.words[wi + 1];
        const end = next && next.time > start ? next.time : line.end;
        const list = Array.from(String(word.text || ""));
        const span = Math.max(0.05, end - start);
        list.forEach((ch, ci) => {
          wordChars.push({
            ch: ch,
            start: start + (span * ci) / Math.max(1, list.length),
            end: start + (span * (ci + 1)) / Math.max(1, list.length),
          });
        });
        cursorTime = Math.max(start, end);
      });
      if (wordChars.length === chars.length) return wordChars;
    }
    const indexes = chars.map((ch, i) => ({ ch: ch, i: i })).filter((item) => !/\s/.test(item.ch));
    if (!indexes.length) return result;
    const weights = indexes.map((item) => {
      if (/[\u4e00-\u9fff\u3040-\u30ff\uac00-\ud7af]/.test(item.ch)) return 1;
      if (/[a-zA-Z0-9]/.test(item.ch)) return 0.55;
      return 0.18;
    });
    const total = weights.reduce((sum, value) => sum + value, 0) || 1;
    const span = Math.max(0.3, line.end - line.time);
    let acc = 0;
    indexes.forEach((item, i) => {
      const start = line.time + (span * acc) / total;
      acc += weights[i];
      const end = line.time + (span * acc) / total;
      result[item.i].start = start;
      result[item.i].end = Math.max(start + 0.04, end);
    });
    return result;
  }

  async function updateLyrics(track) {
    const token = ++state.lyricToken;
    state.lyricLines = [];
    state.lyricEls = [];
    state.lyricActive = -1;
    state.lyricDuration = track.duration || 0;
    $("#lyricList").innerHTML = '<div class="lyric-empty">正在获取歌词…</div>';
    $("#lyricState").textContent = "LRC · ONLINE";
    if (!track) return;
    try {
      let lrc = "";
      let trans = "";
      let sourceLabel = SOURCE_FULL[track.source] || "ONLINE";
      if (track.source === "local") {
        const data = await api("/api/lyrics?title=" + encodeURIComponent(track.name) + "&artist=" + encodeURIComponent(track.artist || ""), 10000);
        lrc = data.lrc || "";
        sourceLabel = "LOCAL LRC";
      } else if (track.source === "kugou") {
        const data = await api("/burger-music/api/bm/lyric?server=kugou&hash=" + encodeURIComponent(track.id) + "&duration=" + encodeURIComponent(track.duration || 0), 10000);
        lrc = data.lrc || "";
        sourceLabel = "KUGOU KRC → LRC";
      } else {
        const data = await api("/burger-music/api/bm/lyric?server=" + encodeURIComponent(track.source) + "&id=" + encodeURIComponent(track.id), 10000);
        lrc = data.lrc || "";
        trans = data.trans || "";
        sourceLabel = (SOURCE_FULL[track.source] || "ONLINE") + " LRC";
      }
      if (token !== state.lyricToken) return;
      if (!lrc.trim()) {
        $("#lyricList").innerHTML = '<div class="lyric-empty"><b>暂无歌词</b>这首歌可能只有纯音乐，或版权方未公开歌词。</div>';
        $("#lyricState").textContent = sourceLabel + " · EMPTY";
        return;
      }
      const lines = parseLrc(lrc, track.duration || audio.duration || 0);
      if (!lines.length) {
        $("#lyricList").innerHTML = '<div class="lyric-empty"><b>暂时无法解析歌词</b>仍可正常播放，稍后再试。</div>';
        $("#lyricState").textContent = sourceLabel + " · PARSE FAILED";
        return;
      }
      state.lyricTrans = {};
      state.lyricTransOn = localStorage.getItem("bm:lyric-trans") !== "0";
      if (trans && trans.trim()) {
        const transLines = parseLrc(trans, track.duration || audio.duration || 0);
        lines.forEach((line, index) => {
          let match = transLines.find((row) => Math.abs(row.time - line.time) < 0.55);
          if (!match && transLines[index] && Math.abs(transLines[index].time - line.time) < 1.4) match = transLines[index];
          if (match && match.text && match.text !== line.text) {
            line.trans = match.text;
            state.lyricTrans[line.time.toFixed(2)] = match.text;
          }
        });
      }
      state.lyricLines = lines;
      renderLyricLines();
      applyLyricTransPref();
      const hasTrans = lines.some((line) => line.trans);
      $("#lyricState").textContent = sourceLabel + " · " + (lines.some((line) => line.hasExact) ? "字级标签" : "字级估算") + (hasTrans ? " · 译文" : "");
      const transBtn = $("#lyricTransBtn");
      if (transBtn) transBtn.style.display = hasTrans ? "" : "none";
      updateLyric(audio.currentTime || 0, true);
    } catch (error) {
      if (token !== state.lyricToken) return;
      $("#lyricList").innerHTML = '<div class="lyric-empty"><b>歌词接口暂时没有回应</b>不影响播放，稍后切歌会重新获取。</div>';
      $("#lyricState").textContent = "LRC · UNAVAILABLE";
    }
  }

  function renderLyricLines() {
    const html = state.lyricLines.map((line, index) => {
      const chars = line.chars.map((char) => {
        const space = /\s/.test(char.ch);
        return '<span class="lch' + (space ? " space" : "") + '" data-s="' + char.start.toFixed(2) + '" data-e="' + char.end.toFixed(2) + '">' +
          (space ? " " : esc(char.ch)) + '</span>';
      }).join("");
      return '<button class="lyric-line" type="button" data-line="' + index + '" data-time="' + line.time.toFixed(2) + '">' +
        '<span class="ly-time">' + fmtStamp(line.time) + '</span>' +
        '<span class="ly-text">' + chars + (line.trans ? '<span class="ly-tr">' + esc(line.trans) + '</span>' : "") + '</span>' +
      '</button>';
    }).join("");
    $("#lyricList").innerHTML = html;
    state.lyricEls = $$(".lyric-line", $("#lyricList")).map((el) => ({
      el: el,
      chars: $$(".lch", el).map((ch) => ({
        el: ch,
        start: Number(ch.dataset.s) || 0,
        end: Number(ch.dataset.e) || 0,
      })),
    }));
  }

  function applyLyricTransPref() {
    const detail = $("#detail");
    const btn = $("#lyricTransBtn");
    if (detail) detail.classList.toggle("ly-trans-off", !state.lyricTransOn);
    if (btn) btn.setAttribute("aria-pressed", state.lyricTransOn ? "true" : "false");
  }

  function scheduleLyric(time) {
    state.lyricTime = Number(time) || 0;
    if (state.lyricRaf) return;
    state.lyricRaf = requestAnimationFrame(() => {
      state.lyricRaf = 0;
      updateLyric(state.lyricTime);
    });
  }

  function updateLyric(time, force) {
    if (!state.lyricLines.length) return;
    let index = -1;
    let lo = 0;
    let hi = state.lyricLines.length - 1;
    while (lo <= hi) {
      const mid = Math.floor((lo + hi) / 2);
      if (state.lyricLines[mid].time <= time + 0.02) {
        index = mid;
        lo = mid + 1;
      } else {
        hi = mid - 1;
      }
    }
    if (index < 0) index = 0;
    if (!force && index === state.lyricActive) {
      const active = state.lyricEls[index];
      if (active) {
        active.chars.forEach((char) => {
          const sung = time >= char.end;
          const current = time >= char.start && time < char.end;
          char.el.classList.toggle("is-sung", sung);
          char.el.classList.toggle("is-current", current);
        });
      }
      return;
    }
    const prev = state.lyricActive;
    state.lyricActive = index;
    state.lyricEls.forEach((row, i) => {
      const distance = Math.abs(i - index);
      row.el.classList.toggle("is-active", i === index);
      row.el.classList.toggle("is-past", i < index);
      row.el.dataset.distance = String(Math.min(3, distance));
      if (i < index) {
        row.chars.forEach((char) => char.el.classList.add("is-sung"));
      }
    });
    const active = state.lyricEls[index];
    if (active) {
      active.chars.forEach((char) => {
        const sung = time >= char.end;
        const current = time >= char.start && time < char.end;
        char.el.classList.toggle("is-sung", sung);
        char.el.classList.toggle("is-current", current);
      });
      if (force || state.lyricAuto) scrollLyricTo(active.el);
    }
    if (prev !== index) queueSave();
  }

  function scrollLyricTo(el) {
    const box = $("#lyricScroll");
    if (!box || !el) return;
    const top = el.offsetTop - box.clientHeight * 0.37;
    box.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
  }

  /* ---------- detail ---------- */
  function openDetail() {
    $("#detail").classList.remove("is-lyrics");
    const lyricBtn = $("#detailLyricsOpen");
    if (lyricBtn) {
      lyricBtn.setAttribute("aria-expanded", "false");
      lyricBtn.setAttribute("aria-label", "打开歌词");
    }
    $("#detail").classList.add("is-open");
    $("#detail").setAttribute("aria-hidden", "false");
    document.documentElement.style.overflow = "hidden";
    if (state.current) updateLyricsIfNeeded();
    setTimeout(() => {
      if (state.lyricEls[state.lyricActive]) scrollLyricTo(state.lyricEls[state.lyricActive].el);
    }, 80);
  }
  function closeDetail() {
    $("#detail").classList.remove("is-open");
    $("#detail").classList.remove("is-lyrics");
    $("#detail").setAttribute("aria-hidden", "true");
    document.documentElement.style.overflow = "";
    const lyricBtn = $("#detailLyricsOpen");
    if (lyricBtn) lyricBtn.setAttribute("aria-expanded", "false");
  }
  function toggleDetailLyrics(force) {
    const detail = $("#detail");
    const btn = $("#detailLyricsOpen");
    if (!detail || !btn) return;
    const open = typeof force === "boolean" ? force : !detail.classList.contains("is-lyrics");
    detail.classList.toggle("is-lyrics", open);
    btn.setAttribute("aria-expanded", open ? "true" : "false");
    btn.setAttribute("aria-label", open ? "关闭歌词" : "打开歌词");
    if (open) {
      updateLyricsIfNeeded();
      applyLyricTransPref();
      bumpStat("lyrics");
      checkAchievements();
      setTimeout(() => {
        if (state.lyricEls[state.lyricActive]) scrollLyricTo(state.lyricEls[state.lyricActive].el);
      }, 380);
    }
  }
  function updateLyricsIfNeeded() {
    if (!state.lyricLines.length && state.current) updateLyrics(state.current);
  }

  /* ---------- import ---------- */
  function modalFor(name) {
    if (name === "shelf") return $("#shelfModal");
    if (name === "archive") return $("#archiveModal");
    return name === "import" ? $("#importModal") : name === "lx" ? $("#lxModal") : $("#syncModal");
  }
  function openModal(name) {
    const modal = modalFor(name);
    if (!modal) return;
    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");
    document.documentElement.style.overflow = "hidden";
    if (name === "import") renderImportRecent();
    if (name === "shelf") {
      if (!state.homeLoaded) loadHome();
    }
    if (name === "archive") renderArchive();
    if (name === "lx") {
      $("#lxBase").value = state.lx.base;
      renderLXSources();
      scanLocalSources(false);
    }
    if (name === "sync") renderSyncSettings();
  }
  function closeModal(name) {
    const modal = modalFor(name);
    if (!modal) return;
    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden", "true");
    if (!$(".bm-modal.is-open")) document.documentElement.style.overflow = "";
  }

  function parsePlaylistId(platform, raw) {
    let value = String(raw || "").trim();
    if (!value) return "";
    try { value = decodeURIComponent(value); } catch (error) {}
    const urlMatch = /https?:\/\/[^\s"'<>]+/i.exec(value);
    if (urlMatch) value = urlMatch[0];
    if (platform === "kugou") {
      const gcid = /(?:global_collection_id=|gcid_)([A-Za-z0-9_]{8,})/i.exec(value);
      if (gcid) return "gcid:" + gcid[1];
      const chain = /(?:chain=|t\.kugou\.com\/)([A-Za-z0-9_-]{4,64})/i.exec(value);
      if (chain) return "chain:" + chain[1];
      const tagged = /(?:id_|specialid=|special\/single\/|songlist\/)(\d{3,})/i.exec(value);
      if (tagged) return tagged[1];
      const digits = /\b(\d{4,})\b/.exec(value);
      if (digits) return "code:" + digits[1];
      const code = /^[A-Za-z0-9_-]{4,32}$/.exec(value);
      if (code) return "chain:" + code[0];
      return "";
    }
    if (/^\d+$/.test(value)) return value;
    if (/^https?:\/\//i.test(value)) {
      if (/163cn\.tv/i.test(value)) return "";
      const patterns = {
        netease: [/playlist\?id=(\d+)/i, /playlist\/(\d+)/i, /[?&]id=(\d+)/i],
        tencent: [/playlist\/(\d+)/i, /playlist\?id=(\d+)/i, /taoge\/playlist\/(\d+)/i, /[?&]id=(\d+)/i],
      };
      const list = patterns[platform] || [];
      for (const pattern of list) {
        const match = pattern.exec(value);
        if (match) return match[1];
      }
    }
    const loose = /(?:playlist|specialid|songlist)[\/=?]+(\d+)/i.exec(value);
    return loose ? loose[1] : "";
  }

  function renderImportRecent() {
    $("#recentCount").textContent = String(state.imported.length);
    if (!state.imported.length) {
      $("#importRecent").innerHTML = '<span class="muted">导入后会出现在这里</span>';
      return;
    }
    $("#importRecent").innerHTML = state.imported.slice(0, 6).map((item) => (
      '<div class="recent-item"><b>' + esc(item.title || item.display || "歌单") + '</b><small>' + esc(SOURCE_NAMES[item.source] || "在线") + ' · ' + playlistCount(item) + ' 首</small></div>'
    )).join("");
  }

  async function importPlaylist() {
    if (state.importBusy) return;
    const platform = state.importPlatform;
    const id = parsePlaylistId(platform, $("#playlistUrl").value);
    const status = $("#importStatus");
    if (!id) {
      status.className = "import-status is-error";
      status.textContent = platform === "kugou"
        ? "酷狗码为空或格式不正确。请粘贴酷狗分享链接（t.kugou.com/…）、酷狗码、id_数字或纯数字歌单 ID。"
        : "没有识别到歌单 ID。请粘贴完整公开歌单链接，或直接填写数字 ID。";
      return;
    }
    const button = $("#importSubmit");
    setBusy(button, true, "解析中…");
    state.importBusy = true;
    status.className = "import-status";
    status.textContent = "正在向 " + (SOURCE_NAMES[platform] || "平台") + " 读取歌单…";
    try {
      const data = await api("/burger-music/api/bm/playlist?source=" + encodeURIComponent(platform) + "&id=" + encodeURIComponent(id) + "&v=26", 18000);
      if (!data.tracks || !data.tracks.length) throw new Error("歌单里没有可读取的歌曲");
      const item = normalizeImported({
        key: "imp-" + platform + "-" + id,
        source: platform,
        id: id,
        title: data.title || (SOURCE_NAMES[platform] + "歌单"),
        display: data.title || (SOURCE_NAMES[platform] + "歌单"),
        cover: data.cover || (data.tracks[0] && data.tracks[0].cover) || "",
        count: data.tracks.length,
        tracks: data.tracks,
        importedAt: Date.now(),
      });
      if (!item) throw new Error("歌单数据不可用");
      state.imported = [item].concat(state.imported.filter((row) => row.key !== item.key)).slice(0, 12);
      writeJSON("bm:playlists", state.imported);
      state.homeData[item.key] = { item: item, data: data };
      renderLibrary();
      renderArchive();
      renderImportRecent();
      bumpStat("imports");
      checkAchievements();
      status.className = "import-status is-ok";
      status.textContent = "已导入《" + item.title + "》 · " + item.count + " 首。正在载入队列…";
      $("#playlistUrl").value = "";
      toast("已导入《" + item.title + "》");
      await loadPlaylist(item, false);
      setTimeout(() => {
        status.className = "import-status is-ok";
        status.textContent = "已加入「我的歌单」，可以在下方或左侧继续播放。";
      }, 700);
    } catch (error) {
      status.className = "import-status is-error";
      status.textContent = platform === "kugou"
        ? "酷狗码解析失败：" + (error.message || "可能已过期") + "。请改用酷狗 App 里的分享链接（t.kugou.com/…）或数字歌单 ID。"
        : "解析失败：" + (error.message || "接口暂时不可用") + "。请检查歌单是否公开，或稍后重试。";
    } finally {
      state.importBusy = false;
      setBusy(button, false);
    }
  }

  function renderLibrary() {
    $("#libCount").textContent = String(state.imported.length);
    if (typeof renderMinePlaylists === "function") renderMinePlaylists();
    if (!state.imported.length) {
      $("#sideLibrary").innerHTML = '<button class="side-lib-empty" type="button" data-open="import">导入第一张歌单 <span>＋</span></button>';
      return;
    }
    $("#sideLibrary").innerHTML = state.imported.map((item) => (
      '<button class="side-lib-item" type="button" data-lib-key="' + esc(item.key) + '">' +
        '<span class="thumb">' + (safeImage(item.cover) ? '<img src="' + esc(item.cover) + '" alt="" loading="lazy" onerror="this.style.display=\'none\'">' : '<b>' + esc(initials(item.title)) + '</b>') + '</span>' +
        '<span class="txt"><b>' + esc(item.title || "歌单") + '</b><small>' + esc(SOURCE_NAMES[item.source] || "在线") + ' · ' + playlistCount(item) + ' 首</small></span>' +
      '</button>'
    )).join("");
  }

  function renderArchive() {
    $("#archiveCount").textContent = state.imported.length + " 张";
    if (!state.imported.length) {
      $("#archiveGrid").innerHTML = '<button class="archive-empty" type="button" data-open="import"><b>＋</b><span>还没有导入歌单<br><small>支持网易云 / QQ / 酷狗</small></span></button>';
      return;
    }
    const html = state.imported.map((item) => (
      '<div class="archive-card" data-archive-key="' + esc(item.key) + '" tabindex="0" role="button" aria-label="打开 ' + esc(item.title) + '">' +
        '<span class="a-cover">' + (safeImage(item.cover) ? '<img src="' + esc(item.cover) + '" alt="" loading="lazy" onerror="this.remove()">' : '<span class="cover-fallback"><b>' + esc(initials(item.title)) + '</b></span>') + '</span>' +
        '<span class="a-copy"><b>' + esc(item.title || "歌单") + '</b><span>' + esc(SOURCE_NAMES[item.source] || "在线") + ' · ' + playlistCount(item) + ' 首</span></span>' +
        '<button class="a-x" type="button" data-remove="' + esc(item.key) + '" aria-label="移除歌单">×</button>' +
      '</div>'
    )).join("");
    $("#archiveGrid").innerHTML = html;
  }

  function removeImported(key) {
    state.imported = state.imported.filter((item) => item.key !== key);
    writeJSON("bm:playlists", state.imported);
    renderLibrary();
    renderArchive();
    renderImportRecent();
    toast("已从我的歌单移除");
  }

  /* ---------- LX ---------- */
  function renderLXSources() {
    const list = state.lxSources;
    $("#lxMiniState").textContent = state.lx.connected ? ("已连接" + (state.lx.name ? " · " + state.lx.name : "")) : (list.length ? "已导入 " + list.length + " 个音源" : "未连接");
    $("#lxMini").classList.toggle("is-on", !!(state.lx.connected || list.length));
    if (!list.length) {
      $("#lxSourceList").innerHTML = '<span class="muted">还没有导入音源</span>';
      return;
    }
    $("#lxSourceList").innerHTML = list.map((source, index) => (
      '<div class="lx-source">' +
        '<span class="s-enabled' + (source.enabled === false ? " off" : "") + '">' + (source.enabled === false ? "停用" : "启用") + '</span>' +
        '<span class="s-txt"><b>' + esc(source.name || "未命名音源") + '</b><small>' + esc([source.author, source.version ? "v" + source.version : ""].filter(Boolean).join(" · ") || "LX SOURCE") + '</small></span>' +
        '<span class="s-actions"><button type="button" data-lx-toggle="' + index + '" aria-label="切换启用">◐</button><button type="button" data-lx-del="' + index + '" aria-label="删除音源">×</button></span>' +
      '</div>'
    )).join("");
  }

  function parseLXMeta(text, url) {
    const pick = (name) => {
      const match = new RegExp("@" + name + "\\s+([^\\n\\r]+)", "i").exec(text);
      return match ? match[1].trim().replace(/^["']|["']$/g, "") : "";
    };
    const name = pick("name") || "未命名音源";
    const description = pick("description");
    const version = pick("version");
    const author = pick("author");
    const homepage = pick("homepage");
    const platforms = ["kw", "kg", "tx", "wy", "mg"].filter((key) => new RegExp("['\"]?" + key + "['\"]?\\s*:", "i").test(text));
    return { name, description, version, author, homepage, url, platforms, enabled: true, importedAt: Date.now() };
    }

  async function importLXSource(rawUrl, rawText) {
    let url = String(rawUrl || "").trim();
    if (!url && !rawText) return;
    if (!url && rawText) url = "local://" + Date.now();
    if (!/^https?:\/\//i.test(url) && !url.startsWith("local://")) {
      toast("请输入以 http(s) 开头的音源地址");
      return;
    }
    try {
      let text = rawText || "";
      if (!text) {
        try {
          const controller = new AbortController();
          const timer = setTimeout(() => controller.abort(), 12000);
          const res = await fetch(url, { signal: controller.signal, headers: { Accept: "text/plain,application/javascript,*/*" } });
          clearTimeout(timer);
          if (res.ok) text = await res.text();
        } catch (error) { /* fall back to the site proxy */ }
        if (!text) {
          const data = await api("/burger-music/api/bm/source?url=" + encodeURIComponent(url), 18000);
          if (data && data.ok && data.text) text = data.text;
        }
        if (!text && /^https:\/\/raw\.githubusercontent\.com\//i.test(url)) {
          const proxy = "https://gh-proxy.org/" + url;
          const res = await fetch(proxy, { headers: { Accept: "text/plain,application/javascript,*/*" } });
          if (res.ok) text = await res.text();
        }
        if (!text) throw new Error("无法读取脚本");
      }
      if (!text || text.length < 20) throw new Error("脚本内容为空");
      if (text.length > 1200000) throw new Error("脚本过大");
      const meta = parseLXMeta(text, url);
      const key = url + "|" + meta.name;
      state.lxSources = [meta].concat(state.lxSources.filter((item) => (item.url + "|" + item.name) !== key)).slice(0, 8);
      writeJSON("bm:lx-sources", state.lxSources);
      renderLXSources();
      $("#lxSourceUrl").value = "";
      toast("已导入音源 · " + meta.name);
    } catch (error) {
      toast("音源导入失败：" + (error.message || "请检查地址或跨域限制"));
    }
  }

  const LOCAL_LX_CANDIDATES = [
    "http://127.0.0.1:23330",
    "http://localhost:23330",
    "http://127.0.0.1:23331",
    "http://127.0.0.1:9527",
    "http://127.0.0.1:8080",
  ];

  function addLocalApiSource(base, data) {
    const meta = {
      name: (data && (data.name || data.singer)) || "本机 LX Music",
      author: "LOCAL OPEN API",
      version: data && data.version ? String(data.version) : "",
      homepage: base,
      url: base,
      type: "api",
      enabled: true,
      importedAt: Date.now(),
    };
    state.lxSources = [meta].concat(state.lxSources.filter((item) => item.url !== base)).slice(0, 8);
    writeJSON("bm:lx-sources", state.lxSources);
    renderLXSources();
  }

  async function probeLocalBase(base) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 1600);
      const res = await fetch(base.replace(/\/+$/, "") + "/status", {
        signal: controller.signal,
        headers: { Accept: "application/json" },
      });
      clearTimeout(timer);
      if (!res.ok) return null;
      const type = res.headers.get("Content-Type") || "";
      if (!/application\/json|text\/json/i.test(type)) return null;
      const data = await res.json().catch(() => null);
      if (!data || typeof data !== "object") return null;
      return data;
    } catch (error) {
      return null;
    }
  }

  async function scanLocalSources(showToast) {
    if (state.lxAiBusy) return;
    state.lxAiBusy = true;
    const badge = $("#lxAiBadge");
    const status = $("#lxAiStatus");
    const scanBtn = $("#lxAiScan");
    if (badge) badge.textContent = "扫描中…";
    if (status) {
      status.className = "lx-status";
      status.innerHTML = "<i></i><span>正在探测本机 LX Music / 在线音源接口…</span>";
    }
    if (scanBtn) scanBtn.disabled = true;
    let found = null;
    let blocked = false;
    for (const base of LOCAL_LX_CANDIDATES) {
      const data = await probeLocalBase(base);
      if (data) { found = { base: base, data: data }; break; }
      if (location.protocol === "https:" && base.indexOf("http://") === 0) blocked = true;
    }
    state.lxAiBusy = false;
    if (scanBtn) scanBtn.disabled = false;
    if (found) {
      state.lx.base = found.base;
      state.lx.connected = true;
      state.lx.name = found.data.name || found.data.singer || "";
      writeJSON("bm:lx", { base: found.base });
      addLocalApiSource(found.base, found.data);
      const baseInput = $("#lxBase");
      if (baseInput) baseInput.value = found.base;
      if (badge) badge.textContent = "已发现";
      if (status) {
        status.className = "lx-status is-on";
        status.innerHTML = "<i></i><span>已发现并添加 · " + esc(found.base) + (state.lx.name ? " · " + esc(state.lx.name) : "") + "</span>";
      }
      if (showToast) toast("AI 已识别本机音源 · " + (state.lx.name || found.base));
      return;
    }
    if (badge) badge.textContent = "未发现";
    if (status) {
      status.className = "lx-status is-error";
      status.innerHTML = "<i></i><span>" + (blocked
        ? "本机可能已开启，但 HTTPS 页面拦截了 http://127.0.0.1；请手动填写地址，或用本机 http 方式打开。"
        : "没有发现本机音源。请先在 LX Music 设置中开启「开放 API」，或填写在线音源 HTTP 链接。") + "</span>";
    }
    if (showToast) toast("未发现本机音源，可手动填写 API 地址");
  }

  async function aiFetchSource() {
    const input = $("#lxAiUrl");
    const url = String((input && input.value) || "").trim();
    const status = $("#lxAiStatus");
    if (!url) {
      if (status) {
        status.className = "lx-status is-error";
        status.innerHTML = "<i></i><span>请先粘贴在线音源的 HTTP 链接。</span>";
      }
      input && input.focus();
      return;
    }
    if (!/^https?:\/\//i.test(url)) {
      if (status) {
        status.className = "lx-status is-error";
        status.innerHTML = "<i></i><span>链接必须以 http:// 或 https:// 开头。</span>";
      }
      return;
    }
    const button = $("#lxAiFetch");
    setBusy(button, true, "AI 拉取中…");
    if (status) {
      status.className = "lx-status";
      status.innerHTML = "<i></i><span>正在拉取 " + esc(url) + " …</span>";
    }
    try {
      const apiReply = await probeLocalBase(url);
      if (apiReply) {
        addLocalApiSource(url.replace(/\/+$/, ""), apiReply);
        state.lx.base = url.replace(/\/+$/, "");
        state.lx.connected = true;
        state.lx.name = apiReply.name || "";
        writeJSON("bm:lx", { base: state.lx.base });
        $("#lxBase").value = state.lx.base;
        $("#lxAiBadge").textContent = "已接入";
        status.className = "lx-status is-on";
        status.innerHTML = "<i></i><span>AI 已识别本机 / 在线 API 并添加 · " + esc(state.lx.base) + "</span>";
        toast("AI 已接入音源 API");
        return;
      }
      await importLXSource(url);
      const added = state.lxSources.find((item) => item.url === url);
      if (added) {
        $("#lxAiBadge").textContent = "已识别";
        status.className = "lx-status is-on";
        status.innerHTML = "<i></i><span>AI 已拉取并识别 · " + esc(added.name || "在线音源") + "</span>";
        if (input) input.value = "";
      } else {
        status.className = "lx-status is-error";
        status.innerHTML = "<i></i><span>音源未识别，请检查链接是否返回有效 JS。</span>";
      }
    } catch (error) {
      status.className = "lx-status is-error";
      status.innerHTML = "<i></i><span>AI 拉取失败：" + esc(error.message || "链接不可访问") + "</span>";
    } finally {
      setBusy(button, false);
    }
  }

  async function testLX(showToast) {
    const base = String($("#lxBase").value || state.lx.base).replace(/\/+$/, "");
    if (!/^https?:\/\//i.test(base)) {
      toast("API 地址需要以 http(s) 开头");
      return;
    }
    state.lx.base = base;
    writeJSON("bm:lx", { base: base });
    const status = $("#lxStatus");
    status.className = "lx-status";
    status.innerHTML = '<i></i><span>正在连接 ' + esc(base) + '…</span>';
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 4200);
      const res = await fetch(base + "/status", { signal: controller.signal, headers: { Accept: "application/json" } });
      clearTimeout(timer);
      if (!res.ok) throw new Error("HTTP " + res.status);
      const data = await res.json();
      state.lx.connected = true;
      state.lx.name = data.name || data.singer || "";
      status.className = "lx-status is-on";
      status.innerHTML = '<i></i><span>已连接 · ' + esc(data.name || "LX Music") + (data.status ? " · " + esc(data.status) : "") + '</span>';
      renderLXSources();
      if (showToast) toast("LX Music 已连接");
    } catch (error) {
      state.lx.connected = false;
      status.className = "lx-status is-error";
      status.innerHTML = '<i></i><span>连接失败。确认 LX Music 已开启开放 API（默认 23330），或当前浏览器允许 HTTPS 页面访问本机 HTTP。</span>';
      renderLXSources();
      if (showToast) toast("LX API 暂时连接不上");
    }
  }

  async function syncLX() {
    await testLX(false);
    if (!state.lx.connected) return;
    try {
      const res = await fetch(state.lx.base.replace(/\/+$/, "") + "/status", { headers: { Accept: "application/json" } });
      const data = await res.json();
      toast("LX 正在播放：" + (data.name || "未命名") + (data.singer ? " · " + data.singer : ""));
    } catch (error) {
      toast("读取状态失败");
    }
  }

  /* ---------- source sync ---------- */
  const DEFAULT_SYNC = { enabled: true, sources: true, playlists: true, prefs: true };

  function syncFromUI() {
    state.sync = {
      enabled: !!$("#syncEnabled").checked,
      sources: !!$("#syncScopeSources").checked,
      playlists: !!$("#syncScopePlaylists").checked,
      prefs: !!$("#syncScopePrefs").checked,
    };
    writeJSON("bm:sync", state.sync);
  }

  function renderSyncSettings() {
    const sync = state.sync || DEFAULT_SYNC;
    $("#syncEnabled").checked = sync.enabled !== false;
    $("#syncScopeSources").checked = sync.sources !== false;
    $("#syncScopePlaylists").checked = sync.playlists !== false;
    $("#syncScopePrefs").checked = sync.prefs !== false;
    const status = $("#syncStatus");
    status.className = "import-status";
    status.textContent = "本机已保存 " + state.imported.length + " 张歌单 · " + state.lxSources.length + " 个落雪音源。";
  }

  function syncPayload() {
    const payload = {
      app: "burger-music",
      version: 1,
      exportedAt: new Date().toISOString(),
      settings: state.sync,
    };
    if (state.sync.sources !== false) payload.lxSources = state.lxSources;
    if (state.sync.playlists !== false) payload.playlists = state.imported;
    if (state.sync.prefs !== false) {
      payload.prefs = {
        volume: audio.volume,
        modeIndex: state.modeIndex,
        syncBase: state.lx.base,
      };
    }
    return payload;
  }

  function exportSync() {
    try {
      const blob = new Blob([JSON.stringify(syncPayload(), null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "burger-music-sync-" + new Date().toISOString().slice(0, 10) + ".json";
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1500);
      const status = $("#syncStatus");
      status.className = "import-status is-ok";
      status.textContent = "已导出同步配置，可在另一台设备导入。";
    } catch (error) {
      toast("导出失败：" + (error.message || "浏览器限制"));
    }
  }

  function applySyncPayload(payload) {
    if (!payload || payload.app !== "burger-music") throw new Error("不是 Burger music 同步配置");
    if (payload.settings && typeof payload.settings === "object") {
      state.sync = {
        enabled: payload.settings.enabled !== false,
        sources: payload.settings.sources !== false,
        playlists: payload.settings.playlists !== false,
        prefs: payload.settings.prefs !== false,
      };
      writeJSON("bm:sync", state.sync);
    }
    if (Array.isArray(payload.lxSources)) {
      state.lxSources = payload.lxSources.filter((item) => item && (item.url || item.name)).slice(0, 8);
      writeJSON("bm:lx-sources", state.lxSources);
    }
    if (Array.isArray(payload.playlists)) {
      state.imported = payload.playlists.filter((item) => item && item.id && Array.isArray(item.tracks)).slice(0, 12);
      writeJSON("bm:playlists", state.imported);
    }
    if (payload.prefs && payload.prefs.volume != null) updateVolume(Math.round(Number(payload.prefs.volume) * 100));
    renderLXSources();
    renderLibrary();
    renderArchive();
    renderImportRecent();
    renderSyncSettings();
  }

  function importSyncFile(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const status = $("#syncStatus");
      try {
        const payload = JSON.parse(String(reader.result || "{}"));
        applySyncPayload(payload);
        status.className = "import-status is-ok";
        status.textContent = "同步配置已导入：歌单与音源已更新。";
        toast("同步配置已导入");
      } catch (error) {
        status.className = "import-status is-error";
        status.textContent = "导入失败：" + (error.message || "配置文件格式不正确");
      }
    };
    reader.readAsText(file);
  }

  /* ---------- search ---------- */
  async function doSearch() {
    const keyword = $("#searchInput").value.trim();
    if (!keyword) {
      toast("输入歌名或歌手再搜索");
      return;
    }
    const server = $("#searchServer").value;
    $("#trackList").innerHTML = '<div class="list-skeleton"><i></i><i></i><i></i><i></i></div>';
    $("#tracksTitle").textContent = "搜索 “" + keyword + "”";
    $("#trackContext").textContent = SOURCE_FULL[server] || "ONLINE";
    $("#tracksKicker").textContent = "SEARCH · 03";
    $("#clearSearch").hidden = false;
    try {
      const data = await api("/burger-music/api/bm/search?server=" + encodeURIComponent(server) + "&keyword=" + encodeURIComponent(keyword) + "&limit=16", 14000);
      const tracks = data.tracks || [];
      if (!tracks.length) {
        renderTracksEmpty("没有找到结果", "换个关键词，或在网易云 / QQ / 酷狗之间切换。");
        return;
      }
      state.queue = tracks;
      state.index = 0;
      state.listTracks = tracks;
      state.listKind = "search";
      state.view = "cards";
      state.listContext = "搜索 · " + keyword;
      state.searchActive = true;
      renderTracks();
      bumpStat("searches");
      checkAchievements();
      const tracksBox = $("#tracks");
      if (tracksBox) tracksBox.scrollIntoView({ behavior: "smooth", block: "start" });
      $("#trackContext").textContent = tracks.length + " 个结果 · " + (SOURCE_NAMES[server] || "");
      toast("找到 " + tracks.length + " 首歌");
    } catch (error) {
      renderTracksEmpty("搜索接口暂时不可用", error.message || "请稍后再试");
    }
  }

  function clearSearch() {
    $("#searchInput").value = "";
    $("#clearSearch").hidden = true;
    state.searchActive = false;
    state.queue = state.onlineTracks.slice();
    state.index = 0;
    state.listTracks = state.queue;
    state.listKind = "home";
    state.view = "rows";
    state.listContext = "今日推荐";
    $("#tracksTitle").textContent = "在线热歌";
    $("#trackContext").textContent = "今日推荐队列";
    $("#tracksKicker").textContent = "ONLINE · 03";
    renderTracks();
  }

  /* ---------- restore ---------- */
  function restoreSession() {
    const saved = readJSON("bm:last", null);
    if (!saved || !saved.track) {
      state.queue = state.onlineTracks.slice();
      state.listTracks = state.queue;
      renderResume();
      return;
    }
    state.queue = state.onlineTracks.slice();
    state.index = 0;
    state.listTracks = state.queue;
    state.listKind = "home";
    state.listContext = "今日推荐";
    state.current = saved.track;
    setPlayerTrack(saved.track);
    renderTracks();
    $("#tracksTitle").textContent = "在线热歌";
    $("#trackContext").textContent = "今日推荐队列";
    $("#tracksKicker").textContent = "ONLINE · 02";
    if (saved.track.url) {
      const first = saved.track.source === "local" ? saved.track.url : streamProxy(saved.track.url, saved.track);
      audio.src = first;
      audio.addEventListener("loadedmetadata", function once() {
        audio.removeEventListener("loadedmetadata", once);
        if (saved.time > 0 && saved.time < audio.duration - 2) {
          audio.currentTime = saved.time;
          updateRangeUI(saved.time, audio.duration);
        }
      });
    }
    $("#resumeBadge").textContent = "READY · " + fmt(saved.time || 0);
    $("#resumeSide").textContent = "LAST SESSION · " + fmt(saved.time || 0);
  }

  /* ---------- events ---------- */
  function setPlayerMini(on) {
    state.playerMini = !!on;
    const player = $("#player");
    if (player) player.classList.toggle("is-mini", state.playerMini);
    const hide = $("#playerHide");
    if (hide) {
      hide.setAttribute("aria-label", state.playerMini ? "展开播放卡片" : "隐藏播放卡片，只显示封面");
      hide.title = state.playerMini ? "展开播放卡片" : "只显示封面";
    }
    const cover = $("#playerCoverBtn");
    if (cover) {
      cover.setAttribute("aria-label", state.playerMini ? "展开播放卡片" : ("打开 " + ((state.current && state.current.name) || "播放") + " 播放详情"));
    }
    writeJSON("bm:player-mini", state.playerMini);
  }

  function bindEvents() {
    bindCardEvents();

    $$("[data-mode]").forEach((btn) => {
      btn.addEventListener("click", () => switchMode(btn.dataset.mode));
    });

    $("#heroPlay").addEventListener("click", () => {
      if (state.mode === "default") {
        setQueue([DEFAULT_TRACK], 0, "默认播放器", true);
      } else if (state.onlineTracks.length) {
        setQueue(state.onlineTracks.slice(), 0, "今日推荐", true);
      } else {
        loadHome().then(() => {
          if (state.onlineTracks.length) setQueue(state.onlineTracks.slice(), 0, "今日推荐", true);
        });
      }
    });
    $("#refreshHome").addEventListener("click", loadHome);
    $("#resumePlay").addEventListener("click", togglePlay);
    $("#resumeCard").addEventListener("click", (event) => {
      if (event.target.closest("#resumePlay")) return;
      if (state.current) openDetail();
    });

    $("#playerPlay").addEventListener("click", togglePlay);
    $("#playerPrev").addEventListener("click", prevTrack);
    $("#playerNext").addEventListener("click", nextTrack);
    $("#playerMode").addEventListener("click", changeMode);
    $("#detailPrev").addEventListener("click", prevTrack);
    $("#detailNext").addEventListener("click", nextTrack);
    $("#detailPlay").addEventListener("click", togglePlay);
    $("#detailMode").addEventListener("click", changeMode);
    $("#playerCoverBtn").addEventListener("click", () => {
      if (state.playerMini) {
        setPlayerMini(false);
        return;
      }
      openDetail();
    });
    $("#playerHide").addEventListener("click", () => setPlayerMini(!state.playerMini));
    $("#playerLyrics").addEventListener("click", openDetail);
    $("#playerDetail").addEventListener("click", openDetail);

    const sidePlayer = $("#sidePlayer");
    const sideMini = $("#sideMini");
    const sideCoverBtn = $("#sideCoverBtn");
    const miniHide = $("#miniHide");
    const setMiniCollapsed = (collapsed) => {
      if (!sideMini) return;
      sideMini.classList.toggle("is-collapsed", !!collapsed);
      if (miniHide) {
        miniHide.setAttribute("aria-pressed", collapsed ? "true" : "false");
        miniHide.title = collapsed ? "显示播放卡片" : "隐藏播放卡片";
        miniHide.setAttribute("aria-label", collapsed ? "显示播放卡片" : "隐藏播放卡片");
      }
      if (sideMini) {
        sideMini.setAttribute("aria-hidden", "false");
        if (collapsed) openMini();
      }
      if (!collapsed) openMini();
    };
    let miniTimer = 0;
    const openMini = () => {
      clearTimeout(miniTimer);
      if (!sideMini) return;
      sideMini.classList.add("is-open");
      sideMini.setAttribute("aria-hidden", "false");
    };
    const closeMini = () => {
      clearTimeout(miniTimer);
      miniTimer = setTimeout(() => {
        if (!sideMini) return;
        sideMini.classList.remove("is-open");
        sideMini.setAttribute("aria-hidden", "true");
      }, 140);
    };
    if (sidePlayer && sideMini) {
      sidePlayer.addEventListener("mouseenter", openMini);
      sidePlayer.addEventListener("mouseleave", closeMini);
      sideMini.addEventListener("mouseenter", openMini);
      sideMini.addEventListener("mouseleave", closeMini);
    }
    if (sideCoverBtn) {
      sideCoverBtn.addEventListener("click", () => {
        if (sideMini && sideMini.classList.contains("is-open")) closeMini();
        else openMini();
      });
    }
    const miniPlay = $("#miniPlay");
    if (miniPlay) miniPlay.addEventListener("click", togglePlay);
    const miniMode = $("#miniMode");
    if (miniMode) miniMode.addEventListener("click", changeMode);
    if (miniHide) {
      miniHide.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        setMiniCollapsed(true);
      });
    }
    if (sideMini) {
      sideMini.addEventListener("click", (e) => {
        if (!sideMini.classList.contains("is-collapsed")) return;
        if (e.target.closest("#miniHide")) return;
        e.preventDefault();
        e.stopPropagation();
        setMiniCollapsed(false);
      });
    }
    const miniExpand = $("#miniExpand");
    if (miniExpand) {
      miniExpand.addEventListener("click", () => {
        if (sideMini) {
          sideMini.classList.remove("is-open");
          sideMini.setAttribute("aria-hidden", "true");
        }
        openDetail();
      });
    }
    const miniModeText = $("#miniModeText");
    if (miniModeText && $("#modeText")) miniModeText.textContent = $("#modeText").textContent;

    $("#detailBack").addEventListener("click", closeDetail);
    $("#detailLyricsOpen").addEventListener("click", () => toggleDetailLyrics());
    $("#detailClose").addEventListener("click", closeDetail);
    $("#detailFav").addEventListener("click", () => {
      if (!state.current) return;
      const key = state.current.source + ":" + state.current.id;
      if (state.favorites.includes(key)) {
        state.favorites = state.favorites.filter((item) => item !== key);
        toast("已取消收藏");
      } else {
        state.favorites.push(key);
        toast("已收藏这首歌");
      }
      writeJSON("bm:favorites", state.favorites);
      updateFavorite();
      checkAchievements();
    });
    $("#lyricJump").addEventListener("click", () => {
      state.lyricAuto = true;
      if (state.lyricEls[state.lyricActive]) scrollLyricTo(state.lyricEls[state.lyricActive].el);
    });

    $("#trackList").addEventListener("click", (event) => {
      const row = event.target.closest(".track-row, .tc-card");
      if (!row) return;
      const index = Number(row.dataset.index);
      if (!Number.isFinite(index)) return;
      if (!state.queue.length) state.queue = state.listTracks.slice();
      state.index = index;
      state.current = state.queue[index];
      setPlayerTrack(state.current);
      loadAudio(state.current, true);
      renderTracks();
      renderUpNext();
      queueSave();
    });
    $("#trackList").addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      const row = event.target.closest(".track-row, .tc-card");
      if (!row) return;
      event.preventDefault();
      row.click();
    });

    bindRange($("#playerProgress"), seekTo);
    bindRange($("#detailProgress"), seekTo);
    $("#playerVolume").addEventListener("input", () => updateVolume($("#playerVolume").value));
    $("#detailVolume").addEventListener("input", () => updateVolume($("#detailVolume").value));
    $("#volumeBtn").addEventListener("click", (event) => {
      if (event.target === $("#playerVolume")) return;
      toggleMute();
    });

    const aiBtn = $("#detailAiSrc");
    if (aiBtn) {
      aiBtn.addEventListener("click", async () => {
        const track = state.current;
        if (!track) return;
        aiBtn.classList.add("is-busy");
        toast("AI 正在为你搜索可用音源…");
        const ai = await findAiSource(track, true);
        aiBtn.classList.remove("is-busy");
        if (ai && ai.url) {
          setSource(streamProxy(ai.url, track), true);
          toast("AI 已为你换上可用音源：" + ai.provider);
        } else {
          toast("AI 没找到可播音源，试试切换下一首");
        }
      });
    }

    const volBtn = $("#detailVolumeBtn");
    const volPop = $("#detailVolPop");
    if (volBtn && volPop) {
      volBtn.addEventListener("click", (event) => {
        event.stopPropagation();
        volPop.hidden = !volPop.hidden;
        volBtn.setAttribute("aria-expanded", volPop.hidden ? "false" : "true");
      });
      volPop.addEventListener("click", (event) => event.stopPropagation());
      $$(".vol-quick button", volPop).forEach((btn) => {
        btn.addEventListener("click", () => {
          audio.muted = false;
          updateVolume(btn.dataset.vol);
        });
      });
      document.addEventListener("click", () => {
        if (!volPop.hidden) {
          volPop.hidden = true;
          volBtn.setAttribute("aria-expanded", "false");
        }
      });
      document.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && !volPop.hidden) {
          volPop.hidden = true;
          volBtn.setAttribute("aria-expanded", "false");
        }
      });
    }

    $$(".dq-btn").forEach((btn) => {
      btn.addEventListener("click", () => setQuality(btn.dataset.quality));
    });
    const transBtn = $("#lyricTransBtn");
    if (transBtn) {
      transBtn.addEventListener("click", () => {
        state.lyricTransOn = !state.lyricTransOn;
        localStorage.setItem("bm:lyric-trans", state.lyricTransOn ? "1" : "0");
        applyLyricTransPref();
      });
    }
    $$(".side-nav a").forEach((link) => {
      link.addEventListener("click", () => {
        $$(".side-nav a").forEach((other) => other.classList.remove("is-active"));
        link.classList.add("is-active");
        const main = document.querySelector(".bm-main");
        const isMine = link.dataset.nav === "mine";
        if (main) main.classList.toggle("view-mine", isMine);
        window.scrollTo(0, 0);
        if (isMine && $("#mine")) $("#mine").scrollIntoView({ block: "start" });
      });
    });
    const historyClear = $("#mineHistoryClear");
    if (historyClear) {
      historyClear.addEventListener("click", () => {
        state.history = [];
        writeJSON("bm:history", []);
        renderHistory();
        toast("播放历史已清空");
      });
    }
    const historyBox = $("#mineHistory");
    if (historyBox) {
      historyBox.addEventListener("click", (event) => {
        const btn = event.target.closest("[data-history]");
        if (!btn) return;
        const row = state.history[Number(btn.dataset.history)];
        if (!row) return;
        state.queue = [row.track];
        state.index = 0;
        state.listTracks = [row.track];
        state.listKind = "history";
        state.view = "rows";
        state.listContext = "播放历史";
        setPlayerTrack(row.track);
        loadAudio(row.track, true);
        renderTracks();
      });
    }
    const minePlaylists = $("#minePlaylists");
    if (minePlaylists) {
      minePlaylists.addEventListener("click", (event) => {
        const btn = event.target.closest("[data-mine-playlist]");
        if (!btn) return;
        const item = state.imported[Number(btn.dataset.minePlaylist)];
        if (item) loadPlaylist(item, true);
      });
    }
    const loginBtn = $("#mineLoginBtn");
    if (loginBtn) {
      loginBtn.addEventListener("click", (event) => {
        if (!readAccount()) return;
        event.preventDefault();
        ["bm:account", "bcAccount", "bcUser", "bcEmail"].forEach((key) => localStorage.removeItem(key));
        renderLogin();
        toast("已退出本机账号");
      });
    }

    $("#lyricScroll").addEventListener("wheel", () => {
      state.lyricAuto = false;
      clearTimeout(state.lyricScrollTimer);
      state.lyricScrollTimer = setTimeout(() => { state.lyricAuto = true; }, 3500);
    }, { passive: true });
    $("#lyricScroll").addEventListener("touchmove", () => {
      state.lyricAuto = false;
    }, { passive: true });
    $("#lyricList").addEventListener("click", (event) => {
      const line = event.target.closest(".lyric-line");
      if (!line) return;
      state.lyricAuto = true;
      const time = Number(line.dataset.time);
      if (Number.isFinite(time)) {
        audio.currentTime = time + 0.04;
        if (audio.paused) audio.play().catch(() => {});
      }
    });

    $("#menuBtn").addEventListener("click", () => {
      $("#bmSide").classList.add("is-open");
      $("#sideScrim").classList.add("is-on");
    });
    $("#sideClose").addEventListener("click", closeSide);
    $("#sideScrim").addEventListener("click", closeSide);

    document.addEventListener("click", (event) => {
      const open = event.target.closest("[data-open]");
      if (open) {
        event.preventDefault();
        openModal(open.dataset.open);
        closeSide();
        return;
      }
      const close = event.target.closest("[data-close-modal]");
      if (close) {
        closeModal(close.dataset.closeModal);
        return;
      }
      const lib = event.target.closest("[data-lib-key]");
      if (lib) {
        const item = state.imported.find((row) => row.key === lib.dataset.libKey);
        if (item) loadPlaylist(item, true);
        closeSide();
        return;
      }
      const archive = event.target.closest("[data-archive-key]");
      if (archive) {
        const remove = event.target.closest("[data-remove]");
        if (remove) {
          event.stopPropagation();
          removeImported(remove.dataset.remove);
          return;
        }
        const item = state.imported.find((row) => row.key === archive.dataset.archiveKey);
        if (item) {
          loadPlaylist(item, true);
          closeModal("archive");
        }
      }
    });

    $("#playlistUrl").addEventListener("keydown", (event) => {
      if (event.key === "Enter") importPlaylist();
    });
    $("#importSubmit").addEventListener("click", importPlaylist);
    $$(".platform-tabs button").forEach((btn) => {
      btn.addEventListener("click", () => {
        state.importPlatform = btn.dataset.platform;
        $$(".platform-tabs button").forEach((other) => {
          const on = other === btn;
          other.classList.toggle("is-on", on);
          other.setAttribute("aria-selected", on ? "true" : "false");
        });
        const isKugou = state.importPlatform === "kugou";
        const card = $(".import-card");
        if (card) card.classList.toggle("is-kugou", isKugou);
        $("#importExample").hidden = isKugou;
        $("#kgCodeNote").hidden = !isKugou;
        $("#playlistLabel").textContent = isKugou ? "酷狗码" : "歌单链接 / ID";
        const example = {
          netease: "示例：https://music.163.com/#/playlist?id=3778678",
          tencent: "示例：https://y.qq.com/n/ryqq/playlist/7011691570",
        };
        if (!isKugou) $("#importExample").textContent = example[state.importPlatform] + "　或直接填歌单 ID";
        $("#playlistUrl").placeholder = state.importPlatform === "netease"
          ? "https://music.163.com/#/playlist?id=…"
          : state.importPlatform === "tencent"
            ? "https://y.qq.com/n/ryqq/playlist/…"
            : "粘贴酷狗分享链接 / 酷狗码 / id_数字";
      });
    });

    $("#syncExport").addEventListener("click", exportSync);
    $("#syncFile").addEventListener("change", (event) => {
      importSyncFile(event.target.files && event.target.files[0]);
      event.target.value = "";
    });
    $("#syncReset").addEventListener("click", () => {
      state.sync = Object.assign({}, DEFAULT_SYNC);
      writeJSON("bm:sync", state.sync);
      renderSyncSettings();
      toast("同步设置已恢复默认");
    });
    [$("#syncEnabled"), $("#syncScopeSources"), $("#syncScopePlaylists"), $("#syncScopePrefs")].forEach((input) => {
      input.addEventListener("change", syncFromUI);
    });

    $("#lxTest").addEventListener("click", () => testLX(true));
    $("#lxSync").addEventListener("click", syncLX);
    $("#lxOpen").addEventListener("click", () => window.open("https://lxmusic.toside.cn/desktop/open-api", "_blank", "noopener"));
    $("#lxImportUrl").addEventListener("click", () => importLXSource($("#lxSourceUrl").value));
    $("#lxSourceUrl").addEventListener("keydown", (event) => {
      if (event.key === "Enter") importLXSource($("#lxSourceUrl").value);
    });
    const lxAiScan = $("#lxAiScan");
    if (lxAiScan) lxAiScan.addEventListener("click", () => scanLocalSources(true));
    const lxAiFetch = $("#lxAiFetch");
    if (lxAiFetch) lxAiFetch.addEventListener("click", aiFetchSource);
    const lxAiUrl = $("#lxAiUrl");
    if (lxAiUrl) lxAiUrl.addEventListener("keydown", (event) => {
      if (event.key === "Enter") aiFetchSource();
    });
    $$("[data-lx-url]").forEach((btn) => {
      btn.addEventListener("click", () => {
        $("#lxSourceUrl").value = btn.dataset.lxUrl;
        importLXSource(btn.dataset.lxUrl);
      });
    });
    $("#lxFile").addEventListener("change", (event) => {
      const file = event.target.files && event.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => importLXSource("", String(reader.result || ""));
      reader.readAsText(file);
      event.target.value = "";
    });
    $("#lxSourceList").addEventListener("click", (event) => {
      const toggle = event.target.closest("[data-lx-toggle]");
      if (toggle) {
        const index = Number(toggle.dataset.lxToggle);
        if (state.lxSources[index]) {
          state.lxSources[index].enabled = state.lxSources[index].enabled === false;
          writeJSON("bm:lx-sources", state.lxSources);
          renderLXSources();
        }
        return;
      }
      const del = event.target.closest("[data-lx-del]");
      if (del) {
        state.lxSources.splice(Number(del.dataset.lxDel), 1);
        writeJSON("bm:lx-sources", state.lxSources);
        renderLXSources();
        toast("已移除音源");
      }
    });

    $("#searchInput").addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        doSearch();
      }
    });
    $("#clearSearch").addEventListener("click", clearSearch);

    audio.addEventListener("play", () => setPlayIcon(false));
    audio.addEventListener("playing", () => {
      setPlayIcon(true);
      clearTimeout(state.loadFailTimer);
    });
    audio.addEventListener("pause", () => setPlayIcon(false));
    audio.addEventListener("timeupdate", () => {
      updateRangeUI(audio.currentTime, audio.duration || (state.current && state.current.duration) || 0);
      scheduleLyric(audio.currentTime);
      if (Math.floor(audio.currentTime) % 3 === 0) queueSave();
    });
    audio.addEventListener("loadedmetadata", () => {
      if (state.current && Number.isFinite(audio.duration) && audio.duration > 0) {
        syncTrackDuration(state.current, audio.duration);
        renderTracks();
      }
      updateRangeUI(audio.currentTime, audio.duration || (state.current && state.current.duration) || 0);
    });
    audio.addEventListener("ended", () => {
      if (state.modeIndex === 1) {
        audio.currentTime = 0;
        audio.play().catch(() => {});
      } else {
        nextTrack(true);
      }
    });
    audio.addEventListener("error", () => {
      if (!state.current || !audio.src) return;
      setPlayIcon(false);
      if (state.recovering) return;
      if (tryNextCandidate()) return;
      if (state.recoveryTried) {
        failCurrentTrack();
        return;
      }
      toast("当前音源加载失败，正在自动换源…");
      recoverCurrent();
    });
    audio.addEventListener("stalled", () => {
      if (!state.current || state.recovering) return;
      clearTimeout(state.stallTimer);
      state.stallTimer = setTimeout(() => {
        if (audio.readyState < 2 && !audio.paused) {
          if (!tryNextCandidate()) recoverCurrent();
        }
      }, 7000);
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        if ($("#detail").classList.contains("is-open")) closeDetail();
        else if ($(".bm-modal.is-open")) {
          const id = $(".bm-modal.is-open").id;
          closeModal(id === "importModal" ? "import" : id === "syncModal" ? "sync" : "lx");
        }
        else closeSide();
        return;
      }
      const target = event.target;
      const typing = target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT");
      if (typing) return;
      if ($(".bm-modal.is-open")) return;
      if (event.code === "Space") {
        event.preventDefault();
        togglePlay();
      } else if (event.key === "ArrowRight" && event.shiftKey) {
        nextTrack();
      } else if (event.key === "ArrowLeft" && event.shiftKey) {
        prevTrack();
      }
    });

    window.addEventListener("beforeunload", saveSession);
  }

  function closeSide() {
    $("#bmSide").classList.remove("is-open");
    $("#sideScrim").classList.remove("is-on");
  }

  function initialize() {
    loadStored();
    applyMode(state.mode, true);
    renderLibrary();
    renderArchive();
    renderLXSources();
    renderImportRecent();
    bindEvents();
    setPlayerMini(state.playerMini);
    $("#lxBase").value = state.lx.base;
    $("#detailVolText").textContent = String(Math.round(audio.volume * 100));
    const volPopText = $("#detailVolPopText");
    if (volPopText) volPopText.textContent = String(Math.round(audio.volume * 100));
    renderQuality();
    renderLogin();
    renderMinePlaylists();
    renderHistory();
    renderAchievements();
    applyLyricTransPref();
    renderSkeletonCards();
    restoreSession();
    loadHome();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialize, { once: true });
  } else {
    initialize();
  }
})();


