/**
 * The opening block, in three states.
 *
 * The design's `Component 9` is one sentence with two halves — "immense
 * potential" and "significant challenges" — and seven figures that belong to
 * one half or the other. It opens with neither half lit, the phrase outlined in
 * yellow and the context paragraph under it; then it lights each half in turn
 * and puts that half's figures where the paragraph was. The paragraph and the
 * two card groups are the three variants of the same slot, not a stack.
 *
 * Scroll drives the sequence in front of a reader who is looking at the
 * sentence: the band is a sticky stage one screenful tall, and the travel that
 * steps through the three states is empty runway underneath it. Driven by page
 * scroll instead, which is what this did, the second and third states arrived
 * after the headline had left the top of the window — figures lighting up under
 * a sentence that was no longer on screen. The stage is CSS sticky rather than
 * a GSAP pin on purpose: no spacer is inserted, the document keeps the height
 * it had, and none of the dozen parallax triggers on this page recompute.
 *
 * Each half is a disclosure button, the same pattern as the expandable figures
 * in the chapters, rather than a tablist: two independent groups that open and
 * close is what this is, and `aria-expanded` says so without a roving tabindex
 * or a container whose role would take the sentence away from a screen reader.
 *
 * The markup ships complete. This module is what *takes things away*: before
 * it runs, the reader gets all seven figures and a highlighted sentence, which
 * is a worse animation and a perfectly good page. It stays that way in the two
 * cases where the sequence has nowhere to play: under prefers-reduced-motion
 * (WCAG 2.3.3), and on a narrow screen, where the seven figures stack a
 * thousand pixels deep and no stage can hold them and the sentence at once.
 */
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const HALVES = ['potential', 'challenges'];
/* The width at which the figures still sit in one row beside the sentence. */
const STAGE_FITS = '(min-width: 62rem) and (prefers-reduced-motion: no-preference)';

export default function initImpactStates() {
  const section = document.querySelector('[data-impact]');
  if (!section) return;

  const marks = HALVES.map((h) => section.querySelector(`.impact__mark[data-half="${h}"]`));
  const panels = HALVES.map((h) => section.querySelector(`.impact__cards[data-half="${h}"]`));
  const context = section.querySelector('.impact__context');
  const cues = [...section.querySelectorAll('.impact__cue')];
  const track = section.querySelector('[data-impact-track]');
  const stage = section.querySelector('[data-impact-stage]');
  const frame = section.querySelector('[data-impact-mapframe]');
  if (marks.some((el) => !el) || panels.some((el) => !el) || !context) return;
  if (!track || !stage || !frame) return;

  /* Everything on show and nothing to press: the state the page ships in, and
     the state it returns to if the window narrows under the sequence. */
  const showEverything = () => {
    marks.forEach((m) => {
      m.setAttribute('data-lit', '');
      m.setAttribute('aria-expanded', 'true');
      m.disabled = true;
    });
    section.setAttribute('data-impact-lit', '');
    context.inert = false;
    context.setAttribute('data-shown', '');
    cues.forEach((el) => el.setAttribute('data-lit', ''));
    panels.forEach((p) => { p.inert = false; p.setAttribute('data-shown', ''); });
  };

  gsap.matchMedia().add(STAGE_FITS, () => {
    section.setAttribute('data-impact-enhanced', '');
    marks.forEach((m) => { m.disabled = false; });

    /* `null` is the first state: the sentence whole, no figure shown yet. */
    let current = false;
    const show = (half) => {
      if (half === current) return;
      current = half;
      /* The outline spans both halves and belongs to the state where neither is
         chosen, so it lives on the section, not on the buttons. */
      section.toggleAttribute('data-impact-lit', half !== null);
      context.inert = half !== null;
      context.toggleAttribute('data-shown', half === null);
      HALVES.forEach((h, i) => {
        const on = h === half;
        marks[i].setAttribute('aria-expanded', String(on));
        marks[i].toggleAttribute('data-lit', on);
        /* `inert` rather than `hidden`: the group keeps its box, so the grid
           area stays the height of the taller of the two and the page below
           never moves — while focus, find-in-page and screen readers skip what
           is not on show, which is the part `opacity: 0` alone gets wrong. */
        panels[i].inert = !on;
        panels[i].toggleAttribute('data-shown', on);
      });
    };
    show(null);

    /* Le due idee dentro il paragrafo si accendono mentre il lettore le
       attraversa, in ordine di lettura. Vivono tutte e due nel primo tempo:
       quando la prima metà della frase si accende il paragrafo esce, e il
       segno ha già detto la sua. */
    const CUE_AT = [0.13, 0.26];
    let litCues = -1;
    const lightCues = (n) => {
      if (n === litCues) return;
      litCues = n;
      cues.forEach((el, i) => el.toggleAttribute('data-lit', i < n));
    };
    lightCues(0);

    /* A reader who presses a half has taken the block off autopilot: from then
       on scrolling past it no longer overrides what they chose to look at. */
    let driven = true;
    const onMark = (i) => () => {
      driven = false;
      /* Fuori dall'autopilota il paragrafo non può restare evidenziato a metà:
         se il lettore richiude le due metà lo ritrova per intero. */
      lightCues(cues.length);
      show(current === HALVES[i] ? null : HALVES[i]);
    };
    const handlers = marks.map((mark, i) => {
      const fn = onMark(i);
      mark.addEventListener('click', fn);
      return fn;
    });

    /* The runway is the difference between the track and the stage standing in
       it — measured rather than assumed, so the three beats keep their share of
       the travel whatever the viewport does to the stage's height. */
    const runway = () => Math.max(1, track.offsetHeight - stage.offsetHeight);
    const headerH = parseFloat(getComputedStyle(document.documentElement)
      .getPropertyValue('--header-h')) || 0;

    /* The sentence holds the first beat for two fifths of the runway: it is the
       one state the reader has to read before the figures mean anything, and
       the paragraph's two marks have to land inside it with room to be read
       after the second one lights. The last beat runs to the release, so the
       fourth figure is still lit when the stage lets go and the closing
       sentence comes up under it. */
    const stateAt = (p) => (p < 0.42 ? null : p < 0.7 ? 'potential' : 'challenges');

    /* One trigger for the sequence and for the map. Behind the stage the frame
       drifts up and grows by a fifteenth around Chad — `transform-origin` is on
       the country, so the continents open out around a silhouette that holds
       still. Scrubbed, so it follows the reader's hand rather than playing at
       them. */
    gsap.fromTo(frame,
      { scale: 1, yPercent: 0 },
      {
        scale: 1.07, yPercent: -2.2, ease: 'none',
        scrollTrigger: {
          trigger: track,
          start: () => `top top+=${headerH}`,
          end: () => `+=${runway()}`,
          scrub: 0.6,
          invalidateOnRefresh: true,
          onUpdate: (self) => {
            if (!driven) return;
            show(stateAt(self.progress));
            lightCues(CUE_AT.filter((t) => self.progress >= t).length);
          },
        },
      });

    return () => {
      handlers.forEach((fn, i) => marks[i].removeEventListener('click', fn));
      section.removeAttribute('data-impact-enhanced');
      gsap.set(frame, { clearProps: 'transform' });
      showEverything();
    };
  });

  if (!section.hasAttribute('data-impact-enhanced')) showEverything();
}
