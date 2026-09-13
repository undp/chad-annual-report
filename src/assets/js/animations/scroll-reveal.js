/**
 * Scroll reveal — translate-only entry (opacity stays at 1 so contrast never
 * drops mid-animation, WCAG 1.4.3) plus a scrub-linked word fade for long
 * statements. Both are skipped under prefers-reduced-motion.
 * Adapted from the Innovation Hub front-end layer.
 */
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
gsap.registerPlugin(ScrollTrigger);

const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const WORD_CLS = 'tr-word';

function wrapWords(root) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode: (n) => (n.nodeValue && n.nodeValue.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT),
  });
  const textNodes = [];
  let n;
  while ((n = walker.nextNode())) textNodes.push(n);

  const words = [];
  textNodes.forEach((textNode) => {
    const frag = document.createDocumentFragment();
    textNode.nodeValue.split(/(\s+)/).forEach((part) => {
      if (part === '') return;
      if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(part)); return; }
      const span = document.createElement('span');
      span.className = WORD_CLS;
      span.textContent = part;
      frag.appendChild(span);
      words.push(span);
    });
    textNode.parentNode.replaceChild(frag, textNode);
  });
  return words;
}

export default function initScrollReveal() {
  if (reduced) return;

  document.querySelectorAll('[data-anim="reveal"]').forEach((el) => {
    const children = el.querySelectorAll(':scope > *');
    gsap.from(children.length ? children : [el], {
      y: 24, duration: 0.6, ease: 'power2.out', stagger: 0.08,
      scrollTrigger: { trigger: el, start: 'top 95%', toggleActions: 'play none none none' },
    });
  });

  document.querySelectorAll('[data-anim="text-reveal"]').forEach((el) => {
    if (el.dataset.trDone) return;
    el.dataset.trDone = '1';
    const words = wrapWords(el);
    if (!words.length) return;
    gsap.set(words, { opacity: 0.25 });
    gsap.to(words, {
      opacity: 1, ease: 'none', stagger: 0.5,
      scrollTrigger: { trigger: el, start: 'top 82%', end: 'bottom 55%', scrub: 0.4 },
    });
  });
}
