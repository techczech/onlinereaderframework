/** Read-only source capture. Run with tsx; generated content stays in the demo, never the core package. */
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';

const here = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
function argument(name: string) {
  const i = args.indexOf(name);
  if (i < 0 || !args[i + 1]) throw new Error(`Required: ${name} <path>`);
  return resolve(args[i + 1]);
}
const practice = argument('--practice');
const language = argument('--language');
const linguistics = argument('--linguistics');
const python = argument('--python');
const practiceFile = resolve(practice, 'data.ts');
const languageFile = resolve(language, 'bookContent.ts');
// Home copy below is a deliberate adapter of the selected originals. Refuse to
// silently recapture a new source hash while keeping old hardcoded home wording.
for (const [file, expected] of [
  [resolve(practice, 'components/Home.tsx'), 'ad3f4bd48f4e8b3155bb5cfc8275906ba4d2df6dfc06eacfddf5913c73dce4f0'],
  [resolve(language, 'App.tsx'), '3f4dc58cf67fd1c840a2b5cbe7a6e959b24b789117a8bda4aed7061a340b4654']
]) {
  const actual = createHash('sha256').update(readFileSync(file)).digest('hex');
  if (actual !== expected) throw new Error('The original home has changed. Review the home-copy adapter before recapturing source provenance.');
}
const { GUIDE_CONTENT } = await import(pathToFileURL(practiceFile).href);
const { BOOK_CONTENT } = await import(pathToFileURL(languageFile).href);
const qa = JSON.parse(execFileSync(python, [resolve(here, 'import-linguistics-book.py'), linguistics], { encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 }));
const adaptLanguage = (sections: any[], category?: string): any[] => sections.map(s => ({
  id: s.id, title: s.title, category: category || s.title,
  content: s.content || '', format: 'html',
  ...(s.defaultExpanded !== undefined ? { defaultExpanded: s.defaultExpanded } : {}),
  ...(s.children ? { children: adaptLanguage(s.children, category || s.title) } : {})
}));
const books = [
  {
    id: 'deliberate-practice', title: 'Deliberate Practice:', subtitle: 'A Universal Learning Method',
    author: 'Dominik Lukeš',
    description: 'The key limit to fluent performance is working memory. Discover how to overcome these limits and master any skill through structured, reflective practice.',
    sourceUrl: 'https://deliberatepractice.dominiklukes.net/',
    home: {
      badge: 'Self-Paced Learning Guide',
      overviewTitle: 'Course Overview',
      overviewDescription: 'Navigate through the theory and application of Deliberate Practice.',
      authorNote: 'Written by Dominik Lukeš between 2022 and 2024.',
      license: { label: 'Creative Commons Attribution-ShareAlike 4.0 International License', href: 'https://creativecommons.org/licenses/by-sa/4.0/' },
      features: [
        { title: 'Working Memory', description: 'The bottleneck of learning. Understand its limits to break through performance plateaus.', icon: 'memory' },
        { title: 'Mental Schemas', description: 'Build robust mental representations (chunks) to bypass cognitive overload during complex tasks.', icon: 'account_tree' },
        { title: 'Targeted Practice', description: "Don't just repeat. Use structured reflection, feedback loops, and specific design to improve.", icon: 'ads_click' }
      ]
    },
    sections: GUIDE_CONTENT.map((s: any) => ({ ...s, format: 'markdown' }))
  },
  {
    id: 'language-muscle', title: 'Building Your', subtitle: 'Language Muscle', author: 'Dominik Lukeš',
    description: 'A practical, interactive guide to deliberate practice for language learners. Move beyond passive study and start training effectively.',
    sections: adaptLanguage(BOOK_CONTENT)
  }, qa.book
];
function digest(path: string) { return createHash('sha256').update(readFileSync(path)).digest('hex'); }
const output = resolve(here, '../src/books/original-publications.json');
writeFileSync(output, JSON.stringify(books, null, 2) + '\n');
writeFileSync(resolve(here, '../src/books/original-publications-provenance.json'), JSON.stringify({
  description: 'Read-only snapshots of original authored sources. No proposals applied. Do not bundle demo manuscripts into reader-core.',
  sources: [
    { book: 'deliberate-practice', repository: 'deliberate-practice-guide', source: 'data.ts', sha256: digest(practiceFile) },
    { book: 'deliberate-practice', repository: 'deliberate-practice-guide', source: 'components/Home.tsx', sha256: digest(resolve(practice, 'components/Home.tsx')) },
    { book: 'language-muscle', repository: 'building-your-language-muscle', source: 'bookContent.ts', sha256: digest(languageFile) },
    { book: 'language-muscle', repository: 'building-your-language-muscle', source: 'App.tsx', sha256: digest(resolve(language, 'App.tsx')) },
    ...qa.sources
  ],
  counts: { practiceSections: GUIDE_CONTENT.length, languageTopLevelSections: BOOK_CONTENT.length, linguisticsThemes: qa.book.sections.length, linguisticsAnswers: qa.answerCount }
}, null, 2) + '\n');
console.log(`Captured ${GUIDE_CONTENT.length} practice chapters, ${BOOK_CONTENT.length} language groups, ${qa.answerCount} linguistics answers. Source files unchanged.`);
