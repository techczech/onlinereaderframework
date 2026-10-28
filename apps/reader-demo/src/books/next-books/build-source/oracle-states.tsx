/** Writes the original components' server-rendered output in several states, for the browser check to compare against.
 *  Usage: tsx oracle-states.tsx <readability-source> <out.json> */
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { makeOracle } from './oracle.js';
const [src, out] = process.argv.slice(2).map(p => resolve(p));
const o = await makeOracle(src);
const long = 'This sentence keeps going and going without any real reason to stop because the author wants to see how the checker behaves when a single sentence passes the twenty word limit and then carries on well beyond it, until it finally ends here.';
const veryLong = Array.from({ length: 40 }, (_, i) => `word${i}`).join(' ') + '.';
const texts = ['Paste your text here to check sentence lengths. Long sentences can make your text difficult to read and process. By identifying these long sentences, you can break them down into smaller chunks that are easier for your audience to understand.',
  '', '   ', 'One short sentence.', long, veryLong, 'No terminal punctuation here', 'Really?! Yes... Fine. <b>Tags & ampersands</b> stay text.', `${long} ${veryLong} Short one.`];
writeFileSync(out, JSON.stringify({
  dyslexia: { false: o.dyslexia(false), true: o.dyslexia(true) },
  font: Object.fromEntries([14, 16, 20, 22, 26, 38, 40].map(s => [s, o.font(s)])),
  checker: texts.map(t => ({ text: t, html: o.checker(t) }))
}, null, 1));
console.log('states written');
