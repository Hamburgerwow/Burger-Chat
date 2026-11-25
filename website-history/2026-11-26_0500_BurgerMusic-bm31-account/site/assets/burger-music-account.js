(function () {
  "use strict";

  var REPO = "Hamburgerwow/Burger-Chat";
  var BRANCH = "main";
  var FILE_DIR = "music-data";
  var TOKEN_KEY = "bm:gh-token";
  var USER_KEY = "bm:gh-user";
  var META_KEY = "bm:account-meta";
  var DATA_KEYS = ["bm:playlists", "bm:lx-sources", "bm:stats", "bm:ach", "bm:favorites", "bm:history", "bm:quality", "bm:lyric-trans", "bm:volume"];
  var PROXY = "https://gh-proxy.com/";

  var $ = function (id) { return document.getElementById(id); };
  var state = { user: "", token: "", sha: "", pushing: false, pulledAt: 0, lastHash: "" };

  function read(key) {
    try { return localStorage.getItem(key); } catch (e) { return null; }
  }
  function write(key, value) {
    try { localStorage.setItem(key, value); } catch (e) {}
  }

  function status(text, tone) {
    var node = $("accStatus");
    if (node) {
      node.textContent = text;
      node.className = "acc-status" + (tone ? " is-" + tone : "");
    }
  }

  function meta() {
    try { return JSON.parse(read(META_KEY) || "{}") || {}; } catch (e) { return {}; }
  }
  function saveMeta(patch) {
    var next = Object.assign(meta(), patch);
    write(META_KEY, JSON.stringify(next));
    return next;
  }

  function filePath(user) {
    return FILE_DIR + "/" + encodeURIComponent(user) + ".json";
  }

  function b64encode(text) {
    var bytes = new TextEncoder().encode(text);
    var bin = "";
    for (var i = 0; i < bytes.length; i += 0x8000) {
      bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    }
    return btoa(bin);
  }
  function b64decode(text) {
    var bin = atob(String(text || "").replace(/\s+/g, ""));
    var bytes = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new TextDecoder().decode(bytes);
  }

  function api(path, options) {
    var opts = options || {};
    var headers = {
      "Accept": "application/vnd.github+json",
      "Content-Type": "application/json"
    };
    if (state.token) headers.Authorization = "token " + state.token;
    var direct = "https://api.github.com" + path;
    var proxied = PROXY + "https://api.github.com" + path;
    var bases = opts.proxy ? [proxied] : [direct, proxied];
    function attempt(index) {
      return fetch(bases[index], {
        method: opts.method || "GET",
        headers: headers,
        body: opts.body ? JSON.stringify(opts.body) : undefined,
        cache: "no-store"
      }).then(function (res) {
        return res.json().catch(function () { return {}; }).then(function (data) {
          if (!res.ok) {
            var error = new Error((data && data.message) || ("HTTP " + res.status));
            error.status = res.status;
            throw error;
          }
          return data;
        });
      }).catch(function (error) {
        if (index + 1 < bases.length && (!error.status || error.status >= 500)) {
          return attempt(index + 1);
        }
        throw error;
      });
    }
    return attempt(0);
  }

  function collect() {
    var payload = {
      version: 1,
      nickname: "",
      avatar: "",
      updatedAt: new Date().toISOString(),
      data: {}
    };
    var m = meta();
    payload.nickname = m.nickname || state.user || "";
    payload.avatar = m.avatar || "";
    DATA_KEYS.forEach(function (key) {
      var value = read(key);
      if (value == null) return;
      try { payload.data[key] = JSON.parse(value); } catch (e) { payload.data[key] = value; }
    });
    return payload;
  }

  function apply(payload) {
    if (!payload || typeof payload !== "object") return false;
    var data = payload.data || {};
    DATA_KEYS.forEach(function (key) {
      if (!(key in data)) return;
      var value = data[key];
      write(key, typeof value === "string" ? value : JSON.stringify(value));
    });
    saveMeta({ nickname: payload.nickname || state.user, avatar: payload.avatar || "" });
    return true;
  }

  function hashPayload(payload) {
    return JSON.stringify(payload.data).length + ":" + (payload.nickname || "") + ":" + (payload.avatar || "").length;
  }

  async function pull(silent) {
    var path = "/repos/" + REPO + "/contents/" + filePath(state.user) + "?ref=" + BRANCH;
    try {
      var res = await api(path);
      var text = b64decode(res.content || "");
      var payload = JSON.parse(text);
      var local = meta();
      var cloudTime = Date.parse(payload.updatedAt || 0) || 0;
      var localTime = Date.parse(local.updatedAt || 0) || 0;
      if (cloudTime > localTime) {
        apply(payload);
        state.sha = res.sha || "";
        state.lastHash = hashPayload(payload);
        saveMeta({ updatedAt: payload.updatedAt, nickname: payload.nickname, avatar: payload.avatar });
        if (!silent) status("已同步云端数据，正在刷新…", "ok");
        return "pulled";
      }
      state.sha = res.sha || "";
      state.lastHash = hashPayload(collect());
      return "local-newer";
    } catch (error) {
      if (error.status === 404) return "missing";
      throw error;
    }
  }

  async function push(force) {
    if (!state.token || !state.user || state.pushing) return false;
    var payload = collect();
    payload.updatedAt = new Date().toISOString();
    var hash = hashPayload(payload);
    if (!force && hash === state.lastHash) return false;
    state.pushing = true;
    status("正在同步到云端…");
    try {
      var body = {
        message: "music sync: " + state.user + " " + payload.updatedAt,
        content: b64encode(JSON.stringify(payload, null, 2)),
        branch: BRANCH
      };
      if (state.sha) body.sha = state.sha;
      var res = await api("/repos/" + REPO + "/contents/" + filePath(state.user), { method: "PUT", body: body });
      state.sha = (res.content && res.content.sha) || state.sha;
      state.lastHash = hash;
      saveMeta({ updatedAt: payload.updatedAt });
      status("已同步 · " + new Date().toLocaleTimeString(), "ok");
      return true;
    } catch (error) {
      status("同步失败：" + (error.message || "网络问题"), "warn");
      return false;
    } finally {
      state.pushing = false;
    }
  }

  function render() {
    var m = meta();
    var logged = !!(state.token && state.user);
    var entry = $("accountEntry");
    if (entry) entry.textContent = logged ? (m.nickname || state.user) : "注册 / 登录";
    var name = $("accName"); if (name) name.textContent = logged ? (m.nickname || state.user) : "未登录";
    var sub = $("accSub"); if (sub) sub.textContent = logged ? "已连接 GitHub · 自动同步" : "密钥只保存在本机浏览器";
    var avatar = $("accAvatar");
    if (avatar) {
      if (m.avatar) {
        avatar.style.backgroundImage = "url('" + m.avatar + "')";
        avatar.textContent = "";
      } else {
        avatar.style.backgroundImage = "";
        avatar.textContent = ((m.nickname || state.user || "B").slice(0, 1) || "B").toUpperCase();
      }
    }
    var nickname = $("accNick");
    if (nickname && !nickname.value && logged) nickname.value = m.nickname || state.user;
    var tokenInput = $("accToken");
    if (tokenInput && !tokenInput.value && state.token) tokenInput.value = state.token;
    var logout = $("accLogout"); if (logout) logout.hidden = !logged;
    var syncBtn = $("accSync"); if (syncBtn) syncBtn.hidden = !logged;

    var mineName = $("mineLoginName");
    if (mineName) mineName.textContent = logged ? (m.nickname || state.user) : "本机访客";
    var mineSub = $("mineLoginSub");
    if (mineSub) mineSub.textContent = logged ? ("GitHub 同步 · " + state.user) : "登录后可同步账号与歌单";
    var mineState = $("mineLoginState");
    if (mineState) mineState.textContent = logged ? "SYNCED" : "LOCAL SESSION";
    var mineBtn = $("mineLoginBtn");
    if (mineBtn) mineBtn.textContent = logged ? "管理" : "登录";
    var mineAvatar = $("mineAvatar");
    if (mineAvatar) {
      if (m.avatar) {
        mineAvatar.style.backgroundImage = "url('" + m.avatar + "')";
        mineAvatar.textContent = "";
      } else {
        mineAvatar.style.backgroundImage = "";
        mineAvatar.textContent = ((m.nickname || state.user || "B").slice(0, 1) || "B").toUpperCase();
      }
    }
  }

  async function login(registerMode) {
    var tokenInput = $("accToken");
    var token = (tokenInput && tokenInput.value || "").trim();
    var nickInput = $("accNick");
    var nickname = (nickInput && nickInput.value || "").trim();
    if (!token) { status("请先填写 GitHub 密钥", "warn"); return; }
    status(registerMode ? "正在注册…" : "正在登录…");
    state.token = token;
    try {
      var user = await api("/user");
      state.user = user.login;
      write(TOKEN_KEY, token);
      write(USER_KEY, state.user);
      saveMeta({ nickname: nickname || meta().nickname || state.user, updatedAt: meta().updatedAt || "" });
      var result = await pull(true);
      if (result === "missing" && registerMode) {
        await push(true);
      } else if (result === "missing") {
        status("该密钥下还没有音乐档案，点「注册新账号」创建", "warn");
        render();
        return;
      }
      status("已登录 " + state.user + "，歌单 / 音源 / 成就已同步", "ok");
      render();
      setTimeout(function () { location.reload(); }, 900);
    } catch (error) {
      state.token = "";
      status("密钥无效或网络不可用：" + (error.message || ""), "warn");
    }
  }

  function logout() {
    state.token = "";
    state.user = "";
    state.sha = "";
    state.lastHash = "";
    ["bm:gh-token", "bm:gh-user"].forEach(function (key) { try { localStorage.removeItem(key); } catch (e) {} });
    var tokenInput = $("accToken"); if (tokenInput) tokenInput.value = "";
    status("已退出登录");
    render();
  }

  function bind() {
    var entry = $("accountEntry");
    if (entry) entry.addEventListener("click", function () { openModal(); });
    var mineBtn = $("mineLoginBtn");
    if (mineBtn) {
      mineBtn.addEventListener("click", function (event) { event.preventDefault(); openModal(); });
    }
    var loginBtn = $("accLogin");
    if (loginBtn) loginBtn.addEventListener("click", function () { login(false); });
    var regBtn = $("accRegister");
    if (regBtn) regBtn.addEventListener("click", function () { login(true); });
    var outBtn = $("accLogout");
    if (outBtn) outBtn.addEventListener("click", logout);
    var syncBtn = $("accSync");
    if (syncBtn) syncBtn.addEventListener("click", function () { push(true); });
    var avatarFile = $("accAvatarFile");
    if (avatarFile) avatarFile.addEventListener("change", function () {
      var file = avatarFile.files && avatarFile.files[0];
      if (!file) return;
      if (file.size > 160000) { status("头像请小于 150KB", "warn"); return; }
      var reader = new FileReader();
      reader.onload = function () {
        saveMeta({ avatar: String(reader.result || "") });
        render();
        if (state.token) push(true);
      };
      reader.readAsDataURL(file);
    });
  }

  function openModal() {
    var modal = $("accountModal");
    if (!modal) return;
    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");
    document.documentElement.style.overflow = "hidden";
    render();
  }

  function boot() {
    state.token = read(TOKEN_KEY) || "";
    state.user = read(USER_KEY) || "";
    bind();
    render();
    if (state.token && state.user) {
      status("正在恢复同步…");
      pull(false).then(function (result) {
        if (result === "pulled") { setTimeout(function () { location.reload(); }, 600); return; }
        status("已登录 · 自动同步开启", "ok");
      }).catch(function () {
        status("当前离线，稍后会自动重试", "warn");
      });
    }
    setInterval(function () {
      if (state.token && state.user) push(false);
    }, 9000);
    window.addEventListener("visibilitychange", function () {
      if (document.visibilityState === "hidden" && state.token && state.user) push(false);
    });
  }

  window.BMAccount = { open: openModal, push: push, pull: pull };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
