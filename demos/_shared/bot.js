/* Демо Telegram-бота записи. Всё работает в браузере, ничего никуда не отправляется. */
(function () {
  var MONTHS = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
  var WD = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'];

  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }
  function hash(str) {
    var h = 0;
    for (var i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
    return h;
  }
  function pad(n) { return n < 10 ? '0' + n : '' + n; }
  function dateKey(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function dateLabel(d) { return WD[d.getDay()] + ', ' + d.getDate() + ' ' + MONTHS[d.getMonth()]; }

  function mount(sel, cfg) {
    var root = document.querySelector(sel);
    if (!root) return;
    var storeKey = 'bot-demo:' + cfg.handle;
    var bookings = [];
    try { bookings = JSON.parse(localStorage.getItem(storeKey) || '[]'); } catch (e) { bookings = []; }
    function save() { try { localStorage.setItem(storeKey, JSON.stringify(bookings)); } catch (e) {} }

    root.innerHTML =
      '<div class="bd">' +
      '<div class="bd-tabs">' +
      '<button class="on" data-t="client">Клиент в Telegram</button>' +
      '<button data-t="admin">Панель администратора <span class="bd-badge">0</span></button>' +
      '</div>' +
      '<div class="bd-phone">' +
      '<div class="bd-head"><div class="bd-ava">' + esc(cfg.avatar) + '</div>' +
      '<div><b>' + esc(cfg.botName) + '</b><small>бот · ' + esc(cfg.handle) + '</small></div></div>' +
      '<div class="bd-msgs"></div>' +
      '<div class="bd-kb"></div>' +
      '<form class="bd-form" hidden><input type="text" autocomplete="off" maxlength="40"><button type="submit" aria-label="Отправить">➤</button></form>' +
      '</div>' +
      '<div class="bd-admin" hidden></div>' +
      '</div>';

    var el = {
      msgs: root.querySelector('.bd-msgs'),
      kb: root.querySelector('.bd-kb'),
      form: root.querySelector('.bd-form'),
      input: root.querySelector('.bd-form input'),
      phone: root.querySelector('.bd-phone'),
      admin: root.querySelector('.bd-admin'),
      badge: root.querySelector('.bd-badge'),
      tabs: root.querySelectorAll('.bd-tabs button')
    };
    var pendingInput = null;

    function scroll() { el.msgs.scrollTop = el.msgs.scrollHeight; }
    function say(html, who) {
      var m = document.createElement('div');
      m.className = 'bd-m ' + (who === 'me' ? 'me' : 'bot');
      m.innerHTML = html;
      el.msgs.appendChild(m);
      scroll();
    }
    function keyboard(rows) {
      el.kb.innerHTML = '';
      rows.forEach(function (row) {
        var r = document.createElement('div');
        r.className = 'bd-row';
        row.forEach(function (b) {
          var btn = document.createElement('button');
          btn.type = 'button';
          btn.textContent = b.t;
          if (b.off) btn.disabled = true;
          btn.addEventListener('click', function () {
            if (b.off) return;
            say(esc(b.t), 'me');
            el.kb.innerHTML = '';
            setTimeout(b.go, 350);
          });
          r.appendChild(btn);
        });
        el.kb.appendChild(r);
      });
      scroll();
    }
    function ask(prompt, cb) {
      say(prompt);
      el.kb.innerHTML = '';
      el.form.hidden = false;
      el.input.value = '';
      el.input.focus({ preventScroll: true });
      pendingInput = cb;
    }
    el.form.addEventListener('submit', function (e) {
      e.preventDefault();
      var v = el.input.value.trim();
      if (!v || !pendingInput) return;
      var cb = pendingInput;
      pendingInput = null;
      el.form.hidden = true;
      say(esc(v), 'me');
      setTimeout(function () { cb(v); }, 350);
    });

    function isBusy(d, svc, slot) {
      var k = dateKey(d) + '|' + slot;
      if (bookings.some(function (b) { return b.key === k && b.svc === svc.name; })) return true;
      return hash(k + svc.name) % 4 === 0;
    }

    function menu() {
      say(cfg.greeting);
      keyboard([
        [{ t: '📅 Записаться', go: pickService }],
        [{ t: '💬 Услуги и цены', go: showServices }, { t: '🗂 Мои записи', go: myBookings }],
        [{ t: '👩‍💼 Связаться с администратором', go: contactAdmin }]
      ]);
    }
    function showServices() {
      var lines = cfg.services.map(function (s) {
        return '<b>' + esc(s.name) + '</b>' + (s.meta ? '<br><small>' + esc(s.meta) + '</small>' : '');
      }).join('<br><br>');
      say(lines + '<br><br><small>' + esc(cfg.priceNote || 'Цены в демо не указаны, это пример.') + '</small>');
      keyboard([[{ t: '📅 Записаться', go: pickService }], [{ t: '⬅️ В меню', go: menu }]]);
    }
    function contactAdmin() {
      say('Передам администратору, он ответит в рабочее время. А пока можно записаться сразу в боте 👇');
      keyboard([[{ t: '📅 Записаться', go: pickService }], [{ t: '⬅️ В меню', go: menu }]]);
    }
    function pickService() {
      say('Выберите услугу:');
      var rows = cfg.services.map(function (s) {
        return [{ t: s.name, go: function () { pickDay(s); } }];
      });
      rows.push([{ t: '⬅️ В меню', go: menu }]);
      keyboard(rows);
    }
    function pickDay(svc) {
      say('Выберите день:');
      var rows = [], row = [];
      var closed = cfg.closedWeekdays || [];
      var shown = 0, i = 0;
      while (shown < (cfg.daysAhead || 6) && i < 30) {
        var d = new Date();
        d.setDate(d.getDate() + i);
        i++;
        if (closed.indexOf(d.getDay()) !== -1) continue;
        (function (d) {
          row.push({ t: dateLabel(d), go: function () { pickTime(svc, d); } });
        })(d);
        shown++;
        if (row.length === 2) { rows.push(row); row = []; }
      }
      if (row.length) rows.push(row);
      rows.push([{ t: '⬅️ Назад', go: pickService }]);
      keyboard(rows);
    }
    function pickTime(svc, d) {
      var free = cfg.slots.filter(function (s) { return !isBusy(d, svc, s); });
      if (!free.length) {
        say('На этот день свободных мест нет 😔 Выберите другой.');
        return pickDay(svc);
      }
      say('Свободное время на ' + esc(dateLabel(d)) + ':');
      var rows = [], row = [];
      cfg.slots.forEach(function (s) {
        var busy = isBusy(d, svc, s);
        row.push({ t: busy ? s + ' ✕' : s, off: busy, go: function () { getName(svc, d, s); } });
        if (row.length === 3) { rows.push(row); row = []; }
      });
      if (row.length) rows.push(row);
      rows.push([{ t: '⬅️ Другой день', go: function () { pickDay(svc); } }]);
      keyboard(rows);
    }
    function getName(svc, d, slot) {
      ask('Как вас зовут?', function (name) { confirm(svc, d, slot, name); });
    }
    function confirm(svc, d, slot, name) {
      say('Проверьте запись:<br><b>' + esc(svc.name) + '</b><br>' + esc(dateLabel(d)) + ' в ' + esc(slot) + '<br>Имя: ' + esc(name));
      keyboard([[
        { t: '✅ Подтвердить', go: function () { finish(svc, d, slot, name); } },
        { t: '✖️ Отмена', go: menu }
      ]]);
    }
    function finish(svc, d, slot, name) {
      bookings.push({
        id: Date.now(), key: dateKey(d) + '|' + slot, svc: svc.name,
        when: dateLabel(d) + ', ' + slot, name: name, status: 'новая'
      });
      save();
      renderAdmin(true);
      say('Готово, вы записаны ✅<br><small>За день до визита пришлю напоминание.</small>');
      keyboard([[{ t: '🗂 Мои записи', go: myBookings }], [{ t: '⬅️ В меню', go: menu }]]);
    }
    function myBookings() {
      if (!bookings.length) {
        say('Пока записей нет.');
        return keyboard([[{ t: '📅 Записаться', go: pickService }], [{ t: '⬅️ В меню', go: menu }]]);
      }
      say(bookings.map(function (b) {
        return '• <b>' + esc(b.svc) + '</b><br>' + esc(b.when);
      }).join('<br>'));
      keyboard([[{ t: '🗑 Отменить последнюю', go: cancelLast }], [{ t: '⬅️ В меню', go: menu }]]);
    }
    function cancelLast() {
      bookings.pop();
      save();
      renderAdmin();
      say('Запись отменена.');
      keyboard([[{ t: '⬅️ В меню', go: menu }]]);
    }

    function renderAdmin(flash) {
      el.badge.textContent = bookings.length;
      var h = '<h4>Заявки из бота</h4>';
      if (!bookings.length) {
        h += '<p class="bd-empty">Пока пусто. Запишитесь в боте слева, и заявка появится здесь с уведомлением.</p>';
      } else {
        h += '<table><thead><tr><th>Клиент</th><th>Услуга</th><th>Когда</th><th>Статус</th></tr></thead><tbody>';
        bookings.slice().reverse().forEach(function (b) {
          h += '<tr><td>' + esc(b.name) + '</td><td>' + esc(b.svc) + '</td><td>' + esc(b.when) + '</td><td><span class="bd-st">' + esc(b.status) + '</span></td></tr>';
        });
        h += '</tbody></table>';
      }
      h += '<p class="bd-hint">В рабочем боте администратор получает такое же уведомление в Telegram и может подтвердить, перенести или отменить запись одной кнопкой.</p>';
      el.admin.innerHTML = h;
      if (flash) el.badge.classList.add('pulse');
      setTimeout(function () { el.badge.classList.remove('pulse'); }, 1200);
    }

    el.tabs.forEach(function (b) {
      b.addEventListener('click', function () {
        el.tabs.forEach(function (x) { x.classList.toggle('on', x === b); });
        var admin = b.getAttribute('data-t') === 'admin';
        el.admin.hidden = !admin;
        el.phone.hidden = admin;
      });
    });

    renderAdmin();
    setTimeout(menu, 300);
  }

  window.BotDemo = { mount: mount };
})();
