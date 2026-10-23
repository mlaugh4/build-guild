// Parallax: each [data-parallax] element drifts down at a fraction of the
// scroll speed. Bigger numbers lag more and read as farther away, so the
// small sphere (.5) slips behind the big one (.22) as you scroll.
const items = [...document.querySelectorAll('[data-parallax]')];
const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
let ticking = false;

function update() {
  const y = reduce.matches ? 0 : window.scrollY;
  for (const el of items) el.style.setProperty('--py', `${y * el.dataset.parallax}px`);
  scaleSphere(y);
  scrubWords();
  ticking = false;
}

window.addEventListener('scroll', () => {
  if (!ticking) { ticking = true; requestAnimationFrame(update); }
}, { passive: true });
reduce.addEventListener('change', () => { centerOnSphere(); update(); });

// Center the statement on the big sphere. The sphere drifts with parallax,
// so work out the scroll position where the statement sits mid-screen and
// the sphere's center lines up with it, then pad the section to put the
// statement exactly there. The sphere itself never moves for this.
const sphere = document.querySelector('[data-center-target]');
const statement = document.querySelector('[data-center-on-sphere]');
// data-scale="0.8 1.1": start size on load → full size once the statement is centered
const [scaleFrom, scaleTo] = (sphere?.dataset.scale || '1 1').split(' ').map(Number);
let meetScroll = 1;   // scroll position where the statement and sphere center meet

function pageTop(el) { let t = 0; for (; el; el = el.offsetParent) t += el.offsetTop; return t; }  // ignores transforms

function centerOnSphere() {
  if (!sphere || !statement) return;
  const section = statement.closest('section');
  section.style.paddingTop = '';
  const k = reduce.matches ? 0 : Number(sphere.dataset.parallax || 0);
  const vh = window.innerHeight;
  // the sphere grows from its top edge, so its center sits lower when it's full size
  const sc = reduce.matches ? 1 : scaleTo;
  const sphereCenter = pageTop(sphere) + sphere.offsetHeight * sc / 2;   // at scroll 0
  const scrollAtMeet = (sphereCenter - vh / 2) / (1 - k);
  meetScroll = Math.max(1, scrollAtMeet);
  const target = scrollAtMeet + vh / 2;                              // page y of the meeting point
  const base = parseFloat(getComputedStyle(section).paddingTop);
  const now = pageTop(statement) + statement.offsetHeight / 2;
  section.style.paddingTop = `${Math.max(base, base + target - now)}px`;
}

// Grow the big sphere from scaleFrom to scaleTo between page load and the
// moment the statement is centered on it, easing out as it gets there.
function scaleSphere(y) {
  if (!sphere) return;
  if (reduce.matches) { sphere.style.setProperty('--sc', '1'); return; }
  const p = Math.min(1, Math.max(0, y / meetScroll));
  const eased = 1 - (1 - p) ** 2;
  sphere.style.setProperty('--sc', (scaleFrom + (scaleTo - scaleFrom) * eased).toFixed(4));
}

// Scrub each word: [data-scrub] text starts dim and lights up word by word
// as you scroll it toward the middle of the screen (like Big Spaceship's
// manifesto). Tied to scroll position, so scrolling back dims it again.
const scrubbers = [...document.querySelectorAll('[data-scrub]')].map(el => {
  el.innerHTML = el.textContent.trim().split(/\s+/).map(w => `<span class="w">${w}</span>`).join(' ');
  return { el, words: [...el.querySelectorAll('.w')] };
});

function scrubWords() {
  const vh = window.innerHeight;
  for (const { el, words } of scrubbers) {
    if (reduce.matches) { words.forEach(w => w.style.opacity = ''); continue; }
    const r = el.getBoundingClientRect();
    const start = vh * .9;                       // statement top enters the lower screen…
    const end = vh * .5 - r.height / 2;          // …fully lit once it's centered
    const p = Math.min(1, Math.max(0, (start - r.top) / (start - end)));
    const n = words.length, soft = 4;            // a 4-word soft edge on the reveal
    words.forEach((w, i) => {
      const o = Math.min(1, Math.max(0, (p * (n + soft) - i) / soft));
      w.style.opacity = (.15 + .85 * o).toFixed(3);
    });
  }
}

centerOnSphere();
update();
addEventListener('resize', () => { centerOnSphere(); update(); });
document.fonts?.ready.then(() => { centerOnSphere(); update(); });

// Wander: [data-wander] elements drift slowly within N px of their spot.
// Each axis is a sum of sine waves with unrelated speeds, so the path is
// smooth but never visibly repeats — it reads as organic, not looping.
const wanderers = [...document.querySelectorAll('[data-wander]')].map(el => ({
  el,
  r: Number(el.dataset.wander),
  // random phases so each page load starts somewhere different
  p: Array.from({ length: 6 }, () => Math.random() * Math.PI * 2),
}));

function wander(now) {
  const t = now / 1000;
  for (const { el, r, p } of wanderers) {
    if (reduce.matches) { el.style.setProperty('--wx', '0px'); el.style.setProperty('--wy', '0px'); continue; }
    // weights add up to 1, so the offset stays within r
    const x = r * (.55 * Math.sin(t * .13 + p[0]) + .30 * Math.sin(t * .29 + p[1]) + .15 * Math.sin(t * .61 + p[2]));
    const y = r * (.55 * Math.sin(t * .11 + p[3]) + .30 * Math.sin(t * .23 + p[4]) + .15 * Math.sin(t * .53 + p[5]));
    el.style.setProperty('--wx', `${x.toFixed(2)}px`);
    el.style.setProperty('--wy', `${y.toFixed(2)}px`);
  }
  requestAnimationFrame(wander);
}
if (wanderers.length) requestAnimationFrame(wander);

// Dark scene: fade the whole page to black while a [data-theme="dark"]
// section crosses the middle of the screen (like Big Spaceship's
// "Explorers, not settlers"), and back to light once it leaves.
const darkSections = document.querySelectorAll('[data-theme="dark"]');
if (darkSections.length) {
  const inView = new Set();
  const io = new IntersectionObserver(entries => {
    for (const e of entries) e.isIntersecting ? inView.add(e.target) : inView.delete(e.target);
    document.documentElement.classList.toggle('is-dark', inView.size > 0);
  }, { rootMargin: '-45% 0px -45% 0px' });   // a thin band across the middle
  darkSections.forEach(s => io.observe(s));
}

// Reveal: [data-reveal] elements get .is-in once their section is a third
// on screen (CSS handles the glide-in), and lose it when it leaves so the
// entrance plays again next time.
document.querySelectorAll('[data-reveal]').forEach(el => {
  const section = el.closest('section') || el;
  new IntersectionObserver(([e]) => el.classList.toggle('is-in', e.isIntersecting), { threshold: .33 }).observe(section);
});
