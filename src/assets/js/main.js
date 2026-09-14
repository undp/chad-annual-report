import initCounters from './animations/counter.js';
import initScrollReveal from './animations/scroll-reveal.js';
import initParallax from './animations/parallax.js';
import initModals from './ui/modal.js';
import initDisclosures from './ui/disclosure.js';

const start = () => {
  initCounters(document.documentElement.lang);
  initScrollReveal();
  initParallax();
  initModals();
  initDisclosures();
};

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
else start();
