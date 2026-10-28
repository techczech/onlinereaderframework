/** Build-time check that every registered embed has a real prose alternative in the sanitised section content.
 * Runs in Node or a browser; uses the same renderer as the reader, EPUB and agent files. */
import { fromHtml } from 'hast-util-from-html';
import { toText } from 'hast-util-to-text';
import type { Element, Root } from 'hast';
import { renderPublicationContent } from '../publication-content/index.js';
import type { PublicationBook, PublicationSection } from '../original/types.js';
import { PUBLICATION_EMBED_ANCHOR_TAGS, PUBLICATION_EMBED_MIN_ALTERNATIVE, validatePublicationEmbeds, type PublicationEmbeds } from './embed-model.js';

function findById(parent: Root | Element, id: string): Element | undefined {
  for (const child of parent.children) {
    if (child.type !== 'element') continue;
    if (child.properties.id === id) return child;
    const found = findById(child, id);
    if (found) return found;
  }
  return undefined;
}

function sectionsById(sections: PublicationSection[], into = new Map<string, PublicationSection>()): Map<string, PublicationSection> {
  for (const section of sections) {
    into.set(section.id, section);
    sectionsById(section.children ?? [], into);
  }
  return into;
}

/** Problems as readable strings; empty when every descriptor is valid, its section exists and its anchor holds an alternative. */
export function checkPublicationEmbeds(book: PublicationBook, embeds: PublicationEmbeds | false | undefined): string[] {
  const { embeds: valid, problems } = validatePublicationEmbeds(embeds);
  const sections = sectionsById(book.sections);
  for (const embed of valid) {
    const section = sections.get(embed.sectionId);
    if (!section) { problems.push(`embed "${embed.id}": section "${embed.sectionId}" is not in book "${book.id}"`); continue; }
    const tree = fromHtml(renderPublicationContent(section.content, section.format ?? 'markdown'), { fragment: true });
    const anchor = findById(tree, embed.anchor);
    if (!anchor) { problems.push(`embed "${embed.id}": anchor "${embed.anchor}" is not in section "${section.id}"`); continue; }
    if (findById(tree, `${embed.anchor}-2`)) problems.push(`embed "${embed.id}": anchor "${embed.anchor}" is used by more than one element`);
    if (!PUBLICATION_EMBED_ANCHOR_TAGS.includes(anchor.tagName)) problems.push(`embed "${embed.id}": anchor is a <${anchor.tagName}>, expected one of ${PUBLICATION_EMBED_ANCHOR_TAGS.join(', ')}`);
    const text = toText(anchor).replace(/\s+/g, ' ').trim();
    if (text.length < PUBLICATION_EMBED_MIN_ALTERNATIVE) problems.push(`embed "${embed.id}": prose alternative has ${text.length} characters; at least ${PUBLICATION_EMBED_MIN_ALTERNATIVE} are required`);
  }
  return problems;
}
