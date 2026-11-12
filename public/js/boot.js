// Runs before first paint (plain script, no modules) so the saved theme and text size
// are applied without a flash. Everything else lives in js/app.js.
(function () {
  var root = document.documentElement;
  try {
    var s = JSON.parse(localStorage.getItem('mt.settings') || '{}');
    var dark = s.theme === 'dark' || (s.theme !== 'light' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
    root.dataset.theme = dark ? 'dark' : 'light';
    if (s.text === 'large' || s.text === 'xlarge') root.dataset.text = s.text;
  } catch (e) {
    root.dataset.theme = 'light';
  }
})();
