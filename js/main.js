const mainScroll = document.getElementById('main-scroll');
const sections = Array.from(document.querySelectorAll('.snap-section'));
const DESKTOP_BREAKPOINT = 900;

function isDesktop() {
  return window.innerWidth >= DESKTOP_BREAKPOINT;
}

let isSectionNavigating = false;
let lastNavTime = 0;

function scrollToSectionIndex(index) {
  if (index < 0 || index >= sections.length) return;
  const now = Date.now();
  if (isSectionNavigating || now - lastNavTime < 650) return;
  isSectionNavigating = true;
  lastNavTime = now;
  const targetTop = sections[index].offsetTop;
  if (typeof targetTop === 'number' && !isNaN(targetTop)) {
    mainScroll.scrollTo({ top: targetTop, behavior: 'smooth' });
  } else {
    sections[index].scrollIntoView({ behavior: 'smooth' });
  }
  setTimeout(() => {
    isSectionNavigating = false;
  }, 700);
}

function getActiveSectionIndex() {
  const st = mainScroll.scrollTop;
  let activeIdx = 0;
  let minDiff = Infinity;
  sections.forEach((sec, idx) => {
    const diff = Math.abs(sec.offsetTop - st);
    if (diff < minDiff) {
      minDiff = diff;
      activeIdx = idx;
    }
  });
  return activeIdx;
}

function updateLightSectionControlContrast() {
  const activeSec = sections[getActiveSectionIndex()];
  const isLightSec = Boolean(activeSec && activeSec.id === 'sponsors');
  const headerEl = document.getElementById('header');
  const isSolid = Boolean(headerEl && headerEl.classList.contains('is-solid'));
  const isVideoSec = Boolean(activeSec && activeSec.id === 'header' && !isSolid);
  document.body.classList.toggle('on-light-section', isLightSec);
  document.body.classList.toggle('on-video-section', isVideoSec);
}

if (mainScroll) {
  mainScroll.addEventListener('scroll', updateLightSectionControlContrast, { passive: true });
  updateLightSectionControlContrast();
}

// Open external URL in a new tab safely
function openExternalUrl(url) {
  if (!url) return;
  const win = window.open(url, '_blank');
  if (win) {
    try { win.opener = null; } catch (e) {}
    return;
  }
  window.location.href = url;
}

// --- Mobile Auto-Swipe to Text Section (4s waiting time) ---
const AUTO_SWIPE_DELAY = 4000;
const autoSwipeTimers = new Map();
const userInteractedSlides = new Set();
let isAutoSwiping = false;

function clearSlideAutoSwipe(slideEl) {
  if (!slideEl) return;
  const timer = autoSwipeTimers.get(slideEl);
  if (timer) {
    clearTimeout(timer);
    autoSwipeTimers.delete(slideEl);
  }
}

function registerSlideUserInteraction(slideEl) {
  if (!slideEl) return;
  clearSlideAutoSwipe(slideEl);
  userInteractedSlides.add(slideEl.id);
}

function triggerAutoSwipe(slideEl) {
  if (isDesktop() || !slideEl) return;
  if (userInteractedSlides.has(slideEl.id)) return;

  const body = slideEl.querySelector('.slide-body');
  const textPane = slideEl.querySelector('.slide-pane-text');
  if (!body || !textPane) return;

  if (body.scrollLeft <= 12) {
    isAutoSwiping = true;
    const padH = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--pad-h')) || 24;
    body.scrollTo({ left: Math.max(0, textPane.offsetLeft - padH), behavior: 'smooth' });
    setTimeout(() => {
      isAutoSwiping = false;
    }, 800);
  }
}

function scheduleSlideAutoSwipe(slideEl) {
  if (isDesktop() || !slideEl) return;
  if (slideEl.id !== 'bikes') return;
  if (!slideEl.querySelector('.slide-pane-text') || !slideEl.querySelector('.slide-pane-device')) return;

  clearSlideAutoSwipe(slideEl);
  if (userInteractedSlides.has(slideEl.id)) return;

  const body = slideEl.querySelector('.slide-body');
  if (body && body.scrollLeft > 12) return;

  const timer = setTimeout(() => {
    triggerAutoSwipe(slideEl);
  }, AUTO_SWIPE_DELAY);

  autoSwipeTimers.set(slideEl, timer);
}

// Glide to text when bike mockup is tapped (mobile only)
function glideToText(el) {
  if (isDesktop()) return;
  const slide = el.closest('.content-slide');
  if (slide) registerSlideUserInteraction(slide);
  const inner = el.closest('.slide-inner');
  const body = inner && inner.querySelector('.slide-body');
  const textPane = inner && inner.querySelector('.slide-pane-text');
  if (body && textPane) {
    const padH = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--pad-h')) || 24;
    body.scrollTo({ left: Math.max(0, textPane.offsetLeft - padH), behavior: 'smooth' });
  }
}

// Reveal text when peeking text is tapped (mobile only)
function revealText(el) {
  if (isDesktop()) return;
  const slide = el.closest('.content-slide');
  if (slide) registerSlideUserInteraction(slide);
  const inner = el.closest('.slide-inner');
  const body = inner && inner.querySelector('.slide-body');
  if (body) {
    const padH = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--pad-h')) || 24;
    body.scrollTo({ left: Math.max(0, el.offsetLeft - padH), behavior: 'smooth' });
  }
}

// When a section comes into view, reset horizontal scroll and schedule 4s auto-swipe (mobile)
const sectionObserver = new IntersectionObserver((entries) => {
  if (isDesktop()) return;
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      if (entry.target.id === 'bikes') {
        const body = entry.target.querySelector('.slide-body');
        if (body) body.scrollLeft = 0;
        userInteractedSlides.delete(entry.target.id);
        scheduleSlideAutoSwipe(entry.target);
      }
    } else {
      clearSlideAutoSwipe(entry.target);
    }
  });
}, { threshold: 0.55 });

sections.forEach((sec) => sectionObserver.observe(sec));

