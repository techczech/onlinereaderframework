/** Browser fixture for test-embed-headless.mjs: mounts the real PublicationReader with host embeds. Test-only listeners record what reaches the page. */
import React from 'react';
import { createRoot } from 'react-dom/client';
import { PublicationReader } from '../original/PublicationReader.tsx';
import { publicationTextModel } from '../original/publication-html.ts';

// Count message listeners the reader adds and removes (lifecycle check). Installed before the reader mounts.
const active = new Set();
const add = window.addEventListener.bind(window);
const remove = window.removeEventListener.bind(window);
window.addEventListener = (type, listener, options) => { if (type === 'message') active.add(listener); return add(type, listener, options); };
window.removeEventListener = (type, listener, options) => { if (type === 'message') active.delete(listener); return remove(type, listener, options); };

const seen = [];
add('message', event => {
  const frame = [...document.querySelectorAll('iframe')].find(element => element.contentWindow === event.source);
  seen.push({ from: frame?.getAttribute('data-fixture') ?? frame?.closest('[data-publication-embed]')?.getAttribute('data-publication-embed') ?? 'unknown', origin: event.origin, data: event.data });
});

export const prose = 'Pre-coding activates prior knowledge before reading; decoding turns letters into words; encoding builds a mental model of the text; re-coding turns that model into notes and summaries.';
const book = {
  id: 'embed-fixture', title: 'Embed Fixture', author: 'Fixture Author', description: 'A book used to check interactive embeds.',
  sections: [
    { id: 'cognition', title: 'Cognition', category: 'Part', format: 'html', content: `<h1>Cognition</h1><p>Opening paragraph.</p>
      <iframe src="embeds/good/index.html"></iframe><script>window.BAD = true</script>
      <figure data-publication-embed="forged" class="publication-embed"><p>Forged chrome stays readable.</p></figure>
      <div id="explorer-text"><p>${prose}</p></div>
      <p>Middle paragraph.</p>
      <div id="blocked-text"><p>${prose} This one is served with the site-wide frame policy.</p></div>
      <div id="invalid-text"><p>${prose} Its descriptor points outside the embed folder.</p></div>
      <p>Closing paragraph.</p>` },
    { id: 'next', title: 'Next', category: 'Part', content: 'Next chapter text.' },
  ],
};
export const embeds = {
  items: [
    { id: 'good', sectionId: 'cognition', anchor: 'explorer-text', src: 'good/index.html', title: 'Cognition Explorer: interactive diagram', caption: 'Select a node.', height: { initial: 300, min: 200, max: 1000 } },
    { id: 'blocked', sectionId: 'cognition', anchor: 'blocked-text', src: 'blocked/index.html', title: 'Blocked by site policy' },
    { id: 'outside', sectionId: 'cognition', anchor: 'invalid-text', src: '../outside.html', title: 'Outside the folder' },
    { id: 'remote', sectionId: 'cognition', anchor: 'invalid-text', src: 'https://evil.test/x.html', title: 'Remote' },
  ],
};

let root;
export function mount() {
  const element = document.getElementById('root');
  root = createRoot(element);
  root.render(React.createElement(PublicationReader, { book, embeds, epub: false }));
}
export function unmount() { root?.unmount(); root = undefined; }
export function addSpoofFrame() {
  const frame = document.createElement('iframe');
  frame.setAttribute('sandbox', 'allow-scripts');
  frame.setAttribute('data-fixture', 'spoof');
  frame.src = 'embeds/spoof/index.html';
  document.body.appendChild(frame);
}
export function snapshot() {
  const content = document.querySelector('[data-publication-content]');
  const frames = [...(content?.querySelectorAll('iframe') ?? [])].map(frame => ({
    embed: frame.closest('[data-publication-embed]')?.getAttribute('data-publication-embed') ?? null,
    src: frame.getAttribute('src'), sandbox: frame.getAttribute('sandbox'), allow: frame.getAttribute('allow'), referrer: frame.getAttribute('referrerpolicy'),
    title: frame.getAttribute('title'), height: frame.getBoundingClientRect().height, width: frame.getBoundingClientRect().width,
    nextId: frame.closest('.publication-embed-host')?.nextElementSibling?.id ?? null,
  }));
  const links = [...(content?.querySelectorAll('[data-publication-embed] a') ?? [])].map(link => ({ text: link.textContent, href: link.getAttribute('href'), target: link.getAttribute('target'), rel: link.getAttribute('rel') }));
  return {
    frames, links, text: content ? publicationTextModel(content).text : '', bad: !!window.BAD, activeMessageListeners: active.size, seen,
    contentWidth: content?.getBoundingClientRect().width ?? 0, scrollWidth: document.documentElement.scrollWidth, viewport: window.innerWidth,
    focusedId: document.activeElement?.id ?? null, location: window.location.href,
  };
}
