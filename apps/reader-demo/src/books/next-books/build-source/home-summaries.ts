/** Read the three original home-card paragraphs without rewording them. */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
export function academicHomeSummaries(source: string): Record<string, string> {
  const app = readFileSync(resolve(source, 'App.tsx'), 'utf8');
  return Object.fromEntries(Object.entries({ COGNITION: 'cognition', NARRATIVE_RUMINATIVE: 'narrative-ruminative', COGNITION_EXPLORER: 'cognition-explorer' }).map(([key, id]) => {
    const after = app.split(`handleNavigate(SectionId.${key})`);
    if (after.length !== 2) throw new Error(`Homepage summary source changed: ${key}`);
    const paragraph = after[1].match(/<p\b[^>]*>([\s\S]*?)<\/p>/)?.[1];
    if (!paragraph || /[<>]/.test(paragraph)) throw new Error(`Homepage summary markup changed: ${key}`);
    return [id, paragraph.replace(/\s+/g, ' ').trim()];
  }));
}