// Cancel auto-swipe immediately on any user touch/input on #bikes
const bikesSlide = document.getElementById('bikes');
if (bikesSlide) {
  const body = bikesSlide.querySelector('.slide-body');
  ['touchstart', 'touchmove', 'mousedown', 'wheel', 'pointerdown'].forEach((evtName) => {
    bikesSlide.addEventListener(evtName, () => {
      registerSlideUserInteraction(bikesSlide);
    }, { passive: true });
  });

  if (body) {
    body.addEventListener('scroll', () => {
      if (!isAutoSwiping) {
        registerSlideUserInteraction(bikesSlide);
      }
    }, { passive: true });
  }
}

// Two-phase vertical boundary scrolling helper (for .slide-pane-text and mobile vertical carousels)
function attachVerticalBoundaryNavigation(scrollEl, options) {
  if (!scrollEl) return;
  const mobileOnly = Boolean(options && options.mobileOnly);
  let touchStartY = 0;
  let touchStartX = 0;
  let wasAtBottomOnTouchStart = false;
  let wasAtTopOnTouchStart = false;
  let hasNavigated = false;

  scrollEl.addEventListener('touchstart', (e) => {
    if (mobileOnly && isDesktop()) return;
    if (!e.touches || e.touches.length !== 1) return;
    touchStartY = e.touches[0].clientY;
    touchStartX = e.touches[0].clientX;
    hasNavigated = false;
    const scrollBottom = scrollEl.scrollHeight - scrollEl.clientHeight - scrollEl.scrollTop;
    wasAtBottomOnTouchStart = scrollBottom <= 14;
    wasAtTopOnTouchStart = scrollEl.scrollTop <= 6;
  }, { passive: true });

  scrollEl.addEventListener('touchmove', (e) => {
    if (mobileOnly && isDesktop()) return;
    if (hasNavigated || !e.touches || e.touches.length !== 1) return;
    const deltaY = touchStartY - e.touches[0].clientY;
    const deltaX = touchStartX - e.touches[0].clientX;

    if (Math.abs(deltaY) < Math.abs(deltaX) * 1.3) return;

    if (wasAtBottomOnTouchStart && deltaY > 45) {
      const idx = getActiveSectionIndex();
      if (idx < sections.length - 1) {
        hasNavigated = true;
        scrollToSectionIndex(idx + 1);
      }
    } else if (wasAtTopOnTouchStart && deltaY < -45) {
      const idx = getActiveSectionIndex();
      if (idx > 0) {
        hasNavigated = true;
        scrollToSectionIndex(idx - 1);
      }
    }
  }, { passive: true });

  let wheelHitsAtBottom = 0;
  let wheelHitTimeout = null;
  let wheelHitsAtTop = 0;
  let wheelHitTopTimeout = null;

  scrollEl.addEventListener('wheel', (e) => {
    if (isDesktop()) return;
    if (scrollEl.scrollHeight <= scrollEl.clientHeight + 4) return;

    const topThreshold = 6;
    const bottomThreshold = 8;
    const scrollBottom = scrollEl.scrollHeight - scrollEl.clientHeight - scrollEl.scrollTop;

    if (e.deltaY > 0) {
      wheelHitsAtTop = 0;
      if (scrollBottom <= bottomThreshold) {
        wheelHitsAtBottom++;
        clearTimeout(wheelHitTimeout);
        wheelHitTimeout = setTimeout(() => { wheelHitsAtBottom = 0; }, 650);
        if (wheelHitsAtBottom >= 2) {
          wheelHitsAtBottom = 0;
          const idx = getActiveSectionIndex();
          if (idx < sections.length - 1) scrollToSectionIndex(idx + 1);
        }
      } else {
        wheelHitsAtBottom = 0;
      }
    } else if (e.deltaY < 0) {
      wheelHitsAtBottom = 0;
      if (scrollEl.scrollTop <= topThreshold) {
        wheelHitsAtTop++;
        clearTimeout(wheelHitTopTimeout);
        wheelHitTopTimeout = setTimeout(() => { wheelHitsAtTop = 0; }, 650);
        if (wheelHitsAtTop >= 2) {
          wheelHitsAtTop = 0;
          const idx = getActiveSectionIndex();
          if (idx > 0) scrollToSectionIndex(idx - 1);
        }
      } else {
        wheelHitsAtTop = 0;
      }
    }
  }, { passive: true });
}

document.querySelectorAll('.slide-pane-text').forEach((textPane) => {
  textPane.addEventListener('scroll', () => {
    const scrollBottom = textPane.scrollHeight - textPane.clientHeight - textPane.scrollTop;
    textPane.classList.toggle('at-bottom', scrollBottom <= 16);
  }, { passive: true });
  attachVerticalBoundaryNavigation(textPane, { mobileOnly: true });
});

// --- Vertical Center-Highlight Carousels (Mobile: Sponsors & Team) ---
function initVerticalCarousel(containerSelector, itemSelector) {
  const container = document.querySelector(containerSelector);
  if (!container) return;
  const items = Array.from(container.querySelectorAll(itemSelector));
  if (!items.length) return;

  let rafId = 0;

  function updateActiveItem() {
    rafId = 0;
    if (isDesktop()) {
      items.forEach((item) => item.classList.remove('is-active'));
      return;
    }

    const containerRect = container.getBoundingClientRect();
    const centerY = containerRect.top + containerRect.height / 2;
    let closestItem = items[0];
    let minDist = Infinity;

    items.forEach((item) => {
      const rect = item.getBoundingClientRect();
      const itemCenterY = rect.top + rect.height / 2;
      const dist = Math.abs(itemCenterY - centerY);
      if (dist < minDist) {
        minDist = dist;
        closestItem = item;
      }
    });

    items.forEach((item) => {
      item.classList.toggle('is-active', item === closestItem);
    });
  }

  function scheduleUpdate() {
    if (!rafId) {
      rafId = requestAnimationFrame(updateActiveItem);
    }
  }

  container.addEventListener('scroll', scheduleUpdate, { passive: true });
  window.addEventListener('resize', scheduleUpdate, { passive: true });
  window.addEventListener('load', scheduleUpdate, { passive: true });

  container.querySelectorAll('img').forEach((img) => {
    if (!img.complete) {
      img.addEventListener('load', scheduleUpdate, { passive: true });
    }
  });

  if ('ResizeObserver' in window) {
    const ro = new ResizeObserver(scheduleUpdate);
    ro.observe(container);
    items.forEach((item) => ro.observe(item));
  }

  updateActiveItem();

  attachVerticalBoundaryNavigation(container, { mobileOnly: true });
}

