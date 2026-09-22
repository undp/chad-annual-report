/**
 * The impact figures, as disclosures.
 *
 * The markup ships closed and `hidden`, so the page is correct before this file
 * runs and stays correct if it never does — the detail is then simply absent
 * rather than permanently invisible behind a dead button.
 *
 * A card opens on the pointer and on the click alike. The pointer is what the
 * prototype does; the click stays because a phone and a keyboard have no
 * pointer to pass, and without it those readers would lose the detail. So the
 * card is open when either says so:
 *
 *   pointer over it          — a mouse on a screen that has one, and only then
 *   clicked, tapped, Entered — and then it stays open after the pointer leaves
 *
 * Clicking a card the pointer has already opened closes it, and holds it closed
 * until the pointer leaves: otherwise the click would land on a card that is
 * open, and nothing would happen.
 *
 * Opening a card grows the page under the reader. On a scroll-driven page that
 * matters twice: ScrollTrigger has cached every start/end offset below this
 * point, so they all move. `refresh()` is the cheap, correct answer — the
 * alternative is a parallax that is silently a card-height out of register for
 * the rest of the visit. On a click that is one refresh; on a pointer crossing
 * a row of three it would be one per card, so it waits for the pointer to come
 * to rest.
 */
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
gsap.registerPlugin(ScrollTrigger);

export default function initDisclosures() {
  const toggles = document.querySelectorAll('.stat__toggle[aria-controls]');
  if (!toggles.length) return;

  /* Read at the moment of the event, not once at load: a laptop gains and loses
     a mouse, and a tablet is both machines on the same page. */
  const hoverable = window.matchMedia('(hover: hover) and (pointer: fine)');

  let pending = 0;
  const refreshSoon = () => {
    clearTimeout(pending);
    pending = setTimeout(() => ScrollTrigger.refresh(), 120);
  };

  for (const toggle of toggles) {
    const panel = document.getElementById(toggle.getAttribute('aria-controls'));
    if (!panel) continue;

    let held = false;      // opened by click, tap or keyboard
    let hovered = false;   // the pointer is on the card
    let muted = false;     // clicked shut while the pointer is still on it

    const sync = () => {
      const open = (held || hovered) && !muted;
      if ((toggle.getAttribute('aria-expanded') === 'true') === open) return;
      toggle.setAttribute('aria-expanded', String(open));
      panel.hidden = !open;
      refreshSoon();
    };

    toggle.addEventListener('click', () => {
      const open = toggle.getAttribute('aria-expanded') === 'true';
      held = !open;
      muted = open && hovered;
      sync();
    });

    toggle.addEventListener('pointerenter', (event) => {
      if (event.pointerType !== 'mouse' || !hoverable.matches) return;
      hovered = true;
      sync();
    });

    toggle.addEventListener('pointerleave', () => {
      hovered = false;
      muted = false;
      sync();
    });
  }
}
