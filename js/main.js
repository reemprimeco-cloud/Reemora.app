/* =========================================================
   Reemora — shared front-end behaviour
   Nav toggle, header scroll state, generic sliders, and
   scroll-reveal animations. Included on every public page.
   ========================================================= */

document.addEventListener('DOMContentLoaded', () => {
  initHeader();
  initNavToggle();
  initSliders();
  initReveal();
  markActiveNav();
});

function initHeader() {
  const header = document.querySelector('.site-header');
  if (!header) return;
  const onScroll = () => header.classList.toggle('scrolled', window.scrollY > 12);
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });
}

function initNavToggle() {
  const toggle = document.querySelector('.nav-toggle');
  const links = document.querySelector('.nav-links');
  if (!toggle || !links) return;
  toggle.addEventListener('click', () => links.classList.toggle('open'));
  links.querySelectorAll('a').forEach(a => a.addEventListener('click', () => links.classList.remove('open')));
}

function markActiveNav() {
  const path = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-links a[data-page]').forEach(a => {
    if (a.dataset.page === path) a.classList.add('active');
  });
}

/* Generic slider: works for hero + testimonials.
   Expects a wrapper with [data-slider], slides with .active toggling,
   optional [data-prev]/[data-next] arrows and a [data-dots] container. */
function initSliders() {
  document.querySelectorAll('[data-slider]').forEach(wrapper => {
    const slides = Array.from(wrapper.querySelectorAll('.slide-item'));
    if (slides.length === 0) return;
    const dotsHost = wrapper.querySelector('[data-dots]');
    const interval = parseInt(wrapper.dataset.interval || '6000', 10);
    let current = Math.max(0, slides.findIndex(s => s.classList.contains('active')));
    if (current === -1) current = 0;
    let timer = null;

    if (dotsHost) {
      dotsHost.innerHTML = '';
      slides.forEach((_, i) => {
        const dot = document.createElement('button');
        dot.type = 'button';
        dot.setAttribute('aria-label', `Go to slide ${i + 1}`);
        if (i === current) dot.classList.add('active');
        dot.addEventListener('click', () => goTo(i));
        dotsHost.appendChild(dot);
      });
    }

    function render() {
      slides.forEach((s, i) => s.classList.toggle('active', i === current));
      if (dotsHost) {
        Array.from(dotsHost.children).forEach((d, i) => d.classList.toggle('active', i === current));
      }
    }

    function goTo(i) {
      current = (i + slides.length) % slides.length;
      render();
      resetTimer();
    }

    function next() { goTo(current + 1); }
    function prev() { goTo(current - 1); }

    function resetTimer() {
      if (timer) clearInterval(timer);
      if (slides.length > 1) timer = setInterval(next, interval);
    }

    const prevBtn = wrapper.querySelector('[data-prev]');
    const nextBtn = wrapper.querySelector('[data-next]');
    if (prevBtn) prevBtn.addEventListener('click', prev);
    if (nextBtn) nextBtn.addEventListener('click', next);

    render();
    resetTimer();
  });
}

function initReveal() {
  const items = document.querySelectorAll('.reveal');
  if (!items.length) return;
  if (!('IntersectionObserver' in window)) {
    items.forEach(i => i.classList.add('in'));
    return;
  }
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('in');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15 });
  items.forEach(i => observer.observe(i));
}

/* Small helper used across pages */
function formatMoney(amount, currency) {
  return `${Number(amount).toFixed(2)} ${currency || 'KWD'}`;
}
function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}
function qs(name) {
  return new URLSearchParams(window.location.search).get(name);
}
