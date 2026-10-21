(function () {
  "use strict";

  // ---------- Subtle sound (Web Audio API, no files needed) ----------
  var SOUND_KEY = "leo-launch-muted";
  var muted = localStorage.getItem(SOUND_KEY) === "1";
  var ctx = null;
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
  window.addEventListener("pointerdown", ensureCtx, { once: true });
  window.addEventListener("keydown", ensureCtx, { once: true });

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
  function playTick(n) {
    var freq = 420 + (10 - n) * 35;
    playTone(freq, 0.13, "square", 0.045);
  }
  function playLiftoff() {
    playTone(180, 0.6, "sawtooth", 0.05, 0);
    playTone(360, 0.5, "sine", 0.04, 0.08);
    playTone(720, 0.6, "sine", 0.035, 0.18);
    playTone(1440, 0.8, "sine", 0.025, 0.32);
  }

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
    el.addEventListener("mouseenter", function () { playHover(); });
    el.addEventListener("click", function () { playClick(); });
  });

  // ---------- Launch sequence ----------
  var landing = document.getElementById("landing");
  var countdownScreen = document.getElementById("countdown-screen");
  var doneScreen = document.getElementById("done-screen");
  var countEl = document.getElementById("count-number");
  var doneMessage = document.getElementById("done-message");
  var launchBtn = document.getElementById("launch-btn");
  var targetUrl = (document.body.getAttribute("data-target-url") || "").trim();

  function showScreen(target) {
    [landing, countdownScreen, doneScreen].forEach(function (s) {
      if (s) s.classList.add("hidden");
    });
    if (target) target.classList.remove("hidden");
  }

  function bump(el) {
    el.classList.remove("bump");
    void el.offsetWidth;
    el.classList.add("bump");
  }

  function startCountdown() {
    showScreen(countdownScreen);
    var n = 10;
    countEl.textContent = String(n);
    playTick(n);
    var timer = setInterval(function () {
      n--;
      if (n > 0) {
        countEl.textContent = String(n);
        playTick(n);
        bump(countEl);
      } else {
        clearInterval(timer);
        liftoff();
      }
    }, 1000);
  }

  function liftoff() {
    playLiftoff();
    countEl.textContent = "🚀";
    bump(countEl);
    setTimeout(function () {
      showScreen(doneScreen);
      if (targetUrl) {
        doneMessage.textContent = "Taking off…";
        setTimeout(function () {
          window.location.href = targetUrl;
        }, 1000);
      } else {
        doneMessage.textContent = "We're almost ready — the full site isn't live yet. Please check back soon!";
      }
    }, 500);
  }

  if (launchBtn) {
    launchBtn.addEventListener("click", function () {
      ensureCtx();
      startCountdown();
    });
  }

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
