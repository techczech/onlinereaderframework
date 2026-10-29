/** Files a converted-book edition ships besides its text, planned before any write: the pinned author-selected cover and the book's interactive embed
 * documents, each read from the app folder only through `readAppFile` (no symbolic link from the app folder down, regular file, opened without following a
 * link) and refused unless its SHA-256 equals its pin (converted-book-assets.json for covers; next-books-provenance.json `outputs` for embeds).
 * The embed descriptors are the demo registry's (src/books/demo-books.ts), with the edition folder added as `base`; the embed manifest read here must
 * describe exactly those descriptors, so the release cannot drift from what the preview showed. */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { checkPublicationEmbeds } from '../../../../packages/reader-core/src/embed/embed-check';
import type { PublicationEmbeds } from '../../../../packages/reader-core/src/embed/embed-model';
import type { PublicationBook } from '../../../../packages/reader-core/src/original/types';
import { demoEmbeds, embedRootOf } from '../../src/books/demo-books';
import type { PlannedFile } from './previous-site';

const sha256 = (bytes: Uint8Array): string => crypto.createHash('sha256').update(bytes).digest('hex');
const SEGMENT = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;
const ID = /^[a-z0-9][a-z0-9-]{0,63}$/;
const relativePath = (value: unknown): value is string => typeof value === 'string' && value.length > 0 && value.length <= 200
  && value.split('/').every(part => SEGMENT.test(part) && !part.includes('..'));
const object = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);

/** Bytes of `<appRoot>/<relative>`: every component from the app folder down must be a real folder or, last, a regular file; none a symbolic link. */
export function readAppFile(appRoot: string, relative: string): Buffer {
  if (!relativePath(relative)) throw new Error(`Refusing an unsafe asset path ${JSON.stringify(String(relative).slice(0, 120))}.`);
  const root = path.resolve(appRoot);
  if (fs.realpathSync(root) !== root) throw new Error('The app folder is reached through a symbolic link.');
  const file = path.join(root, ...relative.split('/'));
  let current = root;
  for (const part of relative.split('/')) {
    current = path.join(current, part);
    if (fs.lstatSync(current).isSymbolicLink()) throw new Error(`Refusing a symbolic link in an asset path: ${relative}`);
  }
  const descriptor = fs.openSync(file, fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW);
  try {
    if (!fs.fstatSync(descriptor).isFile()) throw new Error(`Not a regular file: ${relative}`);
    return fs.readFileSync(descriptor);
  } finally { fs.closeSync(descriptor); }
}

export interface EmbedRecord { id: string; path: string; source: string; sha256: string; bytes: number }
export interface CoverRecord { path: string; source: string; sha256: string; bytes: number; variant: string; name: string; selectedFrom: string }
export interface EditionAssets {
  /** Descriptors the release bundle carries (src/release-embeds.ts replacement). */
  embeds: PublicationEmbeds;
  /** `embeds/<book>/<src>` documents and `covers/<book>.jpg`. */
  files: PlannedFile[];
  record: { base: string; embeds: EmbedRecord[]; cover: CoverRecord };
}

