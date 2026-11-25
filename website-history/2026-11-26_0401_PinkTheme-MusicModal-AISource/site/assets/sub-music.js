(function () {
  if (window.__bcSubMusic) return;
  window.__bcSubMusic = true;

  var MANIFEST = 'https://raw.githubusercontent.com/Hamburgerwow/Burger-Chat/main/music/index.json';
  var FALLBACK = '/api/music';
  var DEFAULT_TRACK = {
    id: 'firefly-cmj',
    title: '萤火之森',
    uploader: 'CMJ',
    url: '/assets/music/firefly-cmj.mp3?v=0.40.52r3'
  };
  var PAUSE_KEY = 'bcMusicPaused';
  var PROGRESS_KEY = 'bcMusicProgress';
  var CURRENT_KEY = 'bcMusicCurrent';
  var current = DEFAULT_TRACK;
  var progress = {};
  var lastSave = 0;
  var started = false;

  function read(key) { try { return localStorage.getItem(key); } catch (e) { return ''; } }
  function write(key, value) { try { localStorage.setItem(key, value); } catch (e) {} }
  function loadProgress() {
    try { progress = JSON.parse(read(PROGRESS_KEY) || '{}') || {}; } catch (e) { progress = {}; }
  }
  function fmt(sec) {
    sec = Math.max(0, Number(sec) || 0);
    var m = Math.floor(sec / 60);
    var s = Math.floor(sec % 60);
    return m + ':' + (s < 10 ? '0' : '') + s;
  }
  function playable(t) { return !!(t && t.url); }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();

  function init() {
    if (document.getElementById('bcMiniMusic')) return;
    var card = document.createElement('div');
    card.className = 'bc-mini-music';
    card.id = 'bcMiniMusic';
    card.setAttribute('aria-label', '背景音乐');
    card.innerHTML = [
      '<audio id="bcMiniAudio" preload="metadata" playsinline></audio>',
      '<button class="mm-play" id="bcMiniPlay" type="button" aria-label="播放背景音乐">',
      '  <svg class="mm-ico-play" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>',
      '  <svg class="mm-ico-pause" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z"/></svg>',
      '</button>',
      '<div class="mm-info"><small>BACKGROUND MUSIC</small><b id="bcMiniTitle">萤火之森</b><span id="bcMiniBy">上传者 · CMJ</span></div>',
      '<span class="mm-time" id="bcMiniTime">0:00</span>',
      '<div class="mm-track" aria-hidden="true"><i id="bcMiniBar"></i></div>'
    ].join('');
    document.body.appendChild(card);

    var audio = card.querySelector('#bcMiniAudio');
    var playBtn = card.querySelector('#bcMiniPlay');
    var title = card.querySelector('#bcMiniTitle');
    var by = card.querySelector('#bcMiniBy');
    var time = card.querySelector('#bcMiniTime');
    var bar = card.querySelector('#bcMiniBar');
    var userPaused = read(PAUSE_KEY) === '1';

    loadProgress();
    var bootSaved = read(CURRENT_KEY) || '';

    function setPlaying(on) {
      card.classList.toggle('is-playing', !!on);
      playBtn.setAttribute('aria-label', on ? '暂停背景音乐' : '播放背景音乐');
    }

    function paintProgress() {
      var d = Number(audio.duration) || 0;
      var c = Number(audio.currentTime) || 0;
      time.textContent = fmt(c) + (d ? ' / ' + fmt(d) : '');
      bar.style.width = (d ? Math.min(100, c / d * 100) : 0).toFixed(2) + '%';
    }

    function saveProgress(force) {
      if (!playable(current)) return;
      var now = Date.now();
      if (!force && now - lastSave < 1800) return;
      var t = Number(audio.currentTime) || 0;
      if (t < .4 && !audio.paused) return;
      progress[current.url] = { time: t, duration: Number(audio.duration) || 0, at: now };
      var keys = Object.keys(progress);
      if (keys.length > 20) {
        keys.sort(function (a, b) { return Number(progress[a].at || 0) - Number(progress[b].at || 0); });
        keys.slice(0, keys.length - 20).forEach(function (k) { delete progress[k]; });
      }
      write(PROGRESS_KEY, JSON.stringify(progress));
      lastSave = now;
    }

    function restoreTime() {
      var saved = progress[current.url];
      if (!saved || !saved.time) return;
      var d = Number(audio.duration) || Number(saved.duration) || 0;
      var t = d ? Math.min(Number(saved.time), Math.max(0, d - .8)) : Number(saved.time);
      try { audio.currentTime = Math.max(0, t); } catch (e) {}
    }

    function applyTrack(track) {
      current = playable(track) ? track : DEFAULT_TRACK;
      title.textContent = current.title || '背景音乐';
      by.textContent = '上传者 · ' + (current.uploader || 'Burger Chat');
      card.classList.remove('is-loading');
      audio.src = current.url;
      write(CURRENT_KEY, current.url);
      started = false;
      paintProgress();
    }

    function tryPlay() {
      if (!playable(current)) return;
      var p = audio.play();
      if (p && p.catch) p.catch(function () {});
    }

    function normalize(json) {
      var arr = [];
      if (json && json.default) arr.push(json.default);
      if (json && json.tracks && json.tracks.length) arr = arr.concat(json.tracks);
      if (json && json.latest) arr.push(json.latest);
      var out = [];
      arr.forEach(function (t) {
        if (!t || !t.url) return;
        for (var i = 0; i < out.length; i++) if (out[i].url === t.url) return;
        out.push(t);
      });
      return out;
    }

    function loadManifest(savedUrl) {
      fetch(MANIFEST, { cache: 'no-store' })
        .then(function (r) { if (!r.ok) throw new Error('manifest'); return r.json(); })
        .then(function (json) { return normalize(json); })
        .catch(function () { return fetch(FALLBACK, { cache: 'no-store' }).then(function (r) { return r.json(); }).then(normalize).catch(function () { return []; }); })
        .then(function (tracks) {
          if (!tracks.length) {
            applyTrack(savedUrl ? { url: savedUrl, title: '背景音乐', uploader: 'Burger Chat' } : DEFAULT_TRACK);
            if (!userPaused) tryPlay();
            return;
          }
          var match = null;
          if (savedUrl) {
            for (var i = 0; i < tracks.length; i++) if (tracks[i].url === savedUrl) { match = tracks[i]; break; }
          }
          if (!match && savedUrl) match = { url: savedUrl, title: '背景音乐', uploader: 'Burger Chat' };
          if (!match) match = tracks[tracks.length - 1];
          applyTrack(match);
          if (!userPaused) tryPlay();
        });
    }

    playBtn.addEventListener('click', function () {
      if (!playable(current)) return;
      if (audio.paused) {
        userPaused = false;
        write(PAUSE_KEY, '0');
        tryPlay();
      } else {
        userPaused = true;
        write(PAUSE_KEY, '1');
        audio.pause();
      }
    });

    audio.addEventListener('play', function () { userPaused = false; write(PAUSE_KEY, '0'); setPlaying(true); });
    audio.addEventListener('pause', function () {
      setPlaying(false);
      if (audio.readyState === 0) return;
      userPaused = true;
      write(PAUSE_KEY, '1');
      saveProgress(true);
    });
    audio.addEventListener('loadedmetadata', function () { if (!started) { restoreTime(); started = true; } paintProgress(); });
    audio.addEventListener('timeupdate', function () { paintProgress(); saveProgress(false); });
    audio.addEventListener('durationchange', paintProgress);
    audio.addEventListener('ended', function () {
      try { audio.currentTime = 0; audio.play().catch(function () {}); } catch (e) {}
    });
    window.addEventListener('pagehide', function () { saveProgress(true); });
    document.addEventListener('visibilitychange', function () { if (document.hidden) saveProgress(true); });

    card.classList.add('is-loading');
    applyTrack(DEFAULT_TRACK);
    if (!userPaused) tryPlay();
    setPlaying(false);
    loadManifest(bootSaved);
  }
})();