initVerticalCarousel('.sponsors-carousel', '.sponsor-item');
initVerticalCarousel('.team-carousel', '.team-card');

// --- Kanaele Slider (Social Media: Instagram & Facebook) ---
let kanaeleDragging = false;
let kanaeleStartX = 0;
let kanaeleStartY = 0;
let kanaeleStartTime = 0;
let kanaeleIgnoreClickUntil = 0;

function initKanaeleSlider() {
  const kanaeleTrack = document.getElementById('kanaele-track');
  const kanaeleBody = document.querySelector('#kanaele .slide-body');
  if (!kanaeleTrack || !kanaeleBody) return;

  kanaeleTrack.addEventListener('touchstart', (e) => {
    if (e.touches.length !== 1) return;
    kanaeleStartX = e.touches[0].clientX;
    kanaeleStartY = e.touches[0].clientY;
    kanaeleStartTime = Date.now();
    kanaeleDragging = false;
  }, { passive: true });

  kanaeleTrack.addEventListener('touchmove', (e) => {
    if (e.touches.length !== 1) return;
    const dx = Math.abs(e.touches[0].clientX - kanaeleStartX);
    const dy = Math.abs(e.touches[0].clientY - kanaeleStartY);
    if (dx > 10 || dy > 10) {
      kanaeleDragging = true;
    }
  }, { passive: true });

  kanaeleTrack.addEventListener('touchend', () => {
    if (kanaeleDragging || (Date.now() - kanaeleStartTime > 350)) {
      kanaeleIgnoreClickUntil = Date.now() + 500;
    }
    kanaeleDragging = false;
  }, { passive: true });

  let isMouseDown = false;
  let mouseStartX = 0;
  let mouseStartScrollLeft = 0;
  let totalDragDist = 0;

  kanaeleBody.addEventListener('mousedown', (e) => {
    if (!isDesktop() || e.button !== 0) return;
    isMouseDown = true;
    totalDragDist = 0;
    mouseStartX = e.pageX;
    mouseStartScrollLeft = kanaeleBody.scrollLeft;
    kanaeleBody.classList.add('is-dragging');
  });

  window.addEventListener('mousemove', (e) => {
    if (!isMouseDown) return;
    const deltaX = e.pageX - mouseStartX;
    totalDragDist += Math.abs(deltaX);
    kanaeleBody.scrollLeft = mouseStartScrollLeft - deltaX;
  });

  window.addEventListener('mouseup', () => {
    if (!isMouseDown) return;
    isMouseDown = false;
    kanaeleBody.classList.remove('is-dragging');
    if (totalDragDist > 8) {
      kanaeleIgnoreClickUntil = Date.now() + 300;
    }
  });

  const prevBtn = document.getElementById('kanaele-prev-btn');
  const nextBtn = document.getElementById('kanaele-next-btn');

  function updateNavButtons() {
    if (!isDesktop()) return;
    const maxScroll = kanaeleBody.scrollWidth - kanaeleBody.clientWidth;
    if (prevBtn) prevBtn.classList.toggle('is-disabled', kanaeleBody.scrollLeft <= 10 || maxScroll <= 10);
    if (nextBtn) nextBtn.classList.toggle('is-disabled', kanaeleBody.scrollLeft >= maxScroll - 10 || maxScroll <= 10);
  }

  if (prevBtn) {
    prevBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const card = kanaeleBody.querySelector('.kanaele-card');
      const step = card ? (card.offsetWidth + 48) : 600;
      kanaeleBody.scrollBy({ left: -step, behavior: 'smooth' });
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const card = kanaeleBody.querySelector('.kanaele-card');
      const step = card ? (card.offsetWidth + 48) : 600;
      kanaeleBody.scrollBy({ left: step, behavior: 'smooth' });
    });
  }

  kanaeleBody.addEventListener('scroll', updateNavButtons, { passive: true });
  window.addEventListener('resize', updateNavButtons, { passive: true });
  updateNavButtons();
}

function handleKanaeleCardClick(url, event) {
  if (isDesktop() && event) {
    const target = event.target;
    const isMockup = target.closest('.device-laptop');
    const isLabel = target.closest('.kanaele-card-title') || target.closest('.kanaele-card-info');
    if (!isMockup && !isLabel) return;
  }
  if (Date.now() < kanaeleIgnoreClickUntil) return;
  openExternalUrl(url);
}

initKanaeleSlider();

