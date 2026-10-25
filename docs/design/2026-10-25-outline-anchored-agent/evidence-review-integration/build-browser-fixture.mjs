import {build} from '../../../../apps/reader-demo/node_modules/esbuild/lib/main.js';
import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';
const here=path.dirname(fileURLToPath(import.meta.url)),root=path.resolve(here,'../../../..');
const result=await build({absWorkingDir:root,stdin:{resolveDir:root,loader:'tsx',contents:`
import React from 'react';import{createRoot}from'react-dom/client';
import{PublicationReader}from'./packages/reader-core/src/original/PublicationReader.tsx';
import{publicationTextModel}from'./packages/reader-core/src/original/publication-html.ts';
import{anchoredRanges}from'./packages/reader-core/src/original/reading-support/anchored-reading.ts';
const content='<h1>Chapter one</h1><h2>Opening section</h2><p>First sentence has <em>emphasised words</em> inside it. Second sentence naïve café 東京.</p><blockquote>BEFOREALPHA words <p>Nested paragraph text.</p> AFTEROMEGA words.</blockquote><h2>Final section</h2><p>Final paragraph with <code>CODEIGNORE</code> and <math xmlns="http://www.w3.org/1998/Math/MathML"><mi>MATHIGNORE</mi></math>.</p>';
const sections=[{id:'one',title:'One',category:'C',format:'html',content},{id:'two',title:'Two',category:'C',content:'# Two\\n\\nOther text.'}];
window.reviewModel=publicationTextModel;window.reviewAnchors=anchoredRanges;window.root=createRoot(document.getElementById('root'));
window.mount=(id='fixture',agent=undefined)=>window.root.render(React.createElement(PublicationReader,{epub:false,agent,book:{id,title:'Review book',author:'Public author',description:'Public description',language:'en-GB',sections}}));
`},bundle:true,write:false,format:'iife',platform:'browser',alias:{react:path.join(root,'apps/reader-demo/node_modules/react'),'react-dom':path.join(root,'apps/reader-demo/node_modules/react-dom')}});
fs.writeFileSync(path.join(here,'scratch/browser-fixture.json'),JSON.stringify({bundle:result.outputFiles[0].text,css:fs.readFileSync(path.join(root,'packages/reader-core/dist/reader.css'),'utf8')}));
console.log('Built source browser fixture in memory, saved only under review scratch.');
