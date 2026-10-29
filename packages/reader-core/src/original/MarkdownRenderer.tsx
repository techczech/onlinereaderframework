
import { attachTableSurfaces, type TableReview } from './table-surface.js';
import React, { useState, useEffect, useRef, memo, forwardRef, useImperativeHandle, useMemo } from 'react';
import { Highlight, Reflection, PublicationContentFormat } from './types.js';
import { renderPublicationContent } from '../publication-content/index.js';
import { preparePublicationHTML } from './publication-html.js';
import { useReadAloud, type ReadAloudActions } from './read-aloud/use-read-aloud.js';
import type { ReadAloudSnapshot } from './read-aloud/read-aloud-controller.js';
import type { ValidPublicationEmbed } from '../embed/embed-model.js';
import { PublicationEmbedSlots } from '../embed/PublicationEmbedFrame.js';

const noEmbeds: readonly ValidPublicationEmbed[] = [];

export interface MarkdownRendererHandle {
    toggleReadAloud: () => void;
    stopReadAloud: () => void;
}

// Redefine types locally for component independence
type MaxWidth = 'sm' | 'md' | 'lg' | 'full';

interface MarkdownRendererProps {
  content: string;
  tableControls?: boolean;
  tableReviews?: readonly TableReview[];
  format?: PublicationContentFormat;
  language?: string;
  highlights?: Highlight[];
  reflection?: Reflection;
  onSaveReflection?: (content: string) => void;
  onOpenHighlight?: () => void;
  /** Stable identity of the book, for the reader's saved voice and speed. */
  bookId?: string;
  onBrowserSpeechStart?: () => void;
  /** The toolbar owns the read-aloud controls and shows this state; null once the chapter goes away. */
  onReadAloudChange?: (snapshot: ReadAloudSnapshot | null, actions: ReadAloudActions | null) => void;
  maxWidth?: MaxWidth;
  /** Reading assistance is on: the reflection prompt and editor are hidden, not unmounted, so a draft and the saved reflection are kept. */
  reflectionHidden?: boolean;
  /** This chapter's validated host embeds; each frame is placed before its prose alternative. */
  embeds?: readonly ValidPublicationEmbed[];
}

