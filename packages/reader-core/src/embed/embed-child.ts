/** Runs inside an embed document (bundle it into the embed's single HTML file). Reports only the content height to the reader.
 * The frame is sandboxed with an opaque origin, so it cannot name the parent's origin; the message carries a number and nothing else. */
const MESSAGE_TYPE = 'reader-embed:height';

function contentHeight(): number {
  const root = document.documentElement;
  const body = document.body;
  return Math.ceil(Math.max(root.scrollHeight, root.offsetHeight, body?.scrollHeight ?? 0, body?.offsetHeight ?? 0));
}

/** Post the current (or given) height once. No-op when not framed. */
export function postReaderEmbedHeight(height: number = contentHeight()): void {
  if (window.parent === window || !Number.isFinite(height)) return;
  window.parent.postMessage({ type: MESSAGE_TYPE, version: 1, height: Math.max(0, Math.ceil(height)) }, '*');
}

/** Report on load and whenever the document resizes, at most once per animation frame. Returns a stop function. */
export function startReaderEmbedHeightReporting(): () => void {
  if (window.parent === window) return () => undefined;
  let request = 0;
  let last = -1;
  const schedule = () => {
    if (request) return;
    request = requestAnimationFrame(() => {
      request = 0;
      const height = contentHeight();
      if (Math.abs(height - last) < 2) return;
      last = height;
      postReaderEmbedHeight(height);
    });
  };
  const observer = typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(schedule);
  observer?.observe(document.documentElement);
  if (document.body) observer?.observe(document.body);
  window.addEventListener('load', schedule);
  window.addEventListener('resize', schedule);
  schedule();
  return () => {
    observer?.disconnect();
    window.removeEventListener('load', schedule);
    window.removeEventListener('resize', schedule);
    if (request) cancelAnimationFrame(request);
  };
}
