import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildSearchIndex, parseMarkdown } from '../../packages/reader-core/src/index';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  const markdownPath = path.resolve(__dirname, '../src/defaultMarkdown.md');
  const markdown = await fs.readFile(markdownPath, 'utf-8');
  const sections = parseMarkdown(markdown, { sectionHeadingLevel: 'auto', fallbackTitle: 'Reader Framework' });
  const index = buildSearchIndex(sections);
  const output = `import { SearchIndexEntry } from 'reader-core';\n\nexport const SEARCH_INDEX: SearchIndexEntry[] = ${JSON.stringify(index, null, 2)};\n`;
  const target = path.resolve(__dirname, '../src/searchIndex.ts');
  await fs.writeFile(target, output, 'utf-8');
  console.log(`Wrote search index with ${index.length} entries to ${target}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
