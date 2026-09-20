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
 * Scroll drives the sequence, but nothing about the page's geometry depends on
 * it: the two groups share one grid area, so the section is the same height in
 * every state and nothing below it moves. That is deliberate — this page
 * already carries a dozen parallax triggers, and a pinned section would make
 * every one of them recompute.
 *
 * Each half is a disclosure button, the same pattern as the expandable figures
 * in the chapters, rather than a tablist: two independent groups that open and
 * close is what this is, and `aria-expanded` says so without a roving tabindex
 * or a container whose role would take the sentence away from a screen reader.
 *
 * The markup ships complete. This module is what *takes things away*: before
 * it runs, the reader gets all seven figures and a highlighted sentence, which
 * is a worse animation and a perfectly good page. Under prefers-reduced-motion
 * it stays that way — both halves lit, both groups shown (WCAG 2.3.3).
 */
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const HALVES = ['potential', 'challenges'];

export default function initImpactStates() {
  const section = document.querySelector('[data-impact]');
  if (!section) return;

  const marks = HALVES.map((h) => section.querySelector(`.impact__mark[data-half="${h}"]`));
  const panels = HALVES.map((h) => section.querySelector(`.impact__cards[data-half="${h}"]`));
  const context = section.querySelector('.impact__context');
  if (marks.some((el) => !el) || panels.some((el) => !el) || !context) return;

  if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
    /* Both halves lit and every figure shown. The marks become plain highlights
       again: with no sequence to step through there is nothing to press. */
    marks.forEach((m) => {
      m.setAttribute('data-lit', '');
      m.disabled = true;
    });
    section.setAttribute('data-impact-lit', '');
    return;
  }

  section.dataset.impactEnhanced = '';

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
      /* `inert` rather than `hidden`: the group keeps its box, so the grid area
         stays the height of the taller of the two and the page below never
         moves — while focus, find-in-page and screen readers skip what is not
         on show, which is the part `opacity: 0` alone gets wrong. */
      panels[i].inert = !on;
      panels[i].toggleAttribute('data-shown', on);
    });
  };
  show(null);

  /* A reader who presses a half has taken the block off autopilot: from then on
     scrolling past it no longer overrides what they chose to look at. */
  let driven = true;
  marks.forEach((mark, i) => {
    mark.addEventListener('click', () => {
      driven = false;
      show(current === HALVES[i] ? null : HALVES[i]);
    });
  });

  /* Three equal thirds of the section's own travel through the viewport. The
     end stops short of the transition line, so the last state is still lit when
     the reader reaches the sentence that hands over to the chapters. */
  ScrollTrigger.create({
    trigger: section,
    start: 'top 75%',
    end: 'bottom 70%',
    onUpdate: (self) => {
      if (!driven) return;
      show(self.progress < 1 / 3 ? null : self.progress < 2 / 3 ? 'potential' : 'challenges');
    },
  });
}
