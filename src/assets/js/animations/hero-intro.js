/**
 * The hero's opening.
 *
 * Three beats, and only the first two belong to the load. The prints arrive out
 * of focus and settle into the angle the file gives them; the headline sets
 * itself line by line over them; the paragraph is left for the scroll, because
 * the file leaves it there too — at 1039 of a 1457 frame it is below the fold
 * of any laptop, and a reader meets it by moving rather than by waiting.
 *
 * The first two beats are CSS transitions: this module only decides *when* they
 * start. The third is a scrubbed ScrollTrigger, so the paragraph rises at the
 * speed the reader turns the wheel instead of playing a canned entry at them —
 * except on a window where the paragraph is already in the first screen, where
 * there is nothing to scroll towards and it simply joins the opening.
 *
 * All of it is decorative, so all of it is skipped under prefers-reduced-motion
 * (WCAG 2.3.3), where the hero is simply present from the first frame.
 */
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

export default function initHeroIntro() {
  const hero = document.querySelector('.hero');
  if (!hero) return;

  if (reduced) { document.documentElement.classList.remove('js-hero'); return; }

  /* The prints are the first beat, so the sequence waits for them to decode —
     otherwise the opening is two white rectangles fading in — and for the
     display face, so the headline never sets twice. A second and a half is the
     limit: past that the reader is looking at a hero that has not begun, and a
     photograph arriving late is better than an opening that never runs. */
  const imgs = Array.from(hero.querySelectorAll('.hero__photo img'));
  const decoded = imgs.map((img) => (img.complete ? Promise.resolve() : new Promise((res) => {
    img.addEventListener('load', res, { once: true });
    img.addEventListener('error', res, { once: true });
  })));
  const settled = Promise.all([document.fonts ? document.fonts.ready : Promise.resolve(), ...decoded]);

  const intro = hero.querySelector('[data-hero-intro]');

  /* Whether the paragraph belongs to the scroll is a question about the window,
     not about the design. On a 1440 laptop it sits below the fold and a reader
     reaches it by moving — which is the whole reason it is tied to the wheel.
     On a phone, and on a tall desktop screen, the same paragraph is already in
     the first screenful: there, holding it at zero until the reader scrolls
     leaves a hole under the headline, and then plays the entry just as the text
     is leaving the top of the screen. So when it starts inside the first screen
     it joins the opening instead, one beat after the headline.

     The measurement is taken once the display face has loaded, because the
     headline's height — four lines of it — is what decides where the paragraph
     falls, and a fallback face gives a different answer. */
  const withinFold = () =>
    intro.getBoundingClientRect().top + window.scrollY < window.innerHeight * 0.85;

  Promise.race([settled, new Promise((res) => { setTimeout(res, 1500); })])
    .then(() => requestAnimationFrame(() => {
      if (intro && withinFold()) hero.classList.add('hero--intro-on-load');
      hero.classList.add('is-open');
      if (intro && !hero.classList.contains('hero--intro-on-load')) scrubIntro(intro, hero);
    }));
}

/* Scrubbed rather than triggered: what brings the paragraph up is the reader
   turning the wheel, at the speed they turn it. Half a screen of scroll is the
   whole run, so it has finished by the time the paragraph is properly in view,
   and the lag keeps it from feeling geared to the mouse. */
function scrubIntro(intro, hero) {
  gsap.fromTo(intro,
    { opacity: 0, y: () => window.innerHeight * 0.06 },
    {
      opacity: 1, y: 0, ease: 'none',
      scrollTrigger: {
        trigger: hero,
        start: 'top top',
        end: () => `+=${Math.round(window.innerHeight * 0.5)}`,
        scrub: 0.45,
        invalidateOnRefresh: true,
      },
    });
}
