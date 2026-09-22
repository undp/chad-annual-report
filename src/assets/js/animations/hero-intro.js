/**
 * The hero's opening.
 *
 * Four beats now, and only the first two belong to the load. The prints arrive
 * out of focus and settle into the angle the file gives them; the headline sets
 * itself line by line over them; the wash behind the type deepens as the reader
 * scrolls; and the paragraph fills in a word at a time, the way the chapter
 * leads do further down the page.
 *
 * The first two beats are CSS transitions: this module only decides *when* they
 * start. The last two are scrubbed ScrollTriggers, so they move at the speed
 * the reader turns the wheel instead of playing a canned entry at them — except
 * on a window where the paragraph is already in the first screen, where there
 * is nothing to scroll towards and it simply joins the opening.
 *
 * All of it is decorative, so all of it is skipped under prefers-reduced-motion
 * (WCAG 2.3.3), where the hero is simply present from the first frame and the
 * wash sits at the fixed strength the stylesheet gives it.
 */
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { wrapWords } from './scroll-reveal.js';

gsap.registerPlugin(ScrollTrigger);

const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

/* What an unread word is worth. Not zero: a paragraph that is half absent reads
   as a loading failure, where one that is half lit reads as one being written.
   The chapter leads use 0.25 on their own gradient; the hero sits on a
   photograph, so its unread words are dimmer to keep the lit ones ahead. */
const DIM = 0.18;

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
     the first screenful: there, holding it back until the reader scrolls leaves
     a hole under the headline, and then plays the entry just as the text is
     leaving the top of the screen. So when it starts inside the first screen it
     joins the opening instead, one beat after the headline.

     The measurement is taken once the display face has loaded, because the
     headline's height — four lines of it — is what decides where the paragraph
     falls, and a fallback face gives a different answer. */
  const withinFold = () =>
    intro.getBoundingClientRect().top + window.scrollY < window.innerHeight * 0.85;

  Promise.race([settled, new Promise((res) => { setTimeout(res, 1500); })])
    .then(() => requestAnimationFrame(() => {
      let words = [];
      if (intro) {
        words = wrapWords(intro);
        gsap.set(words, { opacity: DIM });
        /* Hand the block over before it is shown, so the reader never sees the
           paragraph at full strength for a frame. */
        hero.classList.add('hero--intro-words');
      }
      const onLoad = intro && withinFold();
      hero.classList.add('is-open');

      if (words.length) (onLoad ? openIntro : scrubIntro)(words, intro);
      scrubScrim(hero);
    }));
}

/* Below the fold: the words fill in against the wheel, over the stretch of
   scroll that carries the paragraph from the bottom edge to the middle of the
   screen — the same window, and the same scrub, the chapter leads use, so the
   hero reads as the first instance of a habit rather than as an exception. */
function scrubIntro(words, intro) {
  gsap.to(words, {
    opacity: 1, ease: 'none', stagger: 0.5,
    scrollTrigger: {
      trigger: intro, start: 'top 92%', end: 'bottom 52%',
      scrub: 0.4, invalidateOnRefresh: true,
    },
  });
}

/* Already in the first screen — a phone, a tall monitor. There is no scroll to
   hang the words on, so they arrive on their own after the headline, fast
   enough to be one movement rather than a queue. */
function openIntro(words) {
  gsap.to(words, {
    opacity: 1, duration: 0.45, ease: 'none', stagger: 0.035, delay: 1.5,
  });
}

/* The wash behind the type, from the stylesheet's resting value up to full over
   the first screen of scroll: by the time the paragraph is in the middle of the
   window the photographs are well behind it and the copy is at its most
   readable. Written through a proxy rather than tweened on the element, so the
   custom property is set as a plain string and nothing depends on how the
   engine happens to type it. */
function scrubScrim(hero) {
  const from = parseFloat(getComputedStyle(hero).getPropertyValue('--scrim')) || 0.52;
  const s = { v: from };
  gsap.to(s, {
    v: 1, ease: 'none',
    onUpdate: () => hero.style.setProperty('--scrim', s.v.toFixed(3)),
    scrollTrigger: {
      trigger: hero, start: 'top top',
      end: () => `+=${Math.round(window.innerHeight * 0.75)}`,
      scrub: 0.3, invalidateOnRefresh: true,
    },
  });
}
