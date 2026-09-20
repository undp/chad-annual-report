/**
 * "learn more" dialogs.
 *
 * Everything hard about a modal — trapping focus, Escape, making the page
 * behind inert, stacking above every z-index on the page — is delegated to
 * native <dialog>.showModal(). What is left is the part the platform does not
 * do: closing on a backdrop click, and holding the page still underneath.
 *
 * The scroll lock compensates for the scrollbar it removes. Without that, the
 * whole page jumps a dozen pixels sideways the moment a dialog opens, and on a
 * scroll-driven page that shift is also a parallax recalculation.
 */
const LOCK = 'is-modal-open';

function lock() {
  const gap = window.innerWidth - document.documentElement.clientWidth;
  document.documentElement.style.setProperty('--scrollbar-gap', `${gap}px`);
  document.documentElement.classList.add(LOCK);
}

function unlock() {
  document.documentElement.classList.remove(LOCK);
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
    dialog.addEventListener('close', unlock);
    dialog.addEventListener('cancel', unlock);

    dialog.querySelectorAll('[data-modal-close]').forEach((el) => {
      el.addEventListener('click', () => dialog.close());
    });

    /* A click on the dialog element itself is a click on the backdrop: the
       contents live in .modal__box, which stops the event from reaching here. */
    dialog.addEventListener('click', (e) => {
      if (e.target === dialog) dialog.close();
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
