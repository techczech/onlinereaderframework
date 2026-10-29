/** The public address each demo book is meant to be read at once its agent files are deployed there (`<address>agent/<book>/…`). The reader's
 * "Ask an agent" box points assistants at these, and `npm run build:agent -- --canonical` writes the generated files' links against them.
 * These are deployment targets; the generated agent files are not live there until deployed. Keep them out of any claim that they are. */
export const canonicalSites: Readonly<Record<string, string>> = {
  linguistics: 'https://linguistics.dominiklukes.net/',
  'deliberate-practice': 'https://deliberatepractice.dominiklukes.net/',
  'language-muscle': 'https://buildingyourlanguagemuscle.dominiklukes.net/',
  'academic-reading': 'https://academicreading.dominiklukes.net/',
  'academic-productivity': 'https://academicproductivity.dominiklukes.net/',
  'developing-competence': 'https://developingcompetence.dominiklukes.net/',
  'readability-foundations': 'https://readability.dominiklukes.net/',
};
