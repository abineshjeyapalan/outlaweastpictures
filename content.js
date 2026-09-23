/* Outlaw East — content store.
   Single source of truth for all editable site text/media.
   Admin panel writes overrides to localStorage; the public site
   reads defaults merged with those overrides. */

(() => {
  'use strict';

  const STORAGE_KEY = 'oe_content_v1';
  const THEME_KEY = 'oe_theme';

  const DEFAULT_CONTENT = {
    site: {
      title: 'Outlaw East — Film Studio, Batticaloa',
      description: 'Outlaw East is an independent film studio based in Batticaloa, Sri Lanka.'
    },
    hero: {
      location: 'Batticaloa, Sri Lanka — Est. Independent Film Studio',
      titleMain: 'Outlaw',
      titleEm: 'East',
      desc: 'We make films from the eastern coast of Sri Lanka for the rest of the world to sit still for — features, shorts, and the odd story no one asked us to tell.'
    },
    founders: {
      heading: 'The names behind the outlaws.',
      note: 'The founders of Outlaw East, on the record for the first time.',
      people: [
        { name: 'Unnamed', role: 'Founder', photo: '' }
      ]
    },
    films: {
      heading: 'Frames from the archive.',
      note: "A handful of stills, pulled from the work we've carried from Batticaloa to festival screens.",
      list: [
        {
          film: 'VERMIN — 2026 — Short',
          title: 'Inspired from the book "Metamorphosis"',
          caption: 'Another experimental short.',
          tag: 'Academy Award® Nominee',
          format: '35MM',
          image: ''
        },
        {
          film: "You're a dead man, Michael — 2026 — Short",
          title: 'Featuring space and dreamy sequences, all done without VFX.',
          caption: 'Space sequences were shot using 4K televisions.',
          tag: '',
          format: '35MM',
          image: ''
        },
        {
          film: 'BLOOD SIMPLE — 2026 — Short',
          title: 'Featuring a red and black aesthetic',
          caption: 'A short film about the storytelling of violence and blood.',
          tag: '',
          format: '16MM',
          image: ''
        },
        {
          film: 'New person, same old mistake — 2026 — Short',
          title: "Featuring Tame Impala's song",
          caption: 'A two-minute short film, marking the beginning of our filmmaking career.',
          tag: '',
          format: '35MM',
          image: ''
        }
      ]
    },
    about: {
      heading: 'Who we are.',
      note: 'A studio out of Batticaloa with an outsized swing.',
      vision: 'To make the east coast of Sri Lanka a place where world-class films get made, not just remembered.',
      mission: "To write, finance, and produce honest films — shorts and features — that could only have come from where we're from.",
      description: 'Outlaw East is an independent film studio based in Batticaloa, Sri Lanka. We develop, finance, and produce short and feature-length films, run out of a small crew that grew up on this coast and has no plans to leave it.'
    },
    faq: [
      {
        q: 'do we suck?',
        a: 'yesnt'
      },
      {
        q: 'Where are you based, and do you shoot outside Sri Lanka?',
        a: 'Our studio and crew are based in Batticaloa. Most of our work is shot along the east coast, though we travel for the right story.'
      },
      {
        q: 'Are you currently hiring filmmakers?',
        a: 'Yes — always. Reach out on our <a href="contact.html#filmmakers" style="color:var(--rust)">Connect</a> page.'
      },
      {
        q: 'How do I submit a script, reel, or portfolio?',
        a: 'Send a link to your reel, portfolio, or script (PDF, industry-standard format) through the form on our Connect page. We read everything that comes in, though it can take a few weeks given the size of the team.'
      },
      {
        q: 'What formats do you shoot on?',
        a: 'Mostly 35mm and 16mm film, alongside digital when the schedule demands it.'
      },
      {
        q: 'Do you take on co-productions or crew traineeships?',
        a: 'We do both. We run a small crew traineeship out of Batticaloa each year for local talent, and we are open to co-production conversations with aligned studios.'
      }
    ],
    jobs: [
      'Assistant Directors',
      'Sound Designers',
      'Production Designers',
      'Colourists',
      '1st / 2nd AC',
      'Production Coordinators',
      'Producers'
    ],
    socials: {
      instagram: '#',
      letterboxd: '#',
      vimeo: '#'
    }
  };

  function isPlainObject(v) {
    return v && typeof v === 'object' && !Array.isArray(v);
  }

  function deepMerge(base, override) {
    if (Array.isArray(base)) {
      return Array.isArray(override) ? override : base;
    }
    if (isPlainObject(base)) {
      const out = { ...base };
      if (isPlainObject(override)) {
        Object.keys(override).forEach(k => {
          out[k] = k in base ? deepMerge(base[k], override[k]) : override[k];
        });
      }
      return out;
    }
    return override === undefined ? base : override;
  }

  // Merges always start from a deep clone of DEFAULT_CONTENT, never the literal
  // itself — deepMerge happily hands back nested arrays/objects by reference
  // when there's nothing to override, and admin.js mutates those in place
  // (push/splice/field edits), which would otherwise silently poison the
  // shared defaults for the rest of the page session.
  function cloneDefaults() {
    return JSON.parse(JSON.stringify(DEFAULT_CONTENT));
  }

  function loadLocal() {
    let stored = {};
    try {
      stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    } catch (e) {
      stored = {};
    }
    return deepMerge(cloneDefaults(), stored);
  }

  function fetchWithTimeout(url, opts, ms) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), ms);
    return fetch(url, { ...opts, signal: controller.signal }).finally(() => clearTimeout(timer));
  }

  // Tries the shared backend (Vercel KV via /api/content) first; falls back to
  // whatever is cached in this browser's localStorage if the API isn't reachable
  // or hasn't been configured yet (e.g. running the file straight off disk, or a
  // deploy without a KV store connected). Never rejects.
  async function load() {
    const local = loadLocal();
    let remote = null;
    let backend = false;
    try {
      const res = await fetchWithTimeout('/api/content', { method: 'GET' }, 2500);
      if (res.ok) {
        const data = await res.json();
        backend = !!data.backend;
        if (data.content) remote = data.content;
      }
    } catch (e) {
      /* offline, static file://, or no backend deployed yet — that's fine */
    }
    const content = remote ? deepMerge(cloneDefaults(), remote) : local;
    return { content, backend, hasRemote: !!remote };
  }

  function save(content) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(content));
  }

  async function saveRemote(content, secret) {
    try {
      const res = await fetchWithTimeout('/api/content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + secret },
        body: JSON.stringify(content)
      }, 4000);
      if (res.ok) return { ok: true };
      const data = await res.json().catch(() => ({}));
      return { ok: false, error: data.error || ('http_' + res.status) };
    } catch (e) {
      return { ok: false, error: 'network' };
    }
  }

  function reset() {
    localStorage.removeItem(STORAGE_KEY);
  }

  window.OEContent = {
    load, loadLocal, save, saveRemote, reset,
    defaults: DEFAULT_CONTENT,
    STORAGE_KEY,
    THEME_KEY
  };
})();
