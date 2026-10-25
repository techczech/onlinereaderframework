import React from 'react';
import type { PublicationBook } from '../types.js';
import { safePublicationHref } from '../publication-model.js';
import type { publicationLabels } from '../publication-navigation.js';
import type { FrontPageLayoutKey } from './frontpage-layouts.js';
import type { FrontPageContents, FrontPageEntry, FrontPageGroup, FrontPageMatch, FrontPageTargets, FrontPageTitle } from './frontpage-model.js';
import { frontPageCopy as copy } from './frontpage-copy.js';

export interface FrontPageContext {
  id: string;
  book: PublicationBook;
  labels: ReturnType<typeof publicationLabels>;
  contents: FrontPageContents;
  title: FrontPageTitle;
  targets: FrontPageTargets;
  progress: { read: number; total: number } | null;
  readSections: ReadonlySet<string>;
  showContents: boolean;
  full: boolean;
  setFull: (full: boolean) => void;
  opened: ReadonlySet<string>;
  toggle: (key: string) => void;
  query: string;
  setQuery: (query: string) => void;
  matches: FrontPageMatch[];
  filterRef: React.RefObject<HTMLInputElement>;
  onStart: () => void;
  onSelectSection: (id: string) => void;
  onOpenSearch: () => void;
  downloads: { label: string; href: string }[];
  canGenerate: boolean;
  generating: boolean;
  generate: () => Promise<void>;
}

type Ctx = { c: FrontPageContext };

const Icon = ({ name }: { name: string }) => <span className="material-symbols-outlined publication-front-icon" aria-hidden="true">{name}</span>;
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
const pad = (n: number) => String(n).padStart(2, '0');

// ---------- shared pieces ----------

function Cover({ c, className = '' }: Ctx & { className?: string }) {
  const cover = c.book.appearance?.cover;
  if (!cover || !safePublicationHref(cover.src)) return null;
  return <img className={`publication-front-cover ${className}`} src={cover.src} alt={cover.alt} />;
}

function TitleBlock({ c }: Ctx) {
  const { title } = c;
  return <div className="publication-front-title-block">
    {c.book.home?.badge && <p className="publication-eyebrow">{c.book.home.badge}</p>}
    <h1 className="publication-front-title">
      {title.title}
      {title.continuation && <> <span className="publication-front-continuation">{title.continuation}</span></>}
      {title.subtitle && <span className="publication-subtitle">{title.subtitle}</span>}
    </h1>
    <p className="publication-author">{c.book.author}</p>
  </div>;
}

/** The description is left out when it only repeats the subtitle. */
function Description({ c }: Ctx) {
  const { description } = c.book;
  return description && description.trim() !== c.book.subtitle?.trim() ? <p className="publication-description">{description}</p> : null;
}

function Count({ c }: Ctx) {
  if (!c.showContents) return null;
  return <p className="publication-front-count">{plural(c.contents.total, 'entry', 'entries')}</p>;
}

function Progress({ c }: Ctx) {
  if (!c.progress) return null;
  const { read, total } = c.progress;
  return <div className="publication-front-progress">
    <div className="publication-front-progress-track" aria-hidden="true"><span style={{ width: `${Math.round(100 * read / total)}%` }} /></div>
    <span>{read} of {total} read</span>
  </div>;
}

function ReadAction({ c, compact = false }: Ctx & { compact?: boolean }) {
  const target = c.targets.resume ?? c.targets.start;
  return <button type="button" className={`publication-primary-action publication-front-primary${compact ? ' is-compact' : ''}`} disabled={!target}
    onClick={() => c.targets.resume ? c.onSelectSection(c.targets.resume.id) : c.onStart()}>
    <Icon name={c.targets.resume ? 'history' : 'arrow_forward'} />
    <span className="publication-front-primary-text">
      <span className="publication-front-primary-label">{c.targets.resume ? copy.continue : copy.start}</span>
      {target && <span className="publication-front-primary-where">{target.title}</span>}
    </span>
  </button>;
}

function StartAgain({ c }: Ctx) {
  return c.targets.resume && c.targets.start && c.targets.start.id !== c.targets.resume.id
    ? <button type="button" className="publication-front-again" onClick={c.onStart}>{copy.fromBeginning}</button> : null;
}

function SearchAction({ c }: Ctx) {
  return <button type="button" className="publication-front-secondary" onClick={c.onOpenSearch}><Icon name="search" /><span>{c.labels.search}</span></button>;
}

