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

/* Motion budget. Each figure is the *half* travel: a layer runs from +v to -v
   across its trigger, sitting at its authored position when the block is
   centred — so the composition the design fixes is exactly what you read, and
   the motion lives in the approach and the exit.

   The numbers below were raised from a first pass that measured 90-197px of
   print travel, i.e. a 7-12% differential against the page. That is under the
   threshold where the eye reads depth rather than just noticing nothing; the
   prints now run at roughly a quarter of page speed, which is the range
   editorial parallax has to reach to be legible at a normal scroll rate. */
const FRAME_TRAVEL = 230;   // px a depth-1 print travels each way
const INNER_DRIFT = 9;      // % of the photo's height, counter to its frame
const INNER_SCALE = 1.22;   // slack for that drift: 11% spare each side against 9% used
const SWAY = 1.2;           // deg of tilt added to the print's fixed angle
const COPY_DRIFT = 3.2;     // % — same direction as the prints, at a fraction of
                            //     their speed, so the two still separate
const BACK_TRAVEL = 11;     // % of a backdrop image's own height
const LAG = 0.5;            // seconds of catch-up

/* The chapter bands used to be a parallax layer too, travelling ~14% of their
   height. They were removed rather than retuned: their fill is
   `linear-gradient(90deg, …)`, a gradient with no vertical variation at all, so
   every row of the band is identical and sliding it up or down is invisible by
   construction. Five ScrollTriggers were animating a no-op — measured at ~107px
   of travel apiece with nothing to show for it. Motion that cannot be seen is
   not subtle, it is just cost.

   The outline map behind the impact figures is the opposite case — a real image
   with real vertical structure — so it keeps a vertical backdrop travel, under
   the name `back` rather than sharing a kind with the gradients it has nothing
   in common with.

   It used to move *against* the scroll — the far-layer convention, and a
   downward drift. The design rule for this report is stricter than the
   convention: every image travels upward, so that none of them can settle
   behind a block of copy. The map now rises like everything else, just slowly
   enough to still sit behind the figures. */

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
        } else if (kind === 'back' || kind === 'drift') {
          /* Both rise, like every other layer on the page. Depth is the
             *difference* between two speeds, not the direction of either: the
             copy column moves about a twentieth of what the print beside it
             does, which reads as separation while keeping the text within a
             dozen pixels of where it was typeset.

             Opposing them separated the layers harder, and that is what this
             used to do. It also meant the print climbed while the copy sank,
             which on a stacked phone layout is two blocks converging — the one
             thing the design asks never to happen. */
          const [f, t] = range((kind === 'back' ? BACK_TRAVEL : COPY_DRIFT) * d);
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