const MarkdownRendererComponent = forwardRef<MarkdownRendererHandle, MarkdownRendererProps>(({ 
    content,
    tableControls = false,
    tableReviews,
    format = 'markdown',
    language,
    highlights = [], 
    reflection, 
    onSaveReflection,
    onOpenHighlight,
    bookId = 'reader',
    onBrowserSpeechStart,
    onReadAloudChange,
    maxWidth = 'md',
    reflectionHidden = false,
    embeds = noEmbeds
}, ref) => {
  const [reflectionText, setReflectionText] = useState('');
  const contentElement = useRef<HTMLDivElement>(null);
  const renderedHTML = useMemo(() => renderPublicationContent(content, format), [content, format]);
  const annotatedHTML = useMemo(() => preparePublicationHTML(renderedHTML, highlights), [renderedHTML, highlights]);
  useEffect(() => {
    if (tableControls && contentElement.current) return attachTableSurfaces(contentElement.current, tableReviews);
  }, [annotatedHTML, tableControls, tableReviews]);
  const [notePositions, setNotePositions] = useState<{ highlight: Highlight; top: number }[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
      if (reflection) {
          setReflectionText(reflection.content);
      } else {
          setReflectionText('');
      }
  }, [reflection]);

  // Read-aloud lives in ./read-aloud: ReadFlex's speech player over this chapter's canonical text.
  // The host pauses the recorded player from onBrowserSpeechStart, which the controller calls before the engine speaks, whichever control started it.
  const { snapshot, actions } = useReadAloud({ bookId, language, contentElement, renderedHTML, annotatedHTML, onEngage: onBrowserSpeechStart });
  const readAloudCallback = useRef(onReadAloudChange);
  readAloudCallback.current = onReadAloudChange;
  useEffect(() => {
    readAloudCallback.current?.(snapshot, actions);
  }, [snapshot, actions]);
  useEffect(() => () => readAloudCallback.current?.(null, null), []);

  const handleSaveReflectionClick = () => {
      if (onSaveReflection) {
          onSaveReflection(reflectionText);
      }
  };

  // Expose methods to parent via Ref for Keyboard Shortcuts
  useImperativeHandle(ref, () => ({
      stopReadAloud: actions.stop,
      toggleReadAloud: actions.toggle,
  }), [actions]);

  // Keep the original margin-note cards aligned with the first decorated range.
  useEffect(() => {
    const element = contentElement.current;
    if (!element) return;
    const update = () => {
      const marks = Array.from(element.querySelectorAll<HTMLElement>('[data-publication-highlight]'));
      const top = element.getBoundingClientRect().top;
      setNotePositions(highlights.filter(highlight => highlight.note?.trim()).flatMap(highlight => {
        const mark = marks.find(mark => mark.dataset.publicationHighlight === highlight.id);
        return mark ? [{ highlight, top: mark.getBoundingClientRect().top - top }] : [];
      }));
    };
    update();
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(update) : undefined;
    observer?.observe(element);
    window.addEventListener('resize', update);
    return () => { observer?.disconnect(); window.removeEventListener('resize', update); };
  }, [annotatedHTML, highlights]);

  // Body size, line height and spacing come from the reading preferences (support.css); the prose scale stays fixed so headings keep their proportions.
  const proseClass = 'prose prose-indigo dark:prose-invert prose-lg leading-relaxed max-w-none prose-content text-gray-700 dark:text-gray-300';

  return (
    <div className="relative" ref={containerRef}>
        <div className="relative">
          <div ref={contentElement} data-publication-content className={`${proseClass} publication-content`} dangerouslySetInnerHTML={{ __html: annotatedHTML }} />
          {embeds.length > 0 && <PublicationEmbedSlots embeds={embeds} contentElement={contentElement} html={annotatedHTML} />}
          {notePositions.map(({ highlight: h, top }) => (
            <div key={h.id} className="publication-margin-note absolute right-0" style={{ top }}>
              {maxWidth !== 'full' && <div className="hidden xl:flex flex-col gap-3 absolute left-full top-0 ml-8 w-64 z-10 animate-fade-in-up">
                <button onClick={onOpenHighlight} className="text-left bg-amber-50 dark:bg-amber-900/40 border border-amber-200 dark:border-amber-700 p-3 rounded-md shadow-sm text-xs cursor-pointer hover:bg-amber-100 dark:hover:bg-amber-900/60 transition-colors relative group/note">
                  <div className="absolute -left-2 top-4 w-2 h-2 bg-amber-200 dark:bg-amber-700 transform rotate-45 border-l border-b border-amber-200 dark:border-amber-700"></div>
                  <div className="font-semibold text-amber-800 dark:text-amber-200 mb-1 border-b border-amber-200 dark:border-amber-700 pb-1 flex items-center gap-1"><span className="material-symbols-outlined text-sm">sticky_note_2</span>Note</div>
                  <p className="text-gray-600 dark:text-gray-400 italic mb-2 line-clamp-2 border-l-2 border-amber-300 dark:border-amber-600 pl-2">“{h.text}”</p>
                  <p className="text-gray-900 dark:text-gray-200 font-medium">{h.note}</p>
                </button>
              </div>}
              <button onClick={onOpenHighlight} className={`absolute -right-6 top-0 text-amber-500 hover:text-amber-600 ${maxWidth === 'full' ? 'block' : 'xl:hidden block'}`} title="View Notes"><span className="material-symbols-outlined text-xl material-symbols-filled">sticky_note_2</span></button>
            </div>
          ))}
        </div>

        {/* Key Lessons & Reflections Section */}
        {onSaveReflection && (
            <div className="mt-16 pt-8 border-t-2 border-gray-100 dark:border-gray-800" hidden={reflectionHidden} data-publication-reflection>
                <div className="bg-gradient-to-b from-indigo-50 to-white dark:from-indigo-950/30 dark:to-gray-900 rounded-xl p-8 border border-indigo-100 dark:border-indigo-900/50 shadow-sm">
                    <div className="flex items-center gap-3 mb-4 text-indigo-900 dark:text-indigo-100">
                        <div className="p-2 bg-indigo-100 dark:bg-indigo-900 rounded-lg">
                             <span className="material-symbols-outlined">psychology_alt</span>
                        </div>
                        <h3 className="text-xl font-bold">Key Lessons & Reflections</h3>
                    </div>
                    <p className="text-sm text-indigo-700 dark:text-indigo-300 mb-6 leading-relaxed">
                        Use this space to jot down your key takeaways, specific lessons learned, or questions you want to follow up on from this section. These notes will be saved to your dashboard.
                    </p>
                    <textarea
                        aria-label="Key lessons and reflections"
                        value={reflectionText}
                        onChange={(e) => setReflectionText(e.target.value)}
                        className="w-full p-4 border border-indigo-200 dark:border-indigo-800 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-gray-800 min-h-[150px] text-gray-800 dark:text-gray-100 shadow-inner placeholder-gray-400 dark:placeholder-gray-500"
                        placeholder="What are the main points you want to remember? How does this apply to your practice?..."
                    />
                    <div className="mt-4 flex justify-end">
                        <button 
                            onClick={handleSaveReflectionClick}
                            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-all shadow-md hover:shadow-lg flex items-center gap-2 active:transform active:scale-95"
                        >
                            <span className="material-symbols-outlined text-sm">save</span>
                            Save Reflection
                        </button>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
});

export const MarkdownRenderer = memo(MarkdownRendererComponent);
