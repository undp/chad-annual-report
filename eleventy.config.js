export default function (eleventyConfig) {
  eleventyConfig.addPassthroughCopy({ 'src/.nojekyll': '.nojekyll' });
  eleventyConfig.addPassthroughCopy({ 'src/assets/css': 'assets/css' });
  eleventyConfig.addPassthroughCopy({ 'src/assets/fonts': 'assets/fonts' });
  eleventyConfig.addPassthroughCopy({ 'src/assets/img': 'assets/img' });
  eleventyConfig.addPassthroughCopy({ 'src/assets/files': 'assets/files' });
  eleventyConfig.addPassthroughCopy({ 'src/assets/js/bundle.js': 'assets/js/bundle.js' });

  // Fall back to the English string when a FR translation is still missing,
  // so the site always builds even with partial content delivery.
  eleventyConfig.addFilter('t', function (value, fallback) {
    if (value === undefined || value === null || value === '') return fallback ?? '';
    return value;
  });

  // Merge a translated array with its English fallback, element by element.
  // Needed wherever the template has to *measure* the copy it is about to set
  // — a Nunjucks {% set %} inside a loop does not survive the loop.
  eleventyConfig.addFilter('tList', function (value, fallback) {
    const en = fallback ?? [];
    return en.map((f, i) => {
      const v = Array.isArray(value) ? value[i] : undefined;
      return v === undefined || v === null || v === '' ? f : v;
    });
  });

  // Longest string in a list, in characters. The hero uses it to size its
  // display type against the line that will actually be set, in any language.
  eleventyConfig.addFilter('maxLen', function (list) {
    return (list ?? []).reduce((n, s) => Math.max(n, String(s ?? '').length), 0);
  });

  // How wide a figure is once the counter has formatted it. "15000" renders as
  // "15,000" and with its suffix occupies seven glyphs, not six — and it is the
  // longest figure, not the average one, that decides whether the numeral fits
  // its card. The template hands this to CSS so each card sizes its own numeral.
  eleventyConfig.addFilter('figureLen', function (value, suffix) {
    const n = Number(value);
    const shown = Number.isFinite(n) ? n.toLocaleString('en-US') : String(value ?? '');
    return shown.length + String(suffix ?? '').length;
  });

  // Copy carries emphasis as **double asterisks** so translators edit plain text
  // and can never inject markup; everything else is escaped.
  eleventyConfig.addFilter('emph', function (value) {
    const escaped = String(value ?? '').replace(/[&<>"']/g, (c) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
    return escaped.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  });

  return {
    dir: { input: 'src', output: '_site', includes: '_includes', data: '_data' },
    pathPrefix: process.env.PATH_PREFIX || '/',
    markdownTemplateEngine: 'njk',
    htmlTemplateEngine: 'njk',
  };
}
