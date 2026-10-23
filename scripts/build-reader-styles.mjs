/** Package the original reader CSS and font assets without a runtime CDN. */
import { readFileSync, writeFileSync, mkdirSync, copyFileSync } from 'node:fs';
import { dirname, resolve, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const core = resolve(root, 'packages/reader-core');
const output = resolve(root, 'packages/reader-core/dist');
mkdirSync(resolve(output, 'fonts'), { recursive: true });
execFileSync(process.execPath, [resolve(core, 'node_modules/tailwindcss/lib/cli.js'), '-i', resolve(core, 'styles/reader.css'), '-o', resolve(output, 'reader.css'), '-c', resolve(core, 'styles/tailwind.config.cjs'), '--minify'], { cwd: core, stdio: 'inherit' });
const fonts = [['inter', ['300', '400', '500', '600', '700']], ['merriweather', ['300', '400', '700', '300-italic']], ['material-symbols-outlined', ['400']]];
let fontCSS = '';
const originalCSS = readFileSync(resolve(root, 'packages/reader-core/src/original/reader-original.css'), 'utf8');
for (const [family, faces] of fonts) {
  const source = resolve(core, `node_modules/@fontsource/${family}`);
  for (const face of faces) {
    fontCSS += readFileSync(resolve(source, `${face}.css`), 'utf8').replace(/url\((\.\/files\/[^)]+)\)/g, (_, path) => {
      copyFileSync(resolve(source, path), resolve(output, 'fonts', basename(path)));
      return `url(./fonts/${basename(path)})`;
    });
  }
  copyFileSync(resolve(source, 'LICENSE'), resolve(output, 'fonts', `LICENSE-${family}.txt`));
}
writeFileSync(resolve(output, 'reader.css'), fontCSS + '\n' + originalCSS + '\n' + readFileSync(resolve(output, 'reader.css'), 'utf8'));
console.log('Packaged original reader styling, fonts, icons and font licences.');
