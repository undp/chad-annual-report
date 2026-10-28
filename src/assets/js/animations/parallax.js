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
const FRAME_TRAVEL = 170;   // px a depth-1 print travels each way
/* The photograph inside the frame runs the other way from the frame, and
   further than it used to: at 9% in the frame's own direction the picture
   shifted 36px across a whole viewport while its frame moved 300 — a 1:8
   ratio the eye reads as nothing. At 16% against the frame the two layers
   part company on every scroll, which is what a print in a window is for. */
const INNER_DRIFT = 16;     // % of the photo's height, counter to its frame
const INNER_SCALE = 1.34;   // slack for that drift: 17% spare each side against 16% used
const SWAY = 1.2;           // deg of tilt added to the print's fixed angle
/* Three cues the eye uses for depth, on top of speed. Each one is small; it
   is their agreement that reads as a print lifted off the page.
   - the print grows a little as it passes: nearer things look larger;
   - it tips back on its horizontal axis, under a perspective set on its
     parent, so its top edge foreshortens as it enters and its bottom as it
     leaves — the motion of a card turning through a shaft of light;
   - its shadow follows the tilt: longer and softer when the print is lifted
     towards the viewer, short and tight when it lies back down. */
const LIFT_SCALE = 0.05;    // ± scale around the print's rest size
const LEAN = 5;             // deg of rotateX each way, at depth 1
const SHADOW_REST = { y: 12, blur: 34, a: 0.18 };
const SHADOW_LIFT = { y: 30, blur: 60, a: 0.28 };
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

/* A print's travel normally comes from its size, above: a large print is a near
   print. The hero is the one composition where the design asks for a stated
   separation instead — two prints in the same frame, either side of the
   headline, that have to part company inside the first screen of scroll.
   `--travel` names that half-travel directly, as a percentage of the print's
   own height, so one number holds from the 1440 frame down to a phone where the
   print is a quarter the size. Absent, nothing changes and the size-derived
   budget applies. The same number holds back the prints that hang between
   two lines of text with a few dozen pixels either side — chapter 2 over its
   figures, the aerial view of chapter 3 over its heading — where the full
   budget carried them onto the copy on the way in. */
function travelOf(el) {
  const t = parseFloat(getComputedStyle(el).getPropertyValue('--travel'));
  return Number.isNaN(t) ? null : t;
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

        /* Every tween runs the whole trigger. Without the default, GSAP gives
           the frame its own 0.5 while the two-part shadow below spans 1: the
           frame then finished its travel by mid-scroll and sat the full travel
           above its design position while the block was centred — over the
           paragraph or the link above it (HQ, October 2026). */
        const tl = gsap.timeline({
          defaults: { duration: 1 },
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
          /* Either the stated travel, in percent of the print's own height, or
             the size-derived one in pixels. `axis` carries the choice of unit
             into the tween. */
          const stated = travelOf(el);
          const axis = stated === null ? 'y' : 'yPercent';
          const [fy, ty] = range(stated === null ? FRAME_TRAVEL * d : stated * k);
          const [fr, tr] = range(SWAY * d);
          const [fl, tl_] = range(LEAN * d);
          const tilt = tiltOf(el);
          /* Enters small and leaning back, passes at rest size and flat, leaves
             larger and leaning the other way: one curve through the viewport,
             with its middle — where the reader looks — at the design's own
             geometry. The shadow is keyed to the same curve. */
          const shadow = (t) => {
            const k = Math.abs(t);
            const y = SHADOW_REST.y + (SHADOW_LIFT.y - SHADOW_REST.y) * k;
            const b = SHADOW_REST.blur + (SHADOW_LIFT.blur - SHADOW_REST.blur) * k;
            const a = SHADOW_REST.a + (SHADOW_LIFT.a - SHADOW_REST.a) * k;
            return `0 ${y}px ${b}px rgb(0 0 0 / ${a.toFixed(3)})`;
          };
          const from = anchored ? 0 : -1, to = 1;
          const scaleAt = (t) => 1 + LIFT_SCALE * d * t;
          tl.fromTo(el,
            { [axis]: fy, rotation: tilt + fr, rotateX: fl, scale: scaleAt(from) },
            { [axis]: ty, rotation: tilt + tr, rotateX: tl_, scale: scaleAt(to), ease: 'none' }, 0);
          /* The shadow is not a straight line through the run: long and soft
             at both ends, where the print is lifted and turned, short and
             tight in the middle, where it lies flat. Two halves, so it
             passes through rest at the point the reader looks. */
          if (anchored) {
            tl.fromTo(el, { boxShadow: shadow(0) }, { boxShadow: shadow(to), ease: 'none' }, 0);
          } else {
            tl.fromTo(el, { boxShadow: shadow(from) }, { boxShadow: shadow(0), ease: 'none', duration: 0.5 }, 0)
              .to(el, { boxShadow: shadow(to), ease: 'none', duration: 0.5 }, 0.5);
          }

          /* A print marked `data-hold` keeps its picture still in the frame.
             The window effect needs slack all round the subject, and the
             woman at the pump has her head within 4% of the photo's top
             edge: the zoom alone cut her at the brow, the drift up to the
             eyes (HQ, October 2026). The frame still travels, sways and
             tips; only the picture stays at the crop the design takes. */
          const photo = el.hasAttribute('data-hold') ? null : el.querySelector('img');
          if (photo) {
            gsap.set(photo, { scale: INNER_SCALE, transformOrigin: '50% 50%' });
            /* Opposite sign to the frame's travel: the frame rises through
               the viewport, the picture inside it sinks. */
            const [fi, ti] = range(INNER_DRIFT * d);
            tl.fromTo(photo, { yPercent: -fi }, { yPercent: -ti, ease: 'none' }, 0);
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
