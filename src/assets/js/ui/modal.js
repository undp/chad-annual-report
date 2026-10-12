/**
 * "learn more" dialogs.
 *
 * Everything hard about a modal — trapping focus, Escape, making the page
 * behind inert, stacking above every z-index on the page — is delegated to
 * native <dialog>.showModal(). What is left is the part the platform does not
 * do: closing on a backdrop click, fading out before closing, and holding the
 * page still underneath.
 *
 * The scroll lock compensates for the scrollbar it removes. Without that, the
 * whole page jumps a dozen pixels sideways the moment a dialog opens, and on a
 * scroll-driven page that shift is also a parallax recalculation.
 */
const LOCK = 'is-modal-open';
const CLOSING = 'is-closing';

function lock() {
  const gap = window.innerWidth - document.documentElement.clientWidth;
  document.documentElement.style.setProperty('--scrollbar-gap', `${gap}px`);
  document.documentElement.classList.add(LOCK);
}

function unlock() {
  document.documentElement.classList.remove(LOCK);
}

/* close() takes the dialog out of the top layer at once, so the fade out runs
   first: the closing class plays it (sections.css) and the dialog closes when
   it ends. With reduced motion there is no animation to wait for, and it
   closes straight away. Every way out comes through here — the close button,
   the backdrop and Escape. */
function requestClose(dialog) {
  if (!dialog.open || dialog.classList.contains(CLOSING)) return;
  dialog.classList.add(CLOSING);
  Promise.allSettled(dialog.getAnimations().map((a) => a.finished)).then(() => {
    if (dialog.classList.contains(CLOSING)) dialog.close();
  });
}

export default function initModals() {
  const dialogs = document.querySelectorAll('dialog.modal');
  if (!dialogs.length) return;

  document.querySelectorAll('[data-modal]').forEach((btn) => {
    const dialog = document.getElementById(`modal-${btn.dataset.modal}`);
    if (!dialog) return;
    btn.addEventListener('click', () => {
      dialog.showModal();
      lock();
      dialog.querySelector('.modal__scroll')?.dispatchEvent(new Event('scroll'));
    });
  });

  dialogs.forEach((dialog) => {
    /* The page stays locked until the card has faded out. When the browser
       refuses to hold Escape back (Chrome, on a second press with no click in
       between), the dialog closes at once, and this tidies up after it. */
    dialog.addEventListener('close', () => {
      dialog.classList.remove(CLOSING);
      unlock();
    });
    dialog.addEventListener('cancel', (e) => {
      e.preventDefault();
      requestClose(dialog);
    });

    dialog.querySelectorAll('[data-modal-close]').forEach((el) => {
      el.addEventListener('click', () => requestClose(dialog));
    });

    /* A click on the dialog element itself is a click on the backdrop: the
       contents live in .modal__box, which stops the event from reaching here. */
    dialog.addEventListener('click', (e) => {
      if (e.target === dialog) requestClose(dialog);
    });
    const box = dialog.querySelector('.modal__box');
    box?.addEventListener('click', (e) => e.stopPropagation());
    /* The fade at the card's foot says "more below"; it goes when there is
       none — at the end, or when the card never needed to scroll. */
    const scroller = dialog.querySelector('.modal__scroll');
    if (scroller) {
      const box = scroller;
      const atEnd = () => box.toggleAttribute('data-at-end', box.scrollTop + box.clientHeight >= box.scrollHeight - 2);
      box.addEventListener('scroll', atEnd, { passive: true });
      new ResizeObserver(atEnd).observe(box);
      atEnd();
    }
  });
}
