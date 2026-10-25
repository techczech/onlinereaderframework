/** Server render of the reader with no window/document: theme, assistance and navigation state must not touch browser globals outside hooks. */
import { build } from '../../../apps/reader-demo/node_modules/esbuild/lib/main.js';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const source = resolve(root, 'packages/reader-core/src/original');
const out = await build({ absWorkingDir: root, stdin: { resolveDir: source, loader: 'tsx', contents: `import React from 'react';import {renderToString} from 'react-dom/server';import {PublicationReader} from './PublicationReader.tsx';module.exports=()=>renderToString(React.createElement(PublicationReader,{epub:false,book:{id:'ssr-theme',title:'SSR',sections:[{id:'one',title:'One',content:'# One\\n\\nText.'}]}}));` }, bundle: true, write: false, format: 'cjs', platform: 'node', external: ['react', 'react-dom', 'react-dom/*'] });
const require = createRequire(resolve(root, 'apps/reader-demo/package.json'));
const module = { exports: {} }; new Function('require', 'module', 'exports', out.outputFiles[0].text)(require, module, module.exports);
const html = module.exports();
console.log(JSON.stringify({ ok: true, window: typeof window, document: typeof document, hasToolbar: html.includes('publication-toolbar'), themeIcon: /brightness_auto/.test(html), light: !/publication-reader dark/.test(html), noToolbarLabelText: !/>Formatting<\/span>/.test(html) }));
