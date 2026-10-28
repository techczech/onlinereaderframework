/** The public address each demo book is meant to be read at once its agent files are deployed there (`<address>agent/<book>/…`). The reader's
 * "Ask an agent" box points assistants at these, and `npm run build:agent -- --canonical` writes the generated files' links against them.
 * They are the existing public sites; the generated agent files are not live there until deployed. Keep them out of any claim that they are. */
export const canonicalSites: Readonly<Record<string, string>> = {
  linguistics: 'https://linguistics.dominiklukes.net/',
  'deliberate-practice': 'https://deliberatepractice.dominiklukes.net/',
  'language-muscle': 'https://buildingyourlanguagemuscle.edutools.fyi/',
  // The two converted books, at the addresses agreed for them on dominiklukes.net (28 October 2026). A sub-path address makes its release an edition
  // served from that folder (scripts/release/release-books.ts).
  'academic-reading': 'https://dominiklukes.net/books/academic-reading/',
  'readability-foundations': 'https://dominiklukes.net/books/readability/',
};
