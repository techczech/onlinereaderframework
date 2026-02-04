import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildLlmsText, parseMarkdown } from '../../../packages/reader-core/src/index';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  const markdownPath = path.resolve(__dirname, '../src/defaultMarkdown.md');
  const markdown = await fs.readFile(markdownPath, 'utf-8');
  const sections = parseMarkdown(markdown, { sectionHeadingLevel: 'auto', fallbackTitle: 'Reader Framework' });
  const content = buildLlmsText(sections, 'Reader Framework');

  const target = path.resolve(__dirname, '../public/llms.txt');
  await fs.writeFile(target, content, 'utf-8');
  console.log(`Wrote ${target}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
