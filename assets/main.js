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
})();