// --- Team Member Detail Modal ---
const TEAM_MEMBERS = {
  somavilla: {
    name: 'Bianca Somavilla',
    role: 'Fahrerin',
    img: 'img/somavilla.webp',
    socials: [
      { label: 'Instagram', url: 'https://www.instagram.com/bianca_tirol', icon: 'img/insta.webp' }
    ],
    meta: [
      { label: 'Alter', value: '38' }
    ],
    results: [
      '2. Platz🥈 Österreichische Marathon-Staatsmeisterschaft 2025 (Masters)',
      '1. Platz🥇 Salzkammergut Trophy 2025 (B-Strecke)',
      '3. Platz🥉 Ötztaler Radmarathon Overall 2021'
    ]
  },
  markt: {
    name: 'Karl Markt',
    role: 'Fahrer',
    img: 'img/markt.webp',
    socials: [
      { label: 'Instagram', url: 'https://www.instagram.com/charlymarkt', icon: 'img/insta.webp' },
      { label: 'Facebook', url: 'https://www.facebook.com/charly.markt', icon: 'img/fb.webp' }
    ],
    meta: [
      { label: 'Alter', value: '45' }
    ],
    results: [
      '6. Platz Marathon Weltmeisterschaft 2021 Elite',
      '17. Platz XCO Weltmeisterschaft 2012 Elite',
      '20. Platz Olympische Spiele 2012 XCO London'
    ]
  },
  hochenwarter: {
    name: 'Uwe Hochenwarter',
    role: 'Fahrer',
    img: 'img/hochenwarter.webp',
    socials: [
      { label: 'Instagram', url: 'https://www.instagram.com/uwehochenwarter/', icon: 'img/insta.webp' },
      { label: 'Facebook', url: 'https://facebook.com/uwe.hochenwarter/', icon: 'img/fb.webp' },
      { label: 'Website', url: 'https://www.uwehochenwarter.com/', icon: 'img/web.png' }
    ],
    meta: [
      { label: 'Alter, Beruf', value: '39, gelernter Tischler, MTB Ex-Profi, Soldat' },
      { label: 'Wohnort', value: 'Villach / Kärnten (Österreich)' }
    ],
    results: [
      '2. Platz🥈 Marathon-Europameisterschaft 2024+2025 (Masters)',
      '1. Platz🥇 Österreichische Marathon-Staatsmeisterschaft 2024+2025 (Masters)',
      '1. Platz🥇 HERO Dolomites 2025 (Masters)'
    ]
  },
  acs: {
    name: 'Igor Acs',
    role: 'Fahrer',
    img: 'img/acs.webp',
    socials: [
      { label: 'Instagram', url: 'https://www.instagram.com/igor_acs_/', icon: 'img/insta.webp' }
    ],
    meta: [
      { label: 'Alter, Beruf', value: '36, Unternehmensberater und Kinesiologie-Student' },
      { label: 'Wohnort', value: 'Sisak, Kroatien' }
    ],
    results: [
      '3. Platz🥉 WildBearMTB Overall Men 2025',
      '3. Platz🥉 4-Islands Kroatien Amateur Men 2023',
      '3. Platz🥉 Kroatien Cup Overall Elite 2022'
    ]
  },
  spahn: {
    name: 'Hannes Spahn',
    role: 'Fahrer',
    img: 'img/spahn.webp',
    socials: [
      { label: 'Instagram', url: 'https://www.instagram.com/spahnhannes/', icon: 'img/insta.webp' }
    ],
    meta: [
      { label: 'Alter, Beruf', value: '27, Heilerziehungspfleger' },
      { label: 'Wohnort', value: 'Hausen bei Schonungen' }
    ],
    results: [
      '2. Platz🥈 Xterra Weltmeisterschaft (Altersklasse 25-29)',
      '1. Platz🥇 Ortler Bike Marathon (Classic Distanz)',
      '2. Platz🥈 Riva BIKE Festival (Ronda Piccola)'
    ]
  },
  riedl: {
    name: 'Tobi Riedl',
    role: 'Fahrer',
    img: 'img/riedl.webp',
    socials: [
      { label: 'Instagram', url: 'https://www.instagram.com/rietorides/', icon: 'img/insta.webp' }
    ],
    meta: [
      { label: 'Alter, Beruf', value: '40, Spezialist für Luftfahrtkomponenten' },
      { label: 'Wohnort', value: 'Neuburg an der Donau' }
    ],
    results: [
      'Top 10 Marathon-Europameisterschaft (Masters)',
      'Top 10 Deutsche Cyclocross-Meisterschaft (Elite)'
    ]
  },
  pechacek: {
    name: 'Luca Pechacek',
    role: 'Fahrer',
    img: 'img/pecacheck.webp',
    socials: [
      { label: 'Instagram', url: 'https://www.instagram.com/lucapechacek/', icon: 'img/insta.webp' },
      { label: 'Facebook', url: 'https://www.facebook.com/luca.pechacek/', icon: 'img/fb.webp' }
    ],
    meta: [
      { label: 'Alter, Beruf', value: '22, Student' },
      { label: 'Wohnort', value: 'Schlierbach' }
    ],
    results: [
      '1. Platz🥇 Bike Festival Willingen (Short Distance)',
      '1. Platz🥇 Schwarzwald-Bike-Marathon (Jugend)',
      '3. Platz🥉 Dolomiti Superbike (Short Distance)',
      '3. Platz🥉 Black Forest Ultra Bike-Marathon Overall (Short Track)',
      '4. Platz Kronplatzking (Prince) Marathon Overall (1. U23)'
    ]
  },
  ullmann: {
    name: 'Tobi Ullmann',
    role: 'Teamchef',
    img: 'img/ullmann.webp',
    socials: [
      { label: 'Facebook', url: 'https://www.facebook.com/tobias.ullmann.1', icon: 'img/fb.webp' }
    ],
    meta: [
      { label: 'Alter, Beruf', value: '44, Inhaber der Fahrrad-Werkstatt Hilpoltstein und TU-Sports, Teamchef des Teams WILIER-CHAOYANG' },
      { label: 'Wohnort', value: 'Kronmühle, Allersberg' }
    ],
    results: [
      'Teamchef des Teams WILIER-CHAOYANG und Inhaber von TU-Sports/Fahrrad-Werkstatt',
      'Siege bei Mountainbike XC- und Marathonrennen seit 1995; Teilnahme an UCI XC Welt-, Europa- und Deutschlandcup; letztes Ergebnis: 2. Platz🥈 Overall (1. Platz🥇 Masters) KRK n Roll Short Distance 2025'
    ]
  },
  ramspeck: {
    name: 'Peter Ramspeck',
    role: 'Betreuer',
    img: 'img/ramspeck.webp',
    socials: [],
    meta: [
      { label: 'Alter, Beruf', value: '52, Vertrieb' },
      { label: 'Wohnort', value: 'Mieders, Stubaital' }
    ],
    results: []
  },
  spiegel: {
    name: 'Walter Spiegel',
    role: 'Betreuer',
    img: 'img/spiegel.webp',
    socials: [],
    meta: [
      { label: 'Alter, Beruf', value: '49, Vertriebsingenieur' },
      { label: 'Wohnort', value: 'Weissenburg' }
    ],
    results: []
  },
  felleiter: {
    name: 'Wolfgang Felleiter',
    role: 'Betreuer',
    img: 'img/felleiter.webp',
    socials: [],
    meta: [
      { label: 'Alter, Beruf', value: '54, Werkstattleiter Bikeshop' },
      { label: 'Wohnort', value: 'Eckersmühlen, Hilpoltstein' }
    ],
    results: []
  }
};

