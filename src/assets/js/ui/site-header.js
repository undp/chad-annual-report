/**
 * The behaviour of the UNDP Country Site Header, as the design system's own
 * scripts give it (lang-switcher.js and navigationInitialize in navigation.js,
 * @undp/design-system 2.0.3), with what those scripts leave out for keyboard
 * and screen reader users:
 *
 *   language switcher — a click toggles `.active` on `.dropdown-language`, a
 *                       click anywhere else closes it; here also Escape, and
 *                       aria-expanded on the button.
 *   burger            — toggles `.mobile-nav.show` and `.is-active`, and always
 *                       opens on the first panel; here also Escape and
 *                       aria-expanded.
 *   mobile languages  — the language entry opens its own panel over the first
 *                       one, `back` returns.
 *   logo              — `.scrolled` once the header is no longer wholly in
 *                       view: the mark drops the 7px it hangs below the band.
 *
 * Without this file the header still shows its title, the region link and the
 * download; the two menus stay closed.
 */
export default function initSiteHeader() {
  const header = document.querySelector('.country-header');
  if (!header) return;

  /* Language switcher */
  const dropdown = header.querySelector('.dropdown-language');
  const dropdownButton = dropdown?.querySelector('button');
  const setDropdown = (open) => {
    if (!dropdown) return;
    dropdown.classList.toggle('active', open);
    dropdownButton.setAttribute('aria-expanded', String(open));
    dropdown.querySelectorAll('ul a').forEach((a) => { a.tabIndex = open ? 0 : -1; });
  };
  dropdownButton?.addEventListener('click', () => setDropdown(!dropdown.classList.contains('active')));
  document.addEventListener('click', (e) => {
    if (dropdown && !dropdown.contains(e.target)) setDropdown(false);
  });

  /* Burger menu and its language panel */
  const burger = header.querySelector('.menu-hamburger');
  const nav = header.querySelector('.mobile-nav');
  const links = nav?.querySelector('.mobile-links');
  const langPanel = nav?.querySelector('.mob-sub-lang');
  const langOpener = nav?.querySelector('.mob-lang-switcher');

  const setLangPanel = (open) => {
    langPanel?.classList.toggle('show', open);
    links?.classList.toggle('hide', open);
    langOpener?.setAttribute('aria-expanded', String(open));
  };
  const setNav = (open) => {
    if (!nav) return;
    nav.classList.toggle('show', open);
    burger.classList.toggle('is-active', open);
    burger.setAttribute('aria-expanded', String(open));
    setLangPanel(false);
  };

  burger?.addEventListener('click', () => setNav(!nav.classList.contains('show')));
  langOpener?.addEventListener('click', (e) => {
    e.preventDefault();
    setLangPanel(true);
    langPanel.querySelector('a')?.focus();
  });
  nav?.querySelector('.back-nav')?.addEventListener('click', () => {
    setLangPanel(false);
    langOpener?.focus();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (dropdown?.classList.contains('active')) {
      setDropdown(false);
      dropdownButton.focus();
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
