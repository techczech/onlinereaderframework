import React, { useState } from 'react';
import type { PublicationAgentAccess, PublicationBook } from './types.js';
import { AgentAccess } from './agent/AgentAccess.js';
import { safePublicationHref } from './publication-model.js';
import { publicationLabels, publicationNavigation, type PublicationNavigationNode } from './publication-navigation.js';
import { FrontPage } from './frontpage/FrontPage.js';
import { frontPageLayoutKey } from './frontpage/frontpage-layouts.js';

interface HomeProps {
  book: PublicationBook;
  onStart: () => void;
  onSelectSection: (id: string) => void;
  onOpenSearch: () => void;
  onDownloadEbook?: () => void | Promise<void>;
  /** Saved reader state, used only by the configurable front-page layouts. */
  readSections?: ReadonlySet<string>;
  lastSectionId?: string | null;
  /** Show the ask-an-agent box above the footer. */
  agent?: PublicationAgentAccess;
}

/** A book with a recognised `appearance.frontPageLayout` gets that layout; every other book keeps the classic home page. */
export const Home: React.FC<HomeProps> = props => {
  const layout = frontPageLayoutKey(props.book.appearance?.frontPageLayout);
  return layout ? <FrontPage {...props} layout={layout} /> : <ClassicHome {...props} />;
};

const ClassicHome: React.FC<HomeProps> = ({ book, onStart, onSelectSection, onOpenSearch, onDownloadEbook, agent }) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const labels = publicationLabels(book);
  const contents = publicationNavigation(book.sections, book.navigation?.homeDepth ?? 2);
  const downloads = (book.downloads ?? []).filter(download => safePublicationHref(download.href));
  const cover = book.appearance?.cover;
  const variant = book.appearance?.masthead ?? 'editorial';
  const handleDownload = async () => {
    setIsGenerating(true);
    try { await onDownloadEbook?.(); } finally { setIsGenerating(false); }
  };
  return <div className="publication-home">
    <header className={`publication-masthead publication-masthead--${variant}`}>
      {cover && safePublicationHref(cover.src) && <img className="publication-home-cover" src={cover.src} alt={cover.alt} />}
      <div className="publication-masthead-copy">
        {book.home?.badge && <p className="publication-eyebrow">{book.home.badge}</p>}
        <h1>{book.title}{book.subtitle && <span className="publication-subtitle">{book.subtitle}</span>}</h1>
        <p className="publication-author">{book.author}</p>
        <p className="publication-description">{book.description}</p>
        <div className="publication-home-actions">
          <button className="publication-primary-action" onClick={onStart} disabled={!book.sections.length}>Start Reading</button>
          <button onClick={onOpenSearch}>{labels.search}</button>
          {!downloads.length && onDownloadEbook && <button onClick={() => void handleDownload()} disabled={isGenerating}>{isGenerating ? 'Generating…' : 'Download eBook'}</button>}
          {downloads.map(download => <a key={download.href} href={download.href}>{download.label}</a>)}
        </div>
      </div>
    </header>
    {!!book.home?.features?.length && <section className="publication-home-features" aria-label="Key concepts">
      {book.home.features.map(feature => <div key={feature.title}><h2>{feature.title}</h2><p>{feature.description}</p></div>)}
    </section>}
    {book.navigation?.showHomeContents !== false && contents.length > 0 && <nav className="publication-home-contents" aria-label={labels.tableOfContents}>
      <h2>{book.labels?.tableOfContents ?? book.home?.overviewTitle ?? labels.tableOfContents}</h2>
      {book.home?.overviewDescription && <p>{book.home.overviewDescription}</p>}
      <HomeContents nodes={contents} onSelect={onSelectSection} />
    </nav>}
    {agent && <div className="publication-home-agent"><AgentAccess book={book} access={agent} variant="panel" /></div>}
    <footer className="publication-home-footer">
      <p>{book.home?.authorNote ?? `Written by ${book.author}.`}</p>
      {book.home?.license && safePublicationHref(book.home.license.href) && <div>
        {book.home.license.imageUrl && safePublicationHref(book.home.license.imageUrl) && <img alt={book.home.license.label} src={book.home.license.imageUrl} width="88" height="31" />}
        <a href={book.home.license.href} rel="license noopener noreferrer" target="_blank">{book.home.license.label}</a>
      </div>}
    </footer>
  </div>;
};

function HomeContents({ nodes, onSelect }: { nodes: PublicationNavigationNode[]; onSelect: (id: string) => void }) {
  return <ol>{nodes.map(({section, children}) => <li key={section.id}>
    <button onClick={() => onSelect(section.id)}>{section.title}</button>
    {children.length > 0 && <HomeContents nodes={children} onSelect={onSelect} />}
  </li>)}</ol>;
}
