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

export default function initCounters(locale = document.documentElement.lang || 'en') {
  document.querySelectorAll('[data-counter]').forEach((el) => {
    const target = parseFloat(el.getAttribute('data-counter')) || 0;
    const suffix = el.getAttribute('data-suffix') || '';
    const format = (n) => Math.round(n).toLocaleString(locale) + suffix;

    el.textContent = format(target);
    if (skip) return;

    let started = false;
    const animate = () => {
      if (started) return;
      started = true;
      const duration = 1600;
      const t0 = performance.now();
      const easeOut = (t) => 1 - Math.pow(1 - t, 3);
      const tick = (now) => {
        const p = Math.min((now - t0) / duration, 1);
        el.textContent = format(target * easeOut(p));
        if (p < 1) requestAnimationFrame(tick);
        else el.textContent = format(target);
      };
      requestAnimationFrame(tick);
    };

    ScrollTrigger.create({ trigger: el, start: 'top 90%', onEnter: animate, once: true });
  });
}
