/**
 * Parallax — data-parallax="0.15" moves the element at a fraction of scroll
 * speed. Disabled under prefers-reduced-motion (vestibular motion, WCAG 2.3.3).
 */
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
gsap.registerPlugin(ScrollTrigger);

export default function initParallax() {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  document.querySelectorAll('[data-parallax]').forEach((el) => {
    const factor = parseFloat(el.getAttribute('data-parallax')) || 0.1;
    gsap.to(el, {
      yPercent: factor * 100,
      ease: 'none',
      scrollTrigger: { trigger: el.closest('section') || el, start: 'top bottom', end: 'bottom top', scrub: true },
    });
  });
}
