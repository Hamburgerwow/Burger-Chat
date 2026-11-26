(function () {
  "use strict";

  /* Burger music account v4 — 账号密码 + 扫码登录，云端歌单/音源/头像/昵称/成就同步。
     GitHub 密钥保存在 Edge Worker 的 GH_TOKEN secret 里，浏览器只拿会话 Cookie。 */

  var API = "/burger-music/api/account/";
  var DATA_KEYS = ["bm:playlists", "bm:lx-sources", "bm:stats", "bm:ach", "bm:favorites", "bm:history", "bm:quality", "bm:lyric-trans", "bm:volume"];
  var META_KEY = "bm:account-meta";
  var CACHE_USER = "bm:account-user";
  var $ = function (id) { return document.getElementById(id); };
  var state = { user: "", nick: "", avatar: "", updatedAt: 0, pushing: false, lastHash: "", qr: null, qrTimer: 0, codeTimer: 0, busy: false, verify: false, verifyMsg: "", key: "", keyHint: "", hasBlob: false };

  function read(key) { try { return localStorage.getItem(key); } catch (e) { return null; } }
  function write(key, value) { try { localStorage.setItem(key, value); } catch (e) {} }

  function meta() { try { return JSON.parse(read(META_KEY) || "{}") || {}; } catch (e) { return {}; } }
  function saveMeta(patch) { var next = Object.assign(meta(), patch); write(META_KEY, JSON.stringify(next)); return next; }

  function status(text, tone) {
    var node = $("accStatus");
    if (!node) return;
    node.textContent = text;
    node.className = "acc-status" + (tone ? " is-" + tone : "");
  }

  function abs(path) {
    return (location.protocol === "file:" ? "https://hamburgerwow.top/burger-music/api/account/" : API) + path;
  }

  function call(path, options) {
    var opts = options || {};
    return fetch(abs(path), {
      method: opts.method || "GET",
      credentials: "include",
      headers: opts.body ? { "Content-Type": "application/json" } : undefined,
      body: opts.body ? JSON.stringify(opts.body) : undefined,
      cache: "no-store"
    }).then(function (res) {
      return res.json().catch(function () { return {}; }).then(function (data) {
        if (!res.ok && !(data && data.ok === false)) {
          var error = new Error((data && data.error) || ("HTTP " + res.status));
          error.status = res.status;
          throw error;
        }
        return data || {};
      });
    });
  }

  function collect() {
    var payload = { nick: state.nick || meta().nickname || state.user, avatar: state.avatar || meta().avatar || "", data: {} };
    DATA_KEYS.forEach(function (key) {
      var value = read(key);
      if (value == null) return;
      try { payload.data[key] = JSON.parse(value); } catch (e) { payload.data[key] = value; }
    });
    return payload;
  }

  function apply(payload) {
    var data = (payload && payload.data) || {};
    DATA_KEYS.forEach(function (key) {
      if (!(key in data)) return;
      var value = data[key];
      write(key, typeof value === "string" ? value : JSON.stringify(value));
    });
    state.nick = payload.nick || state.nick || state.user;
    state.avatar = payload.avatar || "";
    saveMeta({ nickname: state.nick, avatar: state.avatar });
  }

  function hashPayload(payload) {
    return (payload.nick || "") + "|" + (payload.avatar || "").length + "|" + JSON.stringify(payload.data).length;
  }

  function pull(silent) {
    return call("data").then(function (res) {
      if (!res.ok) return "none";
      state.updatedAt = Number(res.updatedAt) || 0;
      var localTime = Number(meta().updatedAt) || 0;
      if (state.updatedAt > localTime) {
        apply(res);
        saveMeta({ nickname: state.nick, avatar: state.avatar, updatedAt: state.updatedAt });
        state.lastHash = hashPayload(collect());
        if (!silent) status("已同步云端数据", "ok");
        return "pulled";
      }
      state.lastHash = hashPayload(collect());
      return "local";
    });
  }

  function push(force) {
    if (!state.user || state.pushing) return Promise.resolve(false);
    var payload = collect();
    var hash = hashPayload(payload);
    if (!force && hash === state.lastHash) return Promise.resolve(false);
    state.pushing = true;
    status("正在同步…");
    return call("data", { method: "POST", body: payload }).then(function (res) {
      if (!res.ok) { status("同步失败：" + (res.error || "请重新登录"), "warn"); return false; }
      state.lastHash = hash;
      state.updatedAt = Number(res.updatedAt) || Date.now();
      saveMeta({ updatedAt: state.updatedAt, nickname: res.nick || state.nick, avatar: state.avatar });
      status("已同步 · " + new Date().toLocaleTimeString(), "ok");
      return true;
    }).catch(function (error) {
      status("同步失败：" + (error.message || "网络问题"), "warn");
      return false;
    }).then(function (value) { state.pushing = false; return value; });
  }

  function render() {
    var logged = !!state.user;
    var name = state.nick || meta().nickname || state.user;
    var avatarData = state.avatar || meta().avatar || "";

    var entry = $("accountEntry");
    if (entry) {
      entry.textContent = logged ? name : "注册 / 登录";
      entry.classList.toggle("is-on", logged);
    }
    var accName = $("accName"); if (accName) accName.textContent = logged ? name : "未登录";
    var accSub = $("accSub");
    if (accSub) accSub.textContent = logged ? ("已连接 · " + state.user + " · 自动同步") : "邮箱验证码登录 · 扫码登录";
    var avatar = $("accAvatar");
    if (avatar) {
      if (avatarData) { avatar.style.backgroundImage = "url('" + avatarData + "')"; avatar.textContent = ""; }
      else { avatar.style.backgroundImage = ""; avatar.textContent = (name || "B").slice(0, 1).toUpperCase(); }
    }
    var nameInput = $("accRealName");
    if (nameInput && logged && !nameInput.value) nameInput.value = name;
    var vbox = $("accVerifyBox"); if (vbox) vbox.hidden = logged || !state.verify;
    var vtext = $("accVerifyText"); if (vtext) vtext.textContent = state.verifyMsg || "验证邮件已发送，请点击邮件里的链接完成验证。";
    var forgot = $("accForgot"); if (forgot) forgot.hidden = logged || state.tab === "register";
    var logout = $("accLogout"); if (logout) logout.hidden = !logged;
    var syncBtn = $("accSync"); if (syncBtn) syncBtn.hidden = !logged;
    var form = $("accForm"); if (form) form.hidden = logged;
    var tabs = $("accTabs"); if (tabs) tabs.hidden = logged;
    var pwdPane = $("accPwdPane"); if (pwdPane) pwdPane.hidden = logged || state.tab === "scan" || state.tab === "key";
    var scan = $("accScanPane"); if (scan) scan.hidden = logged || state.tab !== "scan";
    var keyPane = $("accKeyPane"); if (keyPane) keyPane.hidden = logged || state.tab !== "key";
    var keyBox = $("accKeyBox");
    if (keyBox) {
      keyBox.hidden = !(logged && state.key);
      var keyText = $("accKeyText"); if (keyText) keyText.textContent = state.key || "";
    }
    var keyInfo = $("accKeyInfo");
    if (keyInfo) {
      keyInfo.hidden = !(logged && (state.keyHint || state.key));
      var keyHint = $("accKeyHint");
      if (keyHint) keyHint.textContent = state.keyHint || "已生成，请用首次登录时保存的密钥";
    }

    var mineName = $("mineLoginName"); if (mineName) mineName.textContent = logged ? name : "本机访客";
    var mineSub = $("mineLoginSub"); if (mineSub) mineSub.textContent = logged ? ("云端同步 · " + state.user) : "登录后可同步账号与歌单";
    var mineState = $("mineLoginState"); if (mineState) mineState.textContent = logged ? "SYNCED" : "LOCAL SESSION";
    var mineBtn = $("mineLoginBtn"); if (mineBtn) mineBtn.textContent = logged ? "管理" : "登录";
    var mineAvatar = $("mineAvatar");
    if (mineAvatar) {
      if (avatarData) { mineAvatar.style.backgroundImage = "url('" + avatarData + "')"; mineAvatar.textContent = ""; }
      else { mineAvatar.style.backgroundImage = ""; mineAvatar.textContent = (name || "B").slice(0, 1).toUpperCase(); }
    }
  }

  function switchTab(tab) {
    state.tab = tab;
    var tabs = $("accTabs");
    if (tabs) Array.prototype.forEach.call(tabs.querySelectorAll("[data-acc-tab]"), function (btn) {
      btn.classList.toggle("is-on", btn.getAttribute("data-acc-tab") === tab);
    });
    var pwd = $("accPwdPane"); if (pwd) pwd.hidden = tab === "scan" || tab === "key";
    var scan = $("accScanPane"); if (scan) scan.hidden = tab !== "scan";
    var keyPane = $("accKeyPane"); if (keyPane) keyPane.hidden = tab !== "key";
    var register = tab === "register";
    var nameWrap = $("accNameWrap"); if (nameWrap) nameWrap.hidden = !register;
    var submit = $("accSubmit"); if (submit) submit.textContent = register ? "注册并发送验证邮件" : "登录";
    var hint = $("accHint");
    if (hint) hint.textContent = register ? "注册后会向邮箱发送验证链接，点击后才能登录" : tab === "key" ? "用另一台设备保存的 BC1 密钥登录，账号和加密用户文件会一起同步" : "邮箱和密码由 Firebase 校验，验证过的邮箱才能登录";
    var codeHint = $("accCodeHint");
    if (codeHint) codeHint.textContent = register ? "注册后会发送验证链接，点击邮件里的链接完成验证" : "登录前会检查邮箱是否已经验证";
    var forgot = $("accForgot"); if (forgot) forgot.hidden = register || tab === "key";
    if (tab === "scan") startScan();
    else stopScan();
    render();
  }

  function validEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(value || "")) && String(value).length <= 80;
  }

  function authFields() {
    return {
      email: ($("accEmail") && $("accEmail").value || "").trim().toLowerCase(),
      pass: ($("accPass") && $("accPass").value || ""),
      name: ($("accRealName") && $("accRealName").value || "").trim()
    };
  }

  function showVerify(msg) {
    state.verify = true;
    state.verifyMsg = msg || "";
    render();
  }

  function resendVerify() {
    if (state.busy) return;
    var f = authFields();
    if (!validEmail(f.email)) { status("请输入正确的邮箱地址", "warn"); return; }
    if (!f.pass) { status("请先填写密码，再重新发送验证邮件", "warn"); return; }
    state.busy = true;
    status("正在发送验证邮件…");
    call("send-code", { method: "POST", body: { email: f.email, password: f.pass, scene: "verify" } })
      .then(function (res) {
        if (!res.ok) { status(res.error || "发送失败", "warn"); return; }
        var msg = res.message || (res.alreadyVerified ? "邮箱已经验证过了，直接登录即可。" : "验证邮件已重新发送到 " + f.email + "。");
        state.verify = !res.alreadyVerified;
        state.verifyMsg = msg;
        status(msg, "ok");
        render();
      })
      .catch(function (error) { status("发送失败：" + (error.message || "网络不可用"), "warn"); })
      .then(function () { state.busy = false; });
  }

  function forgotPassword() {
    if (state.busy) return;
    var f = authFields();
    if (!validEmail(f.email)) { status("请先填写要找回的邮箱", "warn"); return; }
    state.busy = true;
    status("正在发送重置邮件…");
    call("reset", { method: "POST", body: { email: f.email } })
      .then(function (res) {
        if (!res.ok) { status(res.error || "发送失败", "warn"); return; }
        status(res.message || "如果这个邮箱已注册，重置密码邮件会发送到邮箱。", "ok");
      })
      .catch(function (error) { status("发送失败：" + (error.message || "网络不可用"), "warn"); })
      .then(function () { state.busy = false; });
  }

  function submit() {
    if (state.busy) return;
    var f = authFields();
    var register = state.tab === "register";
    if (!validEmail(f.email)) { status("请输入正确的邮箱地址", "warn"); return; }
    if (f.pass.length < 6 || f.pass.length > 64) { status("密码需要 6-64 位", "warn"); return; }
    if (register && !f.name) { status("请填写名称", "warn"); return; }
    state.busy = true;
    status(register ? "正在创建 Firebase 账号…" : "正在登录…");
    call(register ? "register" : "login", { method: "POST", body: { email: f.email, password: f.pass, name: f.name || f.email.split("@")[0] } })
      .then(function (res) {
        if (!res.ok) {
          if (res.code === "EMAIL_NOT_VERIFIED") {
            showVerify(res.error || "这个邮箱还没有完成验证。");
            status(res.error || "请先完成邮箱验证", "warn");
            return;
          }
          status(res.error || "登录失败", "warn");
          return;
        }
        if (register && res.verifySent) {
          state.verify = true;
          state.verifyMsg = res.message || "验证邮件已发送，请点击邮件里的链接完成验证，然后回来登录。";
          switchTab("login");
          status(state.verifyMsg, "ok");
          return;
        }
        state.user = res.email || res.user; state.nick = res.name || res.nick || state.user; state.avatar = res.avatar || "";
        state.verify = false; state.verifyMsg = "";
        state.key = res.key || "";
        state.keyHint = res.keyHint || state.keyHint || "";
        state.hasBlob = !!(res.key && !res.syncError);
        write(CACHE_USER, state.user);
        saveMeta({ nickname: state.nick, avatar: state.avatar });
        render();
        if (pendingTicket()) confirmOnPhone();
        return pull(true).then(function (result) {
          if (result === "pulled") {
            status(res.keyIssued ? "登录成功 · 已应用云端数据，请立即复制密钥" : "已登录，正在应用云端数据…", "ok");
            if (!res.keyIssued) setTimeout(function () { location.reload(); }, 700);
            render();
          } else {
            return push(true).then(function () {
              if (res.keyIssued && res.key) status("登录成功 · 已生成密钥并上传，请立即复制保存", "ok");
              else if (res.syncError) status("已登录，但密钥上传失败：" + res.syncError, "warn");
              else status("已登录 " + state.user + " · 自动同步开启", "ok");
              render();
            });
          }
        });
      })
      .catch(function (error) { status("失败：" + (error.message || "网络不可用"), "warn"); })
      .then(function () { state.busy = false; });
  }

  function keyLogin() {
    if (state.busy) return;
    var input = $("accKeyInput");
    var key = String(input && input.value || "").trim();
    if (!/^BC1/i.test(key)) { status("请输入 BC1- 开头的同步密钥", "warn"); return; }
    state.busy = true;
    status("正在验证同步密钥…");
    call("key/login", { method: "POST", body: { key: key } })
      .then(function (res) {
        if (!res.ok) { status(res.error || "密钥登录失败", "warn"); return; }
        state.user = res.email || res.user || state.user;
        state.nick = res.name || res.nick || res.user;
        state.avatar = res.avatar || "";
        state.key = "";
        state.keyHint = res.keyHint || "";
        state.hasBlob = !!res.hasBlob;
        state.verify = false; state.verifyMsg = "";
        write(CACHE_USER, state.user);
        saveMeta({ nickname: state.nick, avatar: state.avatar });
        render();
        return pull(true).then(function (result) {
          if (result === "pulled") {
            status("密钥登录成功，正在应用云端数据…", "ok");
            setTimeout(function () { location.reload(); }, 700);
          } else {
            status(res.hasBlob ? "密钥登录成功 · 已同步账号与用户文件" : "密钥登录成功 · 账号已同步", "ok");
            render();
          }
        });
      })
      .catch(function (error) { status("密钥登录失败：" + (error.message || "网络不可用"), "warn"); })
      .then(function () { state.busy = false; });
  }

  function copyKey() {
    var text = state.key || "";
    if (!text) return;
    var done = function () { status("密钥已复制，请妥善保存", "ok"); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done).catch(function () { fallbackCopy(text, done); });
    else fallbackCopy(text, done);
  }

  function fallbackCopy(text, done) {
    var ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.left = "-9999px";
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand("copy"); done(); } catch (e) {}
    document.body.removeChild(ta);
  }

  function resetKey() {
    if (state.busy) return;
    if (!window.confirm("重置后旧密钥会立即失效，旧设备需要重新用新密钥登录。继续？")) return;
    state.busy = true;
    status("正在重置密钥…");
    call("key/rotate", { method: "POST", body: {} })
      .then(function (res) {
        if (!res.ok) { status(res.error || "重置失败", "warn"); return; }
        state.key = res.key || "";
        state.keyHint = res.keyHint || "";
        state.hasBlob = false;
        status("新密钥已生成，请立即复制保存", "ok");
        render();
      })
      .catch(function (error) { status("重置失败：" + (error.message || "网络不可用"), "warn"); })
      .then(function () { state.busy = false; });
  }

  function logout() {
    call("logout", { method: "POST" }).catch(function () {});
    state.user = ""; state.nick = ""; state.avatar = ""; state.lastHash = ""; state.verify = false; state.verifyMsg = "";
    state.key = ""; state.keyHint = ""; state.hasBlob = false;
    try { localStorage.removeItem(CACHE_USER); } catch (e) {}
    status("已退出登录");
    render();
  }

  /* ---------- 扫码登录 ---------- */
  function drawQr(url) {
    var box = $("accQrBox");
    if (!box || typeof qrcode !== "function") return;
    var qr = qrcode(0, "M");
    qr.addData(url);
    qr.make();
    box.innerHTML = qr.createImgTag(4, 8);
    var img = box.querySelector("img");
    if (img) { img.setAttribute("alt", "扫码登录二维码"); img.style.borderRadius = "10px"; }
  }

  function stopScan() {
    if (state.qrTimer) clearInterval(state.qrTimer);
    state.qrTimer = 0;
    state.qr = null;
  }

  function startScan() {
    stopScan();
    status("正在生成二维码…");
    call("qr/new", { method: "POST", body: {} }).then(function (res) {
      if (!res.ok) { status(res.error || "二维码生成失败", "warn"); return; }
      state.qr = { ticket: res.ticket, secret: res.secret, url: res.url };
      drawQr(res.url);
      var link = $("accQrLink"); if (link) { link.href = res.url; link.textContent = res.url.replace("https://", ""); }
      status("用手机扫码并在手机上确认登录");
      state.qrTimer = setInterval(pollScan, 2500);
    }).catch(function (error) { status("二维码生成失败：" + (error.message || ""), "warn"); });
  }

  function pollScan() {
    if (!state.qr) return;
    var q = state.qr;
    call("qr/status?t=" + q.ticket + "&s=" + q.secret).then(function (res) {
      if (!res.ok) return;
      if (res.status === "confirmed" && res.code) {
        clearInterval(state.qrTimer); state.qrTimer = 0;
        status("手机已确认，正在登录…", "ok");
        call("qr/claim", { method: "POST", body: { ticket: q.ticket, code: res.code, secret: q.secret } })
          .then(function (claim) {
            if (!claim.ok) { status(claim.error || "登录失败", "warn"); startScan(); return; }
            state.user = claim.email || claim.user; state.nick = claim.name || claim.nick || claim.user;
            write(CACHE_USER, state.user);
            saveMeta({ nickname: state.nick });
            render();
            return pull(true).then(function (result) {
              if (result === "pulled") { status("扫码登录成功，正在应用云端数据…", "ok"); setTimeout(function () { location.reload(); }, 700); return; }
              status("扫码登录成功 · " + state.user, "ok");
            });
          }).catch(function (error) { status("登录失败：" + (error.message || ""), "warn"); });
      } else if (res.status === "expired" || res.status === "missing") {
        clearInterval(state.qrTimer); state.qrTimer = 0;
        status("二维码已过期，正在刷新…", "warn");
        startScan();
      }
    }).catch(function () {});
  }

  /* ---------- 手机端确认 ---------- */
  function pendingTicket() {
    try { return new URLSearchParams(location.search).get("qr") || ""; } catch (e) { return ""; }
  }

  function confirmOnPhone() {
    var ticket = pendingTicket();
    if (!ticket) return;
    call("qr/confirm", { method: "POST", body: { ticket: ticket } }).then(function (res) {
      var note = $("accScanNote");
      if (res.ok) {
        status("已确认，回到电脑上即可完成登录", "ok");
        if (note) note.textContent = "已确认登录，可关闭此页面";
        openModal();
      } else {
        status(res.error || "确认失败", "warn");
        openModal();
      }
    }).catch(function () { openModal(); });
  }

  function bind() {
    var entry = $("accountEntry");
    if (entry) entry.addEventListener("click", openModal);
    var mineBtn = $("mineLoginBtn");
    if (mineBtn) mineBtn.addEventListener("click", function (event) { event.preventDefault(); openModal(); });
    var tabs = $("accTabs");
    if (tabs) Array.prototype.forEach.call(tabs.querySelectorAll("[data-acc-tab]"), function (btn) {
      btn.addEventListener("click", function () { switchTab(btn.getAttribute("data-acc-tab")); });
    });
    var submitBtn = $("accSubmit"); if (submitBtn) submitBtn.addEventListener("click", submit);
    var keyBtn = $("accKeySubmit"); if (keyBtn) keyBtn.addEventListener("click", keyLogin);
    var keyCopy = $("accKeyCopy"); if (keyCopy) keyCopy.addEventListener("click", copyKey);
    var keyReset = $("accKeyReset"); if (keyReset) keyReset.addEventListener("click", resetKey);
    var resendBtn = $("accResend"); if (resendBtn) resendBtn.addEventListener("click", resendVerify);
    var forgotBtn = $("accForgot"); if (forgotBtn) forgotBtn.addEventListener("click", forgotPassword);
    document.addEventListener("keydown", function (event) {
      var modal = $("accountModal");
      if (!modal || !modal.classList.contains("is-open")) return;
      if (event.key === "Escape") { event.preventDefault(); hideModal(); return; }
      if (event.key === "Enter" && !state.busy) {
        if (state.tab === "key") { event.preventDefault(); keyLogin(); return; }
        if (state.tab !== "scan") { event.preventDefault(); submit(); }
      }
    });
    var outBtn = $("accLogout"); if (outBtn) outBtn.addEventListener("click", logout);
    var syncBtn = $("accSync"); if (syncBtn) syncBtn.addEventListener("click", function () { push(true); });
    var refresh = $("accQrRefresh"); if (refresh) refresh.addEventListener("click", startScan);
    var confirm = $("accQrConfirm"); if (confirm) confirm.addEventListener("click", confirmOnPhone);
    var avatarFile = $("accAvatarFile");
    if (avatarFile) avatarFile.addEventListener("change", function () {
      var file = avatarFile.files && avatarFile.files[0];
      if (!file) return;
      if (file.size > 160000) { status("头像请小于 150KB", "warn"); return; }
      var reader = new FileReader();
      reader.onload = function () {
        state.avatar = String(reader.result || "");
        saveMeta({ avatar: state.avatar });
        render();
        if (state.user) push(true);
      };
      reader.readAsDataURL(file);
    });
  }

  function hideModal() {
    var modal = $("accountModal");
    if (!modal) return;
    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden", "true");
    document.documentElement.style.overflow = "";
  }

  function openModal() {
    var modal = $("accountModal");
    if (!modal) return;
    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");
    document.documentElement.style.overflow = "hidden";
    if (!state.tab) switchTab("login");
    render();
  }

  function boot() {
    state.user = read(CACHE_USER) || "";
    state.nick = meta().nickname || state.user;
    state.avatar = meta().avatar || "";
    bind();
    render();
    if (pendingTicket()) {
      var banner = $("accScanNote");
      if (banner) banner.textContent = "手机端扫码登录确认";
      if (state.user) confirmOnPhone();
    }
    call("me").then(function (res) {
      if (res && res.logged) {
        state.user = res.email || res.user; state.nick = res.name || res.nick || res.user; state.avatar = res.avatar || "";
        write(CACHE_USER, state.user);
        saveMeta({ nickname: state.nick, avatar: state.avatar });
        render();
        call("key/status").then(function (k) {
          if (k && k.ok) { state.keyHint = k.keyHint || ""; state.hasBlob = !!k.hasBlob; render(); }
        }).catch(function () {});
        return pull(true).then(function (result) {
          if (result === "pulled") setTimeout(function () { location.reload(); }, 500);
          else status("已登录 · 自动同步开启", "ok");
        });
      }
      if (state.user) { state.user = ""; try { localStorage.removeItem(CACHE_USER); } catch (e) {} }
      render();
      status("未登录 · 登录后同步歌单、音源、头像与成就");
    }).catch(function () {
      render();
      status("离线：登录状态暂不可用", "warn");
    });
    setInterval(function () { if (state.user) push(false); }, 9000);
    window.addEventListener("visibilitychange", function () {
      if (document.visibilityState === "hidden" && state.user) push(false);
    });
  }

  window.BMAccount = { open: openModal, push: push, pull: pull };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
