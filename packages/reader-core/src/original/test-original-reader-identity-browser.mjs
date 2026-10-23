import React from 'react';
import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import { PublicationReader } from './PublicationReader';
import books from '../../../../apps/reader-demo/src/books/original-publications.json';
import { flattenPublicationSections } from './publication-model';

const waitFor = async predicate => {
  const deadline = performance.now() + 10000;
  while (!predicate()) {
    if (performance.now() > deadline) throw new Error('Reader quote flow did not become ready');
    await new Promise(resolve => setTimeout(resolve, 20));
  }
};

/** Exercise the public reader, real selection toolbar, share callsite and actual canvas. */
export async function runOriginalReaderQuoteIdentityChecks() {
  const mount = document.createElement('div');
  document.body.append(mount);
  const root = createRoot(mount);
  const originalHref = window.location.href;
  const originalFillText = CanvasRenderingContext2D.prototype.fillText;
  const originalDrawImage = CanvasRenderingContext2D.prototype.drawImage;
  let qrDrawn = false;
  let painted = [];
  CanvasRenderingContext2D.prototype.fillText = function (text, ...args) {
    painted.push(String(text));
    return originalFillText.call(this, text, ...args);
  };
  CanvasRenderingContext2D.prototype.drawImage = function (image, ...args) {
    if (image instanceof HTMLImageElement && image.src.startsWith('data:image/png;') && args.slice(-2).every(size => size === 150)) qrDrawn = true;
    return originalDrawImage.call(this, image, ...args);
  };
  const results = [];
  try {
    for (const [id, expected] of [
      ['language-muscle', 'Building Your Language Muscle'],
      ['deliberate-practice', 'Deliberate Practice: A Universal Learning Method'],
    ]) {
      const book = books.find(book => book.id === id);
      const section = id === 'language-muscle' ? flattenPublicationSections(book.sections).find(section => section.id === 'fine-tuning-aims') : flattenPublicationSections(book.sections).find(section => section.content.trim());
      history.replaceState(null, '', `?book=${id}&section=${encodeURIComponent(section.id)}&host=keep`);
      flushSync(() => root.render(React.createElement(PublicationReader, { book, epub: false })));
      await waitFor(() => mount.querySelector('[data-publication-content] p'));
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      const paragraph = mount.querySelector('[data-publication-content] p');
      const range = document.createRange();
      range.selectNodeContents(paragraph);
      const selectedQuote = range.toString();
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
      document.dispatchEvent(new Event('selectionchange'));
      await waitFor(() => mount.querySelector('button[title="Share as Image"]'));
      painted = [];
      qrDrawn = false;
      mount.querySelector('button[title="Share as Image"]').click();
      await waitFor(() => mount.querySelector('[role="dialog"] img[alt="Quote Preview"]')?.naturalWidth === 1080);
      const image = mount.querySelector('[role="dialog"] img[alt="Quote Preview"]');
      results.push({ name: `${id} actual quote image full identity`, expected, painted: [...painted], qrDrawn, pass: qrDrawn && painted.includes(expected) && painted.includes(book.author) && painted.includes(section.title) && image.src.startsWith('data:image/png;') && image.naturalWidth === 1080 && selectedQuote.length > 0 });
      mount.querySelector('button[aria-label="Close quote sharing"]').click();
    }
  } finally {
    root.unmount();
    mount.remove();
    CanvasRenderingContext2D.prototype.fillText = originalFillText;
    CanvasRenderingContext2D.prototype.drawImage = originalDrawImage;
    history.replaceState(null, '', originalHref);
    window.getSelection()?.removeAllRanges();
  }
  return results;
}
