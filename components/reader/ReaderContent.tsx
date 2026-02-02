import React, { useEffect, useMemo, useRef } from 'react';
import { SectionId } from '../../types';
import { SAMPLE_CONTENT } from '../../data/content/sampleContent';
import { BlockRenderer } from '../blocks/BlockRenderer';
import { ScrollLayout } from '../layouts/ScrollLayout';
import { TocItem } from './TableOfContents';

interface ReaderContentProps {
  sectionId: SectionId;
  onActiveHeadingChange: (id: string | null) => void;
  onTocItems: (items: TocItem[]) => void;
  highlightQuery?: string | null;
}

export function ReaderContent({
  sectionId,
  onActiveHeadingChange,
  onTocItems,
  highlightQuery
}: ReaderContentProps) {
  const section = SAMPLE_CONTENT.find((item) => item.id === sectionId);
  const articleRef = useRef<HTMLElement | null>(null);

  const tocItems = useMemo(() => {
    if (!section) return [];
    return section.blocks
      .filter((block) => block.type === 'text' && (block.variant === 'heading' || block.variant === 'subheading'))
      .map((block) => ({
        id: block.id,
        text: block.content,
        level: block.variant === 'heading' ? 2 : 3
      }));
  }, [section]);

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
    <article ref={articleRef} className="max-w-3xl">
      <h1 className="text-3xl font-bold">{section.title}</h1>
      <ScrollLayout>
        {section.blocks.map((block) => (
          <BlockRenderer key={block.id} block={block} />
        ))}
      </ScrollLayout>
    </article>
  );
}