const teamModal = document.getElementById('team-modal');
const teamModalTitle = document.getElementById('team-modal-title');
const teamModalBody = document.getElementById('team-modal-body');

function isTeamModalOpen() {
  return Boolean(teamModal && teamModal.classList.contains('is-open'));
}

function openTeamModal(memberId) {
  const member = TEAM_MEMBERS[memberId];
  if (!member || !teamModal || !teamModalTitle || !teamModalBody) return;

  teamModalTitle.textContent = member.name;

  let html = `<img src="${member.img}" alt="${member.name}" class="team-modal-img">`;

  if (member.socials && member.socials.length) {
    html += '<div class="team-modal-socials">';
    member.socials.forEach((s) => {
      html += `<a href="${s.url}" target="_blank" rel="noopener noreferrer" class="team-modal-social-link">
        <img src="${s.icon}" alt="${s.label}" width="24" height="24">
        <span>${s.label}</span>
      </a>`;
    });
    html += '</div>';
  }

  if (member.meta && member.meta.length) {
    member.meta.forEach((m) => {
      html += `<p><strong>${m.label}: </strong>${m.value}</p>`;
    });
  }

  if (member.results && member.results.length) {
    html += '<p><strong>Top Erfolge: </strong></p><ul>';
    member.results.forEach((r) => {
      html += `<li>${r}</li>`;
    });
    html += '</ul>';
  }

  teamModalBody.innerHTML = html;
  teamModal.classList.add('is-open');
  teamModal.setAttribute('aria-hidden', 'false');
}

function closeTeamModal() {
  if (!teamModal) return;
  teamModal.classList.remove('is-open');
  teamModal.setAttribute('aria-hidden', 'true');
}

if (teamModal) {
  teamModal.addEventListener('click', (e) => {
    if (e.target === teamModal) {
      closeTeamModal();
    }
  });
}

// --- Desktop Unified Wheel & Keyboard Navigation ---
function canScrollContainer(el, deltaY) {
  if (!el) return false;
  const maxScroll = el.scrollHeight - el.clientHeight;
  if (maxScroll <= 6) return false;
  if (deltaY > 0 && el.scrollTop < maxScroll - 6) return true;
  if (deltaY < 0 && el.scrollTop > 6) return true;
  return false;
}

function handleDesktopWheel(e) {
  if (!isDesktop() || isMenuOpen() || isTeamModalOpen()) return;

  if (e.shiftKey || Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
    return;
  }

  if (isSectionNavigating) {
    e.preventDefault();
    return;
  }

  const legalPanel = document.querySelector('#legal .legal-panel.active');
  if (legalPanel && legalPanel.contains(e.target) && canScrollContainer(legalPanel, e.deltaY)) {
    return;
  }

  const teamScroll = document.querySelector('#team .slide-body');
  if (teamScroll && teamScroll.contains(e.target) && canScrollContainer(teamScroll, e.deltaY)) {
    return;
  }

  const sponsorsScroll = document.querySelector('#sponsors .slide-body');
  if (sponsorsScroll && sponsorsScroll.contains(e.target) && canScrollContainer(sponsorsScroll, e.deltaY)) {
    return;
  }

  if (Math.abs(e.deltaY) < 16) return;

  const currentIdx = getActiveSectionIndex();

  if (e.deltaY > 0) {
    if (currentIdx < sections.length - 1) {
      e.preventDefault();
      scrollToSectionIndex(currentIdx + 1);
    }
  } else if (e.deltaY < 0) {
    if (currentIdx > 0) {
      e.preventDefault();
      scrollToSectionIndex(currentIdx - 1);
    }
  }
}

window.addEventListener('wheel', handleDesktopWheel, { passive: false });

window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && isTeamModalOpen()) {
    e.preventDefault();
    closeTeamModal();
    return;
  }
  if (e.key === 'Escape' && isMenuOpen()) {
    e.preventDefault();
    closeMenu();
    const toggleBtn = document.getElementById('menu-toggle');
    if (toggleBtn) toggleBtn.focus();
    return;
  }
  if (isMenuOpen() || isTeamModalOpen()) return;
  if (!isDesktop()) return;
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

  const currentIdx = getActiveSectionIndex();
  if (e.key === 'ArrowDown' || e.key === 'PageDown' || (e.key === ' ' && !e.shiftKey)) {
    if (currentIdx < sections.length - 1) {
      e.preventDefault();
      scrollToSectionIndex(currentIdx + 1);
    }
  } else if (e.key === 'ArrowUp' || e.key === 'PageUp' || (e.key === ' ' && e.shiftKey)) {
    if (currentIdx > 0) {
      e.preventDefault();
      scrollToSectionIndex(currentIdx - 1);
    }
  } else if (e.key === 'Home') {
    e.preventDefault();
    scrollToSectionIndex(0);
  } else if (e.key === 'End') {
    e.preventDefault();
    scrollToSectionIndex(sections.length - 1);
  }
});

// --- Hero Section Continuous Scroll & Snap-Lock ---
const headerSec = document.getElementById('header');
const nextAfterHeroIdx = sections.length > 1 ? 1 : -1;
let updateHeroSolidOnScroll = null;

