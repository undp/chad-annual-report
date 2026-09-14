/**
 * The impact figures, as disclosures.
 *
 * The markup ships closed and `hidden`, so the page is correct before this file
 * runs and stays correct if it never does — the detail is then simply absent
 * rather than permanently invisible behind a dead button.
 *
 * Opening a card grows the page under the reader. On a scroll-driven page that
 * matters twice: ScrollTrigger has cached every start/end offset below this
 * point, so they all move. `refresh()` is the cheap, correct answer — the
 * alternative is a parallax that is silently a card-height out of register for
 * the rest of the visit.
 */
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
gsap.registerPlugin(ScrollTrigger);

export default function initDisclosures() {
  const toggles = document.querySelectorAll('.stat__toggle[aria-controls]');
  if (!toggles.length) return;

  for (const toggle of toggles) {
    const panel = document.getElementById(toggle.getAttribute('aria-controls'));
    if (!panel) continue;

    toggle.addEventListener('click', () => {
      const open = toggle.getAttribute('aria-expanded') === 'true';
      toggle.setAttribute('aria-expanded', String(!open));
      panel.hidden = open;
      // Height changed; every scroll trigger below this card did too.
      ScrollTrigger.refresh();
    });
  }
}
