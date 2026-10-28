/** Server-renders the ORIGINAL Readability components (read-only) in chosen states. Used to build embeds and as the test oracle.
 *  `useState` is substituted per call so a component renders in a given state without a browser. */
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

export async function makeOracle(src: string) {
  const req = createRequire(resolve(src, 'package.json'));
  const React = req('react');
  const { renderToStaticMarkup } = req('react-dom/server');
  const realUseState = React.useState;
  let forced: any[] = [];
  React.useState = (initial: any) => { const [v, set] = realUseState(initial); return forced.length ? [forced.shift(), set] : [v, set]; };
  const load = async (p: string) => import(pathToFileURL(resolve(src, p)).href);
  const render = (Component: any, state: any[] = [], props: any = {}) => { forced = [...state]; try { return renderToStaticMarkup(React.createElement(Component, props)); } finally { forced = []; } };
  const dyslexia = (await load('components/interactive/DyslexiaSimulator.tsx')).DyslexiaSimulator;
  const font = (await load('components/interactive/FontSpacingAdjuster.tsx')).FontSpacingAdjuster;
  const checker = (await load('components/tools/ReadabilityChecker.tsx')).ReadabilityChecker;
  const slide = (await load('components/interactive/SlideSimulation.tsx')).SlideSimulation;
  const blocks = (await load('components/blocks/BlockRenderer.tsx')).BlockRenderer;
  const nav = await load('context/NavigationContext.tsx').catch(() => null);
  return {
    dyslexia: (revealed: boolean) => render(dyslexia, [revealed]),
    font: (size: number) => render(font, [size]),
    checker: (text: string) => render(checker, [text]),
    blocks: (list: any[]) => render(blocks, [], { blocks: list }),
    slide: (block: any) => render(slide, [], { block }),
    navExports: nav && Object.keys(nav)
  };
}
