/* Outlaw East — renders content.js data into the page,
   handles the light/dark theme toggle, and prepares a
   transparent-background version of the stamp logo. */

(() => {
  'use strict';

  let content = window.OEContent.defaults;

  /* ---------- theme ---------- */
  const THEME_KEY = window.OEContent.THEME_KEY;
  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
  }
  function initTheme() {
    let theme = localStorage.getItem(THEME_KEY);
    if (!theme) {
      theme = window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
    }
    applyTheme(theme);
    return theme;
  }
  let currentTheme = initTheme();

  function bindThemeToggle() {
    document.querySelectorAll('[data-theme-toggle]').forEach(btn => {
      btn.setAttribute('aria-label', 'Toggle light / dark mode');
      btn.addEventListener('click', () => {
        currentTheme = currentTheme === 'dark' ? 'light' : 'dark';
        applyTheme(currentTheme);
        localStorage.setItem(THEME_KEY, currentTheme);
      });
    });
  }

  /* ---------- logo: chroma-key the cream backing off the stamp ---------- */
  function prepareLogo() {
    const targets = document.querySelectorAll('[data-logo-mark]');
    if (!targets.length) return;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const px = data.data;
        // sample the backing colour from a top-left corner pixel
        const bgR = px[0], bgG = px[1], bgB = px[2];
        for (let i = 0; i < px.length; i += 4) {
          const dr = px[i] - bgR, dg = px[i + 1] - bgG, db = px[i + 2] - bgB;
          const dist = Math.sqrt(dr * dr + dg * dg + db * db);
          if (dist < 40) px[i + 3] = 0;
          else if (dist < 70) px[i + 3] = Math.round(255 * ((dist - 40) / 30));
        }
        ctx.putImageData(data, 0, 0);
        const url = canvas.toDataURL('image/png');
        targets.forEach(el => { el.src = url; });
      } catch (e) {
        /* canvas may be tainted on file:// in some browsers — fall back to the plain jpg already set as src */
      }
    };
    img.src = targets[0].getAttribute('data-logo-src') || targets[0].src;
  }

  /* ---------- helpers ---------- */
  function el(tag, cls, html) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html !== undefined) e.innerHTML = html;
    return e;
  }

  function avatarStyle(photo) {
    return photo ? `background-image:url('${photo}')` : '';
  }

  /* ---------- site meta ---------- */
  function renderMeta() {
    if (content.site.title) document.title = document.title.includes('Connect')
      ? 'Connect — Outlaw East'
      : content.site.title;
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc && content.site.description) metaDesc.setAttribute('content', content.site.description);
  }

  /* ---------- hero ---------- */
  function renderHero() {
    const loc = document.querySelector('[data-hero-location]');
    const title = document.querySelector('[data-hero-title]');
    const desc = document.querySelector('[data-hero-desc]');
    if (loc) loc.textContent = content.hero.location;
    if (title) title.textContent = `${content.hero.titleMain} ${content.hero.titleEm}`;
    if (desc) desc.textContent = content.hero.desc;
  }

  /* ---------- founders ---------- */
  function renderFounders() {
    const heading = document.querySelector('[data-founders-heading]');
    const note = document.querySelector('[data-founders-note]');
    const grid = document.querySelector('[data-founders-grid]');
    if (heading) heading.innerHTML = content.founders.heading;
    if (note) note.textContent = content.founders.note;
    if (!grid) return;
    grid.innerHTML = '';
    content.founders.people.forEach((p, i) => {
      const card = el('div', 'founder-card', `
        <div class="founder-card__photo${p.photo ? '' : ' is-empty'}" style="${avatarStyle(p.photo)}"></div>
        <h3 class="founder-card__name">${p.name || 'Unnamed'}</h3>
        <p class="founder-card__role">${p.role || 'Founder'}</p>
      `);
      card.setAttribute('data-reveal', '');
      card.style.setProperty('--d', (i % 4) * 0.08 + 's');
      grid.appendChild(card);
    });
  }

  /* ---------- films ---------- */
  function renderFilms() {
    const heading = document.querySelector('[data-films-heading]');
    const note = document.querySelector('[data-films-note]');
    const wrap = document.querySelector('[data-films-list]');
    if (heading) heading.innerHTML = content.films.heading;
    if (note) note.textContent = content.films.note;
    if (!wrap) return;
    wrap.innerHTML = '';
    const total = content.films.list.length;
    content.films.list.forEach((f, i) => {
      const idx = String(i + 1).padStart(2, '0');
      const visualInner = f.image
        ? `background-image:url('${f.image}')`
        : GRADIENTS[i % GRADIENTS.length];
      const article = el('article', 'frame', `
        <div class="frame__visual">
          <div class="frame__visual-inner" style="${visualInner}"></div>
          <div class="frame__vignette"></div>
          <span class="frame__tag">FRAME ${idx} / ${String(total).padStart(2, '0')} — ${f.format || '35MM'}</span>
          <span class="frame__corner c-tl"></span><span class="frame__corner c-tr"></span><span class="frame__corner c-bl"></span><span class="frame__corner c-br"></span>
          ${f.tag ? `<span class="frame__award">${f.tag}</span>` : ''}
        </div>
        <div class="frame__body">
          <span class="frame__index">${idx}</span>
          <p class="frame__film">${f.film}</p>
          <h3 class="frame__title">${f.title}</h3>
          <p class="frame__caption">${f.caption}</p>
        </div>
      `);
      article.setAttribute('data-reveal', '');
      wrap.appendChild(article);
    });
  }
  const GRADIENTS = [
    "background-image: radial-gradient(circle at 30% 20%, #6b4a2a 0%, transparent 55%), radial-gradient(circle at 80% 80%, #3a2418 0%, transparent 60%), linear-gradient(140deg,#c98a3f,#7a3320 55%,#1c130d);",
    "background-image: radial-gradient(circle at 70% 30%, #3d5a3a 0%, transparent 55%), radial-gradient(circle at 20% 80%, #22150f 0%, transparent 60%), linear-gradient(150deg,#6d8a52,#2c3a24 55%,#14100c);",
    "background-image: radial-gradient(circle at 50% 20%, #7a5a8a 0%, transparent 55%), radial-gradient(circle at 80% 90%, #b6522f 0%, transparent 55%), linear-gradient(160deg,#4a3a5c,#2a1c22 55%,#120f0d);",
    "background-image: radial-gradient(circle at 25% 75%, #2e4a4a 0%, transparent 55%), radial-gradient(circle at 75% 20%, #5a5a3a 0%, transparent 55%), linear-gradient(145deg,#3d5555,#1c2a24 55%,#0f1210);"
  ];

  /* ---------- about ---------- */
  function renderAbout() {
    const heading = document.querySelector('[data-about-heading]');
    const note = document.querySelector('[data-about-note]');
    const vision = document.querySelector('[data-about-vision]');
    const mission = document.querySelector('[data-about-mission]');
    const desc = document.querySelector('[data-about-description]');
    if (heading) heading.innerHTML = content.about.heading;
    if (note) note.textContent = content.about.note;
    if (vision) vision.textContent = content.about.vision;
    if (mission) mission.textContent = content.about.mission;
    if (desc) desc.textContent = content.about.description;
  }

  /* ---------- faq ---------- */
  function renderFaq() {
    const wrap = document.querySelector('[data-faq-list]');
    if (!wrap) return;
    wrap.innerHTML = '';
    content.faq.forEach((item, i) => {
      const faqItem = el('div', 'faq-item' + (i === 0 ? ' is-open' : ''), `
        <button class="faq-item__q" aria-expanded="${i === 0 ? 'true' : 'false'}">
          <h3>${item.q}</h3>
          <span class="faq-item__icon"></span>
        </button>
        <div class="faq-item__a"><div class="faq-item__a-inner"><p>${item.a}</p></div></div>
      `);
      wrap.appendChild(faqItem);
    });
  }

  /* ---------- jobs / roles ---------- */
  function renderJobs() {
    const chips = document.querySelector('[data-hire-roles]');
    const roles = document.querySelector('[data-role-chips]');
    if (chips) chips.textContent = content.jobs.join(', ');
    if (roles) {
      roles.innerHTML = '';
      content.jobs.forEach(j => roles.appendChild(el('div', 'role-chip', j)));
    }
  }

  /* ---------- socials ---------- */
  function renderSocials() {
    document.querySelectorAll('[data-social="instagram"]').forEach(a => a.href = content.socials.instagram || '#');
    document.querySelectorAll('[data-social="letterboxd"]').forEach(a => a.href = content.socials.letterboxd || '#');
    document.querySelectorAll('[data-social="vimeo"]').forEach(a => a.href = content.socials.vimeo || '#');
  }

  function renderAll() {
    renderMeta();
    renderHero();
    renderFounders();
    renderFilms();
    renderAbout();
    renderFaq();
    renderJobs();
    renderSocials();
  }

  document.addEventListener('DOMContentLoaded', () => {
    // Paint immediately from whatever is cached locally so there's no blank
    // flash while the network round-trip to the shared backend is pending.
    content = window.OEContent.loadLocal();
    renderAll();
    bindThemeToggle();
    prepareLogo();
    document.dispatchEvent(new CustomEvent('oe:rendered'));

    // Then, if a shared backend is configured and has content, upgrade to it.
    window.OEContent.load().then(loaded => {
      if (loaded.hasRemote) {
        content = loaded.content;
        renderAll();
        document.dispatchEvent(new CustomEvent('oe:rendered'));
      }
    });
  });
})();
