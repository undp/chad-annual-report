/**
 * The behaviour of the UNDP Country Site Header, as the design system's own
 * scripts give it (lang-switcher.js and navigationInitialize in navigation.js,
 * @undp/design-system 2.0.3), with what those scripts leave out for keyboard
 * and screen reader users:
 *
 *   language switcher — a click toggles `.active` on `.dropdown-language`, a
 *                       click anywhere else closes it; here also Escape, and
 *                       aria-expanded on the button. The band and the burger
 *                       menu each carry one, and each behaves the same.
 *   burger            — toggles `.mobile-nav.show` and `.is-active`, and always
 *                       opens with its language list closed; here also Escape
 *                       and aria-expanded.
 *   logo              — `.scrolled` once the header is no longer wholly in
 *                       view: the mark drops the 7px it hangs below the band.
 *
 * Without this file the header still shows its title, the region link and the
 * download; the menus stay closed.
 */
export default function initSiteHeader() {
  const header = document.querySelector('.country-header');
  if (!header) return;

  /* Language switchers */
  const dropdowns = [...header.querySelectorAll('.dropdown-language')];
  const setDropdown = (dropdown, open) => {
    dropdown.classList.toggle('active', open);
    dropdown.querySelector('button').setAttribute('aria-expanded', String(open));
    dropdown.querySelectorAll('ul a').forEach((a) => { a.tabIndex = open ? 0 : -1; });
  };
  dropdowns.forEach((dropdown) => {
    dropdown.querySelector('button').addEventListener('click', () => {
      setDropdown(dropdown, !dropdown.classList.contains('active'));
    });
  });
  document.addEventListener('click', (e) => {
    dropdowns.forEach((dropdown) => { if (!dropdown.contains(e.target)) setDropdown(dropdown, false); });
  });

  /* Burger menu */
  const burger = header.querySelector('.menu-hamburger');
  const nav = header.querySelector('.mobile-nav');

  const setNav = (open) => {
    if (!nav) return;
    nav.classList.toggle('show', open);
    burger.classList.toggle('is-active', open);
    burger.setAttribute('aria-expanded', String(open));
    nav.querySelectorAll('.dropdown-language').forEach((dropdown) => setDropdown(dropdown, false));
  };

  burger?.addEventListener('click', () => setNav(!nav.classList.contains('show')));

  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    const open = dropdowns.find((dropdown) => dropdown.classList.contains('active'));
    if (open) {
      setDropdown(open, false);
      open.querySelector('button').focus();
    } else if (nav?.classList.contains('show')) {
      setNav(false);
      burger.focus();
    }
  });

  /* Logo */
  const logo = header.querySelector('.logo img');
  if (logo && 'IntersectionObserver' in window) {
    new IntersectionObserver(([entry]) => {
      logo.classList.toggle('scrolled', !entry.isIntersecting);
    }, { threshold: 1 }).observe(header);
  }
}