function EbookAction({ c }: Ctx) {
  return <>
    {c.canGenerate && <button type="button" className="publication-front-secondary" disabled={c.generating} onClick={() => void c.generate()}><Icon name="download" /><span>{c.generating ? copy.generating : copy.ebook}</span></button>}
    {c.downloads.map(download => <a key={download.href} className="publication-front-secondary" href={download.href}><Icon name="download" /><span>{download.label}</span></a>)}
  </>;
}

function Actions({ c, search = true, ebook = true, read = true }: Ctx & { search?: boolean; ebook?: boolean; read?: boolean }) {
  return <div className="publication-front-actions">
    {read && <ReadAction c={c} />}
    <div className="publication-front-actions-row">{search && <SearchAction c={c} />}{ebook && <EbookAction c={c} />}</div>
    {read && <StartAgain c={c} />}
  </div>;
}

function Footer({ c }: Ctx) {
  const { book } = c;
  return <footer className="publication-home-footer publication-front-footer">
    <p>{book.home?.authorNote ?? `Written by ${book.author}.`}</p>
    {book.home?.license && safePublicationHref(book.home.license.href) && <div>
      {book.home.license.imageUrl && safePublicationHref(book.home.license.imageUrl) && <img alt={book.home.license.label} src={book.home.license.imageUrl} width="88" height="31" />}
      <a href={book.home.license.href} rel="license noopener noreferrer" target="_blank">{book.home.license.label}</a>
    </div>}
    {book.sourceUrl && safePublicationHref(book.sourceUrl) && <a href={book.sourceUrl}>Publication source</a>}
  </footer>;
}

/** Contents or Full contents: how many levels of the book's own contents are listed. Hidden when both would list the same. */
function DepthSwitch({ c }: Ctx) {
  if (!c.contents.hasDepth) return null;
  return <div className="publication-front-depth" role="group" aria-label={copy.depthLabel}>
    <button type="button" aria-pressed={!c.full} onClick={() => c.setFull(false)}>{c.labels.contents}</button>
    <button type="button" aria-pressed={c.full} onClick={() => c.setFull(true)}>{c.labels.fullContents}</button>
  </div>;
}

/** Title filter for the contents; the reader's own search covers the text of the book. Escape clears the filter and keeps focus here. */
function Filter({ c, className = '', large = false }: Ctx & { className?: string; large?: boolean }) {
  const inputId = `${c.id}-filter`;
  const statusId = `${c.id}-filter-status`;
  return <div className={`publication-front-filter ${large ? 'is-large' : ''} ${className}`}>
    <label htmlFor={inputId} className="publication-front-sr">{copy.filterLabel}</label>
    <Icon name="search" />
    <input id={inputId} ref={c.filterRef} type="search" autoComplete="off" placeholder={copy.filterPlaceholder} value={c.query} aria-describedby={statusId}
      onChange={event => c.setQuery(event.target.value)}
      onKeyDown={event => { if (event.key === 'Escape' && c.query) { event.preventDefault(); event.stopPropagation(); c.setQuery(''); } }} />
    {c.query && <button type="button" className="publication-front-clear" aria-label={copy.clearFilter} onClick={() => { c.setQuery(''); c.filterRef.current?.focus(); }}><Icon name="close" /></button>}
    <p id={statusId} role="status" className="publication-front-sr">{c.query.trim() ? (c.matches.length ? plural(c.matches.length, 'matching entry', 'matching entries') : copy.noMatches) : ''}</p>
  </div>;
}

function EntryRow({ c, entry }: Ctx & { entry: FrontPageEntry }) {
  const { section } = entry;
  if (!entry.readable) return <li className="publication-front-entry is-heading" style={{ '--depth': entry.depth } as React.CSSProperties}><span>{section.title}</span></li>;
  const read = c.readSections.has(section.id);
  const last = c.targets.resume?.id === section.id;
  return <li className={`publication-front-entry${read ? ' is-read' : ''}${last ? ' is-last' : ''}`} style={{ '--depth': entry.depth } as React.CSSProperties}>
    <button type="button" data-section-id={section.id} onClick={() => c.onSelectSection(section.id)}>
      <span className="publication-front-entry-title">{section.title}</span>
      {(last || read) && <span className="publication-front-entry-meta">
        {last ? <span className="publication-front-last">{copy.lastOpened}</span> : <><Icon name="check" /><span className="publication-front-sr">{copy.read}</span></>}
      </span>}
    </button>
  </li>;
}

