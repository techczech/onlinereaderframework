import { createRoot } from 'react-dom/client';
import { PublicationReader } from 'reader-core';
import 'reader-core/reader.css';
import { exampleBook, exampleEmbeds } from './example-book.mjs';

// build.mjs sets this. A build without embeds registers none, so hosts that cannot send the embed headers (such as GitHub Pages) show the text version only.
const embeds = __EXAMPLE_EMBEDS__ ? exampleEmbeds : false;

createRoot(document.getElementById('root')).render(<PublicationReader book={exampleBook} embeds={embeds} agent={{ path: 'agent/' }} />);
