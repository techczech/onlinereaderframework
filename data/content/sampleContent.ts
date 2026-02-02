import { SectionConfig } from '../../types';

export const SAMPLE_CONTENT: SectionConfig[] = [
  {
    id: 'intro',
    title: 'Welcome',
    summary: 'An example section to validate the reader skeleton.',
    category: 'Overview',
    order: 1,
    tags: ['example'],
    blocks: [
      {
        id: 'intro-heading',
        type: 'text',
        variant: 'heading',
        content: 'Welcome to the Reader Framework'
      },
      {
        id: 'intro-paragraph',
        type: 'text',
        variant: 'paragraph',
        content: 'Replace this sample content with your guide content and add new sections as data.'
      },
      {
        id: 'intro-subheading',
        type: 'text',
        variant: 'subheading',
        content: 'Why this exists'
      },
      {
        id: 'intro-list',
        type: 'list',
        variant: 'bullet',
        items: ['Content as data', 'Reader-first UX', 'Reusable export pipeline']
      },
      {
        id: 'intro-callout',
        type: 'callout',
        tone: 'tip',
        title: 'Next step',
        content: 'Define your sections in data/content and connect them in the search index.'
      }
    ]
  }
];
