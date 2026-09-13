// Exposes the current-language copy as `c` and the English source as `en`
// in both the page and the layout scope (a `{% set %}` in the page would not
// reach the layout). `en` is the fallback used by the `t` filter.
export default {
  eleventyComputed: {
    c: (data) => data.copy[data.lang],
    en: (data) => data.copy.en,
  },
};
