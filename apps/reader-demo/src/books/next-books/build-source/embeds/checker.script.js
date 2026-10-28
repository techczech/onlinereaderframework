(function () {
  // Analysis: the body of useMemo in components/tools/ReadabilityChecker.tsx, type-stripped, not retyped.
  var analyse = __ANALYSIS__;
  var $ = function (id) { return document.getElementById(id); };
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  var SENTENCE = 'inline-block py-0.5 px-1 my-0.5 rounded transition-colors duration-300 mr-1';
  var STATUS = { error: 'bg-rose-100 hover:bg-rose-200 text-rose-900', warning: 'bg-orange-100 hover:bg-orange-200 text-orange-900', ok: 'hover:bg-slate-50' };
  function update() {
    var a = analyse($('text-input').value);
    $('stat-sentences').textContent = a.sentenceCount; $('stat-words').textContent = a.totalWords; $('stat-average').textContent = a.avgWords;
    $('stat-average').className = 'text-3xl font-bold ' + (a.avgWords > 20 ? 'text-amber-600' : 'text-emerald-600');
    $('results').innerHTML = a.sentences.length > 0
      ? '<div class="prose max-w-none" id="sentences">' + a.sentences.map(function (s) { return '<span class="' + SENTENCE + ' ' + STATUS[s.status] + '" title="' + s.count + ' words">' + esc(s.text) + '</span>'; }).join('') + '</div>'
      : '<p class="text-slate-400 italic text-center py-8">Start typing or paste text above to see analysis...</p>';
  }
  $('text-input').addEventListener('input', update);
  $('clear').addEventListener('click', function () { $('text-input').value = ''; update(); $('text-input').focus(); });
  update();
})();
