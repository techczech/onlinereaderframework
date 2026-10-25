import React, { useEffect, useId, useRef, useState } from 'react';
import type { PublicationAgentAccess, PublicationBook, PublicationSection } from '../types.js';
import { publicationDisplayTitle } from '../publication-model.js';
import { agentAttachedPrompt, agentBookLinks, agentExamples, agentPrompt, isPrivateHost } from '../../agent-export/agent-paths.js';

/** The reader has no AI client, key or chat service: this box only hands the reader (or their assistant) the addresses of the book's plain-text copy
 * and a prompt that points at them. It follows the pattern of the "Ask an AI assistant" box on dominiklukes.net (heading, a short prompt to paste, Copy,
 * example prompts) and adds the part a book needs: the prompt names this book and, on a chapter, this chapter. */
export interface AgentAccessProps {
  book: PublicationBook;
  access: PublicationAgentAccess;
  /** The open chapter: the prompt then points at it. */
  section?: PublicationSection;
  /** `panel` is the full box on a front page; `quiet` folds it into one line under a chapter. */
  variant: 'panel' | 'quiet';
}
interface Where { base: string; host: string; privateHost: boolean }

/** Resolved in the browser, after mount: the address the files really have where this page is served (host, port and sub-path), never a guess made at build time. */
function useWhere(path: string): Where | null {
  const [where, setWhere] = useState<Where | null>(null);
  useEffect(() => {
    try {
      const base = new URL(path.replace(/\/*$/, '/'), document.baseURI);
      setWhere({ base: base.href, host: base.host, privateHost: base.protocol === 'file:' || isPrivateHost(base.hostname) });
    } catch { setWhere(null); }
  }, [path]);
  return where;
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
  const where = useWhere(access.path ?? 'agent/');
  const [status, setStatus] = useState('');
  const timer = useRef<number>();
  useEffect(() => () => window.clearTimeout(timer.current), []);
  if (!where) return null;
  const title = publicationDisplayTitle(book);
  const links = agentBookLinks(where.base, book.id);
  const chapter = section && section.id !== 'home' ? section : undefined;
  const input = { title, author: book.author, indexUrl: links.index, fullUrl: links.full, chapterTitle: chapter?.title, chapterUrl: chapter ? links.chapter(chapter.id) : undefined };
  const prompt = where.privateHost ? agentAttachedPrompt(input) : agentPrompt(input);
  const examples = agentExamples(!!chapter);
  const copy = async (text: string, what: string) => {
    let done = false;
    try { await navigator.clipboard.writeText(text); done = true; } catch { done = copyWithSelection(text); }
    setStatus(done ? `${what} copied.` : 'Copying is not available here. Select the text and copy it.');
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setStatus(''), 4000);
  };
  const body = <>
    <p className="publication-agent-lead">{where.privateHost
      ? <>This copy is hosted at <strong>{where.host}</strong>, an address that hosted AI assistants cannot open. Download the text and attach or paste it, then use this prompt. An assistant running on your own computer or network can read <a href={links.index}>the book index</a> directly.</>
      : <>Paste this prompt into an AI assistant that can open web addresses. It points at {chapter ? 'this chapter and ' : ''}the book's plain-text copy, so the assistant reads the book itself.</>}</p>
    <div className="publication-agent-prompt">
      <code id={`${id}-prompt`} tabIndex={0}>{prompt}</code>
      <button type="button" onClick={() => void copy(prompt, 'Prompt')}><span aria-hidden="true" className="material-symbols-outlined">content_copy</span> Copy<span className="publication-agent-sr"> the prompt</span></button>
    </div>
    <div className="publication-agent-chips">
      {examples.map(example => <button key={example} type="button" title={`Copy the prompt and: ${example}`} onClick={() => void copy(`${prompt} ${example}`, 'Prompt and question')}>
        <span aria-hidden="true" className="material-symbols-outlined">content_copy</span> {example}</button>)}
    </div>
    <p className="publication-agent-links">
      <a href={links.full} download>Download the full book (Markdown)</a> · <a href={links.index}>Index of every chapter</a> · <a href={links.manifest}>Manifest (JSON)</a>
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
