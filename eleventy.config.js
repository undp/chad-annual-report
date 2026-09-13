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
