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
    { en: 'Beijing',   zh: '北京',   fx: 0.8315, fy: 0.3360, accent: 'gold' },
    { en: 'London',    zh: '伦敦',   fx: 0.4837, fy: 0.2593, accent: 'gold' },
    { en: 'Jakarta',   zh: '雅加达', fx: 0.8134, fy: 0.5547, accent: 'gold' },
    /* blue = secondary ties */
    { en: 'Guangzhou', zh: '广州',   fx: 0.8427, fy: 0.4070, accent: 'blue' },
    { en: 'Shenzhen',  zh: '深圳',   fx: 0.8326, fy: 0.4464, accent: 'blue' },
    { en: 'Singapore', zh: '新加坡', fx: 0.7914, fy: 0.5051, accent: 'blue' },
    { en: 'Sydney',    zh: '悉尼',   fx: 0.9639, fy: 0.7407, accent: 'blue' }
  ];
  /* Node fx/fy are pixel fractions measured directly from hero-cover.jpg's
     own city-glow dots (not real geographic lon/lat) so the live canvas
     overlay lands exactly on the backdrop art regardless of viewport size. */
  var ARCS = [
    [0, 1],   // Beijing - London
    [0, 6],   // Beijing - Sydney
    [3, 5],   // Guangzhou - Singapore
    [3, 2]    // Guangzhou - Jakarta
  ];

  var canvas = document.getElementById('netCanvas');
  if (canvas) {
    var ctx = canvas.getContext('2d');
    var W = 0, H = 0, dpr = 1, rafId = null, running = false;
    var particles = [];
    var IMG_W = 1774, IMG_H = 887;
    var HERO_POS_X = 0.30; // must match .hero-bg's background-position-x (30%)

    function project(fx, fy) {
      /* Replicates CSS background-size:cover; background-position:30% center
         for hero-cover.jpg, so canvas points track the backdrop image exactly. */
      var scale = Math.max(W / IMG_W, H / IMG_H);
      var scaledW = IMG_W * scale, scaledH = IMG_H * scale;
      var offsetX = (W - scaledW) * HERO_POS_X;
      var offsetY = (H - scaledH) / 2;
      return [offsetX + fx * scaledW, offsetY + fy * scaledH];
    }
    function arcPath(a, b) {
      var p1 = project(a.fx, a.fy), p2 = project(b.fx, b.fy);
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
    function rebuild() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = canvas.clientWidth; H = canvas.clientHeight;
      canvas.width = W * dpr; canvas.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      geos = ARCS.map(function (pr) { return arcPath(NODES[pr[0]], NODES[pr[1]]); });
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
      positionHeroHits();
    }

    /* CTA hit-areas: positioned (not drawn) to sit exactly over the
       "进入研究"/"下载简历" buttons baked into hero-cover.jpg, measured
       directly from the image in the same fx/fy pixel-fraction space as
       the canvas nodes, via the same cover-fit project(). */
    var BUTTONS = {
      heroCtaResearch: { fx0: 0.1437, fy0: 0.7621, fx1: 0.2649, fy1: 0.8343 },
      heroCtaCV:       { fx0: 0.2847, fy0: 0.7621, fx1: 0.4071, fy1: 0.8343 }
    };
    function positionHeroHits() {
      Object.keys(BUTTONS).forEach(function (id) {
        var el = document.getElementById(id);
        if (!el) return;
        var b = BUTTONS[id];
        var p1 = project(b.fx0, b.fy0), p2 = project(b.fx1, b.fy1);
        el.style.left = p1[0] + 'px';
        el.style.top = p1[1] + 'px';
        el.style.width = (p2[0] - p1[0]) + 'px';
        el.style.height = (p2[1] - p1[1]) + 'px';
      });
    }

    function drawFrame(time) {
      ctx.clearRect(0, 0, W, H);
      var lang = currentLang();

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
        var p = project(c.fx, c.fy);
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
           (Chinese, drawn beside each dot) — nothing masks the backdrop
           anymore, so the baked label always shows. In EN mode we add our
           own English label below the dot, clear of the baked Chinese
           text beside it. */
        if (lang === 'en') {
          ctx.font = '600 10px Archivo, "Noto Sans SC", sans-serif';
          ctx.fillStyle = isGold ? 'rgba(247,214,140,.9)' : 'rgba(243,239,222,.55)';
          ctx.textAlign = 'center';
          ctx.fillText(c.en.toUpperCase(), p[0], p[1] + 17);
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
