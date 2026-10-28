(function () {
  var size = 20;
  var buttons = document.querySelectorAll('[data-font-control]'); // decrease, increase, reset (document order, as in the original)
  var label = document.querySelector('[data-font-size]'), sample = document.querySelector('[data-font-sample]');
  function render() {
    label.textContent = size + 'px'; sample.style.fontSize = size + 'px'; sample.style.lineHeight = '1.5';
    buttons[0].disabled = size <= 14; buttons[1].disabled = size >= 40;
  }
  buttons[0].addEventListener('click', function () { if (size > 14) { size -= 2; render(); } });
  buttons[1].addEventListener('click', function () { if (size < 40) { size += 2; render(); } });
  buttons[2].addEventListener('click', function () { size = 20; render(); });
  render();
})();
