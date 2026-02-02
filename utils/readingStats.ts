import { SectionConfig } from '../types';

const WORDS_PER_MINUTE = 200;

export function countWords(text: string) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export function getSectionWordCount(section: SectionConfig) {
  let total = 0;
  section.blocks.forEach((block) => {
    if (block.type === 'text') {
      total += countWords(block.content);
    }
    if (block.type === 'list') {
      block.items.forEach((item) => {
        total += countWords(item);
      });
    }
    if (block.type === 'callout') {
      if (block.title) total += countWords(block.title);
      total += countWords(block.content);
    }
    if (block.type === 'code') {
      total += countWords(block.content);
    }
  });
  return total;
}

export function getReadingTimeMinutes(wordCount: number) {
  return Math.max(1, Math.round(wordCount / WORDS_PER_MINUTE));
}