if (headerSec) {
  const getHeaderMaxScroll = () => Math.max(0, headerSec.scrollHeight - headerSec.clientHeight);
  const isHeaderAtBottom = () => {
    const maxScroll = getHeaderMaxScroll();
    return maxScroll > 0 && (maxScroll - headerSec.scrollTop) <= 10;
  };
  const isHeaderAtTop = () => headerSec.scrollTop <= 10;

  updateHeroSolidOnScroll = () => {
    const st = headerSec.scrollTop;
    const maxScroll = getHeaderMaxScroll();
    const denom = maxScroll > 20 ? (maxScroll * 0.92) : (window.innerHeight * 0.32);
    const progress = Math.min(1, Math.max(0, st / denom));
    headerSec.style.setProperty('--hero-solid-opacity', progress.toFixed(3));
    headerSec.classList.toggle('is-solid', progress > 0.65);
    updateLightSectionControlContrast();
  };

  headerSec.addEventListener('scroll', updateHeroSolidOnScroll, { passive: true });
  updateHeroSolidOnScroll();

  let hTouchStartY = 0;
  let hTouchStartX = 0;
  let hStartScrollTop = 0;
  let hWasAtBottomOnTouchStart = false;
  let hHasNavigated = false;
  let hState1LockTime = 0;

  headerSec.addEventListener('touchstart', (e) => {
    if (e.touches.length !== 1) return;
    hTouchStartY = e.touches[0].clientY;
    hTouchStartX = e.touches[0].clientX;
    hStartScrollTop = headerSec.scrollTop;
    hWasAtBottomOnTouchStart = isHeaderAtBottom();
    hHasNavigated = false;
  }, { passive: true });

  headerSec.addEventListener('touchmove', (e) => {
    if (hHasNavigated || e.touches.length !== 1) return;
    const deltaY = hTouchStartY - e.touches[0].clientY;
    const deltaX = hTouchStartX - e.touches[0].clientX;

    if (Math.abs(deltaY) < Math.abs(deltaX) * 1.3) return;

    if (hWasAtBottomOnTouchStart && deltaY > 45 && nextAfterHeroIdx !== -1) {
      hHasNavigated = true;
      scrollToSectionIndex(nextAfterHeroIdx);
    }
  }, { passive: true });

  headerSec.addEventListener('touchend', () => {
    if (hHasNavigated) return;
    const maxScroll = getHeaderMaxScroll();
    if (maxScroll <= 0) return;
    const st = headerSec.scrollTop;
    if (st <= 4 || st >= maxScroll - 4) {
      if (st >= maxScroll - 4 && hStartScrollTop < maxScroll - 10) {
        hState1LockTime = Date.now();
      }
      return;
    }
    const deltaScroll = st - hStartScrollTop;
    if (deltaScroll > 18) {
      hState1LockTime = Date.now();
      headerSec.scrollTo({ top: maxScroll, behavior: 'smooth' });
    } else if (deltaScroll < -18) {
      headerSec.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      const target = st >= maxScroll * 0.5 ? maxScroll : 0;
      if (target === maxScroll) hState1LockTime = Date.now();
      headerSec.scrollTo({ top: target, behavior: 'smooth' });
    }
  }, { passive: true });

  let hWheelHits = 0;
  let hWheelTimeout = null;
  let hWheelSnapTimeout = null;

  headerSec.addEventListener('wheel', (e) => {
    if (isDesktop()) return;
    if (e.deltaY > 0) {
      if (isHeaderAtBottom()) {
        if (Date.now() - hState1LockTime < 420) return;
        hWheelHits++;
        clearTimeout(hWheelTimeout);
        hWheelTimeout = setTimeout(() => { hWheelHits = 0; }, 650);
        if (hWheelHits >= 2 && nextAfterHeroIdx !== -1) {
          hWheelHits = 0;
          scrollToSectionIndex(nextAfterHeroIdx);
        }
      } else {
        hWheelHits = 0;
        hState1LockTime = Date.now();
        clearTimeout(hWheelSnapTimeout);
        hWheelSnapTimeout = setTimeout(() => {
          const ms = getHeaderMaxScroll();
          if (headerSec.scrollTop > 8 && headerSec.scrollTop < ms - 4) {
            headerSec.scrollTo({ top: ms, behavior: 'smooth' });
          }
        }, 90);
      }
    } else if (e.deltaY < 0) {
      hWheelHits = 0;
      if (!isHeaderAtTop()) {
        clearTimeout(hWheelSnapTimeout);
        hWheelSnapTimeout = setTimeout(() => {
          const ms = getHeaderMaxScroll();
          if (headerSec.scrollTop > 4 && headerSec.scrollTop < ms - 8) {
            headerSec.scrollTo({ top: 0, behavior: 'smooth' });
          }
        }, 90);
      }
    }
  }, { passive: true });

  document.querySelectorAll('.header-brand').forEach((brandLogo) => {
    brandLogo.addEventListener('click', (e) => {
      e.preventDefault();
      if (isDesktop()) {
        scrollToSectionIndex(0);
      } else {
        headerSec.scrollTo({ top: 0, behavior: 'smooth' });
      }
    });
  });
}

// --- Dynamic Header & Mockup Sizing Sync ---
const rootStyle = document.documentElement.style;
const heroContent = document.querySelector('.hero-flow-inner');
const refSlide = document.getElementById('bikes');
const refHeader = refSlide ? refSlide.querySelector('.slide-header') : null;
let layoutRafId = 0;

