/* Burger site theme — pink by default, colour / font / blur customisable. */
(function () {
  var KEY = "bcTheme.v1";
  var PRESETS = {
    pink: { name: "粉红", accent: "#ff6f9f", accent2: "#ffc4dc" },
    orange: { name: "暖橙", accent: "#ff7a45", accent2: "#ffc46b" },
    blue: { name: "海蓝", accent: "#5ca8ff", accent2: "#9fe7ff" },
    mint: { name: "薄荷", accent: "#45d6a8", accent2: "#b9ffe4" },
    violet: { name: "紫罗兰", accent: "#b27cff", accent2: "#e0c7ff" },
  };
  var DEFAULT = { preset: "pink", accent: PRESETS.pink.accent, accent2: PRESETS.pink.accent2, ink: "#fff3f8", blur: 14 };

  function hexToRgb(hex) {
    var value = String(hex || "").replace("#", "");
    if (value.length === 3) value = value.split("").map(function (c) { return c + c; }).join("");
    var match = /^([0-9a-f]{6})$/i.exec(value);
    if (!match) return { r: 255, g: 111, b: 159 };
    return {
      r: parseInt(match[1].slice(0, 2), 16),
      g: parseInt(match[1].slice(2, 4), 16),
      b: parseInt(match[1].slice(4, 6), 16),
    };
  }
  function rgba(hex, alpha) {
    var c = hexToRgb(hex);
    return "rgba(" + c.r + "," + c.g + "," + c.b + "," + alpha + ")";
  }
  function readTheme() {
    try {
      var raw = localStorage.getItem(KEY);
      if (!raw) return Object.assign({}, DEFAULT);
      var data = JSON.parse(raw);
      if (!data || typeof data !== "object") return Object.assign({}, DEFAULT);
      var preset = PRESETS[data.preset] ? data.preset : "pink";
      return {
        preset: preset,
        accent: /^#[0-9a-f]{6}$/i.test(data.accent || "") ? data.accent : PRESETS[preset].accent,
        accent2: /^#[0-9a-f]{6}$/i.test(data.accent2 || "") ? data.accent2 : PRESETS[preset].accent2,
        ink: /^#[0-9a-f]{6}$/i.test(data.ink || "") ? data.ink : DEFAULT.ink,
        blur: (function () { var n = Number(data.blur); return Number.isFinite(n) ? Math.max(0, Math.min(32, n)) : DEFAULT.blur; })(),
      };
    } catch (error) {
      return Object.assign({}, DEFAULT);
    }
  }
  function saveTheme(theme) {
    try { localStorage.setItem(KEY, JSON.stringify(theme)); } catch (error) {}
  }
  function applyTheme(theme) {
    var t = Object.assign({}, DEFAULT, theme || {});
    var root = document.documentElement;
    var body = document.body || root;
    var c = hexToRgb(t.accent);
    var accent2 = t.accent2 || t.accent;
    var vars = {
      "--accent": t.accent,
      "--accent-2": accent2,
      "--accent-3": accent2,
      "--ink": t.ink,
      "--cream": t.ink,
      "--muted": rgba(t.ink, .68),
      "--faint": rgba(t.ink, .44),
      "--brand": t.accent,
      "--brand-2": accent2,
      "--acid": accent2,
      "--wall-tint": c.r + "," + c.g + "," + c.b,
      "--glow": "0 0 45px " + rgba(t.accent, .2),
      "--bar-blur": Number(t.blur) + "px",
      "--site-blur": Number(t.blur) + "px",
    };
    Object.keys(vars).forEach(function (key) {
      root.style.setProperty(key, vars[key]);
      body.style.setProperty(key, vars[key]);
    });
    root.setAttribute("data-theme", t.preset || "pink");
    if (body !== root) body.setAttribute("data-theme", t.preset || "pink");
    updateControls(t);
  }
  function updateControls(theme) {
    document.querySelectorAll("[data-theme-preset]").forEach(function (button) {
      var on = button.getAttribute("data-theme-preset") === theme.preset;
      button.classList.toggle("is-on", on);
      button.setAttribute("aria-pressed", on ? "true" : "false");
    });
    var ink = document.getElementById("tmInkColor");
    if (ink) ink.value = theme.ink;
    var blur = document.getElementById("tmBlur");
    if (blur) blur.value = String(theme.blur);
    var label = document.getElementById("tmBlurVal");
    if (label) label.textContent = theme.blur + "px";
    document.querySelectorAll("[data-theme-swatch]").forEach(function (dot) {
      var chip = dot.querySelector("i") || dot;
      chip.style.background = dot.getAttribute("data-theme-swatch");
    });
  }
  function setTheme(patch) {
    var current = readTheme();
    var next = Object.assign({}, current, patch || {});
    if (patch && patch.preset && PRESETS[patch.preset]) {
      next.accent = PRESETS[patch.preset].accent;
      next.accent2 = PRESETS[patch.preset].accent2;
    }
    saveTheme(next);
    applyTheme(next);
    return next;
  }
  function bind() {
    var theme = readTheme();
    applyTheme(theme);
    document.querySelectorAll("[data-theme-preset]").forEach(function (button) {
      button.addEventListener("click", function () {
        setTheme({ preset: button.getAttribute("data-theme-preset") });
      });
    });
    var ink = document.getElementById("tmInkColor");
    if (ink) ink.addEventListener("input", function () { setTheme({ ink: ink.value }); });
    var blur = document.getElementById("tmBlur");
    if (blur) blur.addEventListener("input", function () { setTheme({ blur: Number(blur.value) }); });
    var reset = document.getElementById("tmThemeReset");
    if (reset) reset.addEventListener("click", function () { setTheme(Object.assign({}, DEFAULT)); });
  }
  window.BCTheme = {
    presets: PRESETS,
    get: readTheme,
    set: setTheme,
    reset: function () { return setTheme(Object.assign({}, DEFAULT)); },
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", bind);
  else bind();
})();
