(() => {
  'use strict';

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hasFinePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  /* ---------- preloader ---------- */
  const preloader = document.getElementById('preloader');
  const finishLoad = () => {
    document.body.classList.remove('is-loading');
    document.body.classList.add('is-entered');
    if (preloader) preloader.classList.add('is-done');
  };
  if (preloader) {
    const minDelay = reduceMotion ? 0 : 900;
    const start = Date.now();
    window.addEventListener('load', () => {
      const elapsed = Date.now() - start;
      setTimeout(finishLoad, Math.max(0, minDelay - elapsed));
    });
    setTimeout(finishLoad, 3500);
  }

  /* ---------- footer year ---------- */
  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* ---------- nav scroll state ---------- */
  const nav = document.getElementById('nav');
  const onScroll = () => {
    if (!nav) return;
    if (window.scrollY > 20) nav.classList.add('is-scrolled');
    else nav.classList.remove('is-scrolled');
  };
  document.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---------- mobile nav ---------- */
  const navToggle = document.getElementById('navToggle');
  const navMobile = document.getElementById('navMobile');
  if (navToggle) {
    navToggle.addEventListener('click', () => {
      document.body.classList.toggle('nav-open');
    });
    if (navMobile) {
      navMobile.querySelectorAll('a').forEach(a => {
        a.addEventListener('click', () => document.body.classList.remove('nav-open'));
      });
    }
  }

  /* ---------- page transition between pages ---------- */
  document.querySelectorAll('a[href$=".html"], a[href*=".html#"]').forEach(a => {
    const url = new URL(a.href, location.href);
    if (url.origin !== location.origin) return;
    a.addEventListener('click', (e) => {
      if (e.metaKey || e.ctrlKey || e.shiftKey || a.target === '_blank') return;
      if (url.pathname === location.pathname && url.hash) return; // same-page anchor
      e.preventDefault();
      document.body.classList.add('is-leaving');
      setTimeout(() => { location.href = a.href; }, reduceMotion ? 0 : 380);
    });
  });

  /* ---------- init that needs the dynamic content already rendered ---------- */
  function init() {
    /* active section nav link */
    const navLinks = document.querySelectorAll('[data-navlink]');
    if (navLinks.length) {
      const sections = Array.from(navLinks)
        .map(a => document.querySelector(a.getAttribute('href')))
        .filter(Boolean);
      const linkObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          const id = '#' + entry.target.id;
          const link = document.querySelector(`[data-navlink][href="${id}"]`);
          if (!link) return;
          if (entry.isIntersecting) {
            navLinks.forEach(l => l.classList.remove('is-active'));
            link.classList.add('is-active');
          }
        });
      }, { rootMargin: '-45% 0px -45% 0px' });
      sections.forEach(s => linkObserver.observe(s));
    }

    /* custom cursor */
    const cursor = document.getElementById('cursor');
    if (cursor && hasFinePointer) {
      let mx = 0, my = 0, cx = 0, cy = 0;
      document.addEventListener('mousemove', (e) => {
        mx = e.clientX; my = e.clientY;
        cursor.classList.add('is-active');
      });
      const lerp = (a, b, n) => a + (b - a) * n;
      const tick = () => {
        cx = reduceMotion ? mx : lerp(cx, mx, 0.18);
        cy = reduceMotion ? my : lerp(cy, my, 0.18);
        cursor.style.transform = `translate(${cx}px, ${cy}px) translate(-50%, -50%)`;
        requestAnimationFrame(tick);
      };
      tick();

      document.querySelectorAll('.frame__visual').forEach(el => {
        el.addEventListener('mouseenter', () => {
          cursor.classList.add('is-view');
          cursor.querySelector('span').textContent = 'VIEW';
        });
        el.addEventListener('mouseleave', () => cursor.classList.remove('is-view'));
      });
      document.querySelectorAll('a, button, .founder-card').forEach(el => {
        el.addEventListener('mouseenter', () => cursor.classList.add('is-link'));
        el.addEventListener('mouseleave', () => cursor.classList.remove('is-link'));
      });
    } else if (cursor) {
      cursor.style.display = 'none';
    }

    /* scroll reveal (elements + section dividers) */
    const revealEls = document.querySelectorAll('[data-reveal], [data-reveal-line]');
    if (revealEls.length) {
      const revealObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry, i) => {
          if (entry.isIntersecting) {
            entry.target.style.setProperty('--d', (i % 4) * 0.08 + 's');
            entry.target.classList.add('is-visible');
            revealObserver.unobserve(entry.target);
          }
        });
      }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
      revealEls.forEach(el => revealObserver.observe(el));
    }

    /* parallax on gallery frames */
    const visuals = document.querySelectorAll('.frame__visual-inner');
    if (visuals.length && !reduceMotion) {
      let ticking = false;
      const update = () => {
        const vh = window.innerHeight;
        visuals.forEach(v => {
          const rect = v.parentElement.getBoundingClientRect();
          const center = rect.top + rect.height / 2;
          const offset = (center - vh / 2) / vh;
          v.style.setProperty('translate', `0 ${offset * -22}px`);
        });
        ticking = false;
      };
      document.addEventListener('scroll', () => {
        if (!ticking) {
          requestAnimationFrame(update);
          ticking = true;
        }
      }, { passive: true });
      update();
    }

    /* FAQ accordion (event delegation — survives re-renders) */
    const faqRoot = document.querySelector('[data-faq-list]');
    if (faqRoot) {
      faqRoot.addEventListener('click', (e) => {
        const btn = e.target.closest('.faq-item__q');
        if (!btn) return;
        const item = btn.closest('.faq-item');
        const isOpen = item.classList.contains('is-open');
        faqRoot.querySelectorAll('.faq-item').forEach(other => {
          other.classList.remove('is-open');
          other.querySelector('.faq-item__q').setAttribute('aria-expanded', 'false');
        });
        if (!isOpen) {
          item.classList.add('is-open');
          btn.setAttribute('aria-expanded', 'true');
        }
      });
    }
  }

  if (document.querySelector('script[src*="render.js"]')) {
    // render.js may dispatch this twice — once with local/cached content so
    // there's no blank flash, again if a shared backend upgrades the content.
    // init() re-querying and re-observing each time is cheap and idempotent
    // enough (the dynamic sections are always freshly rebuilt DOM nodes).
    document.addEventListener('oe:rendered', init);
  } else {
    document.addEventListener('DOMContentLoaded', init);
  }

  /* ---------- contact form ---------- */
  document.addEventListener('DOMContentLoaded', () => {
    const contactForm = document.getElementById('contactForm');
    if (!contactForm) return;
    const status = document.getElementById('formStatus');
    contactForm.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!contactForm.checkValidity()) {
        contactForm.reportValidity();
        return;
      }
      const btn = contactForm.querySelector('button[type="submit"]');
      const original = btn.innerHTML;
      btn.innerHTML = 'Sending…';
      btn.disabled = true;
      setTimeout(() => {
        btn.innerHTML = original;
        btn.disabled = false;
        status.classList.add('is-visible');
        contactForm.reset();
        setTimeout(() => status.classList.remove('is-visible'), 5000);
      }, 700);
    });
  });

})();
