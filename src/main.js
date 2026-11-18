import '@fontsource/anton/latin-400.css';
import '@fontsource-variable/manrope';
import '@fontsource/ibm-plex-mono/latin-500.css';
import '@fontsource/ibm-plex-mono/cyrillic-500.css';
import './style.css';
import { soundtrack } from './sound.js';

const ids = ['spongebob', 'patrick', 'squidward'];
const names = ['SpongeBob', 'Patrick Star', 'Squidward'];
const $ = (id) => document.getElementById(id);
const gallery = $('gallery');
const pin = $('pin');
const stage = $('stage-view');
const canvas = $('view-3d');
const detail = $('detail');
const panels = [...document.querySelectorAll('[data-copy]')];
const tabs = [...document.querySelectorAll('.chapter')];
const posters = [...document.querySelectorAll('[data-poster]')];
const posterStack = stage.querySelector('.stage__posters');
const rooms = [...document.querySelectorAll('.environment__room')];
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const clamp = (n, a = 0, b = 1) => Math.min(b, Math.max(a, n));
const smooth = (v) => v * v * (3 - 2 * v);
const near = (a, b, slack = .001) => Math.abs(b - a) < slack;
const TAU = Math.PI * 2;

const orbits = ids.map(() => ({ angle: 0, goal: 0, tilt: 0, tiltGoal: 0, speed: 0 }));
let viewer;
let fallback;
let hasContext = false;
let webglInUse = false;
let active = 0;
let frame = 0;
let lastTime = 0;
let drag;
let settled;
let uiDirty = true;
let sceneDirty = true;
let raw = 0;
let progress = 0;
let idleBuild;
let magnify = 0;
let magnifyGoal = 0;

function silt() {
  const field = $('silt');
  for (let i = 0; i < 24; i++) {
    const grain = document.createElement('i');
    grain.style.cssText = `--x:${29 + (i * 63.718) % 69}%;--y:${12 + (i * 53.669) % 77}%;--size:${1 + (i%4)*.45}px;--o:${.14 + (i%7)*.049};--duration:${5.7 + i%7}s;--delay:${-i*.87}s;--drift:${(i%4-2)*18}px`;
    field.append(grain);
  }
}
silt();

function activate(index) {
  active = index;
  pin.dataset.chapter = index;
  const count = String(index + 1).padStart(2, '0');
  $('edition-number').textContent = `0${count}`;
  $('deck-count').textContent = count;
  $('stage-counter').textContent = count;
  stage.setAttribute('aria-label', `Поворот фигурки ${names[index]}`);
  for (let i = 0; i < ids.length; i++) {
    const current = index === i;
    panels[i].classList.toggle('is-current', current);
    panels[i].inert = !current;
    if (current) {
      panels[i].removeAttribute('aria-hidden');
      tabs[i].setAttribute('aria-current', 'true');
    } else {
      panels[i].setAttribute('aria-hidden', 'true');
      tabs[i].removeAttribute('aria-current');
      orbits[i].speed = 0;
    }
    posters[i].classList.toggle('is-current', current);
  }
  const last = index === ids.length - 1;
  const next = last ? 0 : index + 1;
  $('next-label').textContent = last ? 'Вернуться к началу' : 'Следующий экспонат';
  $('scroll-label').textContent = last ? 'К НАЧАЛУ' : 'ЛИСТАЙ ВНИЗ';
  for (const link of [$('next'), $('scroll-next')]) {
    link.dataset.jump = next;
    link.setAttribute('href', `#${ids[next]}`);
  }
  fallback?.warm(index);
  prewarm();
}