export function convertedEditionAssets(book: PublicationBook, appRoot: string, base: string): EditionAssets {
  const json = (relative: string): unknown => JSON.parse(readAppFile(appRoot, relative).toString('utf8'));
  const pin = json('scripts/release/converted-book-assets.json');
  if (!object(pin) || !object(pin.covers) || pin.embedProvenance !== 'src/books/next-books/next-books-provenance.json') throw new Error('Converted-book asset pin is malformed.');
  const coverPin = pin.covers[book.id];
  if (!object(coverPin) || coverPin.file !== `public/covers/${book.id}.jpg` || typeof coverPin.sha256 !== 'string' || typeof coverPin.bytes !== 'number')
    throw new Error(`No pinned cover for ${book.id}.`);
  const coverBytes = readAppFile(appRoot, coverPin.file);
  if (coverBytes.length !== coverPin.bytes || sha256(coverBytes) !== coverPin.sha256) throw new Error(`The cover of ${book.id} does not match its pinned hash.`);

  if (['academic-productivity', 'developing-competence'].includes(book.id)) {
    const manifest = json('src/books/next-books/embed-manifest.json');
    if (!object(manifest) || !object(manifest.books) || manifest.books[book.id] !== undefined || demoEmbeds[book.id])
      throw new Error(`Unexpected embeds for ${book.id}.`);
    return {
      embeds: { root: embedRootOf(book.id), base, items: [] },
      files: [{ path: `covers/${book.id}.jpg`, content: new Uint8Array(coverBytes), origin: coverPin.file }],
      record: { base, embeds: [], cover: { path: `covers/${book.id}.jpg`, source: coverPin.file, sha256: coverPin.sha256, bytes: coverPin.bytes,
        variant: String(coverPin.variant), name: String(coverPin.name), selectedFrom: String(coverPin.source) } },
    };
  }
  const provenance = json('src/books/next-books/next-books-provenance.json');
  if (!object(provenance) || !Array.isArray(provenance.outputs)) throw new Error('Converted-book provenance has no outputs.');
  const pinned = new Map<string, { sha256: string; bytes: number }>();
  for (const output of provenance.outputs) if (object(output) && typeof output.file === 'string' && typeof output.sha256 === 'string' && typeof output.bytes === 'number') pinned.set(output.file, { sha256: output.sha256, bytes: output.bytes });

  const manifest = json('src/books/next-books/embed-manifest.json');
  if (!object(manifest) || !object(manifest.books)) throw new Error('Embed manifest is malformed.');
  const entry = manifest.books[book.id];
  if (!object(entry) || !relativePath(entry.interactivesDir) || !entry.interactivesDir.startsWith('interactives/') || !Array.isArray(entry.items) || !entry.items.length)
    throw new Error(`The embed manifest has no usable entry for ${book.id}.`);
  const root = embedRootOf(book.id);
  const registry = demoEmbeds[book.id];
  if (!registry || registry.root !== root) throw new Error(`The demo registry has no embeds for ${book.id}.`);
  const items = entry.items.map(item => {
    if (!object(item) || typeof item.id !== 'string' || !ID.test(item.id) || !relativePath(item.src) || !item.src.endsWith('.html')) throw new Error(`Unsafe embed entry in ${book.id}.`);
    const { placement: _placement, ...descriptor } = item;
    return descriptor;
  });
  if (JSON.stringify(items) !== JSON.stringify(registry.items)) throw new Error(`The embed manifest of ${book.id} differs from the demo registry's descriptors.`);
  const embeds = { root, base, items: registry.items } as PublicationEmbeds;
  const problems = checkPublicationEmbeds(book, embeds);
  if (problems.length) throw new Error(`Embeds of ${book.id} refused:\n  ${problems.join('\n  ')}`);

  const seen = new Set<string>();
  const records: EmbedRecord[] = [];
  const files: PlannedFile[] = [];
  for (const item of items as Array<{ id: string; src: string }>) {
    const source = `${entry.interactivesDir}/${item.src}`;
    const target = `${root}${item.src}`;
    if (seen.has(target.toLowerCase())) throw new Error(`Two embeds of ${book.id} share ${target}.`);
    seen.add(target.toLowerCase());
    const expected = pinned.get(source);
    if (!expected) throw new Error(`Embed ${source} has no provenance hash.`);
    const bytes = readAppFile(appRoot, source);
    const digest = sha256(bytes);
    if (bytes.length !== expected.bytes || digest !== expected.sha256) throw new Error(`Embed ${source} does not match its provenance hash.`);
    records.push({ id: item.id, path: target, source, sha256: digest, bytes: bytes.length });
    files.push({ path: target, content: new Uint8Array(bytes), origin: `${source} (provenance ${digest.slice(0, 12)})` });
  }
  files.push({ path: `covers/${book.id}.jpg`, content: new Uint8Array(coverBytes), origin: `${coverPin.file} (selected cover ${String(coverPin.variant)})` });
  return {
    embeds, files,
    record: {
      base, embeds: records,
      cover: { path: `covers/${book.id}.jpg`, source: coverPin.file, sha256: coverPin.sha256, bytes: coverPin.bytes, variant: String(coverPin.variant), name: String(coverPin.name), selectedFrom: String(coverPin.source) },
    },
  };
}