function updateHeaderHeights() {
  layoutRafId = 0;
  if (heroContent) {
    const ch = heroContent.offsetHeight;
    if (ch > 0) {
      rootStyle.setProperty('--welcome-content-h', ch + 'px');
      if (updateHeroSolidOnScroll) updateHeroSolidOnScroll();
    }
  }
  if (isDesktop()) return;

  const refH = (refHeader && refHeader.offsetHeight > 0) ? refHeader.offsetHeight : 84;
  const slideH = (refSlide && refSlide.clientHeight > 0) ? refSlide.clientHeight : (window.innerHeight || 667);
  const availableBodyH = Math.max(120, slideH - refH);

  const phoneH = Math.round(availableBodyH * 0.86);
  const phoneW = Math.round(phoneH * (720 / 1486));
  const padV = Math.round(availableBodyH * 0.07);

  rootStyle.setProperty('--header-h', refH + 'px');
  rootStyle.setProperty('--phone-h', phoneH + 'px');
  rootStyle.setProperty('--phone-w', phoneW + 'px');
  rootStyle.setProperty('--phone-visible-w', Math.round(phoneW * 0.70) + 'px');
  rootStyle.setProperty('--body-pad-v', padV + 'px');
}

function scheduleHeaderHeightUpdate() {
  if (!layoutRafId) {
    layoutRafId = requestAnimationFrame(updateHeaderHeights);
  }
}

updateHeaderHeights();
window.addEventListener('resize', scheduleHeaderHeightUpdate, { passive: true });
window.addEventListener('orientationchange', () => {
  setTimeout(updateHeaderHeights, 100);
});

if ('ResizeObserver' in window) {
  const headerRO = new ResizeObserver(scheduleHeaderHeightUpdate);
  document.querySelectorAll('.slide-header').forEach((h) => headerRO.observe(h));
  if (refSlide) headerRO.observe(refSlide);
  if (heroContent) headerRO.observe(heroContent);
}

if (document.fonts && document.fonts.ready) {
  document.fonts.ready.then(updateHeaderHeights);
}

// --- Hero Video Playback ---
function initHeroVideo() {
  const vid = document.getElementById('hero-video');
  if (!vid) return;

  vid.muted = true;
  vid.defaultMuted = true;
  vid.playsInline = true;
  vid.setAttribute('playsinline', '');
  vid.setAttribute('webkit-playsinline', '');

  let gestureListenersActive = false;
  const gestureEvents = ['click', 'touchend', 'pointerup', 'keydown'];

  function removeGestureListeners() {
    if (!gestureListenersActive) return;
    gestureEvents.forEach((evt) => {
      window.removeEventListener(evt, onUserGesture, true);
      document.removeEventListener(evt, onUserGesture, true);
    });
    gestureListenersActive = false;
  }

  function onUserGesture() {
    vid.muted = true;
    const p = vid.play();
    if (p !== undefined) {
      p.then(removeGestureListeners).catch(() => {});
    }
  }

  function setupGestureFallback() {
    if (gestureListenersActive) return;
    gestureListenersActive = true;
    gestureEvents.forEach((evt) => {
      window.addEventListener(evt, onUserGesture, { capture: true, passive: true });
      document.addEventListener(evt, onUserGesture, { capture: true, passive: true });
    });
  }

  function attemptPlay() {
    vid.muted = true;
    vid.defaultMuted = true;
    const p = vid.play();
    if (p !== undefined) {
      p.then(removeGestureListeners).catch(setupGestureFallback);
    }
  }

  attemptPlay();

  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && vid.paused) {
      attemptPlay();
    }
  });

  if ('IntersectionObserver' in window && headerSec) {
    const heroObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting && vid.paused) {
          attemptPlay();
        }
      });
    }, { threshold: 0.15 });
    heroObserver.observe(headerSec);
  }
}

initHeroVideo();
window.addEventListener('load', updateHeaderHeights);

// --- Legal Tab Switcher & Horizontal Swipe ---
function setLegalTab(tabIndex) {
  const legalSec = document.getElementById('legal');
  if (!legalSec) return;
  const buttons = Array.from(legalSec.querySelectorAll('.legal-tab-btn'));
  const panels = Array.from(legalSec.querySelectorAll('.legal-panel'));
  if (tabIndex < 0 || tabIndex >= panels.length) return;

  const targetBtn = buttons[tabIndex];
  const targetPanel = panels[tabIndex];
  if (!targetBtn || !targetPanel || targetBtn.classList.contains('active')) return;

  buttons.forEach((b) => b.classList.remove('active'));
  panels.forEach((p) => p.classList.remove('active'));

  targetBtn.classList.add('active');
  targetPanel.classList.add('active');
  targetPanel.scrollTop = 0;

  const textPane = legalSec.querySelector('.slide-pane-text');
  if (textPane) textPane.scrollTop = 0;
}

function switchLegal(btn, panelId) {
  const legalSec = document.getElementById('legal');
  if (!legalSec) return;
  const target = legalSec.querySelector('#' + panelId);
  const panels = Array.from(legalSec.querySelectorAll('.legal-panel'));
  const idx = panels.indexOf(target);
  if (idx !== -1) {
    setLegalTab(idx);
  }
}

function initLegalSwipe() {
  const legalSec = document.getElementById('legal');
  if (!legalSec) return;

  let touchStartX = 0;
  let touchStartY = 0;
  let isSwiping = false;

  legalSec.addEventListener('touchstart', (e) => {
    if (e.touches.length !== 1) return;
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
    isSwiping = true;
  }, { passive: true });

  legalSec.addEventListener('touchmove', (e) => {
    if (!isSwiping || e.touches.length !== 1) return;
    const deltaX = touchStartX - e.touches[0].clientX;
    const deltaY = touchStartY - e.touches[0].clientY;
    if (Math.abs(deltaY) > Math.abs(deltaX) * 1.2 && Math.abs(deltaY) > 8) {
      isSwiping = false;
    }
  }, { passive: true });

  legalSec.addEventListener('touchend', (e) => {
    if (!isSwiping) return;
    isSwiping = false;
    if (!e.changedTouches || e.changedTouches.length !== 1) return;

    const deltaX = touchStartX - e.changedTouches[0].clientX;
    const deltaY = touchStartY - e.changedTouches[0].clientY;

    if (Math.abs(deltaX) > 38 && Math.abs(deltaX) > Math.abs(deltaY) * 1.3) {
      const panels = Array.from(legalSec.querySelectorAll('.legal-panel'));
      const activeIdx = panels.findIndex((p) => p.classList.contains('active'));
      if (deltaX > 0) {
        if (activeIdx === 0) setLegalTab(1);
      } else {
        if (activeIdx === 1) setLegalTab(0);
      }
    }
  }, { passive: true });
}

