import React, { useEffect, useLayoutEffect, useMemo, useRef, useState, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import {
  PUBLICATION_EMBED_ALLOW, PUBLICATION_EMBED_ANCHOR_TAGS, PUBLICATION_EMBED_SANDBOX, readPublicationEmbedHeight, resolvePublicationEmbedUrl,
  type ValidPublicationEmbed,
} from './embed-model.js';

interface FrameProps {
  embed: ValidPublicationEmbed;
  /** Last height reported before a reload, so the chapter does not jump. */
  rememberedHeight?: number;
  onHeight?: (height: number) => void;
}

// Hosts are placed before paint in the browser; during SSR there is no rendered chapter to place them in.
const useBrowserLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;

/** One sandboxed frame with its title, skip link and full-view link. The chrome is excluded from the reader text model. */
export function PublicationEmbedFrame({ embed, rememberedHeight, onHeight }: FrameProps) {
  const frame = useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = useState(rememberedHeight ?? embed.height.initial);
  // Resource authority comes from the actual page, never a host-controlled <base>.
  const url = useMemo(() => typeof window === 'undefined' ? null : resolvePublicationEmbedUrl(embed.path, embed.root, window.location.href), [embed]);
  const heightCallback = useRef(onHeight);
  heightCallback.current = onHeight;

  useEffect(() => {
    if (!embed.resize || !url) return;
    let request = 0;
    let pending = 0;
    const listener = (event: MessageEvent) => {
      // Identity of the sending window is the authority; the payload is a number and nothing else.
      const source = frame.current?.contentWindow;
      if (!source || event.source !== source) return;
      const next = readPublicationEmbedHeight(event.origin, event.data, embed.height);
      if (next === null) return;
      pending = next;
      if (request) return;
      request = requestAnimationFrame(() => {
        request = 0;
        setHeight(current => Math.abs(current - pending) < 2 ? current : pending);
        heightCallback.current?.(pending);
      });
    };
    window.addEventListener('message', listener);
    return () => {
      window.removeEventListener('message', listener);
      if (request) cancelAnimationFrame(request);
    };
  }, [embed, url]);

  if (!url) return null;
  const titleId = `publication-embed-title-${embed.id}`;
  return <figure className="publication-embed" data-publication-embed={embed.id} aria-labelledby={titleId}>
    <div className="publication-embed-header">
      <span className="publication-embed-label">Interactive</span>
      <span id={titleId} className="publication-embed-title">{embed.title}</span>
      {embed.caption && <span className="publication-embed-caption">{embed.caption}</span>}
      <span className="publication-embed-links">
        <a href={`#${embed.anchor}`}>Skip to text version</a>
        <a href={url.href} target="_blank" rel="noopener noreferrer">Open full view<span className="publication-embed-hint"> (opens in a new tab)</span></a>
      </span>
    </div>
    <iframe ref={frame} className="publication-embed-frame" src={url.href} title={embed.title}
      sandbox={PUBLICATION_EMBED_SANDBOX} allow={PUBLICATION_EMBED_ALLOW} referrerPolicy="no-referrer" loading="lazy"
      style={{ height: `${height}px` }} />
  </figure>;
}

/** Place each embed's frame immediately before its prose alternative in the rendered chapter.
 * `html` is the exact string React put in the content element; hosts are rebuilt whenever it changes. */
export function PublicationEmbedSlots({ embeds, contentElement, html }: { embeds: readonly ValidPublicationEmbed[]; contentElement: RefObject<HTMLElement | null>; html: string }) {
  const [hosts, setHosts] = useState<{ embed: ValidPublicationEmbed; node: HTMLElement }[]>([]);
  const heights = useRef(new Map<string, number>());

  useBrowserLayoutEffect(() => {
    const root = contentElement.current;
    if (!root || !embeds.length) { setHosts(previous => previous.length ? [] : previous); return; }
    const created: { embed: ValidPublicationEmbed; node: HTMLElement }[] = [];
    for (const embed of embeds) {
      const anchor = Array.from(root.querySelectorAll<HTMLElement>('[id]')).find(element => element.id === embed.anchor);
      if (!anchor || !PUBLICATION_EMBED_ANCHOR_TAGS.includes(anchor.localName) || anchor.closest('[data-publication-embed]')) continue;
      const node = document.createElement('div');
      node.className = 'publication-embed-host';
      node.dataset.publicationEmbed = embed.id;
      anchor.before(node);
      created.push({ embed, node });
    }
    setHosts(created);
    return () => created.forEach(({ node }) => node.remove());
  }, [embeds, contentElement, html]);

  return <>{hosts.map(({ embed, node }) => createPortal(
    <PublicationEmbedFrame embed={embed} rememberedHeight={heights.current.get(embed.id)} onHeight={value => heights.current.set(embed.id, value)} />,
    node, embed.id))}</>;
}
