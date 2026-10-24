import React, { useEffect, useState, useRef, forwardRef, useImperativeHandle } from 'react';

interface TableOfContentsProps {
  content: string;
  format?: 'markdown' | 'html';
  sectionId?: string;
  contentRef: React.RefObject<HTMLDivElement>;
}

export interface TableOfContentsHandle {
  focus: () => void;
}

interface Heading {
  id: string;
  text: string;
  level: number;
}

export const TableOfContents = forwardRef<TableOfContentsHandle, TableOfContentsProps>(({ content, contentRef, format, sectionId }, ref) => {
  const [headings, setHeadings] = useState<Heading[]>([]);
  const [activeId, setActiveId] = useState<string>('');
  const linkRefs = useRef<(HTMLAnchorElement | null)[]>([]);

  useImperativeHandle(ref, () => ({
    focus: () => {
        // Focus the active link if there is one, otherwise the first link
        const activeIndex = headings.findIndex(h => h.id === activeId);
        if (activeIndex !== -1 && linkRefs.current[activeIndex]) {
            linkRefs.current[activeIndex]?.focus();
        } else if (linkRefs.current[0]) {
            linkRefs.current[0]?.focus();
        } else {
            contentRef.current?.querySelector<HTMLElement>('#toc-container')?.focus();
        }
    }
  }));

  useEffect(() => {
    const extracted: Heading[] = Array.from(contentRef.current?.querySelectorAll<HTMLElement>('[data-publication-content] h2, [data-publication-content] h3, [data-publication-content] h4, [data-publication-content] h5, [data-publication-content] h6') ?? []).map(heading => ({
      id: heading.id,
      text: heading.textContent?.trim() ?? '',
      level: Number(heading.tagName.slice(1))
    })).filter(heading => heading.id && heading.text);
    setActiveId('');
    setHeadings(extracted);
    // Reset refs array
    linkRefs.current = linkRefs.current.slice(0, extracted.length);
  }, [content, format, sectionId, contentRef]);

  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return;

    let observer: IntersectionObserver | null = null;

    try {
      observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              setActiveId(entry.target.id);
            }
          });
        },
        { root: contentRef.current, rootMargin: '0px 0px -80% 0px' }
      );

      headings.forEach((heading) => {
        if (!heading.id) return;
        const element = Array.from(contentRef.current?.querySelectorAll<HTMLElement>('[data-publication-content] [id]') ?? []).find(element => element.id === heading.id);
        if (element) observer?.observe(element);
      });
    } catch (e) {
      console.error('IntersectionObserver error:', e);
    }

    return () => {
      if (observer) {
        observer.disconnect();
      }
    };
  }, [headings, contentRef]);

  const scrollToHeading = (id: string) => {
    const element = Array.from(contentRef.current?.querySelectorAll<HTMLElement>('[data-publication-content] [id]') ?? []).find(element => element.id === id);
    if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
        setActiveId(id);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    let nextIndex = -1;
    
    if (e.key === 'ArrowDown' || e.key === 'j') {
        e.preventDefault();
        nextIndex = Math.min(index + 1, headings.length - 1);
    } else if (e.key === 'ArrowUp' || e.key === 'k') {
        e.preventDefault();
        nextIndex = Math.max(index - 1, 0);
    }

    if (nextIndex !== -1) {
        const link = linkRefs.current[nextIndex];
        const heading = headings[nextIndex];
        if (link) link.focus();
        if (heading) scrollToHeading(heading.id);
    }
  };

  // A single heading is not a map of the page; the chapter's own title is not listed here.
  if (headings.length < 2) return null;

  return (
    <nav 
        id="toc-container"
        aria-label="On this page"
        tabIndex={-1}
        className="publication-local-contents focus:outline-none focus:ring-2 focus:ring-indigo-500"
    >
      <div className="border-l border-gray-200 dark:border-gray-700 pl-4 py-2">
        <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">
          On this page
        </h4>
        <ul className="space-y-3 text-sm">
          {headings.map((heading, index) => (
            <li 
              key={heading.id}
              style={{ paddingLeft: `${(heading.level - 2) * 0.5}rem` }}
            >
              <a
                ref={el => { linkRefs.current[index] = el; }}
                href={`#${heading.id}`}
                onKeyDown={(e) => handleKeyDown(e, index)}
                onClick={(e) => {
                  e.preventDefault();
                  scrollToHeading(heading.id);
                }}
                className={`
                  block transition-colors duration-200 line-clamp-2 outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900 rounded-sm
                  ${activeId === heading.id 
                    ? 'text-indigo-600 dark:text-indigo-400 font-medium border-l-2 border-indigo-600 dark:border-indigo-400 -ml-[1.1rem] pl-[calc(1.1rem-2px)]' 
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'}
                `}
              >
                {heading.text}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
});