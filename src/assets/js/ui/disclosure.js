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
 * The panel grows rather than appearing. `hidden` toggled on its own put the
 * whole detail on screen in one frame, which read as a jump next to a yellow
 * that takes a fifth of a second to arrive — the card changed colour smoothly
 * and changed size instantly. The height is tweened from nothing to its own
 * measured height, with the bottom padding travelling with it so no yellow band
 * is left standing under a closed card, and the sentence fades up a beat behind
 * the box so the reader sees the space open before the words land in it.
 *
 * `hidden` still carries the state — set before the opening tween, cleared
 * after the closing one — so find-in-page and screen readers see a panel that
 * is either there or not, never a half-height box.
 *
 * Opening a card grows the page under the reader. On a scroll-driven page that
 * matters twice: ScrollTrigger has cached every start/end offset below this
 * point, so they all move. `refresh()` is the cheap, correct answer — the
 * alternative is a parallax that is silently a card-height out of register for
 * the rest of the visit. It runs when the box has stopped moving, not while it
 * moves, so one opening costs one refresh rather than one per frame.
 */
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
gsap.registerPlugin(ScrollTrigger);

/* Opening is the gesture the reader asked for and closing is clearing up after
   it: the first is given room, the second gets out of the way. */
const OPEN = 0.42;
const SHUT = 0.28;

export default function initDisclosures() {
  const toggles = document.querySelectorAll('.stat__toggle[aria-controls]');
  if (!toggles.length) return;

  /* Read at the moment of the event, not once at load: a laptop gains and loses
     a mouse, and a tablet is both machines on the same page. */
  const hoverable = window.matchMedia('(hover: hover) and (pointer: fine)');
  const still = window.matchMedia('(prefers-reduced-motion: reduce)');

  let pending = 0;
  const refreshSoon = () => {
    clearTimeout(pending);
    pending = setTimeout(() => ScrollTrigger.refresh(), 120);
  };

  for (const toggle of toggles) {
    const panel = document.getElementById(toggle.getAttribute('aria-controls'));
    if (!panel) continue;
    const copy = panel.firstElementChild || panel;

    let held = false;      // opened by click, tap or keyboard
    let hovered = false;   // the pointer is on the card
    let muted = false;     // clicked shut while the pointer is still on it

    const settle = () => {
      gsap.set([panel, copy], { clearProps: 'height,paddingBottom,overflow,opacity,y' });
      refreshSoon();
    };

    const open = () => {
      gsap.killTweensOf([panel, copy]);
      panel.hidden = false;
      if (still.matches) { settle(); return; }
      /* Measured with the panel laid out and before anything is set on it, so
         the target is whatever the stylesheet says at this viewport. */
      const pad = getComputedStyle(panel).paddingBottom;
      gsap.set(panel, { overflow: 'hidden' });
      gsap.fromTo(panel,
        { height: 0, paddingBottom: 0 },
        { height: 'auto', paddingBottom: pad, duration: OPEN, ease: 'power3.out', onComplete: settle });
      gsap.fromTo(copy,
        { opacity: 0, y: 8 },
        { opacity: 1, y: 0, duration: OPEN * 0.65, delay: OPEN * 0.25, ease: 'power2.out' });
    };

    const shut = () => {
      gsap.killTweensOf([panel, copy]);
      if (still.matches) { panel.hidden = true; settle(); return; }
      gsap.set(panel, { overflow: 'hidden' });
      gsap.to(copy, { opacity: 0, y: 4, duration: SHUT * 0.5, ease: 'power1.in' });
      gsap.to(panel, {
        height: 0, paddingBottom: 0, duration: SHUT, ease: 'power2.inOut',
        onComplete: () => { panel.hidden = true; settle(); },
      });
    };

    const sync = () => {
      const on = (held || hovered) && !muted;
      if ((toggle.getAttribute('aria-expanded') === 'true') === on) return;
      toggle.setAttribute('aria-expanded', String(on));
      if (on) open(); else shut();
    };

    toggle.addEventListener('click', () => {
      const on = toggle.getAttribute('aria-expanded') === 'true';
      held = !on;
      muted = on && hovered;
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
