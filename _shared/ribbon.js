/* Плашка «это демо-концепт», чтобы страницу нельзя было принять за официальный сайт компании. */
(function () {
  var name = document.documentElement.getAttribute('data-company') || 'компании';
  var b = document.createElement('div');
  b.textContent = 'Демо-концепт · не официальный сайт «' + name + '» · сделал Иван для примера';
  b.style.cssText = 'position:fixed;left:50%;bottom:12px;transform:translateX(-50%);z-index:99999;' +
    'max-width:92vw;padding:8px 14px;border-radius:999px;background:rgba(20,20,24,.92);color:#fff;' +
    'font:12px/1.3 system-ui,sans-serif;text-align:center;box-shadow:0 6px 24px rgba(0,0,0,.3)';
  b.addEventListener('click', function () { b.style.display = 'none'; });
  b.title = 'Нажмите, чтобы скрыть';
  document.body.appendChild(b);
})();
