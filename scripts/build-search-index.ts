import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildSearchIndex } from '../utils/search';
import { SAMPLE_CONTENT } from '../data/content/sampleContent';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  const index = buildSearchIndex(SAMPLE_CONTENT);
  const output = `import { SearchIndexEntry } from '../types';\n\nexport const SEARCH_INDEX: SearchIndexEntry[] = ${JSON.stringify(index, null, 2)};\n`;
  const target = path.resolve(__dirname, '../data/searchIndex.ts');
  await fs.writeFile(target, output, 'utf-8');
  console.log(`Wrote search index with ${index.length} entries to ${target}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
