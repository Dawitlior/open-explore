/*!
 * OrcaGuide v1.0.0 — Generic first-visit onboarding engine
 * -------------------------------------------------------
 * Drop-in, zero-dependency. Scans any platform page on entry,
 * understands what's on it, and walks first-time users through it.
 *
 * - Auto page identity (routes, SPA tabs, headings) — no routing required
 * - Auto language (he/en) + RTL/LTR
 * - Auto theme (dark/light), accent color & font inherited from host
 * - Auto feature detection (date filters, tabs, search, add, export,
 *   charts, tables, KPI cards, calendars, filters, pagination...)
 * - Skips login/landing pages automatically
 * - Seen-state persisted in localStorage (versioned)
 * - Lazy & light: sleeps until navigation; ~0 cost while idle
 *
 * Usage:  OrcaGuide.init({ appName: 'My Platform' });
 * API:    OrcaGuide.replay() / .resetAll() / .scan() / .version
 * Author hints (optional, for pixel-perfect control):
 *   <section data-og-page="economic" data-og-intro="...">
 *   <button data-og-feature="הסבר מותאם אישית לכפתור הזה">
 */
(function (global) {
  'use strict';
  if (global.OrcaGuide) return; // singleton guard

  var VERSION = '1.0.0';

  /* ============================================================
   * 1. UTILITIES
   * ==========================================================*/
  function debounce(fn, ms) {
    var t;
    var d = function () {
      var a = arguments, c = this;
      clearTimeout(t);
      t = setTimeout(function () { fn.apply(c, a); }, ms);
    };
    d.cancel = function () { clearTimeout(t); };
    return d;
  }

  function rafThrottle(fn) {
    var pending = false;
    return function () {
      if (pending) return;
      pending = true;
      requestAnimationFrame(function () { pending = false; fn(); });
    };
  }

  function txt(el, max) {
    if (!el) return '';
    var s = (el.getAttribute && (el.getAttribute('aria-label') || el.getAttribute('title') || el.getAttribute('placeholder'))) || el.textContent || '';
    s = s.replace(/\s+/g, ' ').trim();
    if (max && s.length > max) s = s.slice(0, max - 1) + '…';
    return s;
  }

  function isVisible(el) {
    if (!el || el.nodeType !== 1) return false;
    if (el.closest('#og-root')) return false;
    var r = el.getBoundingClientRect();
    if (r.width < 8 || r.height < 8) return false;
    var cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || cs.display === 'none' || +cs.opacity === 0) return false;
    if (el.closest('[aria-hidden="true"]')) return false;
    return true;
  }

  function area(el) {
    var r = el.getBoundingClientRect();
    return r.width * r.height;
  }

  function hashStr(s) {
    var h = 5381, i = s.length;
    while (i) h = (h * 33) ^ s.charCodeAt(--i);
    return (h >>> 0).toString(36);
  }

  function norm(s) {
    return (s || '').toLowerCase().replace(/[0-9]/g, '').replace(/\s+/g, ' ').trim();
  }

  function uniq(arr) {
    var seen = {}, out = [];
    for (var i = 0; i < arr.length; i++) {
      var k = arr[i];
      if (!seen[k]) { seen[k] = 1; out.push(k); }
    }
    return out;
  }

  function fmt(tpl, vars) {
    return tpl.replace(/\{(\w+)\}/g, function (_, k) { return vars[k] != null ? vars[k] : ''; });
  }

  function idle(fn) {
    if (global.requestIdleCallback) global.requestIdleCallback(fn, { timeout: 600 });
    else setTimeout(fn, 1);
  }

  /* ============================================================
   * 2. COLOR ENGINE — parse, measure, derive a palette
   * ==========================================================*/
  function parseColor(str) {
    if (!str) return null;
    str = str.trim();
    var m = str.match(/^rgba?\(([^)]+)\)$/i);
    if (m) {
      var p = m[1].split(',').map(function (v) { return parseFloat(v); });
      return [p[0] || 0, p[1] || 0, p[2] || 0, p.length > 3 ? p[3] : 1];
    }
    m = str.match(/^#([0-9a-f]{3,8})$/i);
    if (m) {
      var h = m[1];
      if (h.length === 3 || h.length === 4) h = h.split('').map(function (c) { return c + c; }).join('');
      var r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
      var a = h.length === 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1;
      return [r, g, b, a];
    }
    return null;
  }

  function lum(c) { // perceived luminance 0..1
    return (0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]) / 255;
  }

  function rgbToHsl(c) {
    var r = c[0] / 255, g = c[1] / 255, b = c[2] / 255;
    var max = Math.max(r, g, b), min = Math.min(r, g, b);
    var h = 0, s = 0, l = (max + min) / 2;
    if (max !== min) {
      var d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
      else if (max === g) h = (b - r) / d + 2;
      else h = (r - g) / d + 4;
      h /= 6;
    }
    return [h, s, l];
  }

  function mix(c1, c2, t) {
    return [
      Math.round(c1[0] + (c2[0] - c1[0]) * t),
      Math.round(c1[1] + (c2[1] - c1[1]) * t),
      Math.round(c1[2] + (c2[2] - c1[2]) * t),
      1
    ];
  }

  function css(c, a) {
    var alpha = a != null ? a : (c[3] != null ? c[3] : 1);
    return alpha >= 1 ? 'rgb(' + c[0] + ',' + c[1] + ',' + c[2] + ')'
      : 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + alpha + ')';
  }

  var WHITE = [255, 255, 255, 1], BLACK = [10, 12, 18, 1];

  function effectiveBg(el) {
    var node = el || document.body;
    while (node && node !== document.documentElement.parentNode) {
      var c = parseColor(getComputedStyle(node).backgroundColor);
      if (c && c[3] > 0.1) return c;
      node = node.parentElement || (node === document.body ? document.documentElement : null);
    }
    return WHITE;
  }

  function detectAccent(cfg, dark) {
    if (cfg.accent) { var fc = parseColor(cfg.accent); if (fc) return fc; }
    // 1) probe common CSS custom properties on :root
    var root = getComputedStyle(document.documentElement);
    var names = ['--og-accent', '--accent', '--primary', '--color-primary', '--primary-color',
      '--accent-color', '--brand', '--brand-color', '--color-accent', '--main-color', '--theme-color'];
    for (var i = 0; i < names.length; i++) {
      var v = root.getPropertyValue(names[i]).trim();
      var c = parseColor(v);
      if (c) {
        var hs = rgbToHsl(c);
        if (hs[1] > 0.18 && hs[2] > 0.12 && hs[2] < 0.92) return c;
      }
    }
    // 2) sample buttons & links — most frequent saturated hue wins
    var els = document.querySelectorAll('button,[role="button"],a,[class*="btn"],[class*="primary"],[class*="accent"],[class*="active"]');
    var buckets = {}, count = 0;
    for (var j = 0; j < els.length && count < 90; j++) {
      var el = els[j];
      if (!isVisible(el)) continue;
      count++;
      var cs = getComputedStyle(el);
      var cand = parseColor(cs.backgroundColor);
      var weight = 2;
      if (!cand || cand[3] < 0.4) { cand = parseColor(cs.color); weight = 1; }
      if (!cand) continue;
      var hsl = rgbToHsl(cand);
      if (hsl[1] < 0.28 || hsl[2] < 0.15 || hsl[2] > 0.85) continue; // skip grays/extremes
      var key = Math.round(hsl[0] * 18); // 20° hue buckets
      buckets[key] = buckets[key] || { w: 0, c: cand };
      buckets[key].w += weight;
      if (lum(cand) > 0.1) buckets[key].c = cand; // keep a representative
    }
    var best = null;
    for (var k in buckets) if (!best || buckets[k].w > best.w) best = buckets[k];
    if (best) return best.c;
    // 3) graceful fallback
    return dark ? [122, 162, 255, 1] : [47, 88, 230, 1];
  }

  function detectThemeVars(cfg) {
    var bg = effectiveBg(document.body);
    var dark = cfg.theme === 'dark' ? true : cfg.theme === 'light' ? false : lum(bg) < 0.5;
    var accent = detectAccent(cfg, dark);
    var accentDark = lum(accent) < 0.62;
    var surface = dark ? mix(bg, WHITE, 0.075) : mix(WHITE, bg, 0.25);
    var surface2 = dark ? mix(bg, WHITE, 0.13) : mix(WHITE, bg, 0.5);
    var bodyFont = getComputedStyle(document.body).fontFamily ||
      'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
    return {
      dark: dark,
      '--og-font': bodyFont,
      '--og-surface': css(surface),
      '--og-surface2': css(surface2),
      '--og-text': dark ? '#f4f6fa' : '#171b26',
      '--og-muted': dark ? 'rgba(244,246,250,.64)' : 'rgba(23,27,38,.6)',
      '--og-border': dark ? 'rgba(255,255,255,.14)' : 'rgba(15,20,35,.12)',
      '--og-accent': css(accent),
      '--og-accent-soft': css(accent, 0.16),
      '--og-accent-text': accentDark ? '#ffffff' : '#13161f',
      '--og-backdrop': dark ? 'rgba(2,4,10,.62)' : 'rgba(15,20,35,.46)',
      '--og-shadow': dark ? '0 24px 60px -12px rgba(0,0,0,.65)' : '0 24px 60px -16px rgba(20,30,60,.3)',
      '--og-glow': css(accent, 0.5)
    };
  }

  /* ============================================================
   * 3. LANGUAGE DETECTION + STRINGS (he / en)
   * ==========================================================*/
  function detectLang(cfg) {
    if (cfg.language && cfg.language !== 'auto') return cfg.language;
    var htmlLang = (document.documentElement.getAttribute('lang') || '').toLowerCase();
    if (/^(he|iw)/.test(htmlLang)) return 'he';
    if (/^en/.test(htmlLang)) return 'en';
    var sample = (document.body.innerText || '').slice(0, 3000);
    var heb = (sample.match(/[\u0590-\u05FF]/g) || []).length;
    var lat = (sample.match(/[a-zA-Z]/g) || []).length;
    if (heb > 12 && heb >= lat * 0.25) return 'he';
    if ((document.documentElement.getAttribute('dir') || '').toLowerCase() === 'rtl') return 'he';
    return 'en';
  }

  var I18N = {
    he: {
      dir: 'rtl',
      gotIt: 'הבנתי, בואו נמשיך',
      gotItShort: 'הבנתי',
      next: 'הבא',
      done: 'סיימתי, תודה!',
      skip: 'דלג על ההדרכה',
      stepOf: 'שלב {n} מתוך {total}',
      tourBadge: 'היכרות עם העמוד',
      replayTitle: 'הצגת ההדרכה מחדש',
      featuresIntroTitle: 'מה אפשר לעשות כאן?',
      noFeatures: 'הסתכלו מסביב בנחת — כל מה שצריך נמצא כאן, ותמיד אפשר ללחוץ על סימן השאלה כדי לקבל את ההדרכה שוב.'
    },
    en: {
      dir: 'ltr',
      gotIt: "Got it, let's go",
      gotItShort: 'Got it',
      next: 'Next',
      done: 'Done, thanks!',
      skip: 'Skip tour',
      stepOf: 'Step {n} of {total}',
      tourBadge: 'Getting to know this page',
      replayTitle: 'Replay the tour',
      featuresIntroTitle: 'What can you do here?',
      noFeatures: 'Take a look around — everything you need is right here, and you can always tap the question mark to see this tour again.'
    }
  };

  /* ============================================================
   * 4. PAGE IDENTITY — works for MPAs, SPAs and tab-state apps
   * ==========================================================*/
  function mainHeading() {
    var hs = document.querySelectorAll('h1,h2,[class*="page-title"],[class*="pageTitle"]');
    for (var i = 0; i < hs.length; i++) {
      var h = hs[i];
      if (!isVisible(h)) continue;
      if (h.closest('nav,aside,footer') ) continue;
      var t = txt(h, 70);
      if (t.length >= 2) return t;
    }
    return '';
  }

  function activeNavItem() {
    var sel = 'nav [aria-current], nav .active, nav [class*="active"], nav [class*="selected"],' +
      '[role="navigation"] [aria-current], aside [class*="active"], aside [aria-current],' +
      '[role="tablist"] [aria-selected="true"]';
    var els = document.querySelectorAll(sel);
    for (var i = 0; i < els.length; i++) {
      if (!isVisible(els[i])) continue;
      var t = txt(els[i], 50);
      if (t.length >= 2 && t.length <= 50) return t;
    }
    return '';
  }

  function getIdentity() {
    var tagged = document.querySelector('[data-og-page]');
    var route = location.pathname + (location.hash || '');
    var heading = mainHeading();
    var nav = activeNavItem();
    var title = heading || nav || (tagged && tagged.getAttribute('data-og-page')) || document.title || 'page';
    var key;
    if (tagged) key = 'pg:' + tagged.getAttribute('data-og-page');
    else key = norm(route) + '::' + norm(nav) + '::' + norm(heading);
    return { key: hashStr(key), title: title.trim(), route: route, heading: heading, nav: nav, tagged: tagged };
  }

  var LOGIN_RX = /(log\s?-?in|sign\s?-?in|sign\s?-?up|register|forgot|reset.?password|auth|התחבר|הרשמ|כניסה לחשבון|שכחתי סיסמה)/i;

  function isExcluded(identity, cfg) {
    if (document.body.hasAttribute('data-og-skip')) return true;
    // a visible password field = login/landing-auth page
    var pw = document.querySelectorAll('input[type="password"]');
    for (var i = 0; i < pw.length; i++) if (isVisible(pw[i])) return true;
    if (LOGIN_RX.test(identity.title) || LOGIN_RX.test(identity.route)) return true;
    var ex = cfg.exclude || [];
    for (var j = 0; j < ex.length; j++) {
      var rule = ex[j];
      if (rule instanceof RegExp) { if (rule.test(identity.route) || rule.test(identity.title)) return true; }
      else if (typeof rule === 'string' && rule) {
        if (rule === '/' ) { if (location.pathname === '/') return true; }
        else if (identity.route.indexOf(rule) !== -1 || identity.title.indexOf(rule) !== -1) return true;
      }
    }
    return false;
  }

  /* ============================================================
   * 5. PAGE CLASSIFICATION + CONTENT TEMPLATES
   * ==========================================================*/
  var CATS = [
    { id: 'economic',  rx: /(כלכלי|מאקרו|אירועים כלכליים|economic|macro|news|חדשות)/i },
    { id: 'calendar',  rx: /(לוח שנה|לוח חודשי|calendar|monthly view)/i },
    { id: 'analytics', rx: /(אנליטיק|סטטיסט|ביצועים|ניתוח|דוחות|דו"חות|analytic|statistic|performance|report|insight)/i },
    { id: 'journal',   rx: /(יומן|עסקאות|עסקה|פוזיצי|היסטוריית|trade|journal|position|history|orders)/i },
    { id: 'settings',  rx: /(הגדרות|העדפות|פרופיל|חשבון|setting|preference|profile|account)/i },
    { id: 'dashboard', rx: /(דשבורד|לוח בקרה|סקירה|ראשי|בית|dashboard|overview|home|summary)/i }
  ];

  function classify(identity) {
    var hay = identity.title + ' ' + identity.route + ' ' + identity.nav;
    for (var i = 0; i < CATS.length; i++) if (CATS[i].rx.test(hay)) return CATS[i].id;
    return 'generic';
  }

  var INTROS = {
    he: {
      dashboard: ['ברוכים הבאים אל {title} 👋 כאן מרוכזת תמונת המצב המלאה שלכם — הכול במבט אחד.', 'הכרטיסים והגרפים מתעדכנים לפי הנתונים שלכם, כך שתמיד תדעו בדיוק איפה אתם עומדים.'],
      journal:   ['זהו {title} — הלב של הפלטפורמה, המקום שבו כל עסקה מתועדת ומקבלת הקשר.', 'אפשר להוסיף, לסנן ולחפש — וכך לעקוב אחרי ההתקדמות שלכם לאורך זמן.'],
      calendar:  ['הגעתם אל {title} 🗓️ כל הפעילות שלכם פרוסה כאן על לוח חודשי נוח.', 'ימים עם פעילות מסומנים, ולחיצה על יום תפתח את הפירוט המלא שלו.'],
      economic:  ['זהו {title} 📅 ריכוז של האירועים והפרסומים הכלכליים שמזיזים את השוק.', 'כך תדעו מראש מתי צפויה תנודתיות — ותוכלו להיערך בהתאם, בלי הפתעות.'],
      analytics: ['ברוכים הבאים אל {title} 📊 כאן הנתונים שלכם הופכים לתובנות.', 'הגרפים והמדדים יעזרו לכם לזהות מה עובד טוב — ומה כדאי לחדד.'],
      settings:  ['אלה {title} ⚙️ המקום להתאים את הפלטפורמה בדיוק אליכם.', 'כל שינוי שתעשו כאן נשמר ומשפיע על המערכת כולה.'],
      generic:   ['ברוכים הבאים אל {title} 👋 זו הפעם הראשונה שלכם כאן, אז הכנו סיור קצר.', 'שני רגעים — ותכירו את כל מה שהעמוד הזה יודע לעשות.']
    },
    en: {
      dashboard: ['Welcome to {title} 👋 This is your full picture — everything that matters, at a glance.', 'The cards and charts update with your data, so you always know exactly where you stand.'],
      journal:   ['This is {title} — the heart of the platform, where every trade gets recorded and put in context.', 'Add, filter and search to track your progress over time.'],
      calendar:  ['Welcome to {title} 🗓️ All your activity laid out on a clean monthly board.', 'Active days are marked — click any day to open its full details.'],
      economic:  ['This is {title} 📅 — the economic events and releases that move the market, in one place.', "You'll know in advance when volatility is coming, so you can prepare instead of react."],
      analytics: ['Welcome to {title} 📊 — where your data turns into insight.', 'The charts and metrics highlight what works well, and what could use sharpening.'],
      settings:  ['This is {title} ⚙️ — the place to make the platform truly yours.', 'Anything you change here is saved and applied across the system.'],
      generic:   ["Welcome to {title} 👋 It's your first time here, so we prepared a short tour.", "Two quick moments and you'll know everything this page can do."]
    }
  };

  var FEATURES = {
    he: {
      dates:    { t: 'מעבר מהיר בין תקופות', x: 'לחיצה על {labels} משנה את טווח הזמן של התצוגה — קופצים בקלות בין היום, השבוע והלאה.' },
      tabs:     { t: 'לשוניות תצוגה',        x: 'מעבר בין {labels} מציג חתכים שונים של המידע בעמוד.' },
      search:   { t: 'חיפוש מהיר',           x: 'מקלידים כאן כל מילה — והעמוד מאתר עבורכם את מה שחיפשתם.' },
      add:      { t: '{label}',              x: 'הכפתור הזה יוצר פריט חדש — כשתהיו מוכנים, פשוט לחצו עליו.' },
      exportBtn:{ t: 'ייצוא נתונים',         x: 'בלחיצה אחת המידע יורד אליכם כקובץ — נוח לגיבוי ולשיתוף.' },
      filter:   { t: 'סינון ממוקד',          x: 'המסננים מצמצמים את התצוגה בדיוק למה שמעניין אתכם כרגע.' },
      chart:    { t: 'גרף אינטראקטיבי',      x: 'מעבר עם העכבר מעל הגרף יציג פירוט מדויק לכל נקודה.' },
      table:    { t: 'טבלת הנתונים',         x: 'כאן מרוכזות כל הרשומות — גוללים, סוקרים, וצוללים לכל שורה.' },
      kpi:      { t: 'המדדים החשובים',       x: 'הכרטיסים האלה מציגים את המספרים המרכזיים שלכם — והם מתעדכנים אוטומטית.' },
      calgrid:  { t: 'הלוח החודשי',          x: 'כל משבצת היא יום. ימים מסומנים מכילים פעילות — לחצו עליהם לפרטים.' },
      list:     { t: 'רשימת הפריטים',        x: 'הפריטים מסודרים כאן לפי סדר — גללו כדי לראות את כולם.' },
      pager:    { t: 'דפדוף בין עמודים',     x: 'יש עוד נתונים מעבר למסך — כאן עוברים בין העמודים.' },
      themeBtn: { t: 'מצב תצוגה',            x: 'מעדיפים כהה או בהיר? כאן מחליפים את מראה המערכת בלחיצה.' },
      form:     { t: 'טופס ההגדרות',         x: 'ממלאים את השדות לפי ההעדפות שלכם — והמערכת תתאים את עצמה.' },
      custom:   { t: 'שימו לב',              x: '{label}' }
    },
    en: {
      dates:    { t: 'Quick time ranges',    x: 'Tap {labels} to change the time window — jump between today, this week and beyond.' },
      tabs:     { t: 'View tabs',            x: 'Switch between {labels} to see different slices of this page.' },
      search:   { t: 'Quick search',         x: 'Type anything here — the page will find it for you instantly.' },
      add:      { t: '{label}',              x: "This button creates a new item — whenever you're ready, just click it." },
      exportBtn:{ t: 'Export your data',     x: 'One click downloads everything as a file — great for backups and sharing.' },
      filter:   { t: 'Focused filtering',    x: "Filters narrow the view down to exactly what you're interested in." },
      chart:    { t: 'Interactive chart',    x: 'Hover over the chart to see precise details for every point.' },
      table:    { t: 'The data table',       x: 'All your records live here — scroll, review, and dive into any row.' },
      kpi:      { t: 'Your key numbers',     x: 'These cards show the metrics that matter most — updated automatically.' },
      calgrid:  { t: 'The monthly board',    x: 'Each cell is a day. Marked days hold activity — click them for details.' },
      list:     { t: 'The items list',       x: 'Everything is listed here in order — scroll to see it all.' },
      pager:    { t: 'Pagination',           x: 'There is more data beyond this screen — move between pages here.' },
      themeBtn: { t: 'Display mode',         x: 'Prefer dark or light? Switch the whole look with one click.' },
      form:     { t: 'The settings form',    x: 'Fill the fields to your preference — the system adapts itself.' },
      custom:   { t: 'Worth knowing',        x: '{label}' }
    }
  };

  // priority of feature types per page category (first = most important)
  var PRIORITY = {
    economic:  ['custom', 'dates', 'filter', 'tabs', 'list', 'table', 'search', 'exportBtn'],
    calendar:  ['custom', 'calgrid', 'dates', 'tabs', 'add', 'list', 'filter'],
    journal:   ['custom', 'add', 'table', 'list', 'filter', 'search', 'dates', 'exportBtn', 'kpi'],
    analytics: ['custom', 'kpi', 'chart', 'dates', 'tabs', 'filter', 'exportBtn', 'table'],
    dashboard: ['custom', 'kpi', 'chart', 'dates', 'tabs', 'table', 'list', 'exportBtn'],
    settings:  ['custom', 'form', 'tabs', 'themeBtn', 'exportBtn', 'search'],
    generic:   ['custom', 'tabs', 'dates', 'kpi', 'chart', 'table', 'list', 'add', 'search', 'filter', 'exportBtn', 'pager']
  };

  /* ============================================================
   * 6. SCANNER — reads the page and detects feature groups
   * ==========================================================*/
  var RX = {
    time: /^(היום|אתמול|מחר|השבוע|שבוע|השבוע הבא|החודש|חודש|השנה|שנה|רבעון|הכול|הכל|טווח|מותאם|today|yesterday|tomorrow|(this |next |last )?(week|month|year)|quarter|all( time)?|range|custom|ytd|mtd|\d+\s?[dwmy]|[1-9]\d?\s?(days?|weeks?|months?|years?))$/i,
    search: /(חיפוש|חפש|search|find)/i,
    add: /(^\+\s*$|^\+\s|הוסף|הוספת|חדש(ה)?$|צור|יצירת|רישום|פתח עסקה|עסקה חדשה|אירוע חדש|add|new |create|open trade|\bnew$)/i,
    exportBtn: /(ייצוא|יצוא|יצא|הורדה|הורד|גיבוי|export|download|backup|csv|excel|xlsx|\bpdf\b|הדפס|print)/i,
    filter: /(סינון|סנן|מסנן|חשיבות|עדיפות|קטגוריה|סטטוס|filter|importance|priority|category|status)/i,
    theme: /(מצב כהה|מצב בהיר|ערכת נושא|כהה|בהיר|dark mode|light mode|theme|dark|light)/i,
    pager: /(pagination|page \d|עמוד \d|הבא|הקודם|next|prev)/i,
    numeric: /^[+\-₪$€%]?[\d,.]+\s?[%₪$€kKmM]?$/
  };

  function scanScope() {
    var m = document.querySelector('main, [role="main"], [data-og-scope]');
    if (m && isVisible(m)) return m;
    return document.body;
  }

  function inScope(el, scope) {
    if (scope === document.body) {
      // when no <main>, ignore chrome: nav / header / aside / footer
      return !el.closest('nav,header,aside,footer,[role="navigation"],[role="banner"]');
    }
    return scope.contains(el);
  }

  function clickables(scope) {
    var all = scope.querySelectorAll('button, a, [role="button"], [role="tab"], input[type="button"], input[type="submit"], [class*="chip"], [class*="pill"]');
    var out = [];
    for (var i = 0; i < all.length && out.length < 400; i++) {
      var el = all[i];
      if (!isVisible(el) || !inScope(el, scope)) continue;
      out.push(el);
    }
    return out;
  }

  function commonParentGroup(els) {
    // group elements that share the same parent (or grandparent)
    var byParent = new Map();
    els.forEach(function (el) {
      var p = el.parentElement;
      var gp = p && p.parentElement;
      [p, gp].forEach(function (anc) {
        if (!anc) return;
        if (!byParent.has(anc)) byParent.set(anc, []);
        var arr = byParent.get(anc);
        if (arr.indexOf(el) === -1) arr.push(el);
      });
    });
    var best = null;
    byParent.forEach(function (arr, anc) {
      if (arr.length >= 2 && (!best || arr.length > best.arr.length)) best = { anc: anc, arr: arr };
    });
    return best;
  }

  function biggest(els, minArea) {
    var best = null, bestA = minArea || 0;
    for (var i = 0; i < els.length; i++) {
      if (!isVisible(els[i])) continue;
      var a = area(els[i]);
      if (a > bestA) { bestA = a; best = els[i]; }
    }
    return best;
  }

  function scanPage(cfg, identity) {
    var scope = scanScope();
    var groups = [];
    var used = new Set();
    function take(el) { used.add(el); var p = el.parentElement; if (p) used.add(p); }   // containers: poison wrapper too
    function takeSelf(el) { used.add(el); }                                             // small controls: keep toolbar siblings detectable
    function fresh(el) { return el && !used.has(el) && !used.has(el.parentElement); }

    // 0) author hints — data-og-feature wins everything
    var hinted = scope.querySelectorAll('[data-og-feature]');
    for (var h = 0; h < hinted.length && h < 6; h++) {
      if (!isVisible(hinted[h])) continue;
      groups.push({ type: 'custom', el: hinted[h], label: hinted[h].getAttribute('data-og-feature'), order: h });
      take(hinted[h]);
    }

    var btns = clickables(scope);

    // 1) date / time-range filter clusters
    var dateBtns = btns.filter(function (el) { var t = txt(el, 30); return t && RX.time.test(t) && fresh(el); });
    var dg = commonParentGroup(dateBtns);
    if (dg) {
      var labels = uniq(dg.arr.map(function (e) { return txt(e, 18); })).slice(0, 4);
      groups.push({ type: 'dates', el: dg.arr[0], els: dg.arr.slice(0, 8), labels: labels });
      dg.arr.forEach(takeSelf); // members only — siblings in the same toolbar stay detectable
    }

    // 2) tabs
    var tablist = scope.querySelector('[role="tablist"]');
    var tabEls = [];
    if (tablist && isVisible(tablist)) {
      tabEls = Array.prototype.filter.call(tablist.querySelectorAll('[role="tab"],button,a'), isVisible);
      if (tabEls.length >= 2 && fresh(tablist)) {
        groups.push({ type: 'tabs', el: tablist, labels: uniq(tabEls.map(function (e) { return txt(e, 16); })).slice(0, 4) });
        take(tablist); tabEls.forEach(takeSelf);
      }
    }

    // 3) search
    var searches = Array.prototype.filter.call(
      scope.querySelectorAll('input[type="search"], input[type="text"], input:not([type])'),
      function (el) {
        return isVisible(el) && inScope(el, scope) && fresh(el) &&
          RX.search.test((el.getAttribute('placeholder') || '') + ' ' + (el.getAttribute('aria-label') || ''));
      });
    if (searches[0]) { groups.push({ type: 'search', el: searches[0] }); takeSelf(searches[0]); }

    // 4) primary "add / create" button — the most prominent match
    var addCands = btns.filter(function (el) { return fresh(el) && RX.add.test(txt(el, 40)); });
    var addBtn = biggest(addCands, 0);
    if (addBtn) { groups.push({ type: 'add', el: addBtn, label: txt(addBtn, 28) }); takeSelf(addBtn); }

    // 5) export / download
    var expBtn = btns.filter(function (el) { return fresh(el) && RX.exportBtn.test(txt(el, 40)); })[0];
    if (expBtn) { groups.push({ type: 'exportBtn', el: expBtn }); takeSelf(expBtn); }

    // 6) filters: visible <select>s or filter-labelled buttons
    var selects = Array.prototype.filter.call(scope.querySelectorAll('select'), function (el) {
      return isVisible(el) && inScope(el, scope) && fresh(el);
    });
    var filterBtns = btns.filter(function (el) { return fresh(el) && RX.filter.test(txt(el, 30)); });
    if (selects.length || filterBtns.length >= 1) {
      var fEls = (selects.length ? selects : filterBtns).slice(0, 6);
      groups.push({ type: 'filter', el: fEls[0], els: fEls.length > 1 ? fEls : null });
      selects.forEach(takeSelf); filterBtns.forEach(takeSelf);
    }

    // 7) calendar grid (a container with many day cells)
    var calCand = scope.querySelectorAll('[class*="calendar"], [class*="month"], [data-og-cal]');
    for (var c = 0; c < calCand.length; c++) {
      var cc = calCand[c];
      if (!isVisible(cc) || !fresh(cc)) continue;
      var cells = cc.querySelectorAll(':scope > *, :scope > * > *');
      if (cells.length >= 25 && area(cc) > 40000) { groups.push({ type: 'calgrid', el: cc }); take(cc); break; }
    }

    // 8) KPI / stat cards — siblings holding short, big numeric text
    var kpiHost = null;
    var cardCand = scope.querySelectorAll('[class*="card"], [class*="stat"], [class*="kpi"], [class*="metric"], [class*="tile"]');
    var byParentKpi = new Map();
    for (var q = 0; q < cardCand.length; q++) {
      var card = cardCand[q];
      if (!isVisible(card) || !inScope(card, scope)) continue;
      var nums = card.querySelectorAll('*');
      var hit = false;
      for (var n = 0; n < nums.length && n < 25; n++) {
        var s = (nums[n].childElementCount === 0) ? txt(nums[n], 16) : '';
        if (s && RX.numeric.test(s) && parseFloat(getComputedStyle(nums[n]).fontSize) >= 18) { hit = true; break; }
      }
      if (!hit) continue;
      var par = card.parentElement;
      if (!par) continue;
      byParentKpi.set(par, (byParentKpi.get(par) || 0) + 1);
    }
    byParentKpi.forEach(function (cnt, par) {
      if (cnt >= 2 && (!kpiHost || cnt > kpiHost.cnt) && fresh(par)) kpiHost = { el: par, cnt: cnt };
    });
    if (kpiHost) { groups.push({ type: 'kpi', el: kpiHost.el }); take(kpiHost.el); }

    // 9) chart (svg / canvas)
    var chartEls = scope.querySelectorAll('svg.recharts-surface, .recharts-wrapper, canvas, svg[class*="chart"], [class*="chart"] svg, [data-og-chart]');
    var chart = biggest(Array.prototype.filter.call(chartEls, function (el) { return inScope(el, scope) && fresh(el); }), 12000);
    if (chart) {
      var chartBox = chart.closest('[class*="chart"], [class*="card"], [class*="panel"]') || chart;
      if (fresh(chartBox)) { groups.push({ type: 'chart', el: chartBox }); take(chartBox); take(chart); }
    }

    // 10) table / grid
    var tables = scope.querySelectorAll('table, [role="grid"], [role="table"]');
    var tbl = biggest(Array.prototype.filter.call(tables, function (el) {
      return inScope(el, scope) && fresh(el) && el.querySelectorAll('tr, [role="row"]').length >= 3;
    }), 20000);
    if (tbl) { groups.push({ type: 'table', el: tbl }); take(tbl); }

    // 11) generic repeated list (>=4 similar siblings, sizable)
    if (!tbl) {
      var listHost = null;
      var uls = scope.querySelectorAll('ul, ol, [class*="list"], [class*="rows"], [class*="feed"]');
      for (var L = 0; L < uls.length; L++) {
        var u = uls[L];
        if (!isVisible(u) || !inScope(u, scope) || !fresh(u)) continue;
        if (u.children.length >= 4 && area(u) > 30000) { listHost = u; break; }
      }
      if (listHost) { groups.push({ type: 'list', el: listHost }); take(listHost); }
    }

    // 12) settings form (many labelled inputs)
    var inputs = Array.prototype.filter.call(
      scope.querySelectorAll('input:not([type="hidden"]), select, textarea'),
      function (el) { return isVisible(el) && inScope(el, scope); });
    if (inputs.length >= 4) {
      var formEl = inputs[0].closest('form, [class*="form"], [class*="settings"], section') || inputs[0].parentElement;
      if (formEl && fresh(formEl)) { groups.push({ type: 'form', el: formEl }); take(formEl); }
    }

    // 13) theme toggle (only interesting on settings-like pages)
    var themeBtn = btns.filter(function (el) { return fresh(el) && RX.theme.test(txt(el, 30)); })[0];
    if (themeBtn) { groups.push({ type: 'themeBtn', el: themeBtn }); takeSelf(themeBtn); }

    // 14) pagination
    var pager = scope.querySelector('[class*="pagination"], nav[aria-label*="pag" i]');
    if (pager && isVisible(pager) && fresh(pager)) groups.push({ type: 'pager', el: pager });

    // ---- order by category priority, cap to maxSteps
    var category = classify(identity);
    var prio = PRIORITY[category] || PRIORITY.generic;
    groups.sort(function (a, b) {
      var ia = prio.indexOf(a.type), ib = prio.indexOf(b.type);
      if (ia === -1) ia = 99; if (ib === -1) ib = 99;
      if (ia !== ib) return ia - ib;
      return (a.order || 0) - (b.order || 0);
    });
    groups = groups.slice(0, cfg.maxSteps);

    return { category: category, groups: groups, scope: scope };
  }

  function buildContent(cfg, identity, scan, lang) {
    var L = INTROS[lang] || INTROS.en;
    var F = FEATURES[lang] || FEATURES.en;
    var pageOverride = (cfg.pages && (cfg.pages[identity.route] || cfg.pages[identity.title])) || null;
    var taggedIntro = identity.tagged && identity.tagged.getAttribute('data-og-intro');

    var introArr = (pageOverride && pageOverride.intro) ? [].concat(pageOverride.intro)
      : taggedIntro ? [taggedIntro]
      : L[scan.category] || L.generic;
    var title = (pageOverride && pageOverride.title) || identity.title;
    var intro = introArr.map(function (s) { return fmt(s, { title: title, app: cfg.appName || '' }); });

    var steps = scan.groups.map(function (g) {
      var tpl = F[g.type] || F.custom;
      var vars = {
        label: g.label || txt(g.el, 28),
        labels: (g.labels && g.labels.length) ? g.labels.join(' · ') : txt(g.el, 24)
      };
      return { el: g.el, type: g.type, title: fmt(tpl.t, vars), text: fmt(tpl.x, vars) };
    });

    if (pageOverride && pageOverride.features) {
      steps = pageOverride.features.map(function (f) {
        var el = typeof f.selector === 'string' ? document.querySelector(f.selector) : f.el;
        return el && isVisible(el) ? { el: el, type: 'custom', title: f.title || '', text: f.text || '' } : null;
      }).filter(Boolean).slice(0, cfg.maxSteps);
    }

    return { title: title, intro: intro, steps: steps, category: scan.category };
  }

  /* ============================================================
   * 7. UI LAYER — styles, intro modal, spotlight + popover
   * ==========================================================*/
  var STYLE_ID = 'og-style';
  function injectStyles() {
    if (document.getElementById(STYLE_ID)) return;
    var s = document.createElement('style');
    s.id = STYLE_ID;
    s.textContent = [
      '#og-root{position:fixed;inset:0;z-index:2147483000;pointer-events:none;font-family:var(--og-font);',
      ' -webkit-font-smoothing:antialiased;text-rendering:optimizeLegibility;}',
      '#og-root *{box-sizing:border-box;margin:0;padding:0;}',
      '.og-backdrop{position:fixed;inset:0;background:var(--og-backdrop);backdrop-filter:blur(3px) saturate(1.05);',
      ' -webkit-backdrop-filter:blur(3px) saturate(1.05);opacity:0;transition:opacity .35s ease;pointer-events:auto;}',
      '.og-backdrop.og-in{opacity:1;}',
      '.og-spot{position:fixed;pointer-events:none;border-radius:14px;',
      ' box-shadow:0 0 0 6px var(--og-accent-soft),0 0 0 9999px var(--og-backdrop);',
      ' transition:all .45s cubic-bezier(.45,.05,.2,1);}',
      '.og-spot::after{content:"";position:absolute;inset:-7px;border-radius:inherit;border:2px solid var(--og-accent);',
      ' animation:ogPulse 2.2s ease-out infinite;}',
      '.og-card{position:fixed;pointer-events:auto;background:var(--og-surface);color:var(--og-text);',
      ' border:1px solid var(--og-border);border-radius:18px;box-shadow:var(--og-shadow);',
      ' width:min(380px,calc(100vw - 28px));padding:22px 22px 18px;opacity:0;}',
      '.og-card.og-in{animation:ogPop .42s cubic-bezier(.22,1.1,.32,1) forwards;}',
      '.og-card.og-out{animation:ogFadeOut .22s ease forwards;}',
      '.og-modal{left:50%;top:50%;transform:translate(-50%,-46%) scale(.94);text-align:center;padding:30px 26px 22px;}',
      '.og-modal.og-in{animation:ogPopCenter .5s cubic-bezier(.22,1.12,.3,1) forwards;}',
      '.og-icon{width:62px;height:62px;border-radius:50%;margin:0 auto 16px;display:flex;align-items:center;justify-content:center;',
      ' background:var(--og-accent-soft);color:var(--og-accent);position:relative;animation:ogFloat 3.4s ease-in-out infinite;}',
      '.og-icon::before{content:"";position:absolute;inset:-5px;border-radius:50%;',
      ' border:1.5px dashed var(--og-glow);opacity:.55;animation:ogSpin 14s linear infinite;}',
      '.og-icon svg{width:30px;height:30px;}',
      '.og-badge{display:inline-block;font-size:11.5px;font-weight:600;letter-spacing:.4px;color:var(--og-accent);',
      ' background:var(--og-accent-soft);border-radius:999px;padding:4px 12px;margin-bottom:12px;}',
      '.og-title{font-size:19px;font-weight:700;line-height:1.35;margin-bottom:8px;}',
      '.og-text{font-size:14.5px;line-height:1.65;color:var(--og-muted);}',
      '.og-text b{color:var(--og-text);font-weight:600;}',
      '.og-actions{display:flex;align-items:center;gap:10px;margin-top:18px;}',
      '.og-modal .og-actions{justify-content:center;flex-direction:column;gap:8px;}',
      '.og-btn{pointer-events:auto;cursor:pointer;border:none;font-family:inherit;font-size:14.5px;font-weight:600;',
      ' border-radius:12px;padding:11px 20px;background:var(--og-accent);color:var(--og-accent-text);',
      ' transition:transform .15s ease, box-shadow .2s ease, filter .15s ease;box-shadow:0 6px 18px -6px var(--og-glow);}',
      '.og-btn:hover{transform:translateY(-1px);filter:brightness(1.06);}',
      '.og-btn:active{transform:translateY(0) scale(.98);}',
      '.og-btn:focus-visible{outline:2px solid var(--og-accent);outline-offset:2px;}',
      '.og-ghost{background:transparent;color:var(--og-muted);box-shadow:none;font-weight:500;font-size:13px;padding:8px 10px;}',
      '.og-ghost:hover{color:var(--og-text);filter:none;}',
      '.og-meta{display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;}',
      '.og-step-label{font-size:12px;font-weight:600;color:var(--og-accent);}',
      '.og-dots{display:flex;gap:5px;}',
      '.og-dot{width:6px;height:6px;border-radius:50%;background:var(--og-border);transition:all .3s ease;}',
      '.og-dot.og-on{background:var(--og-accent);transform:scale(1.25);}',
      '.og-spacer{flex:1;}',
      '.og-replay{position:fixed;bottom:18px;z-index:2147482999;width:42px;height:42px;border-radius:50%;border:1px solid var(--og-border);',
      ' background:var(--og-surface);color:var(--og-accent);font-size:19px;font-weight:700;cursor:pointer;font-family:var(--og-font);',
      ' box-shadow:var(--og-shadow);display:flex;align-items:center;justify-content:center;',
      ' transition:transform .2s ease, opacity .3s ease;opacity:0;animation:ogFadeIn .4s ease .25s forwards;}',
      '.og-replay:hover{transform:scale(1.1);}',
      '[dir="rtl"] .og-replay, .og-replay.og-rtl{left:18px;} .og-replay.og-ltr{right:18px;}',
      '@keyframes ogPop{from{opacity:0;transform:translateY(14px) scale(.95);}to{opacity:1;transform:translateY(0) scale(1);}}',
      '@keyframes ogPopCenter{from{opacity:0;transform:translate(-50%,-42%) scale(.92);}to{opacity:1;transform:translate(-50%,-50%) scale(1);}}',
      '@keyframes ogFadeOut{to{opacity:0;transform:translateY(6px) scale(.98);}}',
      '@keyframes ogFadeIn{to{opacity:1;}}',
      '@keyframes ogPulse{0%{transform:scale(1);opacity:.85;}70%{transform:scale(1.045);opacity:0;}100%{opacity:0;}}',
      '@keyframes ogFloat{0%,100%{transform:translateY(0);}50%{transform:translateY(-4px);}}',
      '@keyframes ogSpin{to{transform:rotate(360deg);}}',
      '@media (prefers-reduced-motion: reduce){#og-root *,.og-replay{animation:none !important;transition:none !important;opacity:1 !important;}',
      ' .og-modal{transform:translate(-50%,-50%) !important;}}'
    ].join('\n');
    document.head.appendChild(s);
  }

  var ICONS = {
    dashboard: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><rect x="3" y="3" width="8" height="8" rx="2"/><rect x="13" y="3" width="8" height="5" rx="2"/><rect x="13" y="10" width="8" height="11" rx="2"/><rect x="3" y="13" width="8" height="8" rx="2"/></svg>',
    journal:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3V4z"/><path d="M5 4v13a3 3 0 0 0 3 3"/><path d="M9.5 9h6M9.5 13h6"/></svg>',
    calendar:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 10h18M8 3v4M16 3v4"/><circle cx="9" cy="15" r="1.2" fill="currentColor" stroke="none"/><circle cx="15" cy="15" r="1.2" fill="currentColor" stroke="none"/></svg>',
    economic:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.6 2.4 4 5.6 4 9s-1.4 6.6-4 9c-2.6-2.4-4-5.6-4-9s1.4-6.6 4-9z"/></svg>',
    analytics: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M4 20V10M10 20V4M16 20v-7M21 20H3"/></svg>',
    settings:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M4 7h10M18 7h2M4 12h2M10 12h10M4 17h10M18 17h2"/><circle cx="16" cy="7" r="2"/><circle cx="8" cy="12" r="2"/><circle cx="16" cy="17" r="2"/></svg>',
    generic:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M12 3l1.8 4.6L18 9l-4.2 1.4L12 15l-1.8-4.6L6 9l4.2-1.4L12 3z"/><path d="M19 14l.9 2.1L22 17l-2.1.9L19 20l-.9-2.1L16 17l2.1-.9L19 14z"/></svg>'
  };

  function makeRoot(vars, dir) {
    var root = document.createElement('div');
    root.id = 'og-root';
    root.setAttribute('dir', dir);
    for (var k in vars) if (k.indexOf('--') === 0) root.style.setProperty(k, vars[k]);
    document.body.appendChild(root);
    return root;
  }

  function keepFocus(root) {
    function onKey(e) {
      if (e.key !== 'Tab') return;
      var f = root.querySelectorAll('button');
      if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
    root.addEventListener('keydown', onKey);
  }

  function targetRect(el, pad) {
    var r = el.getBoundingClientRect();
    return { top: r.top - pad, left: r.left - pad, width: r.width + pad * 2, height: r.height + pad * 2 };
  }

  function stepRect(step, pad) {
    var els = step.els && step.els.length ? step.els : [step.el];
    var t = Infinity, l = Infinity, b = -Infinity, rr = -Infinity, any = false;
    for (var i = 0; i < els.length; i++) {
      if (!els[i] || !document.contains(els[i])) continue;
      var r = els[i].getBoundingClientRect();
      if (!r.width && !r.height) continue;
      any = true;
      t = Math.min(t, r.top); l = Math.min(l, r.left);
      b = Math.max(b, r.bottom); rr = Math.max(rr, r.right);
    }
    if (!any) return null;
    return { top: t - pad, left: l - pad, width: (rr - l) + pad * 2, height: (b - t) + pad * 2 };
  }

  function placeCard(card, rect) {
    var vw = innerWidth, vh = innerHeight, gap = 14;
    var r = { top: rect.top, left: rect.left, right: rect.left + rect.width, bottom: rect.top + rect.height, width: rect.width, height: rect.height };
    card.style.visibility = 'hidden'; card.style.display = 'block';
    var cw = card.offsetWidth, ch = card.offsetHeight;
    var top, left;
    if (r.bottom + gap + ch <= vh - 10) top = r.bottom + gap;            // below
    else if (r.top - gap - ch >= 10) top = r.top - gap - ch;             // above
    else top = Math.max(10, Math.min(vh - ch - 10, r.top + r.height / 2 - ch / 2)); // beside
    var rtl = card.parentElement.getAttribute('dir') === 'rtl';
    left = rtl ? r.right - cw : r.left;
    if (top !== r.bottom + gap && top !== r.top - gap - ch) { // side placement
      left = rtl ? r.left - gap - cw : r.right + gap;
      if (left < 10 || left + cw > vw - 10) left = rtl ? r.right - cw : r.left;
    }
    left = Math.max(10, Math.min(vw - cw - 10, left));
    card.style.top = Math.round(top) + 'px';
    card.style.left = Math.round(left) + 'px';
    card.style.visibility = '';
  }

  /* ============================================================
   * 8. STORAGE — versioned seen-state
   * ==========================================================*/
  var memStore = {};
  function store(cfg) {
    var key = (cfg.storageKey || 'orcaGuide') + ':v' + (cfg.version || 1);
    function read() {
      try { return JSON.parse(localStorage.getItem(key) || '{}'); }
      catch (e) { return memStore; }
    }
    function write(o) {
      try { localStorage.setItem(key, JSON.stringify(o)); }
      catch (e) { memStore = o; }
    }
    return {
      seen: function (id) { return !!read()[id]; },
      mark: function (id) { var o = read(); o[id] = Date.now(); write(o); },
      reset: function () { try { localStorage.removeItem(key); } catch (e) {} memStore = {}; }
    };
  }

  /* ============================================================
   * 9. TOUR FLOW
   * ==========================================================*/
  function escHtml(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }

  function runTour(engine, identity, opts) {
    var cfg = engine.cfg;
    if (engine.state.active) return;
    engine.state.active = true;
    engine.hideReplay();

    var lang = detectLang(cfg);
    var S = I18N[lang] || I18N.en;
    var vars = detectThemeVars(cfg);
    injectStyles();

    var scan = scanPage(cfg, identity);
    var content = buildContent(cfg, identity, scan, lang);
    var root = makeRoot(vars, S.dir);
    keepFocus(root);

    var backdrop = document.createElement('div');
    backdrop.className = 'og-backdrop';
    root.appendChild(backdrop);
    requestAnimationFrame(function () { backdrop.classList.add('og-in'); });

    var spot = null, card = null, stepIdx = -1, finished = false;
    var steps = content.steps;
    var total = steps.length;

    function cleanup(markSeen) {
      if (finished) return;
      finished = true;
      engine.state.active = false;
      window.removeEventListener('resize', reposition);
      window.removeEventListener('scroll', reposition, true);
      document.removeEventListener('keydown', onKey, true);
      backdrop.classList.remove('og-in');
      if (card) card.classList.add('og-out');
      if (spot) spot.style.opacity = '0';
      setTimeout(function () { if (root.parentNode) root.parentNode.removeChild(root); }, 260);
      if (markSeen) engine.store.mark(identity.key);
      engine.showReplay();
      try {
        if (markSeen && stepIdx >= total - 1 && typeof cfg.onComplete === 'function') cfg.onComplete(identity);
        else if (markSeen && typeof cfg.onSkip === 'function') cfg.onSkip(identity);
      } catch (e) {}
    }

    engine.state.abort = function () { cleanup(false); };

    var reposition = rafThrottle(function () {
      if (finished || stepIdx < 0 || !steps[stepIdx]) return;
      var step = steps[stepIdx];
      if (!step.el || !document.contains(step.el)) return;
      var r = stepRect(step, 6);
      if (!r) return;
      if (spot) {
        spot.style.top = r.top + 'px'; spot.style.left = r.left + 'px';
        spot.style.width = r.width + 'px'; spot.style.height = r.height + 'px';
      }
      if (card) placeCard(card, r);
    });
    window.addEventListener('resize', reposition);
    window.addEventListener('scroll', reposition, true);

    function onKey(e) {
      if (e.key === 'Escape') { e.preventDefault(); cleanup(true); }
    }
    document.addEventListener('keydown', onKey, true);

    function removeCard(cb) {
      if (!card) return cb();
      var old = card; card = null;
      old.classList.add('og-out');
      setTimeout(function () { if (old.parentNode) old.parentNode.removeChild(old); cb(); }, 180);
    }

    function dots(idx) {
      var h = '<span class="og-dots">';
      for (var i = 0; i < total; i++) h += '<span class="og-dot' + (i <= idx ? ' og-on' : '') + '"></span>';
      return h + '</span>';
    }

    function showIntro() {
      card = document.createElement('div');
      card.className = 'og-card og-modal';
      card.setAttribute('role', 'dialog');
      card.setAttribute('aria-modal', 'true');
      var icon = ICONS[content.category] || ICONS.generic;
      card.innerHTML =
        '<div class="og-icon">' + icon + '</div>' +
        '<div class="og-badge">' + escHtml(S.tourBadge) + '</div>' +
        '<div class="og-title">' + escHtml(content.title) + '</div>' +
        '<div class="og-text">' + content.intro.map(escHtml).join('<br>') + '</div>' +
        '<div class="og-actions">' +
        '  <button class="og-btn" data-og="next">' + escHtml(total ? S.gotIt : S.gotItShort) + '</button>' +
        (total ? '  <button class="og-btn og-ghost" data-og="skip">' + escHtml(S.skip) + '</button>' : '') +
        '</div>';
      root.appendChild(card);
      requestAnimationFrame(function () { card.classList.add('og-in'); });
      card.querySelector('[data-og="next"]').focus({ preventScroll: true });
      card.addEventListener('click', function (e) {
        var b = e.target.closest('[data-og]');
        if (!b) return;
        if (b.getAttribute('data-og') === 'skip') return cleanup(true);
        removeCard(function () {
          if (!total) {
            // no anchored features — show a single friendly "what's here" note
            showFreeNote();
          } else {
            nextStep();
          }
        });
      });
    }

    function showFreeNote() {
      card = document.createElement('div');
      card.className = 'og-card og-modal';
      card.innerHTML =
        '<div class="og-icon">' + ICONS.generic + '</div>' +
        '<div class="og-title">' + escHtml(S.featuresIntroTitle) + '</div>' +
        '<div class="og-text">' + escHtml(S.noFeatures) + '</div>' +
        '<div class="og-actions"><button class="og-btn" data-og="done">' + escHtml(S.done) + '</button></div>';
      root.appendChild(card);
      requestAnimationFrame(function () { card.classList.add('og-in'); });
      card.querySelector('button').focus({ preventScroll: true });
      card.addEventListener('click', function (e) {
        if (e.target.closest('[data-og="done"]')) cleanup(true);
      });
    }

    function ensureSpot() {
      if (spot) return spot;
      spot = document.createElement('div');
      spot.className = 'og-spot';
      spot.style.opacity = '0';
      root.appendChild(spot);
      backdrop.classList.remove('og-in'); // spotlight's own shadow takes over dimming
      backdrop.style.background = 'transparent';
      backdrop.classList.add('og-in');
      return spot;
    }

    function nextStep() {
      stepIdx++;
      if (stepIdx >= total) return cleanup(true);
      var step = steps[stepIdx];
      var el = step.el;
      if (!el || !document.contains(el) || !isVisible(el)) return nextStep();

      try { el.scrollIntoView({ block: 'center', behavior: 'smooth' }); } catch (e) { el.scrollIntoView(); }

      setTimeout(function () {
        if (finished) return;
        var sp = ensureSpot();
        var r = stepRect(step, 6);
        if (!r) return nextStep();
        var radius = Math.min(16, parseFloat(getComputedStyle(el).borderRadius) + 6 || 14);
        sp.style.opacity = '1';
        sp.style.borderRadius = radius + 'px';
        sp.style.top = r.top + 'px'; sp.style.left = r.left + 'px';
        sp.style.width = r.width + 'px'; sp.style.height = r.height + 'px';

        removeCard(function () {
          card = document.createElement('div');
          card.className = 'og-card';
          var last = stepIdx === total - 1;
          card.innerHTML =
            '<div class="og-meta"><span class="og-step-label">' +
            escHtml(fmt(S.stepOf, { n: stepIdx + 1, total: total })) + '</span>' + dots(stepIdx) + '</div>' +
            '<div class="og-title" style="font-size:16.5px">' + escHtml(step.title) + '</div>' +
            '<div class="og-text">' + escHtml(step.text) + '</div>' +
            '<div class="og-actions">' +
            '  <button class="og-btn og-ghost" data-og="skip">' + escHtml(S.skip) + '</button>' +
            '  <span class="og-spacer"></span>' +
            '  <button class="og-btn" data-og="next">' + escHtml(last ? S.done : S.next) + '</button>' +
            '</div>';
          root.appendChild(card);
          placeCard(card, r);
          requestAnimationFrame(function () { card.classList.add('og-in'); });
          card.querySelector('[data-og="next"]').focus({ preventScroll: true });
          card.addEventListener('click', function (e) {
            var b = e.target.closest('[data-og]');
            if (!b) return;
            if (b.getAttribute('data-og') === 'skip') return cleanup(true);
            removeCard(nextStep);
          });
        });
      }, opts && opts.fast ? 80 : 380);
    }

    showIntro();
  }

  /* ============================================================
   * 10. ENGINE CORE — navigation sensing, settle, lifecycle
   * ==========================================================*/
  function Engine(cfg) {
    this.cfg = cfg;
    this.store = store(cfg);
    this.state = { lastKey: null, active: false, abort: null, pendingTimer: null };
    this.replayBtn = null;
    this.lastIdentity = null;
  }

  Engine.prototype.hideReplay = function () {
    if (this.replayBtn) { this.replayBtn.remove(); this.replayBtn = null; }
  };

  Engine.prototype.showReplay = function () {
    if (!this.cfg.replayButton || this.replayBtn || this.state.active) return;
    var identity = this.lastIdentity;
    if (!identity || isExcluded(identity, this.cfg)) return;
    var lang = detectLang(this.cfg);
    var vars = detectThemeVars(this.cfg);
    injectStyles();
    var b = document.createElement('button');
    b.className = 'og-replay ' + (I18N[lang].dir === 'rtl' ? 'og-rtl' : 'og-ltr');
    b.type = 'button';
    b.textContent = '?';
    b.title = I18N[lang].replayTitle;
    b.setAttribute('aria-label', I18N[lang].replayTitle);
    for (var k in vars) if (k.indexOf('--') === 0) b.style.setProperty(k, vars[k]);
    var self = this;
    b.addEventListener('click', function () { self.replay(); });
    document.body.appendChild(b);
    this.replayBtn = b;
  };

  Engine.prototype.checkPage = function () {
    var self = this;
    if (self.state.active) {
      // user navigated away mid-tour → abort quietly, re-evaluate
      var idNow = getIdentity();
      if (idNow.key !== self.state.lastKey && self.state.abort) {
        self.state.abort();
      } else return;
    }
    var identity = getIdentity();
    if (identity.key === this.state.lastKey) return;
    this.state.lastKey = identity.key;
    this.lastIdentity = identity;
    clearTimeout(this.state.pendingTimer);
    this.hideReplay();

    if (isExcluded(identity, this.cfg)) return;
    this.showReplay();
    if (this.store.seen(identity.key)) return;

    var self2 = this;
    this.state.pendingTimer = setTimeout(function () {
      // re-verify nothing changed while we waited
      var now = getIdentity();
      if (now.key !== identity.key || self2.state.active) return;
      if (self2.store.seen(identity.key)) return;
      runTour(self2, identity);
    }, this.cfg.delay);
  };

  Engine.prototype.start = function () {
    var self = this;
    var settle = debounce(function () { idle(function () { self.checkPage(); }); }, 350);

    // SPA navigation: history API + hash + back/forward
    ['pushState', 'replaceState'].forEach(function (m) {
      var orig = history[m];
      history[m] = function () {
        var r = orig.apply(this, arguments);
        settle();
        return r;
      };
    });
    window.addEventListener('popstate', settle);
    window.addEventListener('hashchange', settle);

    // Tab-state apps with no routing: watch meaningful DOM swaps
    var mo = new MutationObserver(function (muts) {
      for (var i = 0; i < muts.length; i++) {
        var t = muts[i].target;
        if (t && t.nodeType === 1 && t.closest && t.closest('#og-root')) continue;
        settle();
        return;
      }
    });
    mo.observe(document.body, { childList: true, subtree: true });
    this._mo = mo;

    settle();
  };

  /* ============================================================
   * 11. PUBLIC API
   * ==========================================================*/
  var DEFAULTS = {
    appName: '',
    language: 'auto',      // 'auto' | 'he' | 'en'
    theme: 'auto',         // 'auto' | 'dark' | 'light'
    accent: '',            // override accent color, e.g. '#9A7B1F'
    version: 1,            // bump to re-show all tours after big updates
    delay: 900,            // ms after page settles before tour opens
    maxSteps: 4,           // cap of feature steps per page
    exclude: [],           // paths / titles / RegExp to skip (login auto-skipped)
    replayButton: true,    // floating "?" to replay current page tour
    pages: null,           // precise overrides: { '/route' | 'Title': {title, intro:[..], features:[{selector,title,text}]} }
    storageKey: 'orcaGuide',
    onComplete: null, onSkip: null
  };

  var engine = null;

  var OrcaGuide = {
    version: VERSION,
    init: function (userCfg) {
      if (engine) return OrcaGuide;
      var cfg = {};
      for (var k in DEFAULTS) cfg[k] = DEFAULTS[k];
      for (var u in (userCfg || {})) cfg[u] = userCfg[u];
      engine = new Engine(cfg);
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () { engine.start(); });
      } else engine.start();
      return OrcaGuide;
    },
    replay: function () {
      if (!engine || engine.state.active) return;
      var identity = getIdentity();
      engine.state.lastKey = identity.key;
      engine.lastIdentity = identity;
      if (isExcluded(identity, engine.cfg)) return;
      runTour(engine, identity, { fast: true });
    },
    resetAll: function () {
      if (!engine) return;
      engine.store.reset();
      engine.state.lastKey = null;
      engine.checkPage();
    },
    scan: function () { // debug: what does the engine see right now?
      if (!engine) return null;
      var identity = getIdentity();
      var s = scanPage(engine.cfg, identity);
      return {
        identity: identity,
        excluded: isExcluded(identity, engine.cfg),
        seen: engine.store.seen(identity.key),
        language: detectLang(engine.cfg),
        theme: detectThemeVars(engine.cfg).dark ? 'dark' : 'light',
        category: s.category,
        features: s.groups.map(function (g) { return { type: g.type, labels: g.labels || g.label || txt(g.el, 30) }; })
      };
    }
  };

  global.OrcaGuide = OrcaGuide;
})(typeof window !== 'undefined' ? window : this);
