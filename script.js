(function () {
  "use strict";

  // ---------- Countdown ----------
  var launchEl = document.querySelector("[data-launch]");
  var launchDate = launchEl ? new Date(launchEl.getAttribute("data-launch")).getTime() : 0;

  var els = {
    d: document.getElementById("d"),
    h: document.getElementById("h"),
    m: document.getElementById("m"),
    s: document.getElementById("s"),
  };
  var statusEl = document.getElementById("status");

  function pad(n) {
    return String(n).padStart(2, "0");
  }

  function tick() {
    var diff = launchDate - Date.now();
    if (diff <= 0) {
      els.d.textContent = els.h.textContent = els.m.textContent = els.s.textContent = "00";
      if (statusEl) statusEl.textContent = "We're launching — stay tuned!";
      return;
    }
    var d = Math.floor(diff / 86400000); diff -= d * 86400000;
    var h = Math.floor(diff / 3600000); diff -= h * 3600000;
    var m = Math.floor(diff / 60000); diff -= m * 60000;
    var s = Math.floor(diff / 1000);
    els.d.textContent = pad(d);
    els.h.textContent = pad(h);
    els.m.textContent = pad(m);
    els.s.textContent = pad(s);
  }
  tick();
  setInterval(tick, 1000);

  // ---------- Subtle sound (Web Audio API, no files needed) ----------
  var SOUND_KEY = "leo-launch-muted";
  var muted = localStorage.getItem(SOUND_KEY) === "1";
  var ctx = null;
  var interacted = false;
  var toggleBtn = document.getElementById("sound-toggle");

  function updateToggleIcon() {
    if (!toggleBtn) return;
    toggleBtn.textContent = muted ? "🔇" : "🔈";
    toggleBtn.setAttribute("aria-pressed", String(!muted));
  }
  updateToggleIcon();

  function ensureCtx() {
    if (!ctx) {
      var AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return null;
      ctx = new AudioCtx();
    }
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  }

  function playTone(freq, duration, type, gainPeak, delay) {
    if (muted) return;
    var audio = ensureCtx();
    if (!audio) return;
    var t0 = audio.currentTime + (delay || 0);
    var osc = audio.createOscillator();
    var gain = audio.createGain();
    osc.type = type || "sine";
    osc.frequency.setValueAtTime(freq, t0);
    gain.gain.setValueAtTime(0, t0);
    gain.gain.linearRampToValueAtTime(gainPeak || 0.04, t0 + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
    osc.connect(gain).connect(audio.destination);
    osc.start(t0);
    osc.stop(t0 + duration + 0.03);
  }

  function playHover() { playTone(880, 0.12, "sine", 0.03); }
  function playClick() { playTone(1318.5, 0.09, "triangle", 0.045); }
  function playWelcomeChime() {
    playTone(523.25, 0.25, "sine", 0.035, 0);
    playTone(659.25, 0.25, "sine", 0.035, 0.12);
    playTone(783.99, 0.35, "sine", 0.035, 0.24);
  }

  function firstInteraction() {
    if (interacted) return;
    interacted = true;
    ensureCtx();
    if (!muted) playWelcomeChime();
  }
  window.addEventListener("pointerdown", firstInteraction, { once: true });
  window.addEventListener("keydown", firstInteraction, { once: true });

  if (toggleBtn) {
    toggleBtn.addEventListener("click", function (e) {
      e.stopPropagation();
      muted = !muted;
      localStorage.setItem(SOUND_KEY, muted ? "1" : "0");
      updateToggleIcon();
      if (!muted) {
        ensureCtx();
        playTone(1046.5, 0.15, "sine", 0.05);
      }
    });
  }

  document.querySelectorAll(".hoverable").forEach(function (el) {
    el.addEventListener("mouseenter", function () {
      if (interacted) playHover();
    });
    el.addEventListener("click", function () {
      if (interacted) playClick();
    });
  });

  // ---------- Soft drifting particle background ----------
  var canvas = document.getElementById("bg");
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (canvas && canvas.getContext) {
    var g = canvas.getContext("2d");
    var particles = [];
    var accentRgb = getComputedStyle(document.documentElement)
      .getPropertyValue("--accent-rgb")
      .trim() || "255,255,255";

    function resize() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }

    function initParticles() {
      var count = Math.min(70, Math.floor((canvas.width * canvas.height) / 20000));
      particles = [];
      for (var i = 0; i < count; i++) {
        particles.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          r: Math.random() * 1.6 + 0.4,
          vy: Math.random() * 0.15 + 0.03,
          a: Math.random() * 0.5 + 0.15,
        });
      }
    }

    window.addEventListener("resize", function () {
      resize();
      initParticles();
    });
    resize();
    initParticles();

    function draw() {
      g.clearRect(0, 0, canvas.width, canvas.height);
      for (var i = 0; i < particles.length; i++) {
        var p = particles[i];
        g.beginPath();
        g.fillStyle = "rgba(" + accentRgb + "," + p.a + ")";
        g.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        g.fill();
        p.y -= p.vy;
        if (p.y < -5) {
          p.y = canvas.height + 5;
          p.x = Math.random() * canvas.width;
        }
      }
      if (!reduceMotion) requestAnimationFrame(draw);
    }

    if (!reduceMotion) {
      requestAnimationFrame(draw);
    } else {
      draw();
    }
  }
})();
