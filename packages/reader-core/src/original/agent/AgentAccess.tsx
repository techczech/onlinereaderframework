import React, { useEffect, useId, useRef, useState } from 'react';
import type { PublicationAgentAccess, PublicationBook, PublicationSection } from '../types.js';
import { publicationDisplayTitle } from '../publication-model.js';
import { agentAttachedPrompt, agentBookLinks, agentExamples, agentPrompt } from '../../agent-export/agent-paths.js';
import { agentLocations, type AgentLocations } from '../../agent-export/agent-location.js';

/** The reader has no AI client, key or chat service: this box only hands the reader (or their assistant) the addresses of the book's plain-text copy
 * and a prompt that points at them. It follows the pattern of the "Ask an AI assistant" box on dominiklukes.net (heading, a short prompt to paste, Copy,
 * example prompts) and adds the part a book needs: the prompt names this book and, on a chapter, this chapter.
 * The prompt always points at the book's public address: `access.siteUrl` when configured (even while previewing on a private address), otherwise the page's
 * own address when that is public. With neither, the box offers the downloaded text and a prompt for attaching it; a private address is never put in a prompt.
 * `access.path` is the same folder under both: see `agentLocations` (an unusable value is ignored for `agent/`, so no configuration makes an unsafe link). */
export interface AgentAccessProps {
  book: PublicationBook;
  access: PublicationAgentAccess;
  /** The open chapter: the prompt then points at it. */
  section?: PublicationSection;
  /** `panel` is the full box on a front page; `quiet` folds it into one line under a chapter. */
  variant: 'panel' | 'quiet';
}
/** The page's own address is read in the browser, after mount, so the download links name where the files really are (host, port and sub-path), never a
 * guess made at build time. Before that (and on a server) only the public folder is known. */
function useWhere(access: PublicationAgentAccess): AgentLocations {
  const [documentUrl, setDocumentUrl] = useState<string>();
  useEffect(() => { setDocumentUrl(document.baseURI); }, []);
  return agentLocations({ path: access.path, siteUrl: access.siteUrl, documentUrl });
}

/** Pages served over plain http (a home-network preview) have no async clipboard; a selected hidden field and the browser's own copy command still work. */
function copyWithSelection(text: string): boolean {
  const field = document.createElement('textarea');
  field.value = text; field.setAttribute('readonly', ''); field.setAttribute('aria-hidden', 'true');
  field.style.cssText = 'position:fixed;top:0;left:0;opacity:0;pointer-events:none';
  document.body.appendChild(field);
  const focus = document.activeElement as HTMLElement | null;
  try { field.select(); return document.execCommand('copy'); } catch { return false; } finally { field.remove(); focus?.focus?.(); }
}

export function AgentAccess({ book, access, section, variant }: AgentAccessProps) {
  const id = useId();
  const where = useWhere(access);
  const [status, setStatus] = useState('');
  const timer = useRef<number>();
  useEffect(() => () => window.clearTimeout(timer.current), []);
  if (!where.public && !where.local) return null;
  const title = publicationDisplayTitle(book);
  const publicLinks = where.public ? agentBookLinks(where.public, book.id) : undefined;
  // Downloads come from where this page is served, so a preview keeps working before the public files exist.
  const downloads = agentBookLinks(where.local ?? where.public!, book.id);
  const chapter = section && section.id !== 'home' ? section : undefined;
  const attached = agentAttachedPrompt({ title, author: book.author });
  const prompt = publicLinks
    ? agentPrompt({ title, author: book.author, indexUrl: publicLinks.index, fullUrl: publicLinks.full, chapterTitle: chapter?.title, chapterUrl: chapter ? publicLinks.chapter(chapter.id) : undefined })
    : attached;
  const examples = agentExamples(!!chapter);
  const copy = async (text: string, what: string) => {
    let done = false;
    try { await navigator.clipboard.writeText(text); done = true; } catch { done = copyWithSelection(text); }
    setStatus(done ? `${what} copied.` : 'Copying is not available here. Select the text and copy it.');
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setStatus(''), 4000);
  };
  const body = <>
    <p className="publication-agent-lead">{publicLinks
      ? <>Paste this into an AI assistant that can open web pages. It reads {chapter ? 'this chapter and ' : ''}the book itself, so it can answer your questions and point you to chapters.</>
      : <>Download the book's text, attach it to an AI assistant, then paste this prompt.</>}</p>
    <div className="publication-agent-prompt">
      <p id={`${id}-prompt`}>{prompt}</p>
      <button type="button" onClick={() => void copy(prompt, 'Prompt')}><span aria-hidden="true" className="material-symbols-outlined">content_copy</span> Copy<span className="publication-agent-sr"> the prompt</span></button>
    </div>
    <details className="publication-agent-try">
      <summary>Try a question</summary>
      <ul>{examples.map(example => <li key={example}>
        <span>{example}</span>
        <button type="button" title="Copy the prompt with this question" onClick={() => void copy(`${prompt} ${example}`, 'Prompt and question')}>
          <span aria-hidden="true" className="material-symbols-outlined">content_copy</span> Copy<span className="publication-agent-sr"> the prompt with: {example}</span></button>
      </li>)}</ul>
    </details>
    <p className="publication-agent-links">
      <a href={downloads.full} download>Download the full text (Markdown)</a> · <a href={downloads.index}>Chapter index</a> · <a href={downloads.manifest}>Manifest</a>
      {publicLinks && <> · <button type="button" className="publication-agent-textbutton" onClick={() => void copy(attached, 'Prompt for an attached file')}>Copy a prompt for the downloaded file</button></>}
    </p>
    <p className="publication-agent-status" role="status">{status}</p>
  </>;
  const heading = 'Ask an agent to help you read this';
  return variant === 'quiet'
    ? <details className="publication-agent publication-agent--quiet" data-publication-agent>
        <summary><span aria-hidden="true" className="material-symbols-outlined">smart_toy</span> {heading}</summary>{body}</details>
    : <aside className="publication-agent" aria-labelledby={`${id}-h`} data-publication-agent>
        <h2 id={`${id}-h`}><span aria-hidden="true" className="material-symbols-outlined">smart_toy</span> {heading}</h2>{body}</aside>;
}
