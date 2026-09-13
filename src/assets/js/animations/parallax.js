/**
 * Multi-layer parallax.
 *
 * Every print in the report is a small depth stack rather than one sliding
 * image: the frame travels furthest, the photograph inside drifts the other way
 * behind the white border — so it reads as a window, not a sticker — the print
 * picks up a fraction of a degree of sway, and the copy column beside it barely
 * moves at all. Four speeds in one composition is what makes a page feel deep
 * instead of merely animated.
 *
 * Per-print speed is not hand-tuned. It comes from `--fw`, the frame's width on
 * the 1440px Figma artboard: a large print is a near print, and near things
 * move more. Thirteen prints, one rule, and the motion stays consistent with
 * the design if a photo is ever resized.
 *
 * One ScrollTrigger drives each stack rather than one per layer, which keeps
 * the whole page at ~20 triggers. `scrub` is given a lag instead of `true`: the
 * scroll position becomes an eased target rather than a rigid binding, and that
 * lag is the entire difference between "fluid" and "glued to the wheel".
 *
 * All of this is decorative, so all of it is skipped under
 * prefers-reduced-motion (WCAG 2.3.3) — and when it is skipped the photographs
 * sit unscaled in their frames, showing exactly the crop the design intends.
 */
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

/* Motion budget, each measured across one full viewport traversal of the layer. */
const FRAME_TRAVEL = 120;   // px a depth-1 print travels
const INNER_DRIFT = 5;      // % of the photo's height, counter to its frame
const INNER_SCALE = 1.14;   // slack for that drift: 7% spare each side against 5.7% used
const SWAY = 0.6;           // deg of tilt added to the print's fixed angle
const COPY_DRIFT = 2.4;     // % — the slowest layer, small enough not to disturb reading
const BAND_TRAVEL = 14;     // % of the gradient band's own height
const LAG = 0.7;            // seconds of catch-up

/* Figma frame widths run 340–648px on the 1440 artboard. Mapped onto 0.45–1 so
   even the smallest print keeps a visible share of the motion. */
const FW_MIN = 340;
const FW_SPAN = 648 - FW_MIN;

/* GSAP folds the standalone CSS `rotate` property into its own transform matrix
   the first time it animates an element, so animating `rotation` here without
   re-adding the design angle would flatten every print to 0deg. The tilt stays
   in CSS as the no-JS and reduced-motion baseline; the sway is added on top. */
function tiltOf(el) {
  const rot = parseFloat(getComputedStyle(el).getPropertyValue('--rot'));
  return Number.isNaN(rot) ? 0 : rot;
}

function depthOf(el) {
  const explicit = parseFloat(el.dataset.depth);
  if (!Number.isNaN(explicit)) return explicit;
  const fw = parseFloat(getComputedStyle(el).getPropertyValue('--fw'));
  if (Number.isNaN(fw)) return 0.6;
  return 0.45 + 0.55 * Math.min(1, Math.max(0, (fw - FW_MIN) / FW_SPAN));
}

export default function initParallax() {
  /* Mobile browsers fire a resize every time their chrome hides; refreshing on
     each one is both expensive and visibly jumpy. */
  ScrollTrigger.config({ ignoreMobileResize: true });

  gsap.matchMedia().add(
    { wide: '(min-width: 62rem)', motion: '(prefers-reduced-motion: no-preference)' },
    (ctx) => {
      if (!ctx.conditions.motion) return undefined;
      /* Below the two-column breakpoint the layout stacks and the prints are
         already close together, so the same travel would read as drift. */
      const k = ctx.conditions.wide ? 1 : 0.4;
      const moved = [];

      document.querySelectorAll('[data-parallax]').forEach((el) => {
        const kind = el.dataset.parallax;
        const d = depthOf(el) * k;
        const scope = el.closest('.block, .hero, .impact, .chapter__intro') || el.parentElement;
        if (!scope) return;

        /* A layer already on screen at rest has to start from its authored
           position, or the hero would load with its prints shoved out of the
           composition the design fixes them in. */
        const anchored = scope.getBoundingClientRect().top + window.scrollY < window.innerHeight * 0.5;
        const range = (amount) => (anchored ? [0, -amount] : [amount, -amount]);

        const tl = gsap.timeline({
          scrollTrigger: {
            trigger: scope,
            start: anchored ? 'top top' : 'top bottom',
            end: 'bottom top',
            scrub: LAG,
            invalidateOnRefresh: true,
            onToggle: (self) => { el.style.willChange = self.isActive ? 'transform' : ''; },
          },
        });
        moved.push(el);

        if (kind === 'stack') {
          const [fy, ty] = range(FRAME_TRAVEL * d);
          const [fr, tr] = range(SWAY * d);
          const tilt = tiltOf(el);
          tl.fromTo(el, { y: fy, rotation: tilt + fr }, { y: ty, rotation: tilt + tr, ease: 'none' }, 0);

          const photo = el.querySelector('img');
          if (photo) {
            gsap.set(photo, { scale: INNER_SCALE, transformOrigin: '50% 50%' });
            const [fi, ti] = range(-INNER_DRIFT * d);
            tl.fromTo(photo, { yPercent: fi }, { yPercent: ti, ease: 'none' }, 0);
          }
        } else if (kind === 'drift') {
          const [f, t] = range(COPY_DRIFT * d);
          tl.fromTo(el, { yPercent: f }, { yPercent: t, ease: 'none' }, 0);
        } else if (kind === 'band') {
          const [f, t] = range(-BAND_TRAVEL * d);
          tl.fromTo(el, { yPercent: f }, { yPercent: t, ease: 'none' }, 0);
        }
      });

      return () => moved.forEach((el) => { el.style.willChange = ''; });
    },
  );

  /* Lazy images and web fonts both change the page height after init, and a
     stale trigger start is precisely what makes parallax look like it jumps.
     Debounced, because thirteen lazy photos arriving during a scroll would
     otherwise recalculate every trigger thirteen times — the cure being worse
     than the disease. */
  let pending;
  const refresh = () => {
    clearTimeout(pending);
    pending = setTimeout(() => ScrollTrigger.refresh(), 180);
  };
  if (document.fonts) document.fonts.ready.then(refresh);
  window.addEventListener('load', refresh, { once: true });
  document.querySelectorAll('img[loading="lazy"]').forEach((img) => {
    if (!img.complete) img.addEventListener('load', refresh, { once: true });
  });
}