initLegalSwipe();

// --- Theme Switcher ---
const themeMediaQuery = window.matchMedia ? window.matchMedia('(prefers-color-scheme: light)') : null;
let themeOverriddenByToggle = false;

function getSystemTheme() {
  return (themeMediaQuery && themeMediaQuery.matches) ? 'light' : 'dark';
}

function getEffectiveTheme() {
  const explicit = document.documentElement.getAttribute('data-theme');
  if (explicit === 'light' || explicit === 'dark') return explicit;
  return getSystemTheme();
}

function updateThemeColorMeta(theme) {
  const meta = document.getElementById('theme-color-meta') || document.querySelector('meta[name="theme-color"]');
  if (meta) {
    meta.setAttribute('content', theme === 'light' ? '#ffffff' : '#000000');
  }
}

function applyTheme(theme) {
  const target = theme === 'light' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', target);
  updateThemeColorMeta(target);
}

function setTheme(theme) {
  themeOverriddenByToggle = true;
  applyTheme(theme);
}

function toggleTheme() {
  const current = getEffectiveTheme();
  setTheme(current === 'light' ? 'dark' : 'light');
}

function onSystemThemeChange(e) {
  if (!themeOverriddenByToggle) {
    applyTheme(e.matches ? 'light' : 'dark');
  }
}

if (themeMediaQuery) {
  if (themeMediaQuery.addEventListener) {
    themeMediaQuery.addEventListener('change', onSystemThemeChange);
  } else if (themeMediaQuery.addListener) {
    themeMediaQuery.addListener(onSystemThemeChange);
  }
}

(function initTheme() {
  try {
    localStorage.removeItem('theme');
    localStorage.removeItem('tu_sports_theme_preference');
  } catch (e) {}
  if (!themeOverriddenByToggle) {
    applyTheme(getSystemTheme());
  }
})();

// ==========================================================================
// Fullscreen Header Navigation Menu
// ==========================================================================

function isMenuOpen() {
  return document.body.classList.contains('menu-open');
}

function updateActiveMenuHeader(activeIdx) {
  const links = document.querySelectorAll('.menu-nav-link');
  links.forEach((link) => {
    const idx = parseInt(link.getAttribute('data-index'), 10);
    if (idx === activeIdx) {
      link.classList.add('is-active');
      link.setAttribute('aria-current', 'true');
    } else {
      link.classList.remove('is-active');
      link.removeAttribute('aria-current');
    }
  });
}

function openMenu() {
  const activeIdx = getActiveSectionIndex();
  updateActiveMenuHeader(activeIdx);
  document.body.classList.add('menu-open');
  const toggleBtn = document.getElementById('menu-toggle');
  const themeBtn = document.getElementById('theme-toggle');
  const overlay = document.getElementById('menu-overlay');
  if (toggleBtn) {
    toggleBtn.setAttribute('aria-expanded', 'true');
    toggleBtn.setAttribute('aria-label', 'Menü schließen');
  }
  if (themeBtn) {
    themeBtn.setAttribute('aria-hidden', 'false');
    themeBtn.setAttribute('tabindex', '0');
  }
  if (overlay) {
    overlay.setAttribute('aria-hidden', 'false');
  }
}

function closeMenu() {
  document.body.classList.remove('menu-open');
  const toggleBtn = document.getElementById('menu-toggle');
  const themeBtn = document.getElementById('theme-toggle');
  const overlay = document.getElementById('menu-overlay');
  if (toggleBtn) {
    toggleBtn.setAttribute('aria-expanded', 'false');
    toggleBtn.setAttribute('aria-label', 'Menü öffnen');
  }
  if (themeBtn) {
    themeBtn.setAttribute('aria-hidden', 'true');
    themeBtn.setAttribute('tabindex', '-1');
  }
  if (overlay) {
    overlay.setAttribute('aria-hidden', 'true');
  }
}

function toggleMenu() {
  if (isMenuOpen()) {
    closeMenu();
  } else {
    openMenu();
  }
}

function beamToSection(index) {
  if (index < 0 || index >= sections.length) return;
  closeMenu();

  const targetSec = sections[index];
  const targetTop = targetSec.offsetTop;

  mainScroll.scrollTo({ top: targetTop, behavior: 'auto' });
  updateLightSectionControlContrast();

  if (index === 0 && headerSec) {
    headerSec.scrollTo({ top: 0, behavior: 'auto' });
    if (typeof updateHeroSolidOnScroll === 'function') {
      updateHeroSolidOnScroll();
    }
  }

  if (!isDesktop() && targetSec && targetSec.id === 'bikes') {
    const slideBody = targetSec.querySelector('.slide-body');
    if (slideBody) {
      slideBody.scrollLeft = 0;
    }
    userInteractedSlides.delete(targetSec.id);
    scheduleSlideAutoSwipe(targetSec);
  }

  updateActiveMenuHeader(index);
}

function initNavigationMenu() {
  const toggleBtn = document.getElementById('menu-toggle');
  if (toggleBtn) {
    toggleBtn.addEventListener('click', (e) => {
      e.preventDefault();
      toggleMenu();
    });
  }

  const menuNav = document.querySelector('.menu-nav');
  if (menuNav) {
    menuNav.addEventListener('click', (e) => {
      const link = e.target.closest('.menu-nav-link');
      if (!link) return;
      e.preventDefault();
      const idx = parseInt(link.getAttribute('data-index'), 10);
      if (!isNaN(idx)) {
        beamToSection(idx);
      }
    });
  }

  const overlay = document.getElementById('menu-overlay');
  if (overlay) {
    overlay.addEventListener('click', (e) => {
      if (e.target.closest('.menu-nav-link')) return;
      closeMenu();
    });
  }
}

initNavigationMenu();
