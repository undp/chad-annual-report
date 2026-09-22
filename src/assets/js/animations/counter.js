/**
 * Counter — animates numeric values when they scroll into view.
 * Progressive enhancement: the final value is already in the HTML, this only
 * animates from 0. Respects prefers-reduced-motion and headless contexts.
 * Adapted from the Innovation Hub front-end layer.
 */
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
gsap.registerPlugin(ScrollTrigger);

const isHeadless = navigator.webdriver === true || /HeadlessChrome|PhantomJS/i.test(navigator.userAgent);
const skip = isHeadless || matchMedia('(prefers-reduced-motion: reduce)').matches;

/* A figure that starts counting while it is still on the bottom edge of the
   screen has finished by the time the reader looks at it. `START` puts the
   numeral roughly three-quarters down the viewport before the run begins. */
const START = 'top 78%';

/* The curve the count runs on, as a CSS cubic-bezier. An ease-out covers half
   the distance in its first fifth of time and then crawls on the last digits,
   which is what made the old count read as instant. This one winds up briefly,
   holds a near-linear middle, and still has ground to cover in its final
   half-second: at 80% of the time it is at 95% of the value, not 99.2%. */
const EASE = [0.3, 0, 0.45, 1];

/* 350,000 earns more time than 7, and the reader should not wait the same for
   both: the run grows with the number's order of magnitude, between the two
   bounds. */
const RUN = { base: 900, perDecade: 300, min: 1200, max: 2600 };

/* Figures that share a row start one after the other, so the group reads as a
   cascade instead of one block of numbers moving as a slab. */
const STEP = 130;
const MAX_STEPS = 3;

/* Newton's method on the bezier's x, the way a browser solves a CSS easing. */
function easing([x1, y1, x2, y2]) {
  const a = (u, v) => 1 - 3 * v + 3 * u;
  const b = (u, v) => 3 * v - 6 * u;
  const c = (u) => 3 * u;
  const at = (t, u, v) => ((a(u, v) * t + b(u, v)) * t + c(u)) * t;
  const slope = (t, u, v) => 3 * a(u, v) * t * t + 2 * b(u, v) * t + c(u);
  return (x) => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    let t = x;
    for (let i = 0; i < 8; i += 1) {
      const d = slope(t, x1, x2);
      if (!d) break;
      const err = at(t, x1, x2) - x;
      if (Math.abs(err) < 1e-5) break;
      t -= err / d;
    }
    return at(t, y1, y2);
  };
}

const ease = easing(EASE);
const runFor = (target) => Math.min(
  RUN.max,
  Math.max(RUN.min, RUN.base + RUN.perDecade * Math.log10(Math.abs(target) + 1)),
);

export default function initCounters(locale = document.documentElement.lang || 'en') {
  document.querySelectorAll('[data-counter]').forEach((el) => {
    const raw = el.getAttribute('data-counter') || '0';
    const target = parseFloat(raw) || 0;
    const suffix = el.getAttribute('data-suffix') || '';
    /* Every figure in the report is a whole number today, but a value written
       with decimals keeps them rather than being rounded away. */
    const decimals = (raw.split('.')[1] || '').length;
    const format = (n) => n.toLocaleString(locale, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }) + suffix;

    el.textContent = format(target);
    if (skip) return;

    const group = el.closest('.statcards, .counters, .cards');
    const order = group ? [...group.querySelectorAll('[data-counter]')].indexOf(el) : 0;
    const delay = Math.min(Math.max(order, 0), MAX_STEPS) * STEP;
    const duration = runFor(target);

    let started = false;
    const animate = () => {
      if (started) return;
      started = true;
      const t0 = performance.now() + delay;
      const tick = (now) => {
        /* Until its turn comes the figure holds its final value, so a staggered
           card never sits on a visible zero. */
        if (now < t0) { requestAnimationFrame(tick); return; }
        /* Söhne Breit's figures are proportional — its 1 is 0.49em against the
           0.87em of its 0 — so a running number shifts sideways on every frame.
           The font carries a tabular set; the count borrows it and gives it
           back, leaving the figure at rest in the proportional set the design
           is drawn with and that sizes its cell. */
        el.classList.add('is-counting');
        const p = Math.min((now - t0) / duration, 1);
        el.textContent = format(target * ease(p));
        if (p < 1) { requestAnimationFrame(tick); return; }
        el.textContent = format(target);
        el.classList.remove('is-counting');
      };
      requestAnimationFrame(tick);
    };

    ScrollTrigger.create({ trigger: el, start: START, onEnter: animate, once: true });
  });
}
