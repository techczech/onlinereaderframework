(function () {
  var box = document.querySelector('[data-cramped-box]'), text = box.querySelector('p'), hint = box.querySelector('[data-hint]');
  var CLASSES = __CLASSES__;
  var revealed = false;
  function render() {
    box.className = revealed ? CLASSES.boxRevealed : CLASSES.boxHidden;
    text.className = revealed ? CLASSES.textRevealed : CLASSES.textHidden;
    hint.hidden = revealed; box.setAttribute('aria-pressed', revealed ? 'true' : 'false');
  }
  function toggle() { revealed = !revealed; render(); }
  box.addEventListener('click', toggle);
  box.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); } });
  render();
})();
