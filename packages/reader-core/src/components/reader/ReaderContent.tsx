import React, { useEffect, useMemo, useRef } from 'react';
import { SectionConfig, SectionId, TextBlock } from '../../types';
import { BlockRenderer } from '../blocks/BlockRenderer';
import { ScrollLayout } from '../layouts/ScrollLayout';
import { TocItem } from './TableOfContents';
import { getReadingTimeMinutes, getSectionWordCount } from '../../utils/readingStats';

interface ReaderContentProps {
  sections: SectionConfig[];
  sectionId: SectionId;
  onActiveHeadingChange: (id: string | null) => void;
  onTocItems: (items: TocItem[]) => void;
  highlightQuery?: string | null;
  showReadingStats?: boolean;
  tocMinLevel?: number;
}

function isHeadingBlock(block: TextBlock) {
  return block.variant === 'heading' || block.variant === 'subheading';
}

export function ReaderContent({
  sections,
  sectionId,
  onActiveHeadingChange,
  onTocItems,
  highlightQuery,
  showReadingStats,
  tocMinLevel = 2
}: ReaderContentProps) {
  const section = sections.find((item) => item.id === sectionId);
  const articleRef = useRef<HTMLElement | null>(null);
  const readingStats = section ? getSectionWordCount(section) : 0;

  const tocItems = useMemo(() => {
    if (!section) return [];
    return section.blocks
      .filter((block) => block.type === 'text')
      .map((block) => block as TextBlock)
      .filter(isHeadingBlock)
      .map((block) => ({
        id: block.id,
        text: block.content,
        level: block.level || (block.variant === 'heading' ? 2 : 3)
      }))
      .filter((item) => item.level >= tocMinLevel);
  }, [section, tocMinLevel]);

  useEffect(() => {
    onTocItems(tocItems);
  }, [tocItems, onTocItems]);

  useEffect(() => {
    if (tocItems.length === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            onActiveHeadingChange(entry.target.id);
          }
        });
      },
      { rootMargin: '0px 0px -70% 0px' }
    );

    tocItems.forEach((item) => {
      const element = document.getElementById(item.id);
      if (element) observer.observe(element);
    });

    return () => observer.disconnect();
  }, [tocItems, onActiveHeadingChange]);

  useEffect(() => {
    if (!highlightQuery || !articleRef.current) return;

    const container = articleRef.current;
    const existing = container.querySelectorAll('mark[data-deeplink="true"]');
    existing.forEach((node) => node.replaceWith(document.createTextNode(node.textContent || '')));

    const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
    let node = walker.nextNode();
    while (node) {
      const textNode = node as Text;
      const index = textNode.nodeValue?.toLowerCase().indexOf(highlightQuery.toLowerCase()) ?? -1;
      if (index !== -1 && textNode.nodeValue) {
        const before = textNode.nodeValue.slice(0, index);
        const match = textNode.nodeValue.slice(index, index + highlightQuery.length);
        const after = textNode.nodeValue.slice(index + highlightQuery.length);

        const mark = document.createElement('mark');
        mark.dataset.deeplink = 'true';
        mark.className = 'bg-yellow-200 px-1 rounded';
        mark.textContent = match;

        const fragment = document.createDocumentFragment();
        if (before) fragment.appendChild(document.createTextNode(before));
        fragment.appendChild(mark);
        if (after) fragment.appendChild(document.createTextNode(after));

        textNode.replaceWith(fragment);
        mark.scrollIntoView({ behavior: 'smooth', block: 'center' });
        break;
      }
      node = walker.nextNode();
    }
  }, [highlightQuery, sectionId]);

  if (!section) {
    return <div className="text-slate-600">Section not found.</div>;
  }

  return (
    <article ref={articleRef}>
      <h1 className="text-[2em] font-bold">{section.title}</h1>
      {showReadingStats && (
        <div className="mt-1 text-sm text-slate-500">
          {readingStats} words · {getReadingTimeMinutes(readingStats)} min read
        </div>
      )}
      <ScrollLayout>
        {section.blocks.map((block) => (
          <BlockRenderer key={block.id} block={block} />
        ))}
      </ScrollLayout>
    </article>
  );
}
