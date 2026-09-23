(() => {
  'use strict';

  const PASS_KEY = 'oe_admin_pass';
  const UNLOCK_KEY = 'oe_admin_unlocked';

  let content = window.OEContent.defaults;
  let backendAvailable = false;

  /* ============ persistence ============ */
  let saveTimer = null;
  let syncTimer = null;
  function persist() {
    window.OEContent.save(content);
    toast('Saved on this device…');
    clearTimeout(syncTimer);
    syncTimer = setTimeout(syncToBackend, 400);
  }
  async function syncToBackend() {
    const secret = localStorage.getItem(PASS_KEY) || '';
    const result = await window.OEContent.saveRemote(content, secret);
    if (result.ok) {
      toast('Saved — live for every visitor');
    } else if (result.error === 'unauthorized') {
      toast('Saved on this device only — admin password doesn’t match the site’s ADMIN_SECRET');
    } else if (result.error === 'backend_not_configured') {
      toast('Saved on this device only — no backend connected yet');
    } else {
      toast('Saved on this device only — could not reach the backend');
    }
  }
  function toast(msg) {
    const t = document.getElementById('adminToast');
    t.textContent = msg;
    t.classList.add('is-visible');
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => t.classList.remove('is-visible'), 2600);
  }

  /* ============ login gate ============ */
  function initGate() {
    const gate = document.getElementById('loginGate');
    const app = document.getElementById('adminApp');
    const input = document.getElementById('gatePassword');
    const submit = document.getElementById('gateSubmit');
    const label = document.getElementById('gateLabel');
    const note = document.getElementById('gateNote');

    const storedPass = localStorage.getItem(PASS_KEY);
    if (!storedPass) {
      label.textContent = 'Set an admin password for this browser';
      note.textContent = "This only protects the panel on this device/browser — it isn't sent anywhere.";
    } else {
      label.textContent = 'Enter the admin password';
      note.textContent = '';
    }

    function unlock() {
      sessionStorage.setItem(UNLOCK_KEY, '1');
      gate.style.display = 'none';
      app.hidden = false;
      initApp();
    }

    if (sessionStorage.getItem(UNLOCK_KEY) === '1' && storedPass) {
      unlock();
      return;
    }

    submit.addEventListener('click', attempt);
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') attempt(); });

    function attempt() {
      const val = input.value;
      if (!val) return;
      if (!storedPass) {
        if (val.length < 4) {
          note.textContent = 'Use at least 4 characters.';
          note.classList.add('is-error');
          return;
        }
        localStorage.setItem(PASS_KEY, val);
        unlock();
        return;
      }
      if (val === storedPass) {
        unlock();
      } else {
        note.textContent = 'Wrong password.';
        note.classList.add('is-error');
        input.value = '';
      }
    }

    input.focus();
  }

  /* ============ tabs ============ */
  const TABS = [
    { id: 'site', label: 'Site' },
    { id: 'hero', label: 'Hero' },
    { id: 'founders', label: 'Founders' },
    { id: 'films', label: 'Films' },
    { id: 'about', label: 'About' },
    { id: 'faq', label: 'FAQ' },
    { id: 'jobs', label: 'Jobs' },
    { id: 'socials', label: 'Socials' }
  ];

  async function initApp() {
    const loaded = await window.OEContent.load();
    content = loaded.content;
    backendAvailable = loaded.backend;

    const tabsEl = document.getElementById('adminTabs');
    const mainEl = document.getElementById('adminMain');
    tabsEl.innerHTML = '';
    mainEl.innerHTML = '';

    if (!backendAvailable) {
      const notice = document.createElement('div');
      notice.className = 'admin-notice';
      notice.innerHTML = 'No shared backend detected — edits are saved to this browser only. ' +
        'Connect a Redis database (Storage → Marketplace → Upstash) and set <code>ADMIN_SECRET</code> (same value as your admin password) to make edits live for every visitor. See README.md.';
      mainEl.appendChild(notice);
    }

    TABS.forEach((t, i) => {
      const btn = document.createElement('button');
      btn.className = 'admin-tab' + (i === 0 ? ' is-active' : '');
      btn.textContent = t.label;
      btn.dataset.tab = t.id;
      btn.addEventListener('click', () => showTab(t.id));
      tabsEl.appendChild(btn);

      const panel = document.createElement('div');
      panel.className = 'admin-panel' + (i === 0 ? ' is-active' : '');
      panel.id = 'panel-' + t.id;
      mainEl.appendChild(panel);
    });

    renderSite(document.getElementById('panel-site'));
    renderHero(document.getElementById('panel-hero'));
    renderFounders(document.getElementById('panel-founders'));
    renderFilms(document.getElementById('panel-films'));
    renderAbout(document.getElementById('panel-about'));
    renderFaq(document.getElementById('panel-faq'));
    renderJobs(document.getElementById('panel-jobs'));
    renderSocials(document.getElementById('panel-socials'));

    bindToolbar();
  }

  function showTab(id) {
    document.querySelectorAll('.admin-tab').forEach(b => b.classList.toggle('is-active', b.dataset.tab === id));
    document.querySelectorAll('.admin-panel').forEach(p => p.classList.toggle('is-active', p.id === 'panel-' + id));
  }

  /* ============ helpers ============ */
  function header(panel, title, sub) {
    panel.innerHTML = `<h2 class="admin-section-title">${title}</h2><p class="admin-section-sub">${sub}</p>`;
  }
  function field(labelText, value, onInput, multiline = false) {
    const wrap = document.createElement('div');
    wrap.className = 'admin-field';
    const label = document.createElement('label');
    label.textContent = labelText;
    const input = document.createElement(multiline ? 'textarea' : 'input');
    if (!multiline) input.type = 'text';
    input.value = value || '';
    input.addEventListener('input', () => onInput(input.value));
    input.addEventListener('blur', () => persist());
    wrap.append(label, input);
    return wrap;
  }
  function readImage(file, cb) {
    const reader = new FileReader();
    reader.onload = () => cb(reader.result);
    reader.readAsDataURL(file);
  }
  function photoField(currentUrl, onChange) {
    const wrap = document.createElement('div');
    wrap.className = 'admin-photo';
    const preview = document.createElement('div');
    preview.className = 'admin-photo__preview';
    if (currentUrl) preview.style.backgroundImage = `url('${currentUrl}')`;
    const actions = document.createElement('div');
    actions.className = 'admin-photo__actions';
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';
    fileInput.addEventListener('change', () => {
      const file = fileInput.files[0];
      if (!file) return;
      readImage(file, (dataUrl) => {
        preview.style.backgroundImage = `url('${dataUrl}')`;
        onChange(dataUrl);
        persist();
      });
    });
    const clear = document.createElement('a');
    clear.href = '#';
    clear.className = 'admin-photo__clear';
    clear.textContent = 'Remove photo';
    clear.addEventListener('click', (e) => {
      e.preventDefault();
      preview.style.backgroundImage = '';
      fileInput.value = '';
      onChange('');
      persist();
    });
    actions.append(fileInput, clear);
    wrap.append(preview, actions);
    return wrap;
  }
  function addButton(text, onClick) {
    const btn = document.createElement('button');
    btn.className = 'admin-add';
    btn.textContent = text;
    btn.addEventListener('click', onClick);
    return btn;
  }
  function removeButton(onClick) {
    const btn = document.createElement('button');
    btn.className = 'admin-card__remove';
    btn.textContent = 'Remove';
    btn.addEventListener('click', onClick);
    return btn;
  }

  /* ============ site ============ */
  function renderSite(panel) {
    header(panel, 'Site', 'The title and description used in the browser tab and search results.');
    panel.appendChild(field('Site Title', content.site.title, v => content.site.title = v));
    panel.appendChild(field('Site Description', content.site.description, v => content.site.description = v, true));
  }

  /* ============ hero ============ */
  function renderHero(panel) {
    header(panel, 'Hero', 'The first thing visitors see on the landing page.');
    panel.appendChild(field('Location Line', content.hero.location, v => content.hero.location = v));
    const row = document.createElement('div');
    row.className = 'admin-row';
    row.appendChild(field('Title (normal part)', content.hero.titleMain, v => content.hero.titleMain = v));
    row.appendChild(field('Title (highlighted part)', content.hero.titleEm, v => content.hero.titleEm = v));
    panel.appendChild(row);
    panel.appendChild(field('Description', content.hero.desc, v => content.hero.desc = v, true));
  }

  /* ============ founders ============ */
  function renderFounders(panel) {
    header(panel, 'Founders', "Names and photos shown in place of the old stats. Leave a photo empty to show the gradient placeholder.");
    panel.appendChild(field('Section Heading', content.founders.heading, v => content.founders.heading = v));
    panel.appendChild(field('Section Note', content.founders.note, v => content.founders.note = v, true));
    const list = document.createElement('div');
    panel.appendChild(list);
    function draw() {
      list.innerHTML = '';
      content.founders.people.forEach((p, i) => {
        const card = document.createElement('div');
        card.className = 'admin-card';
        card.appendChild(removeButton(() => { content.founders.people.splice(i, 1); persist(); draw(); }));
        card.appendChild(photoField(p.photo, v => p.photo = v));
        const row = document.createElement('div');
        row.className = 'admin-row';
        row.appendChild(field('Name', p.name, v => p.name = v));
        row.appendChild(field('Role', p.role, v => p.role = v));
        card.appendChild(row);
        list.appendChild(card);
      });
      list.appendChild(addButton('+ Add founder', () => {
        content.founders.people.push({ name: 'Unnamed', role: 'Founder', photo: '' });
        persist(); draw();
      }));
    }
    draw();
  }

  /* ============ films ============ */
  function renderFilms(panel) {
    header(panel, 'Films', 'The film frames shown on the landing page. Upload an image to replace the gradient placeholder.');
    panel.appendChild(field('Section Heading', content.films.heading, v => content.films.heading = v));
    panel.appendChild(field('Section Note', content.films.note, v => content.films.note = v, true));
    const list = document.createElement('div');
    panel.appendChild(list);
    function draw() {
      list.innerHTML = '';
      content.films.list.forEach((f, i) => {
        const card = document.createElement('div');
        card.className = 'admin-card';
        card.appendChild(removeButton(() => { content.films.list.splice(i, 1); persist(); draw(); }));
        card.appendChild(photoField(f.image, v => f.image = v));
        card.appendChild(field('Film / Year / Type', f.film, v => f.film = v));
        card.appendChild(field('Caption (large title)', f.title, v => f.title = v));
        card.appendChild(field('Sub-description', f.caption, v => f.caption = v, true));
        const row = document.createElement('div');
        row.className = 'admin-row';
        row.appendChild(field('Award Badge (blank for none)', f.tag, v => f.tag = v));
        row.appendChild(field('Format Tag (e.g. 35MM)', f.format, v => f.format = v));
        card.appendChild(row);
        list.appendChild(card);
      });
      list.appendChild(addButton('+ Add film', () => {
        content.films.list.push({ film: 'New Film — 2026 — Short', title: 'Working title', caption: 'Add a sub-description.', tag: '', format: '35MM', image: '' });
        persist(); draw();
      }));
    }
    draw();
  }

  /* ============ about ============ */
  function renderAbout(panel) {
    header(panel, 'About', 'Vision, mission, and studio description shown on the landing page.');
    panel.appendChild(field('Section Heading', content.about.heading, v => content.about.heading = v));
    panel.appendChild(field('Section Note', content.about.note, v => content.about.note = v));
    panel.appendChild(field('Vision', content.about.vision, v => content.about.vision = v, true));
    panel.appendChild(field('Mission', content.about.mission, v => content.about.mission = v, true));
    panel.appendChild(field('Description', content.about.description, v => content.about.description = v, true));
  }

  /* ============ faq ============ */
  function renderFaq(panel) {
    header(panel, 'FAQ', 'Questions and answers shown on the landing page. Basic HTML (like links) is allowed in answers.');
    const list = document.createElement('div');
    panel.appendChild(list);
    function draw() {
      list.innerHTML = '';
      content.faq.forEach((item, i) => {
        const card = document.createElement('div');
        card.className = 'admin-card';
        card.appendChild(removeButton(() => { content.faq.splice(i, 1); persist(); draw(); }));
        card.appendChild(field('Question', item.q, v => item.q = v));
        card.appendChild(field('Answer', item.a, v => item.a = v, true));
        list.appendChild(card);
      });
      list.appendChild(addButton('+ Add question', () => {
        content.faq.push({ q: 'New question?', a: 'Answer goes here.' });
        persist(); draw();
      }));
    }
    draw();
  }

  /* ============ jobs ============ */
  function renderJobs(panel) {
    header(panel, 'Jobs', 'Role chips shown on the hiring band and the Connect page vacancies list.');
    const list = document.createElement('div');
    panel.appendChild(list);
    function draw() {
      list.innerHTML = '';
      content.jobs.forEach((job, i) => {
        const card = document.createElement('div');
        card.className = 'admin-card';
        card.appendChild(removeButton(() => { content.jobs.splice(i, 1); persist(); draw(); }));
        card.appendChild(field('Role', job, v => content.jobs[i] = v));
        list.appendChild(card);
      });
      list.appendChild(addButton('+ Add role', () => { content.jobs.push('New Role'); persist(); draw(); }));
    }
    draw();
  }

  /* ============ socials ============ */
  function renderSocials(panel) {
    header(panel, 'Socials', 'Links used in the footer and Connect page. Leave blank to keep them as "#".');
    panel.appendChild(field('Instagram URL', content.socials.instagram, v => content.socials.instagram = v));
    panel.appendChild(field('Letterboxd URL', content.socials.letterboxd, v => content.socials.letterboxd = v));
    panel.appendChild(field('Vimeo URL', content.socials.vimeo, v => content.socials.vimeo = v));
  }

  /* ============ toolbar ============ */
  function bindToolbar() {
    document.getElementById('btnExport').addEventListener('click', () => {
      const blob = new Blob([JSON.stringify(content, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'outlaw-east-content.json';
      a.click();
      URL.revokeObjectURL(url);
    });

    const importFile = document.getElementById('importFile');
    document.getElementById('btnImport').addEventListener('click', () => importFile.click());
    importFile.addEventListener('change', () => {
      const file = importFile.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const parsed = JSON.parse(reader.result);
          content = parsed;
          window.OEContent.save(content);
          const secret = localStorage.getItem(PASS_KEY) || '';
          await window.OEContent.saveRemote(content, secret);
          toast('Imported — reloading…');
          setTimeout(() => location.reload(), 700);
        } catch (e) {
          toast('That file is not valid JSON.');
        }
      };
      reader.readAsText(file);
      importFile.value = '';
    });

    document.getElementById('btnReset').addEventListener('click', async () => {
      if (!confirm('Reset all content back to the built-in defaults? This cannot be undone.')) return;
      window.OEContent.reset();
      const secret = localStorage.getItem(PASS_KEY) || '';
      await window.OEContent.saveRemote(window.OEContent.defaults, secret);
      location.reload();
    });
  }

  document.addEventListener('DOMContentLoaded', initGate);
})();
