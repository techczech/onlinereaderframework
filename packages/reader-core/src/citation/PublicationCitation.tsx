import { citationRis } from './publication-citation.js';
import React, { useEffect, useState } from 'react';
import { applyCitation, citeText, type CitePage } from './citation.js';

/** Hosts provide the canonical page record; the footer and live metadata use that same record. */
export function PublicationCitation({ page, bookPage }: { page: CitePage; bookPage?: CitePage }) {
  const [status, setStatus] = useState('');
  const text = citeText(page);
  useEffect(() => {
    applyCitation(page);
    let canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!canonical) { canonical = document.createElement('link'); canonical.rel = 'canonical'; document.head.append(canonical); }
    canonical.href = page.url;
    setStatus('');
  }, [page]);
  const copy = async () => {
    let copied = false;
    try { await navigator.clipboard.writeText(text); copied = true; } catch {
      const previous = document.activeElement as HTMLElement | null;
      const field = document.createElement('textarea'); field.value = text;
      field.style.position = 'fixed'; field.style.opacity = '0'; document.body.append(field); field.select();
      try { copied = document.execCommand('copy'); } catch {} finally { field.remove(); previous?.focus({ preventScroll: true }); }
    }
    setStatus(copied ? 'Citation copied.' : 'Copy failed. Select and copy the citation above.');
  };
  return <section className="publication-citation mx-auto max-w-3xl px-6 py-8 text-sm text-gray-700 dark:text-gray-300" aria-label="Cite this page">
    <h2 className="font-semibold">{page.type === 'book' ? 'Cite this book' : 'Cite this page'}</h2><p className="my-3 break-words">{text}</p>
    {bookPage && <p className="mb-3"><a download="book-citation.ris" href={'data:application/x-research-info-systems;charset=utf-8,' + encodeURIComponent(citationRis(bookPage))} className="underline">Download book citation (RIS)</a></p>}
    <button type="button" onClick={copy} className="underline">Copy citation</button><p role="status">{status}</p>
  </section>;
}
