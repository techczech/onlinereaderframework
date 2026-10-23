import React, { type ComponentType, type ReactElement } from 'react';
import { createRoot } from 'react-dom/client';
import {
  PublicationReader, ReaderShell,
  type PublicationBook, type PublicationReaderProps, type PublicationCoaching,
  type ReaderProps, type SectionConfig,
} from 'reader-core';

const book: PublicationBook = {
  id: 'typed-consumer', title: 'Typed consumer', author: 'Verification',
  description: 'Check the public package declarations with host React types.',
  sections: [{ id: 'intro', title: 'Introduction', category: 'Check', content: '**Content**' }],
};
const coaching: PublicationCoaching = {
  render: ({ book: currentBook, section, onClose }) => <button onClick={onClose}>{currentBook.title}{section?.title}</button>,
};
const props: PublicationReaderProps = { book, coaching, epub: false };
const component: ComponentType<PublicationReaderProps> = PublicationReader;
const publication: ReactElement = <PublicationReader {...props} />;
const viaCreateElement: ReactElement = React.createElement(component, props);
const legacySections: SectionConfig[] = [{
  id: 'legacy', title: 'Legacy reader', order: 1,
  blocks: [{ id: 'paragraph', type: 'text', variant: 'paragraph', content: 'Still supported.' }],
}];
const legacyProps: ReaderProps = {
  sections: legacySections, initialSectionId: 'legacy', enableSearch: true,
  enableHighlights: true, enableReadingStats: true,
  headingLevels: { section: 2, tocMin: 3 }, onBackHome: () => {},
};
const legacyComponent: ComponentType<ReaderProps> = ReaderShell;
const legacy: ReactElement = <ReaderShell {...legacyProps} />;
const legacyViaCreateElement = React.createElement(legacyComponent, legacyProps);
createRoot(document.createElement('div')).render(<>{publication}{viaCreateElement}{legacy}{legacyViaCreateElement}</>);

// Ensure the check would fail if the public props became untyped.
// @ts-expect-error A publication requires a book.
const missingBook = <PublicationReader />;
// @ts-expect-error A legacy reader requires sections.
const missingSections = <ReaderShell />;
// @ts-expect-error Coaching must return a host-compatible React node.
const invalidCoaching: PublicationCoaching = { render: () => ({ arbitrary: true }) };
void [missingBook, missingSections, invalidCoaching];
