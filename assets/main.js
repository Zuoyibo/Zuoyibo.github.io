/* ═══════════════════════════════════════════════════════
   Yibo Zuo 左毅博 · homepage interactions
   ═══════════════════════════════════════════════════════ */
(function () {
  'use strict';

  /* ── 1. Language toggle ─────────────────────────────── */
  var langBtn = document.getElementById('langToggle');
  function currentLang() { return document.body.dataset.lang === 'zh' ? 'zh' : 'en'; }
  function setLang(lang) {
    document.body.dataset.lang = lang;
    document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en';
    langBtn.textContent = lang === 'zh' ? 'EN' : '中文';
    try { localStorage.setItem('yz-lang', lang); } catch (e) {}
  }
  (function initLang() {
    var saved = null;
    try { saved = localStorage.getItem('yz-lang'); } catch (e) {}
    var lang = saved || 'zh';
    setLang(lang);
  })();
  langBtn.addEventListener('click', function () {
    setLang(currentLang() === 'zh' ? 'en' : 'zh');
  });

  /* ── 2. Nav: scrolled state + active section ────────── */
  var nav = document.getElementById('nav');
  function onScroll() { nav.classList.toggle('scrolled', window.scrollY > 40); }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  var navLinks = Array.prototype.slice.call(document.querySelectorAll('.nav-links a'));
  var secObserver = new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      if (!en.isIntersecting) return;
      var id = '#' + en.target.id;
      navLinks.forEach(function (a) { a.classList.toggle('active', a.getAttribute('href') === id); });
    });
  }, { rootMargin: '-40% 0px -55% 0px' });
  document.querySelectorAll('section[id]').forEach(function (s) { secObserver.observe(s); });

  /* ── 3. Reveal on scroll (staggered) ────────────────── */
  var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var revealObserver = new IntersectionObserver(function (entries) {
    var batch = entries.filter(function (e) { return e.isIntersecting; });
    batch.forEach(function (en, i) {
      en.target.style.transitionDelay = reducedMotion ? '0ms' : (i * 70) + 'ms';
      en.target.classList.add('in');
      revealObserver.unobserve(en.target);
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -6% 0px' });
  document.querySelectorAll('.reveal').forEach(function (el) { revealObserver.observe(el); });

  /* Safety net: if IntersectionObserver is unsupported or a
     section is somehow never observed as intersecting, force
     every .reveal visible after a short delay so content can
     never get stuck hidden. */
  setTimeout(function () {
    document.querySelectorAll('.reveal:not(.in)').forEach(function (el) { el.classList.add('in'); });
  }, 2500);

  /* ── 4. Hero canvas: global research network ────────── */
  var NODES = [
    /* gold = emphasized hubs (home base + flagship ties) */
    { en: 'Beijing',   zh: '北京',   lon: 116.40, lat: 39.90, accent: 'gold', lab: { a: 'start', dx: 9, dy: -9 } },
    { en: 'London',    zh: '伦敦',   lon: -0.13,  lat: 51.51, accent: 'gold', lab: { a: 'end', dx: -9, dy: -9 } },
    { en: 'Jakarta',   zh: '雅加达', lon: 106.85, lat: -6.21, accent: 'gold', lab: { a: 'start', dx: 8, dy: 4 } },
    /* blue = secondary ties */
    { en: 'Guangzhou', zh: '广州',   lon: 113.26, lat: 23.13, accent: 'blue', lab: { a: 'start', dx: 8, dy: 4 } },
    { en: 'Shenzhen',  zh: '深圳',   lon: 114.06, lat: 22.54, accent: 'blue', lab: { a: 'start', dx: 8, dy: 16 } },
    { en: 'San Francisco',  zh: '旧金山', lon: -122.42, lat: 37.77, accent: 'blue', lab: { hide: true } },
    { en: 'Washington, DC', zh: '华盛顿', lon: -77.04, lat: 38.91,  accent: 'blue', lab: { hide: true } },
    { en: 'Singapore', zh: '新加坡', lon: 103.82, lat: 1.35,   accent: 'blue', lab: { a: 'start', dx: 7, dy: -9 } },
    { en: 'Sydney',    zh: '悉尼',   lon: 151.21, lat: -33.87, accent: 'blue', lab: { a: 'start', dx: 7, dy: 14 } }
  ];
  var ARCS = [
    [3, 7], [3, 2], [3, 8],   // Guangzhou: diaspora & firm-internationalization routes
    [0, 6], [0, 1],           // Beijing: industrial-policy research ties
    [4, 5]                    // Shenzhen: AI / innovation tie to the Bay Area
  ];

  var canvas = document.getElementById('netCanvas');
  if (canvas && window.MAP_DOTS) {
    var ctx = canvas.getContext('2d');
    var W = 0, H = 0, dpr = 1, rafId = null, running = false;
    var particles = [];

    function project(lon, lat) {
      var mx = W * 0.05, my = H * 0.1;
      return [
        mx + (lon + 180) / 360 * (W - 2 * mx),
        my + (90 - lat) / 180 * (H - 2 * my)
      ];
    }
    function arcPath(a, b) {
      var p1 = project(a.lon, a.lat), p2 = project(b.lon, b.lat);
      var dx = p2[0] - p1[0], dy = p2[1] - p1[1];
      var dist = Math.sqrt(dx * dx + dy * dy);
      var lift = Math.min(dist * 0.26, H * 0.16) + 12;
      return { p1: p1, p2: p2, cx: (p1[0] + p2[0]) / 2, cy: (p1[1] + p2[1]) / 2 - lift, len: dist };
    }
    function bez(g, t) {
      var u = 1 - t;
      return [
        u * u * g.p1[0] + 2 * u * t * g.cx + t * t * g.p2[0],
        u * u * g.p1[1] + 2 * u * t * g.cy + t * t * g.p2[1]
      ];
    }

    var geos = [];
    var dotVariants = [];
    function rebuild() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = canvas.clientWidth; H = canvas.clientHeight;
      canvas.width = W * dpr; canvas.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      geos = ARCS.map(function (pr) { return arcPath(NODES[pr[0]], NODES[pr[1]]); });
      if (!dotVariants.length) {
        var dots0 = window.MAP_DOTS;
        for (var v = 0; v < dots0.length; v++) {
          /* deterministic pseudo-random city-light texture: varies size/brightness per dot */
          var h = Math.sin(v * 12.9898) * 43758.5453; h -= Math.floor(h);
          dotVariants.push(h);
        }
      }
      particles = [];
      ARCS.forEach(function (pr, i) {
        var n = geos[i].len > 420 ? 2 : 1;
        for (var k = 0; k < n; k++) {
          particles.push({
            g: i,
            t: Math.random(),
            speed: (0.0017 + Math.random() * 0.0011) * (420 / Math.max(geos[i].len, 220)),
            trail: []
          });
        }
      });
    }

    function drawFrame(time) {
      ctx.clearRect(0, 0, W, H);
      var lang = currentLang();

      var dots = window.MAP_DOTS;
      for (var i = 0; i < dots.length; i++) {
        var p = project(dots[i][0], dots[i][1]);
        var v = dotVariants[i] || 0;
        var sz = 1.1 + v * 1.5;
        ctx.fillStyle = 'rgba(232,178,58,' + (0.1 + v * 0.3).toFixed(3) + ')';
        ctx.fillRect(p[0], p[1], sz, sz);
      }
      if (time) {
        ctx.fillStyle = 'rgba(247,214,140,.55)';
        for (var s = 0; s < dots.length; s += 29) {
          var ph = (time * 0.00032 + s) % 1;
          var a = Math.sin(ph * Math.PI);
          if (a <= 0.05) continue;
          ctx.globalAlpha = a * 0.65;
          var q = project(dots[s][0], dots[s][1]);
          ctx.fillRect(q[0], q[1], 2, 2);
        }
        ctx.globalAlpha = 1;
      }

      ctx.save();
      ctx.strokeStyle = 'rgba(232,178,58,.4)';
      ctx.lineWidth = 1.3;
      ctx.shadowColor = 'rgba(232,178,58,.5)';
      ctx.shadowBlur = 4;
      geos.forEach(function (g) {
        ctx.beginPath();
        ctx.moveTo(g.p1[0], g.p1[1]);
        ctx.quadraticCurveTo(g.cx, g.cy, g.p2[0], g.p2[1]);
        ctx.stroke();
      });
      ctx.restore();

      particles.forEach(function (pt) {
        var g = geos[pt.g];
        pt.t += pt.speed;
        if (pt.t > 1) { pt.t = 0; pt.trail.length = 0; }
        var pos = bez(g, pt.t);
        pt.trail.push(pos);
        if (pt.trail.length > 14) pt.trail.shift();
        for (var j = 0; j < pt.trail.length; j++) {
          var al = (j / pt.trail.length) * 0.45;
          ctx.fillStyle = 'rgba(93,211,255,' + al.toFixed(3) + ')';
          ctx.beginPath();
          ctx.arc(pt.trail[j][0], pt.trail[j][1], 1.3, 0, 6.2832);
          ctx.fill();
        }
        ctx.save();
        ctx.shadowColor = 'rgba(93,211,255,.9)';
        ctx.shadowBlur = 7;
        ctx.fillStyle = '#5DD3FF';
        ctx.beginPath();
        ctx.arc(pos[0], pos[1], 2, 0, 6.2832);
        ctx.fill();
        ctx.restore();
      });

      NODES.forEach(function (c) {
        var p = project(c.lon, c.lat);
        var isGold = c.accent === 'gold';
        ctx.save();
        ctx.shadowColor = isGold ? 'rgba(232,178,58,.95)' : 'rgba(93,211,255,.85)';
        ctx.shadowBlur = isGold ? 11 : 7;
        ctx.fillStyle = isGold ? '#E8B23A' : '#5DD3FF';
        ctx.beginPath();
        ctx.arc(p[0], p[1], isGold ? 3.4 : 2.4, 0, 6.2832);
        ctx.fill();
        ctx.restore();
        /* City-name labels are baked into the hero-cover.jpg backdrop
           (Chinese). Only draw our own (English) label in EN mode, so the
           default Chinese view stays clean with no duplicate text. */
        var lc = c.lab || {};
        if (!lc.hide && lang === 'en') {
          ctx.font = '600 10px Archivo, "Noto Sans SC", sans-serif';
          ctx.fillStyle = isGold ? 'rgba(247,214,140,.9)' : 'rgba(243,239,222,.55)';
          ctx.textAlign = lc.a || 'start';
          ctx.fillText(c.en.toUpperCase(), p[0] + (lc.dx != null ? lc.dx : 7), p[1] + (lc.dy != null ? lc.dy : 3));
          ctx.textAlign = 'start';
        }
      });
    }

    function loop(time) {
      drawFrame(time);
      rafId = running ? requestAnimationFrame(loop) : null;
    }
    function start() { if (!running && !reducedMotion) { running = true; rafId = requestAnimationFrame(loop); } }
    function stop() { running = false; if (rafId) cancelAnimationFrame(rafId); rafId = null; }

    rebuild();
    if (reducedMotion) { drawFrame(0); } else { start(); }

    var resizeT;
    window.addEventListener('resize', function () {
      clearTimeout(resizeT);
      resizeT = setTimeout(function () { rebuild(); if (reducedMotion) drawFrame(0); }, 200);
    });
    new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (reducedMotion) return;
        if (en.isIntersecting) start(); else stop();
      });
    }).observe(canvas);
    document.addEventListener('visibilitychange', function () {
      if (reducedMotion) return;
      if (document.hidden) stop(); else start();
    });
  }
})();
