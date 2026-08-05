(() => {
  'use strict';

  const doc = document.documentElement;
  const body = document.body;
  const header = document.querySelector('.site-header');
  const menuButton = document.querySelector('.menu-button');
  const mobileMenu = document.querySelector('.mobile-menu');
  const menuScrim = document.querySelector('.menu-scrim');
  const finePointer = matchMedia('(hover:hover) and (pointer:fine)').matches;

  const progress = document.createElement('div');
  progress.className = 'scroll-progress';
  progress.setAttribute('aria-hidden', 'true');
  body.appendChild(progress);

  let lastScrollY = Math.max(0, window.scrollY);
  let directionDistance = 0;
  let scrollFrame = 0;

  const revealHeader = () => {
    header?.classList.remove('nav-hidden');
    header?.classList.add('nav-visible');
  };

  const updateScroll = () => {
    scrollFrame = 0;
    const y = Math.max(0, window.scrollY);
    const max = Math.max(1, doc.scrollHeight - innerHeight);
    progress.style.transform = `scaleX(${Math.min(1, y / max)})`;

    if (header) {
      header.classList.toggle('scrolled', y > 24);
      const delta = y - lastScrollY;
      directionDistance = Math.sign(delta) === Math.sign(directionDistance)
        ? directionDistance + delta
        : delta;
      const menuOpen = body.classList.contains('menu-open');

      if (y < 30 || menuOpen || header.matches(':focus-within')) {
        revealHeader();
        directionDistance = 0;
      } else if (directionDistance > 72 && y > 150) {
        header.classList.add('nav-hidden');
        header.classList.remove('nav-visible');
        directionDistance = 0;
      } else if (directionDistance < -28) {
        revealHeader();
        directionDistance = 0;
      }
    }
    lastScrollY = y;
  };

  addEventListener('scroll', () => {
    if (!scrollFrame) scrollFrame = requestAnimationFrame(updateScroll);
  }, { passive: true });
  updateScroll();

  header?.addEventListener('focusin', revealHeader);

  /* Accessible mobile navigation */
  let returnFocus = null;
  const focusableSelector = 'a[href],button:not([disabled]),[tabindex]:not([tabindex="-1"])';

  const setMenu = (open) => {
    if (!menuButton || !mobileMenu) return;
    body.classList.toggle('menu-open', open);
    mobileMenu.classList.toggle('open', open);
    mobileMenu.setAttribute('aria-hidden', String(!open));
    mobileMenu.toggleAttribute('inert', !open);
    menuButton.setAttribute('aria-expanded', String(open));
    menuButton.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    menuButton.textContent = open ? 'Close' : 'Menu';
    if (open) {
      returnFocus = document.activeElement;
      revealHeader();
      requestAnimationFrame(() => mobileMenu.querySelector(focusableSelector)?.focus());
    } else if (returnFocus instanceof HTMLElement) {
      returnFocus.focus({ preventScroll: true });
      returnFocus = null;
    }
  };

  menuButton?.addEventListener('click', () => setMenu(!body.classList.contains('menu-open')));
  menuScrim?.addEventListener('click', () => setMenu(false));
  mobileMenu?.querySelectorAll('a').forEach(link => link.addEventListener('click', (event) => {
    const href = link.getAttribute('href') || '';
    const target = new URL(href, location.href);
    const samePage = target.pathname === location.pathname && target.hash;
    if (samePage) {
      event.preventDefault();
      const section = document.querySelector(target.hash);
      setMenu(false);
      window.setTimeout(() => section?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60);
    } else {
      setMenu(false);
    }
  }));

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      if (body.classList.contains('menu-open')) setMenu(false);
      const dialog = document.querySelector('.portfolio-dialog');
      if (dialog?.open) dialog.close();
    }

    if (event.key === 'Tab' && body.classList.contains('menu-open') && mobileMenu) {
      const focusables = [...mobileMenu.querySelectorAll(focusableSelector)];
      if (!focusables.length) return;
      const first = focusables[0];
      const last = focusables.at(-1);
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
  });

  addEventListener('resize', () => {
    if (innerWidth > 1100 && body.classList.contains('menu-open')) setMenu(false);
  }, { passive: true });

  /* Content entrance: one consistent motion layer */
  const revealItems = [...document.querySelectorAll('.reveal')];
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('visible');
      revealObserver.unobserve(entry.target);
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -5% 0px' });

  revealItems.forEach((el, index) => {
    el.style.transitionDelay = `${Math.min((index % 3) * 55, 110)}ms`;
    if (el.getBoundingClientRect().top < innerHeight * 0.95) {
      requestAnimationFrame(() => el.classList.add('visible'));
    } else {
      revealObserver.observe(el);
    }
  });

  /* Active section navigation */
  const navLinks = [...document.querySelectorAll('.desktop-nav a, .mobile-menu a')];
  const sectionMap = new Map();
  navLinks.forEach(link => {
    const href = link.getAttribute('href') || '';
    const id = href.includes('#') ? href.split('#').pop() : '';
    const section = id && document.getElementById(id);
    if (!section) return;
    if (!sectionMap.has(section)) sectionMap.set(section, []);
    sectionMap.get(section).push(link);
  });
  if (sectionMap.size) {
    const sectionObserver = new IntersectionObserver((entries) => {
      const current = entries.filter(e => e.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (!current) return;
      navLinks.forEach(link => { link.classList.remove('is-active'); link.removeAttribute('aria-current'); });
      sectionMap.get(current.target)?.forEach(link => { link.classList.add('is-active'); link.setAttribute('aria-current','location'); });
    }, { threshold: [0.25, 0.5], rootMargin: '-22% 0px -62% 0px' });
    sectionMap.forEach((_, section) => sectionObserver.observe(section));
  }

  /* Portfolio lightbox: real affordance for archive cards */
  const dialog = document.querySelector('.portfolio-dialog');
  const dialogImage = dialog?.querySelector('#portfolio-image');
  const dialogTitle = dialog?.querySelector('#portfolio-title');
  const dialogCategory = dialog?.querySelector('#portfolio-category');
  const dialogCount = dialog?.querySelector('.dialog-count');
  const dialogPrev = dialog?.querySelector('.dialog-prev');
  const dialogNext = dialog?.querySelector('.dialog-next');
  const dialogClose = dialog?.querySelector('.dialog-close');
  let gallery = [];
  let galleryIndex = 0;
  let galleryTrigger = null;

  const updateDialog = () => {
    if (!dialogImage || !gallery.length) return;
    const src = gallery[galleryIndex];
    dialogImage.src = src;
    dialogImage.alt = `${dialogTitle?.textContent || 'Project'} — image ${galleryIndex + 1} of ${gallery.length}`;
    if (dialogCount) dialogCount.textContent = `${galleryIndex + 1} / ${gallery.length}`;
  };

  document.querySelectorAll('.archive-card[data-gallery]').forEach(card => {
    card.addEventListener('click', () => {
      if (!dialog) return;
      gallery = (card.dataset.gallery || '').split('|').filter(Boolean);
      galleryIndex = 0;
      galleryTrigger = card;
      if (dialogTitle) dialogTitle.textContent = card.dataset.title || 'Project gallery';
      if (dialogCategory) dialogCategory.textContent = card.dataset.category || '';
      updateDialog();
      body.classList.add('modal-open');
      dialog.showModal();
      requestAnimationFrame(() => dialogClose?.focus());
    });
  });

  dialogPrev?.addEventListener('click', () => {
    galleryIndex = (galleryIndex - 1 + gallery.length) % gallery.length;
    updateDialog();
  });
  dialogNext?.addEventListener('click', () => {
    galleryIndex = (galleryIndex + 1) % gallery.length;
    updateDialog();
  });
  dialogClose?.addEventListener('click', () => dialog?.close());
  dialog?.addEventListener('click', event => {
    if (event.target === dialog) dialog.close();
  });
  dialog?.addEventListener('keydown', event => {
    if (event.key === 'ArrowLeft') dialogPrev?.click();
    if (event.key === 'ArrowRight') dialogNext?.click();
  });
  dialog?.addEventListener('close', () => {
    body.classList.remove('modal-open');
    dialogImage?.removeAttribute('src');
    galleryTrigger?.focus({ preventScroll: true });
  });


  /* Selected key visuals: deterministic side-card navigation, edge arrows, dots, touch swipe, and keyboard. */
  document.querySelectorAll('[data-revolve]').forEach((shell) => {
    const block = shell.closest('.key-visual-block') || shell;
    const deck = shell.querySelector('.key-visual-deck');
    const cards = [...shell.querySelectorAll('[data-revolve-card]')];
    const prevButtons = [...block.querySelectorAll('[data-carousel-prev]')];
    const nextButtons = [...block.querySelectorAll('[data-carousel-next]')];
    const pagination = block.querySelector('[data-carousel-pagination]');
    const status = block.querySelector('.revolve-status');
    const announcer = block.querySelector('.key-visual-announcer');
    const touchInput = matchMedia('(pointer:coarse)').matches || navigator.maxTouchPoints > 0;
    if (cards.length < 2 || !deck) return;

    let active = Math.max(0, cards.findIndex(card => card.classList.contains('is-active')));
    let swipePointer = null;
    let swipeStartX = 0;
    let swipeStartY = 0;
    let swipeDeltaX = 0;
    let swipeStartedAt = 0;
    let horizontalSwipe = false;
    let suppressClickUntil = 0;
    let animationTimer = 0;

    const wrapped = value => (value + cards.length) % cards.length;
    const titles = cards.map((card, index) =>
      card.querySelector('.key-visual-name')?.textContent?.trim() ||
      card.querySelector('figcaption span')?.textContent?.trim() ||
      `Key visual ${index + 1}`
    );

    const shortestDirection = target => {
      const forward = wrapped(target - active);
      const backward = wrapped(active - target);
      return forward <= backward ? 1 : -1;
    };

    const dots = cards.map((card, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'key-visual-dot';
      button.setAttribute('aria-label', `Show ${titles[index]}`);
      button.addEventListener('click', event => {
        event.stopPropagation();
        goTo(index, shortestDirection(index));
      });
      pagination?.appendChild(button);
      return button;
    });

    const render = (announce = false, direction = 0) => {
      const prev = wrapped(active - 1);
      const next = wrapped(active + 1);
      cards.forEach((card, index) => {
        const isActive = index === active;
        const isPrev = index === prev;
        const isNext = index === next;
        card.classList.toggle('is-active', isActive);
        card.classList.toggle('is-prev', isPrev);
        card.classList.toggle('is-next', isNext);
        card.setAttribute('aria-hidden', String(!isActive));

        const action = card.querySelector('[data-carousel-card-action]');
        if (action) {
          action.tabIndex = -1;
          action.disabled = isActive;
          action.setAttribute('aria-label', isPrev
            ? `Show previous visual: ${titles[index]}`
            : isNext
              ? `Show next visual: ${titles[index]}`
              : `Current visual: ${titles[index]}`);
        }
        card.style.removeProperty('--tilt-x');
        card.style.removeProperty('--tilt-y');
      });

      dots.forEach((dot, index) => {
        const current = index === active;
        dot.classList.toggle('is-active', current);
        dot.setAttribute('aria-current', current ? 'true' : 'false');
      });

      const compact = `${String(active + 1).padStart(2, '0')} / ${String(cards.length).padStart(2, '0')}`;
      if (status) status.textContent = compact;
      if (announce && announcer) announcer.textContent = `${titles[active]}, visual ${active + 1} of ${cards.length}`;

      block.classList.remove('is-moving-prev', 'is-moving-next');
      if (direction) {
        block.classList.add(direction > 0 ? 'is-moving-next' : 'is-moving-prev');
        clearTimeout(animationTimer);
        animationTimer = window.setTimeout(() => {
          block.classList.remove('is-moving-prev', 'is-moving-next');
        }, 520);
      }
      shell.style.removeProperty('--swipe-offset');
    };

    const goTo = (index, direction = 0) => {
      const target = wrapped(index);
      if (target === active) return;
      const resolvedDirection = direction || shortestDirection(target);
      active = target;
      render(true, resolvedDirection);
    };
    const next = () => goTo(active + 1, 1);
    const previous = () => goTo(active - 1, -1);

    cards.forEach(card => {
      const action = card.querySelector('[data-carousel-card-action]');
      action?.addEventListener('click', event => {
        event.stopPropagation();
        if (Date.now() < suppressClickUntil) return;
        // Direction is derived from the card's current visual position, not its original DOM index.
        if (card.classList.contains('is-prev')) previous();
        else if (card.classList.contains('is-next')) next();
      });

      if (finePointer) {
        card.addEventListener('pointermove', event => {
          if (!card.classList.contains('is-active')) return;
          const rect = card.getBoundingClientRect();
          const x = (event.clientX - rect.left) / rect.width - 0.5;
          const y = (event.clientY - rect.top) / rect.height - 0.5;
          card.style.setProperty('--tilt-y', `${x * 1.7}deg`);
          card.style.setProperty('--tilt-x', `${y * -1.4}deg`);
        });
        card.addEventListener('pointerleave', () => {
          card.style.setProperty('--tilt-y', '0deg');
          card.style.setProperty('--tilt-x', '0deg');
        });
      }
    });

    prevButtons.forEach(button => button.addEventListener('click', event => {
      event.stopPropagation();
      previous();
    }));
    nextButtons.forEach(button => button.addEventListener('click', event => {
      event.stopPropagation();
      next();
    }));

    /* Swipe is supplementary on touch. A tap on either side card or the visible arrows remains sufficient. */
    if (touchInput) {
      deck.addEventListener('pointerdown', event => {
        if (event.button !== undefined && event.button !== 0) return;
        swipePointer = event.pointerId;
        swipeStartX = event.clientX;
        swipeStartY = event.clientY;
        swipeDeltaX = 0;
        swipeStartedAt = performance.now();
        horizontalSwipe = false;
        deck.setPointerCapture?.(swipePointer);
      });

      deck.addEventListener('pointermove', event => {
        if (swipePointer === null || event.pointerId !== swipePointer) return;
        const dx = event.clientX - swipeStartX;
        const dy = event.clientY - swipeStartY;
        if (!horizontalSwipe && Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > 10) {
          swipePointer = null;
          deck.releasePointerCapture?.(event.pointerId);
          return;
        }
        if (Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(dy)) {
          horizontalSwipe = true;
          swipeDeltaX = dx;
          shell.classList.add('is-swiping');
          shell.style.setProperty('--swipe-offset', `${Math.max(-42, Math.min(42, dx * .18))}px`);
          event.preventDefault();
        }
      }, { passive: false });

      const endSwipe = event => {
        if (swipePointer === null || event.pointerId !== swipePointer) return;
        const elapsed = Math.max(1, performance.now() - swipeStartedAt);
        const velocity = Math.abs(swipeDeltaX) / elapsed;
        const shouldMove = horizontalSwipe && (Math.abs(swipeDeltaX) > 34 || velocity > .38);
        if (shouldMove) {
          suppressClickUntil = Date.now() + 280;
          if (swipeDeltaX < 0) next(); else previous();
        } else {
          shell.style.removeProperty('--swipe-offset');
        }
        shell.classList.remove('is-swiping');
        deck.releasePointerCapture?.(swipePointer);
        swipePointer = null;
        swipeDeltaX = 0;
        horizontalSwipe = false;
      };
      deck.addEventListener('pointerup', endSwipe);
      deck.addEventListener('pointercancel', endSwipe);
    }

    shell.addEventListener('keydown', event => {
      if (event.key === 'ArrowLeft') { event.preventDefault(); previous(); }
      if (event.key === 'ArrowRight') { event.preventDefault(); next(); }
      if (event.key === 'Home') { event.preventDefault(); goTo(0, -1); }
      if (event.key === 'End') { event.preventDefault(); goTo(cards.length - 1, 1); }
    });

    render(false);
  });

  /* Internal page transitions */
  document.addEventListener('click', event => {
    const link = event.target.closest('a[href]');
    if (!link || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const href = link.getAttribute('href');
    if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('http')) return;
    const target = new URL(href, location.href);
    if (target.pathname === location.pathname && target.hash) return;
    event.preventDefault();
    body.classList.add('page-leaving');
    setTimeout(() => { location.href = href; }, 140);
  });

  document.querySelectorAll('[data-year]').forEach(el => { el.textContent = new Date().getFullYear(); });
})();
