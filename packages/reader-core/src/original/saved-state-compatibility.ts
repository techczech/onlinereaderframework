import type { PublicationBook, PublicationSection } from './types.js';
import { readerStorageKey } from './publication-model.js';

/** Change only identities proved by retained anchors or a unique exact quote. Never infer pixel offsets. */
export function migrateSavedRecords(value: unknown, book: PublicationBook, sections: PublicationSection[], textOf: (section: PublicationSection) => string): unknown {
  const config = book.compatibility;
  if (!config || !Array.isArray(value)) return value;
  return value.map(item => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return item;
    const record = item as Record<string, unknown>;
    const candidates = typeof record.sectionId === 'string' ? config.splitSections[record.sectionId] : undefined;
    if (!candidates) return item;
    let owner: string | undefined;
    if (typeof record.anchor === 'string') owner = config.anchorOwners[record.anchor.replace(/^#/, '')];
    // An unknown explicit anchor is evidence of an unresolved location, not permission to guess from text.
    else if (typeof record.text === 'string' && record.text.trim()) {
      const matches = sections.filter(section => candidates.includes(section.id) && textOf(section).includes(record.text as string));
      if (matches.length === 1) owner = matches[0].id;
    }
    const section = sections.find(section => section.id === owner && candidates.includes(section.id));
    return section ? { ...record, sectionId: section.id, sectionTitle: section.title } : item;
  });
}

/** Backup every original byte before any changed field is written; failures leave the field untouched. */
export function migrateReaderStorage(book: PublicationBook, sections: PublicationSection[], storage: Storage, textOf: (section: PublicationSection) => string): boolean {
  if (!book.compatibility) return true;
  try {
    for (const field of ['highlights', 'reflections', 'readSections', 'bookmarkedSections', 'lastSection', 'readingPositions']) {
      const key = readerStorageKey(book.id, field), raw = storage.getItem(key);
      if (raw === null) continue;
      const backup = readerStorageKey(book.id, `compatibility:${book.compatibility.version}:original:${field}`);
      if (storage.getItem(backup) === null) storage.setItem(backup, raw);
      if (field !== 'highlights' && field !== 'reflections') continue;
      let value: unknown;
      try { value = JSON.parse(raw); } catch { continue; }
      const next = migrateSavedRecords(value, book, sections, textOf);
      if (JSON.stringify(next) === JSON.stringify(value)) continue;
      storage.setItem(key, JSON.stringify(next));
    }
    return true;
  } catch { return false; }
}