function GroupCount({ group }: { group: FrontPageGroup }) {
  return <span className="publication-front-group-count">{plural(group.count, 'entry', 'entries')}</span>;
}

type GroupVariant = 'list' | 'tiles' | 'parts';

function Group({ c, group, number, variant }: Ctx & { group: FrontPageGroup; number?: number; variant: GroupVariant }) {
  const numeral = number !== undefined && <span className="publication-front-numeral" aria-hidden="true">{pad(number)}</span>;
  if (group.kind === 'single') {
    return <li className={`publication-front-group is-single is-${variant}`}>{numeral}<ol className="publication-front-entries"><EntryRow c={c} entry={group.entries[0]} /></ol></li>;
  }
  const preview = variant === 'tiles' ? 3 : 0;
  const open = c.full || c.opened.has(group.key);
  const collapsible = !c.full && group.entries.length > 0;
  const shown = open ? group.entries : preview ? group.entries.slice(0, preview) : [];
  const listId = `${c.id}-${group.key}`;
  const toggle = preview
    ? group.entries.length > preview && !c.full && <button type="button" className="publication-front-more" aria-expanded={open} aria-controls={listId} onClick={() => c.toggle(group.key)}>{open ? copy.showFewer : copy.showAll(group.entries.length)}</button>
    : null;
  const title = group.section
    ? <button type="button" className="publication-front-group-page" data-section-id={group.section.id} onClick={() => c.onSelectSection(group.section!.id)}>{group.title}</button>
    : collapsible && !preview
      ? null
      : <span className="publication-front-group-title">{group.title}</span>;
  return <li className={`publication-front-group is-${group.kind} is-${variant}${open ? ' is-open' : ''}`}>
    {numeral}
    <h3 className="publication-front-group-head">
      {collapsible && !preview && <button type="button" className="publication-front-group-toggle" aria-expanded={open} aria-controls={listId}
        aria-label={group.section ? copy.toggleGroup(group.title, open) : undefined} onClick={() => c.toggle(group.key)}>
        <Icon name={open ? 'expand_more' : 'chevron_right'} />
        {!group.section && <span className="publication-front-group-title">{group.title}</span>}
      </button>}
      {title}
      <GroupCount group={group} />
    </h3>
    {shown.length > 0 && <ol className="publication-front-entries" id={listId}>{shown.map(entry => <EntryRow key={entry.section.id} c={c} entry={entry} />)}</ol>}
    {toggle}
  </li>;
}

/** Either the grouped contents or, while the filter has text, the matching entries with the group each belongs to. */
function ContentsBody({ c, variant = 'list', numbered = false }: Ctx & { variant?: GroupVariant; numbered?: boolean }) {
  if (c.query.trim()) {
    return c.matches.length
      ? <ol className="publication-front-results">{c.matches.map(({ entry, context }) => <li key={entry.section.id} className="publication-front-entry">
          <button type="button" data-section-id={entry.section.id} onClick={() => c.onSelectSection(entry.section.id)}>
            {context && <span className="publication-front-result-context">{context}</span>}
            <span className="publication-front-entry-title">{entry.section.title}</span>
          </button></li>)}</ol>
      : <p className="publication-front-empty">{copy.noMatches}</p>;
  }
  let number = 0;
  return <ol className={`publication-front-groups is-${variant}`}>
    {c.contents.groups.map(group => <Group key={group.key} c={c} group={group} variant={variant} number={numbered && group.numbered ? ++number : undefined} />)}
  </ol>;
}

function ContentsArea({ c, filter = true, variant = 'list', numbered = false, className = '' }: Ctx & { filter?: boolean; variant?: GroupVariant; numbered?: boolean; className?: string }) {
  if (!c.showContents) return null;
  return <nav className={`publication-front-contents ${className}`} aria-label={c.labels.tableOfContents}>
    <div className="publication-front-contents-head">
      <h2>{c.book.labels?.tableOfContents ?? c.book.home?.overviewTitle ?? c.labels.tableOfContents}</h2>
      <DepthSwitch c={c} />
    </div>
    {c.book.home?.overviewDescription && <p className="publication-front-overview">{c.book.home.overviewDescription}</p>}
    {filter && <Filter c={c} />}
    <ContentsBody c={c} variant={variant} numbered={numbered} />
  </nav>;
}

// ---------- the six layouts: geometry only ----------

