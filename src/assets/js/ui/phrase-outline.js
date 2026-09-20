/**
 * The yellow outline around "immense potential and significant challenges."
 *
 * In the file it is one shape — a `Union` of the line boxes the phrase covers,
 * with no rule where the lines meet. CSS cannot draw that: an inline box that
 * wraps is two boxes, and the edge where they overlap shows. So the outline is
 * drawn here, as a single SVG path traced around the union of the phrase's
 * line rectangles, and laid over the text as the file draws it.
 *
 * The path is rebuilt whenever the lines can move: resize, font load, and the
 * lit/unlit state of the halves. Until the script runs, the CSS outline on
 * `.impact__phrase` is what shows — two boxes, but never nothing.
 */
const STROKE = 2;

function lineRects(el, origin) {
  const rects = [];
  for (const r of el.getClientRects()) {
    if (r.width < 1 || r.height < 1) continue;
    rects.push({ x: r.left - origin.left, y: r.top - origin.top, w: r.width, h: r.height });
  }
  /* Fragments of the same line (the span is split by the buttons) merge into
     one rectangle per line. Same line = same top, within a pixel. */
  rects.sort((a, b) => a.y - b.y || a.x - b.x);
  const lines = [];
  for (const r of rects) {
    const last = lines[lines.length - 1];
    if (last && Math.abs(last.y - r.y) < 1.5) {
      const x0 = Math.min(last.x, r.x), x1 = Math.max(last.x + last.w, r.x + r.w);
      last.x = x0; last.w = x1 - x0; last.h = Math.max(last.h, r.h);
    } else lines.push({ ...r });
  }
  return lines;
}

/* Outline of a stack of rectangles, one per line. Walk down the right-hand
   side, then back up the left: at every step between two lines the path turns
   out or in by the difference in their edges. Consecutive boxes meet on one
   seam, halfway through the gap between the caps of one line and the next —
   which is where the file's Union has its own edges meet. */
function unionPath(lines, pad) {
  const L = lines.map((l) => ({ x0: l.x - pad, x1: l.x + l.w + pad, y0: l.y - pad, y1: l.y + l.h + pad }));
  for (let i = 1; i < L.length; i++) { const seam = (L[i - 1].y1 + L[i].y0) / 2; L[i - 1].y1 = seam; L[i].y0 = seam; }
  const f = (n) => Math.round(n * 2) / 2;
  let d = `M${f(L[0].x0)},${f(L[0].y0)} H${f(L[0].x1)}`;
  for (let i = 0; i < L.length; i++) {
    d += ` V${f(L[i].y1)}`;
    if (i + 1 < L.length) d += ` H${f(L[i + 1].x1)}`;
  }
  d += ` H${f(L[L.length - 1].x0)}`;
  for (let i = L.length - 1; i >= 0; i--) {
    d += ` V${f(L[i].y0)}`;
    if (i > 0) d += ` H${f(L[i - 1].x0)}`;
  }
  return d + ' Z';
}

export default function initPhraseOutline() {
  const lead = document.querySelector('.impact__lead');
  const phrase = lead && lead.querySelector('.impact__phrase');
  if (!lead || !phrase) return;

  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.classList.add('impact__outline');
  svg.setAttribute('aria-hidden', 'true');
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  svg.appendChild(path);
  lead.appendChild(svg);

  const draw = () => {
    const origin = lead.getBoundingClientRect();
    const lines = lineRects(phrase, origin);
    if (!lines.length) { lead.removeAttribute('data-outlined'); return; }
    /* The file's outline hugs the capitals, not the line box: on the 1440
       artboard the Union starts 8px above the cap line of its first line and
       ends 8px under the baseline of its last, 7px left of the text. The
       line box here is taller than the caps (57 up, 13 down on a 55 size), so
       each line is cut down to its cap box — measured from the font itself —
       before the outline is drawn round it with the file's air. */
    const fs = parseFloat(getComputedStyle(phrase).fontSize);
    const cap = capHeight(phrase) || fs * 0.72;
    const lh = parseFloat(getComputedStyle(phrase).lineHeight) || fs;
    const air = Math.round(fs * (8 / 55));
    for (const l of lines) {
      /* Baseline sits `ascent` under the line top when the line box is the
         font's own height; with line-height set, half-leading is added above. */
      const halfLeading = (lh - (asc + desc)) / 2;
      const baseline = l.y + halfLeading + asc;
      l.y = baseline - cap; l.h = cap;
    }
    svg.setAttribute('viewBox', `0 0 ${origin.width} ${origin.height}`);
    svg.setAttribute('width', origin.width);
    svg.setAttribute('height', origin.height);
    path.setAttribute('d', unionPath(lines, air));
    lead.setAttribute('data-outlined', '');
  };
  let asc = 0, desc = 0;
  function capHeight(el) {
    const cs = getComputedStyle(el);
    const c = document.createElement('canvas').getContext('2d');
    c.font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
    const m = c.measureText('H');
    asc = m.fontBoundingBoxAscent || 0; desc = m.fontBoundingBoxDescent || 0;
    return m.actualBoundingBoxAscent || 0;
  }

  draw();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(draw);
  let raf = 0;
  const schedule = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(draw); };
  window.addEventListener('resize', schedule);
  if ('ResizeObserver' in window) new ResizeObserver(schedule).observe(lead);
  new MutationObserver(schedule).observe(lead, { attributes: true, subtree: true, attributeFilter: ['data-lit'] });
  return draw;
}
