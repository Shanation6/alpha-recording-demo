/* ============================================================
   ALPHA REC — концепт сайта студии звукозаписи
   Бриф → резюме → WhatsApp. Без автозапуска звука.
   ============================================================ */
(function () {
  'use strict';

  var WHATSAPP_NUMBER = '79831661666';
  var prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  /* ---------- Шапка: тень при скролле ---------- */

  var header = document.querySelector('.site-header');
  function onScrollHeader() {
    header.classList.toggle('is-scrolled', window.scrollY > 8);
  }
  window.addEventListener('scroll', onScrollHeader, { passive: true });
  onScrollHeader();

  /* ---------- Мобильное меню ---------- */

  var navToggle = document.querySelector('.nav-toggle');
  var siteNav = document.getElementById('site-nav');

  function setMenu(open) {
    navToggle.setAttribute('aria-expanded', String(open));
    siteNav.classList.toggle('is-open', open);
  }

  navToggle.addEventListener('click', function () {
    setMenu(navToggle.getAttribute('aria-expanded') !== 'true');
  });

  siteNav.addEventListener('click', function (event) {
    if (event.target.closest('a')) setMenu(false);
  });

  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && navToggle.getAttribute('aria-expanded') === 'true') {
      setMenu(false);
      navToggle.focus();
    }
  });

  document.addEventListener('click', function (event) {
    if (
      navToggle.getAttribute('aria-expanded') === 'true' &&
      !event.target.closest('.site-nav') &&
      !event.target.closest('.nav-toggle')
    ) {
      setMenu(false);
    }
  });

  /* ---------- Подсветка активного раздела ---------- */

  var navLinks = Array.prototype.slice.call(document.querySelectorAll('.nav-link'));
  var sections = navLinks
    .map(function (link) { return document.querySelector(link.getAttribute('href')); })
    .filter(Boolean);

  if ('IntersectionObserver' in window && sections.length) {
    var sectionObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        navLinks.forEach(function (link) {
          var active = link.getAttribute('href') === '#' + entry.target.id;
          if (active) link.setAttribute('aria-current', 'true');
          else link.removeAttribute('aria-current');
        });
      });
    }, { rootMargin: '-40% 0px -55% 0px' });
    sections.forEach(function (section) { sectionObserver.observe(section); });
  }

  /* ---------- Появление блоков при скролле ---------- */

  var revealEls = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && !prefersReducedMotion.matches) {
    var revealObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          revealObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    revealEls.forEach(function (el) { revealObserver.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add('no-anim'); });
  }

  /* ---------- Волны на дорожках (декоративные, детерминированные) ---------- */

  function seededRandom(seed) {
    var state = seed;
    return function () {
      state = (state * 9301 + 49297) % 233280;
      return state / 233280;
    };
  }

  function buildWave(container, count, seed, profile) {
    var rand = seededRandom(seed);
    var fragment = document.createDocumentFragment();
    for (var i = 0; i < count; i += 1) {
      var bar = document.createElement('i');
      var t = i / count;
      var envelope = profile(t, rand);
      bar.style.height = Math.max(6, Math.round(envelope * 100)) + '%';
      fragment.appendChild(bar);
    }
    container.appendChild(fragment);
  }

  var waveProfiles = {
    vox: function (t, rand) {
      var phrase = Math.sin(t * Math.PI * 5.2) * 0.5 + 0.5;
      var breath = Math.sin(t * Math.PI * 1.3) * 0.3 + 0.55;
      return phrase * breath * (0.45 + rand() * 0.55);
    },
    beat: function (t, rand) {
      var kick = (Math.floor(t * 32) % 4 === 0) ? 0.9 : 0.35;
      return kick * (0.5 + rand() * 0.5);
    },
    fx: function (t, rand) {
      return (Math.sin(t * Math.PI * 2) * 0.4 + 0.4) * (0.3 + rand() * 0.7);
    },
    listen: function (t, rand) {
      var swell = Math.sin(t * Math.PI) * 0.65 + 0.25;
      return swell * (0.4 + rand() * 0.6);
    }
  };

  document.querySelectorAll('[data-wave]').forEach(function (lane) {
    var kind = lane.getAttribute('data-wave');
    var isListen = kind === 'listen';
    var count = isListen ? 56 : 72;
    var seed = { vox: 11, beat: 47, fx: 83, listen: 29 }[kind] || 7;
    buildWave(lane, count, seed, waveProfiles[kind] || waveProfiles.vox);
  });

  /* ---------- Таймкод и плейхед героя ---------- */

  var timecodeEl = document.getElementById('hero-timecode');
  var playhead = document.getElementById('hero-playhead');
  var tracksBox = document.querySelector('.hero-tracks');
  var tcStart = null;
  var tcRaf = null;

  function pad2(n) { return String(n).padStart(2, '0'); }

  function formatTimecode(ms) {
    var totalFrames = Math.floor(ms / 40); // 25 fps
    var frames = totalFrames % 25;
    var totalSeconds = Math.floor(totalFrames / 25);
    var seconds = totalSeconds % 60;
    var minutes = Math.floor(totalSeconds / 60) % 60;
    var hours = Math.floor(totalSeconds / 3600) % 24;
    return pad2(hours) + ':' + pad2(minutes) + ':' + pad2(seconds) + ':' + pad2(frames);
  }

  function tickTimecode(now) {
    if (tcStart === null) tcStart = now;
    var elapsed = now - tcStart;
    timecodeEl.textContent = formatTimecode(elapsed);

    if (playhead && tracksBox) {
      var laneWidth = tracksBox.clientWidth - 90;
      var cycle = 16000; // один проход за 16 секунд
      var progress = (elapsed % cycle) / cycle;
      playhead.style.transform = 'translateX(' + Math.round(progress * Math.max(laneWidth, 0)) + 'px)';
    }
    tcRaf = window.requestAnimationFrame(tickTimecode);
  }

  function startTimecode() {
    if (prefersReducedMotion.matches || tcRaf !== null || document.hidden) return;
    tcRaf = window.requestAnimationFrame(tickTimecode);
  }

  function stopTimecode() {
    if (tcRaf !== null) {
      window.cancelAnimationFrame(tcRaf);
      tcRaf = null;
    }
  }

  document.addEventListener('visibilitychange', function () {
    if (document.hidden) stopTimecode();
    else startTimecode();
  });

  if (typeof prefersReducedMotion.addEventListener === 'function') {
    prefersReducedMotion.addEventListener('change', function () {
      if (prefersReducedMotion.matches) {
        stopTimecode();
        timecodeEl.textContent = '00:00:00:00';
      } else {
        tcStart = null;
        startTimecode();
      }
    });
  }

  if (prefersReducedMotion.matches) {
    timecodeEl.textContent = '00:00:00:00';
  } else {
    startTimecode();
  }

  /* ============================================================
     БРИФ НА ЗАПИСЬ
     ============================================================ */

  var form = document.getElementById('brief-form');
  if (!form) return;

  var summaryEmpty = document.getElementById('summary-empty');
  var summaryList = document.getElementById('summary-list');
  var messageWrap = document.getElementById('summary-message-wrap');
  var messagePre = document.getElementById('summary-message');
  var summaryActions = document.getElementById('summary-actions');
  var waLink = document.getElementById('wa-link');
  var copyBtn = document.getElementById('copy-message');
  var copyStatus = document.getElementById('copy-status');
  var errorSummary = document.getElementById('error-summary');
  var errorSummaryList = document.getElementById('error-summary-list');
  var commentInput = document.getElementById('comment');
  var commentCount = document.getElementById('comment-count');
  var dateInput = document.getElementById('date');

  var sumFields = {
    goal: document.getElementById('sum-goal'),
    material: document.getElementById('sum-material'),
    people: document.getElementById('sum-people'),
    tracks: document.getElementById('sum-tracks'),
    date: document.getElementById('sum-date'),
    comment: document.getElementById('sum-comment')
  };
  var sumCommentRow = document.getElementById('sum-comment-row');

  /* Минимальная дата — сегодня (локальная таймзона) */
  function todayISO() {
    var now = new Date();
    return now.getFullYear() + '-' + pad2(now.getMonth() + 1) + '-' + pad2(now.getDate());
  }
  dateInput.min = todayISO();

  /* ---------- Чтение значений ---------- */

  function radioValue(name) {
    var checked = form.querySelector('input[name="' + name + '"]:checked');
    return checked ? checked.value : '';
  }

  function numberValue(id) {
    var input = document.getElementById(id);
    var raw = input.value.trim();
    if (raw === '') return null;
    var num = Number(raw);
    return Number.isFinite(num) ? num : NaN;
  }

  function collectBrief() {
    return {
      goal: radioValue('goal'),
      material: radioValue('material'),
      people: numberValue('people'),
      tracks: numberValue('tracks'),
      date: dateInput.value,
      comment: commentInput.value.trim()
    };
  }

  /* ---------- Валидация ---------- */

  var validators = {
    goal: function (brief) {
      return brief.goal ? '' : 'Выбери цель обращения.';
    },
    material: function (brief) {
      return brief.material ? '' : 'Отметь, есть ли готовый материал.';
    },
    people: function (brief) {
      if (brief.people === null) return 'Укажи число участников.';
      if (Number.isNaN(brief.people) || !Number.isInteger(brief.people)) return 'Число участников должно быть целым.';
      if (brief.people < 1 || brief.people > 20) return 'Участников может быть от 1 до 20.';
      return '';
    },
    tracks: function (brief) {
      if (brief.tracks === null) return 'Укажи число треков.';
      if (Number.isNaN(brief.tracks) || !Number.isInteger(brief.tracks)) return 'Число треков должно быть целым.';
      if (brief.tracks < 1 || brief.tracks > 30) return 'Треков может быть от 1 до 30.';
      return '';
    },
    date: function (brief) {
      if (!brief.date) return 'Выбери желаемую дату.';
      if (brief.date < todayISO()) return 'Дата уже прошла — выбери сегодняшний день или позже.';
      return '';
    },
    comment: function (brief) {
      if (brief.comment.length > 600) return 'Комментарий длиннее 600 символов — сократи его.';
      return '';
    }
  };

  var fieldLabels = {
    goal: 'Цель обращения',
    material: 'Готовый материал',
    people: 'Участники',
    tracks: 'Треки',
    date: 'Желаемая дата',
    comment: 'Комментарий'
  };

  var touched = {};

  function fieldAnchor(name) {
    if (name === 'goal' || name === 'material') {
      return form.querySelector('input[name="' + name + '"]');
    }
    return document.getElementById(name);
  }

  function fieldWrap(name) {
    var anchor = fieldAnchor(name);
    return anchor ? anchor.closest('.field') : null;
  }

  function showFieldError(name, message) {
    var errorEl = document.getElementById(name + '-error');
    var wrap = fieldWrap(name);
    var anchor = fieldAnchor(name);
    if (!errorEl || !wrap) return;

    if (message) {
      errorEl.textContent = message;
      errorEl.hidden = false;
      wrap.classList.add('has-error');
      if (anchor) anchor.setAttribute('aria-invalid', 'true');
    } else {
      errorEl.textContent = '';
      errorEl.hidden = true;
      wrap.classList.remove('has-error');
      if (anchor) anchor.removeAttribute('aria-invalid');
    }
  }

  function validateField(name, brief) {
    var message = validators[name](brief);
    showFieldError(name, message);
    return message;
  }

  function validateAll(brief) {
    var errors = [];
    Object.keys(validators).forEach(function (name) {
      var message = validateField(name, brief);
      if (message) errors.push({ name: name, message: message });
    });
    return errors;
  }

  function renderErrorSummary(errors) {
    errorSummaryList.innerHTML = '';
    if (!errors.length) {
      errorSummary.hidden = true;
      return;
    }
    errors.forEach(function (error) {
      var li = document.createElement('li');
      var a = document.createElement('a');
      a.href = '#' + (error.name === 'goal' || error.name === 'material' ? error.name + '-hint' : error.name);
      a.textContent = fieldLabels[error.name] + ': ' + error.message;
      a.addEventListener('click', function (event) {
        event.preventDefault();
        var anchor = fieldAnchor(error.name);
        if (anchor) {
          anchor.focus();
          anchor.scrollIntoView({ block: 'center', behavior: prefersReducedMotion.matches ? 'auto' : 'smooth' });
        }
      });
      li.appendChild(a);
      errorSummaryList.appendChild(li);
    });
    errorSummary.hidden = false;
    errorSummary.focus();
  }

  /* ---------- Форматирование для резюме ---------- */

  var monthNames = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];

  function formatDateHuman(iso) {
    if (!iso) return '';
    var parts = iso.split('-');
    if (parts.length !== 3) return iso;
    var year = Number(parts[0]);
    var month = Number(parts[1]);
    var day = Number(parts[2]);
    if (!year || !month || !day) return iso;
    return day + ' ' + monthNames[month - 1] + ' ' + year;
  }

  function pluralRu(n, one, few, many) {
    var abs = Math.abs(n) % 100;
    var last = abs % 10;
    if (abs > 10 && abs < 20) return many;
    if (last > 1 && last < 5) return few;
    if (last === 1) return one;
    return many;
  }

  function peopleText(n) {
    if (n === null || Number.isNaN(n)) return '';
    return n + ' ' + pluralRu(n, 'участник', 'участника', 'участников');
  }

  function tracksText(n) {
    if (n === null || Number.isNaN(n)) return '';
    return n + ' ' + pluralRu(n, 'трек', 'трека', 'треков');
  }

  /* ---------- Сообщение для WhatsApp ---------- */

  function buildMessage(brief) {
    var lines = [
      'Привет! Хочу записаться в студию Alpha. Мой бриф:',
      '',
      '• Цель: ' + (brief.goal || '—'),
      '• Готовый материал: ' + (brief.material || '—'),
      '• Участники: ' + (peopleText(brief.people) || '—'),
      '• Треки: ' + (tracksText(brief.tracks) || '—'),
      '• Желаемая дата: ' + (formatDateHuman(brief.date) || '—')
    ];
    if (brief.comment) {
      lines.push('• Комментарий: ' + brief.comment);
    }
    lines.push('', 'Это пожелания с сайта-концепта — подтвердите, пожалуйста, возможность, стоимость и время.');
    return lines.join('\n');
  }

  function whatsappUrl(message) {
    return 'https://wa.me/' + WHATSAPP_NUMBER + '?text=' + encodeURIComponent(message);
  }

  /* ---------- Живое резюме ---------- */

  var lastMessage = '';

  function updateSummary() {
    var brief = collectBrief();
    /* Счётчики со значением по умолчанию (1) не считаются заполнением */
    var hasAnything = Boolean(brief.goal || brief.material || brief.date || brief.comment) ||
      (brief.people !== null && brief.people !== 1) ||
      (brief.tracks !== null && brief.tracks !== 1);

    var complete = !validators.goal(brief) && !validators.material(brief) &&
      !validators.people(brief) && !validators.tracks(brief) && !validators.date(brief) &&
      !validators.comment(brief);

    summaryEmpty.hidden = hasAnything;
    summaryList.hidden = !hasAnything;

    sumFields.goal.textContent = brief.goal || '—';
    sumFields.material.textContent = brief.material || '—';
    sumFields.people.textContent = peopleText(brief.people) || '—';
    sumFields.tracks.textContent = tracksText(brief.tracks) || '—';
    sumFields.date.textContent = formatDateHuman(brief.date) || '—';
    sumFields.comment.textContent = brief.comment || '—';
    sumCommentRow.hidden = !brief.comment;

    if (complete) {
      lastMessage = buildMessage(brief);
      messagePre.textContent = lastMessage;
      waLink.href = whatsappUrl(lastMessage);
      messageWrap.hidden = false;
      summaryActions.hidden = false;
    } else {
      lastMessage = '';
      messageWrap.hidden = true;
      summaryActions.hidden = true;
      copyStatus.textContent = '';
    }
  }

  /* ---------- События формы ---------- */

  form.addEventListener('input', function (event) {
    var name = event.target.name;
    if (name === 'comment') {
      commentCount.textContent = commentInput.value.length + ' / 600';
    }
    if (touched[name] && validators[name]) {
      validateField(name, collectBrief());
    }
    updateSummary();
  });

  form.addEventListener('change', function (event) {
    var name = event.target.name;
    if (validators[name]) {
      touched[name] = true;
      validateField(name, collectBrief());
    }
    updateSummary();
  });

  form.addEventListener('focusout', function (event) {
    var name = event.target.name;
    if (validators[name] && !touched[name]) {
      touched[name] = true;
      validateField(name, collectBrief());
    }
  });

  form.addEventListener('submit', function (event) {
    event.preventDefault();
    Object.keys(validators).forEach(function (name) { touched[name] = true; });
    var brief = collectBrief();
    var errors = validateAll(brief);
    renderErrorSummary(errors);
    updateSummary();

    if (errors.length) return;

    /* Полностью валидный бриф: открываем WhatsApp с готовым сообщением */
    var url = whatsappUrl(buildMessage(brief));
    window.open(url, '_blank', 'noopener');
    copyStatus.textContent = 'WhatsApp открыт в новой вкладке. Если окно не появилось — скопируй текст вручную.';
  });

  form.addEventListener('reset', function () {
    window.setTimeout(function () {
      touched = {};
      Object.keys(validators).forEach(function (name) { showFieldError(name, ''); });
      renderErrorSummary([]);
      commentCount.textContent = '0 / 600';
      dateInput.min = todayISO();
      updateSummary();
    }, 0);
  });

  /* ---------- Степперы ---------- */

  document.querySelectorAll('.stepper-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var input = document.getElementById(btn.getAttribute('data-target'));
      var step = Number(btn.getAttribute('data-step'));
      var min = Number(input.min);
      var max = Number(input.max);
      var current = Number(input.value);
      if (!Number.isFinite(current)) current = min;
      var next = Math.min(max, Math.max(min, current + step));
      input.value = String(next);
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    });
  });

  /* ---------- Копирование сообщения ---------- */

  function fallbackCopy(text) {
    var area = document.createElement('textarea');
    area.value = text;
    area.setAttribute('readonly', '');
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    var ok = false;
    try { ok = document.execCommand('copy'); } catch (err) { ok = false; }
    document.body.removeChild(area);
    return ok;
  }

  copyBtn.addEventListener('click', function () {
    if (!lastMessage) return;
    function done(ok) {
      copyStatus.textContent = ok
        ? 'Текст скопирован — вставь его в чат WhatsApp.'
        : 'Не удалось скопировать автоматически. Выдели текст выше и скопируй вручную.';
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(lastMessage).then(function () { done(true); }, function () { done(fallbackCopy(lastMessage)); });
    } else {
      done(fallbackCopy(lastMessage));
    }
  });

  /* ---------- Инициализация ---------- */

  updateSummary();
})();