function Jacket({ c }: Ctx) {
  return <div className="pf-shell">
    <div className="pf-jacket-spread">
      <Cover c={c} />
      <div className="pf-copy"><TitleBlock c={c} /><Description c={c} /><Count c={c} /><Progress c={c} /><Actions c={c} /></div>
    </div>
    <ContentsArea c={c} />
    <Footer c={c} />
  </div>;
}

function ReadingDesk({ c }: Ctx) {
  const target = c.targets.resume ?? c.targets.start;
  return <div className="pf-shell">
    <div className="pf-desk-masthead">
      <div className="pf-copy"><TitleBlock c={c} /><Description c={c} /><Count c={c} /></div>
      <Cover c={c} />
    </div>
    <div className="pf-desk-layout">
      <div className="pf-desk-side">
        <section className="pf-desk-reading" aria-label={c.targets.resume ? copy.continue : copy.startHere}>
          <Icon name={c.targets.resume ? 'bookmark' : 'menu_book'} />
          <p className="publication-eyebrow">{c.targets.resume ? copy.continue : copy.startHere}</p>
          {target && <h2>{target.title}</h2>}
          <div className="publication-front-actions"><ReadAction c={c} /><StartAgain c={c} /></div>
          <Progress c={c} />
        </section>
        <div className="publication-front-actions-row"><SearchAction c={c} /><EbookAction c={c} /></div>
      </div>
      <ContentsArea c={c} />
    </div>
    <Footer c={c} />
  </div>;
}

function OpenContents({ c }: Ctx) {
  return <div className="pf-shell">
    <div className="pf-open-layout">
      <section className="pf-open-book">
        <Cover c={c} />
        <TitleBlock c={c} /><Description c={c} /><Count c={c} /><Progress c={c} />
        <Actions c={c} />
      </section>
      <ContentsArea c={c} className="is-large" />
    </div>
    <Footer c={c} />
  </div>;
}

function TitleBeside({ c }: Ctx) {
  return <div className="pf-shell">
    <div className="pf-a-layout">
      <div className="pf-a-title">
        <Cover c={c} />
        <div className="pf-copy"><TitleBlock c={c} /><Description c={c} /><Actions c={c} /><Progress c={c} /><Count c={c} /></div>
      </div>
      <ContentsArea c={c} filter={false} />
    </div>
    <Footer c={c} />
  </div>;
}

function SearchMap({ c }: Ctx) {
  return <div className="pf-shell">
    <div className="pf-b-mast">
      <Cover c={c} />
      <div className="pf-copy"><TitleBlock c={c} /><Description c={c} /></div>
      <div className="pf-b-side"><ReadAction c={c} compact /><EbookAction c={c} /><StartAgain c={c} /></div>
    </div>
    <Progress c={c} />
    {c.showContents && <div className="pf-b-find">
      <Filter c={c} large />
      <button type="button" className="publication-front-secondary" onClick={c.onOpenSearch}><Icon name="search" /><span>{copy.searchBook(c.labels.search)}</span></button>
    </div>}
    <ContentsArea c={c} filter={false} variant="tiles" className="pf-b-map" />
    <Count c={c} />
    <Footer c={c} />
  </div>;
}

function ColourBand({ c }: Ctx) {
  return <div className="pf-shell pf-c">
    <div className="pf-band"><div className="pf-band-inner">
      <div className="pf-copy"><TitleBlock c={c} /><Description c={c} /></div>
      <Cover c={c} />
    </div></div>
    <div className="pf-strip">
      <div className="pf-strip-main"><ReadAction c={c} /><Progress c={c} /></div>
      <div className="publication-front-actions-row"><SearchAction c={c} /><EbookAction c={c} /><StartAgain c={c} /></div>
    </div>
    <ContentsArea c={c} filter={false} variant="parts" numbered className="pf-c-parts" />
    <Count c={c} />
    <Footer c={c} />
  </div>;
}

const LAYOUTS: Record<FrontPageLayoutKey, (props: Ctx) => React.ReactElement> = {
  'sol-jacket': Jacket,
  'sol-reading-desk': ReadingDesk,
  'sol-open-contents': OpenContents,
  'opus-title-contents': TitleBeside,
  'opus-search-map': SearchMap,
  'opus-colour-band': ColourBand,
};

export function FrontPageLayout({ layout, context }: { layout: FrontPageLayoutKey; context: FrontPageContext }) {
  const Layout = LAYOUTS[layout];
  return <Layout c={context} />;
}

