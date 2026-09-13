import initCounters from './animations/counter.js';
import initScrollReveal from './animations/scroll-reveal.js';
import initParallax from './animations/parallax.js';

const start = () => {
  initCounters(document.documentElement.lang);
  initScrollReveal();
  initParallax();
};

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
else start();