function updateProgress() {
  raw = clamp(-gallery.getBoundingClientRect().top / Math.max(pin.offsetHeight, 1), 0, 2);
  const index = Math.round(raw);
  const base = Math.floor(raw);
  const t = smooth(clamp((raw - base - .075) / .85));
  const staticMotion = reducedMotion.matches;
  progress = staticMotion ? index : base + t;
  if (magnifyGoal && (index !== active || Math.abs(raw - active) > .14)) setDetail(false);
  if (index !== active) activate(index);
  const distance = active - progress;
  $('copy-stack').style.setProperty('--text-opacity', 1 - .84 * smooth(clamp(Math.abs(distance) * 2)));
  $('copy-stack').style.setProperty('--text-y', `${distance * 38}px`);
  rooms[1].style.opacity = Math.min(progress, 1);
  rooms[2].style.opacity = Math.max(0, progress - 1);
  const current = staticMotion ? 0 : Math.sin(Math.PI * t);
  $('dive-light').style.opacity = current ** 2 * .92;
  pin.style.setProperty('--water-shift', `${(t - .5) * current * 92}px`);
  stage.style.setProperty('--dive-edge', `${current ** 2 * 14}%`);
  tabs.forEach((tab, i) => tab.querySelector('.chapter__line').style.setProperty('--fill', clamp(1 - Math.abs(i - raw) * 1.45).toFixed(3)));
  sceneDirty = true;
}

function queue() {
  if (!frame) frame = requestAnimationFrame(render);
}

function render(now) {
  frame = 0;
  const dt = lastTime ? clamp((now - lastTime) / 1000, .004, .048) : 1 / 60;
  lastTime = now;
  if (uiDirty) {
    uiDirty = false;
    updateProgress();
  }
  let animate = false;
  const ease = reducedMotion.matches ? 1 : 1 - Math.exp(-dt * (drag ? 24 : 14));
  orbits.forEach((o, i) => {
    if (!drag && !reducedMotion.matches && i === active && Math.abs(o.speed) > .031) {
      o.goal += o.speed * dt;
      o.speed *= Math.exp(-dt * 5.8);
    }
    const moving = !near(o.angle, o.goal) || !near(o.tilt, o.tiltGoal);
    if (!moving) return;
    o.angle = near(o.angle, o.goal, .002) ? o.goal : o.angle + (o.goal - o.angle) * ease;
    o.tilt = near(o.tilt, o.tiltGoal, .002) ? o.tiltGoal : o.tilt + (o.tiltGoal - o.tilt) * ease;
    sceneDirty = true;
    animate = animate || !near(o.angle, o.goal) || !near(o.tilt, o.tiltGoal) || Math.abs(o.speed) > .031;
  });
  if (!near(magnify, magnifyGoal)) {
    magnify = near(magnify, magnifyGoal, .002) ? magnifyGoal : magnify + (magnifyGoal - magnify) * ease;
    sceneDirty = true;
    animate = animate || !near(magnify,magnifyGoal);
  }
  if (sceneDirty) {
    sceneDirty = false;
    const angles = orbits.map((o) => o.angle);
    const zoom = magnify * (1 - smooth(clamp(Math.abs(active-progress)*2)));
    stage.style.setProperty('--detail-scale', (1+zoom*.43).toFixed(3));
    if (viewer && hasContext) {
      try {
        const tilt = orbits[active].tilt * (1 - Math.abs(active - progress) * 1.7);
        viewer.draw(progress, angles, tilt, active, reducedMotion.matches, zoom);
        if (!webglInUse) {
          webglInUse = true;
          stage.dataset.ready = 'true';
          $('stage-mode').textContent = '3D VIEW';
          prewarm();
        }
      } catch (error) {
        console.warn('Could not render the live scene; using the orbit preview.', error);
        hasContext = false;
        showFallback();
      }
    }
    if (!webglInUse) {
      if (fallback) fallback.draw(progress, angles);
      else drawPosters(progress);
    }
  }
  if (animate) queue();
  else lastTime = 0;
}

function drawPosters(p, drawFrame) {
  posters.forEach((poster, i) => {
    const d = i - p;
    const opacity = clamp(1 - Math.abs(d) * 1.33);
    const y = `${d * stage.clientHeight * .61}px`;
    const scale = 1 - Math.min(.31, Math.abs(d) * .34);
    const shown = drawFrame?.(i, opacity, y, scale);
    poster.style.setProperty('--poster-opacity', shown ? '0' : opacity.toFixed(3));
    poster.style.setProperty('--poster-y', y);
    poster.style.setProperty('--poster-scale', scale.toFixed(3));
  });
}

