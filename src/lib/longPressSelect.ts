// Touch screens: text stays unselectable until a finger has rested on it for a moment,
// so a quick tap never selects anything but a normal press-and-hold (about half a second,
// as on other sites) still does. The CSS side lives in index.css (html:not(.allow-select)).
const HOLD_MS = 350; // just under the browser's own long-press (~500ms) so it can select
const MOVE_PX = 10;

const root = document.documentElement;
let timer: number | undefined;
let startX = 0;
let startY = 0;

const hasSelection = () => !!window.getSelection()?.toString();

function cancel() {
  window.clearTimeout(timer);
}

document.addEventListener(
  'touchstart',
  (e) => {
    cancel();
    if (e.touches.length !== 1) return;
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
    timer = window.setTimeout(() => root.classList.add('allow-select'), HOLD_MS);
  },
  { passive: true }
);

document.addEventListener(
  'touchmove',
  (e) => {
    const t = e.touches[0];
    if (t && (Math.abs(t.clientX - startX) > MOVE_PX || Math.abs(t.clientY - startY) > MOVE_PX)) cancel();
  },
  { passive: true }
);

function release() {
  cancel();
  // Keep selecting enabled while a selection exists (so the handles can be dragged).
  window.setTimeout(() => {
    if (!hasSelection()) root.classList.remove('allow-select');
  }, 600);
}

document.addEventListener('touchend', release, { passive: true });
document.addEventListener('touchcancel', release, { passive: true });

document.addEventListener('selectionchange', () => {
  if (!hasSelection()) root.classList.remove('allow-select');
});

export {};
