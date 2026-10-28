(function () {
  // Same behaviour as reader-core/embed-child: report content height to the reader, at most once per frame.
  if (window.parent === window) return;
  var request = 0, last = -1;
  function height() { var r = document.documentElement, b = document.body; return Math.ceil(Math.max(r.scrollHeight, r.offsetHeight, b ? b.scrollHeight : 0, b ? b.offsetHeight : 0)); }
  function schedule() {
    if (request) return;
    request = requestAnimationFrame(function () {
      request = 0; var h = height();
      if (Math.abs(h - last) < 2) return;
      last = h; window.parent.postMessage({ type: 'reader-embed:height', version: 1, height: Math.max(0, Math.ceil(h)) }, '*');
    });
  }
  if (typeof ResizeObserver !== 'undefined') { var o = new ResizeObserver(schedule); o.observe(document.documentElement); if (document.body) o.observe(document.body); }
  window.addEventListener('load', schedule); window.addEventListener('resize', schedule); schedule();
})();