function makeFallback() {
  const posterRatio = 720 / 880;
  const strips = ids.map(() => ({ status: 'idle', element: null }));
  function warm(index) {
    if (strips[index].status !== 'idle') return;
    const data = strips[index];
    data.status = 'loading';
    const image = new Image();
    const url = `${import.meta.env.BASE_URL}images/${ids[index]}-orbit.webp`;
    image.onload = () => {
      const poster = document.createElement('div');
      poster.className = 'poster poster--spin';
      poster.style.backgroundImage = `url("${url}")`;
      posterStack.append(poster);
      data.status = 'ready';
      data.element = poster;
      sceneDirty = true;
      queue();
    };
    image.onerror = () => { data.status = 'unavailable'; };
    image.src = url;
  }
  function draw(p, angles) {
    const h = Math.min(stage.clientHeight, stage.clientWidth / posterRatio);
    drawPosters(p, (i, opacity, y, scale) => {
      const data = strips[i];
      if (opacity > .2) warm(i);
      if (!data.element) return false;
      const frame = ((Math.round(angles[i] / TAU * 16) % 16) + 16) % 16;
      const style = data.element.style;
      style.setProperty('--poster-opacity', frame === 0 ? '0' : opacity.toFixed(3));
      if (!frame || !opacity) return false;
      style.width = `${h * posterRatio}px`;
      style.height = `${h}px`;
      style.backgroundPosition = `${(frame % 4) * 100/3}% ${Math.floor(frame/4) * 100/3}%`;
      style.setProperty('--poster-y', y);
      style.setProperty('--poster-scale', scale.toFixed(3));
      return true;
    });
  }
  return { warm, draw };
}

function showFallback() {
  webglInUse = false;
  stage.dataset.ready = 'false';
  $('stage-mode').textContent = '360° VIEW';
  fallback ??= makeFallback();
  fallback.warm(active);
  sceneDirty = true;
  queue();
}

function resizeScene() {
  viewer?.resize(stage.clientWidth, stage.clientHeight);
  uiDirty = true;
  sceneDirty = true;
  queue();
}

new ResizeObserver(resizeScene).observe(stage);
canvas.addEventListener('webglcontextlost', (event) => {
  event.preventDefault();
  hasContext = false;
  showFallback();
});
canvas.addEventListener('webglcontextrestored', () => {
  hasContext = Boolean(viewer);
  resizeScene();
});

function prewarm() {
  if (!window.requestIdleCallback || !viewer || !hasContext || idleBuild !== undefined) return;
  idleBuild = window.requestIdleCallback(() => {
    idleBuild = undefined;
    if (!hasContext) return;
    try {
      viewer.build(active < 2 ? active + 1 : 1);
    } catch {
      // The regular render path can retry or fall back without interrupting navigation.
    }
  });
}

async function loadScene() {
  try {
    const { createViewer } = await import('./viewer.js');
    viewer = await createViewer(canvas);
    hasContext = true;
    resizeScene();
  } catch (error) {
    console.info('WebGL is unavailable. Showing the 360° orbit preview.', error);
    showFallback();
  }
}
void loadScene();

function setHash(index) {
  const hash = `#${ids[index]}`;
  if (window.location.hash !== hash) history.replaceState(null, '', hash);
}

function jump(index, { instant = false, updateURL = true } = {}) {
  if (!ids[index]) return;
  const top = gallery.getBoundingClientRect().top + window.scrollY + index * pin.offsetHeight;
  if (updateURL) setHash(index);
  window.scrollTo({ top, behavior: instant || reducedMotion.matches ? 'auto' : 'smooth' });
}

gallery.addEventListener('click', (event) => {
  const link = event.target.closest('a[data-jump]');
  if (!link || event.defaultPrevented || event.button !== 0 || event.metaKey || event.altKey || event.ctrlKey || event.shiftKey) return;
  event.preventDefault();
  jump(Number(link.dataset.jump));
});

window.addEventListener('scroll', () => {
  uiDirty = true;
  queue();
  clearTimeout(settled);
  settled = setTimeout(() => { if (active !== 0 || location.hash) setHash(active); }, 180);
}, { passive: true });
window.addEventListener('hashchange', () => {
  const index = ids.indexOf(decodeHash());
  if (index > -1) jump(index, { instant: true, updateURL: false });
});
reducedMotion.addEventListener('change', resizeScene);

