import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseMarkdownToSection } from '../utils/markdownParser.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  const inputPath = process.argv[2];
  if (!inputPath) {
    console.error('Usage: npm run import:md -- /path/to/file.md');
    process.exit(1);
  }

  const absolutePath = path.resolve(process.cwd(), inputPath);
  const markdown = await fs.readFile(absolutePath, 'utf-8');
  const section = parseMarkdownToSection(markdown);

  const output = `import { SectionConfig } from '../types';\n\nexport const IMPORTED_CONTENT: SectionConfig[] = [\n  ${JSON.stringify(section, null, 2)}\n];\n`;

  const target = path.resolve(__dirname, '../data/content/importedContent.ts');
  await fs.writeFile(target, output, 'utf-8');
  console.log(`Imported ${section.blocks.length} blocks into ${target}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
