// Публичная версия на GitHub Pages: сервера нет, поэтому «заявки» живут в браузере посетителя (localStorage) и никуда не отправляются.
// Локально (http://localhost:8109) этот файл ничего не делает: там работает настоящий server.py.
(() => {
  if (['localhost', '127.0.0.1'].includes(location.hostname) && location.port === '8109') return;
  window.__gmStatic = true;
  const KEY = 'gm-leads-v1';
  const STATUSES = ['новая', 'в работе', 'готово', 'отказ'];
  const DEVICES = ['Телефон', 'Ноутбук', 'Планшет', 'Компьютер', 'Другая техника'];
  const CONTACTS = ['Позвоните мне', 'Напишите в Telegram', 'Напишите в WhatsApp'];
  const SAMPLES = [
    ['Анна', '+7 921 000-00-01', 'Телефон', 'Разбит экран, остальное работает', 'Позвоните мне'],
    ['Дмитрий', '+7 911 000-00-02', 'Ноутбук', 'Не включается после обновления, нужна диагностика', 'Напишите в Telegram'],
    ['Ольга', '+7 931 000-00-03', 'Планшет', 'Быстро садится батарея', 'Напишите в WhatsApp'],
  ];
  const p2 = (n) => String(n).padStart(2, '0');
  const now = () => { const d = new Date(); return `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())} ${p2(d.getHours())}:${p2(d.getMinutes())}:${p2(d.getSeconds())}`; };
  const clean = (s, n) => String(s == null ? '' : s).replace(/[\x00-\x08\x0b-\x1f]/g, '').trim().slice(0, n);

  let mem = null;
  const load = () => {
    if (mem) return mem;
    try { const raw = localStorage.getItem(KEY); if (raw) return (mem = JSON.parse(raw)); } catch (e) { /* без хранилища работаем в памяти */ }
    mem = SAMPLES.map((s, i) => ({ id: i + 1, at: now(), name: s[0], phone: s[1], device: s[2], text: s[3], contact: s[4], status: 'новая', sample: true }));
    save(mem);
    return mem;
  };
  const save = (items) => { mem = items; try { localStorage.setItem(KEY, JSON.stringify(items)); } catch (e) { /* память вкладки */ } };
  const json = (code, obj) => new Response(JSON.stringify(obj), { status: code, headers: { 'Content-Type': 'application/json' } });

  const handle = (route, body) => {
    if (route === 'leads') return json(200, { ok: true, items: load().slice().reverse(), statuses: STATUSES });
    if (route === 'lead') {
      if (clean(body.website, 50)) return json(200, { ok: true });          // ловушка для ботов
      const name = clean(body.name, 60), phone = clean(body.phone, 30), text = clean(body.text, 600);
      if (name.length < 2) return json(400, { ok: false, error: 'Укажите имя.' });
      if (phone.replace(/\D/g, '').length < 10) return json(400, { ok: false, error: 'Укажите телефон полностью.' });
      if (body.consent !== true) return json(400, { ok: false, error: 'Нужно согласие на обработку данных.' });
      const items = load().slice();
      const lead = { id: Math.max(0, ...items.map((x) => x.id)) + 1, at: now(), name, phone, text, status: 'новая', sample: false,
        device: DEVICES.includes(body.device) ? body.device : 'Другая техника', contact: CONTACTS.includes(body.contact) ? body.contact : CONTACTS[0] };
      items.push(lead); save(items);
      return json(200, { ok: true, id: lead.id });
    }
    if (route === 'status') {
      const items = load().map((x) => ({ ...x }));
      const it = items.find((x) => x.id === body.id);
      if (!STATUSES.includes(body.status) || !it) return json(400, { ok: false, error: 'Неверные данные.' });
      it.status = body.status; save(items);
      return json(200, { ok: true });
    }
    if (route === 'clear-samples') { const left = load().filter((x) => !x.sample); save(left); return json(200, { ok: true, left: left.length }); }
    return json(404, { error: 'not found' });
  };

  const orig = window.fetch.bind(window);
  window.fetch = async (input, init) => {
    const url = typeof input === 'string' ? input : input.url;
    const m = /api\/(leads|lead|status|clear-samples)(\?|$)/.exec(url);
    if (!m) return orig(input, init);
    let body = {};
    try { body = init && init.body ? JSON.parse(init.body) : {}; } catch (e) { /* пустое тело */ }
    return handle(m[1], body);
  };

  document.addEventListener('DOMContentLoaded', () => {
    const bar = document.querySelector('.demo');
    if (!bar) return;
    const note = document.createElement('div');
    note.className = 'demo';
    note.textContent = 'публичная демо-версия · заявки сохраняются только в вашем браузере и никуда не отправляются';
    bar.after(note);
  });
})();