function decodeHash() { return window.location.hash.slice(1).toLowerCase(); }
const entry = ids.indexOf(decodeHash());
if (entry >= 0) requestAnimationFrame(() => jump(entry, { instant: true, updateURL: false }));
queue();

stage.addEventListener('pointerdown', (event) => {
  if (event.button !== 0 || drag || !event.isPrimary) return;
  drag = { id: event.pointerId, index: active, x: event.clientX, y: event.clientY, time: event.timeStamp, vx: 0, moved: 0 };
  orbits[active].speed = 0;
  stage.setPointerCapture(event.pointerId);
  stage.classList.add('is-dragging');
});
stage.addEventListener('pointermove', (event) => {
  if (!drag || event.pointerId !== drag.id) return;
  const dx = event.clientX - drag.x;
  const dy = event.clientY - drag.y;
  const o = orbits[drag.index];
  const shift = dx * (event.pointerType === 'touch' ? .015 : .012);
  o.goal += shift;
  if (event.pointerType !== 'touch' && webglInUse) o.tiltGoal = clamp(o.tiltGoal + dy * .005, -.64, .89);
  drag.vx = drag.vx * .49 + .51 * shift * 1000 / Math.max(10, event.timeStamp - drag.time);
  drag.x = event.clientX;
  drag.y = event.clientY;
  drag.time = event.timeStamp;
  drag.moved += Math.abs(dx);
  queue();
});
function endDrag(event) {
  if (!drag || event.pointerId !== drag.id) return;
  if (event.type === 'pointerup' && drag.moved > 9 && event.timeStamp - drag.time < 90 && !reducedMotion.matches) {
    orbits[drag.index].speed = clamp(drag.vx * .57, -4.9, 4.9);
    queue();
  }
  drag = null;
  stage.classList.remove('is-dragging');
}
for (const name of ['pointerup', 'pointercancel', 'lostpointercapture']) stage.addEventListener(name, endDrag);

function setDetail(on) {
  magnifyGoal = on ? 1 : 0;
  detail.setAttribute('aria-pressed', String(on));
  detail.title = on ? 'Общий план' : 'Крупный план';
  queue();
}
detail.addEventListener('click', () => setDetail(!magnifyGoal));

function resetAngle() {
  const o = orbits[active];
  o.speed = 0;
  o.goal = Math.round(o.angle / TAU) * TAU;
  o.tiltGoal = 0;
  if (magnifyGoal) setDetail(false);
  queue();
}
$('reset').addEventListener('click', resetAngle);
stage.addEventListener('keydown', (event) => {
  const o = orbits[active];
  switch (event.key) {
    case 'ArrowLeft': o.goal -= Math.PI / 6; break;
    case 'ArrowRight': o.goal += Math.PI / 6; break;
    case 'ArrowUp': o.tiltGoal = clamp(o.tiltGoal - .23, -.64, .89); break;
    case 'ArrowDown': o.tiltGoal = clamp(o.tiltGoal + .23, -.64, .89); break;
    case 'Home': resetAngle(); break;
    default: return;
  }
  event.preventDefault();
  o.speed = 0;
  queue();
});

const beat = soundtrack();
const sound = $('sound');
let audioChanging = false;
sound.addEventListener('click', async () => {
  if (audioChanging) return;
  const enable = sound.getAttribute('aria-pressed') !== 'true';
  audioChanging = true;
  try {
    if (enable) await beat.start();
    else beat.stop();
    sound.setAttribute('aria-pressed', String(enable));
    $('sound-state').textContent = enable ? 'ВКЛ' : 'ВЫКЛ';
  } catch {
    $('sound-state').textContent = 'НЕДОСТУПЕН';
  } finally {
    audioChanging = false;
  }
});
document.addEventListener('visibilitychange', () => {
  if (document.hidden && sound.getAttribute('aria-pressed') === 'true') {
    beat.stop();
    sound.setAttribute('aria-pressed', 'false');
    $('sound-state').textContent = 'ВЫКЛ';
  }
});
