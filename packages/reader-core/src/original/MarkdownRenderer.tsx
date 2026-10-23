
import React, { useState, useEffect, useRef, memo, forwardRef, useImperativeHandle, useMemo } from 'react';
import { Highlight, Reflection, PublicationContentFormat } from './types.js';
import { renderPublicationContent } from '../publication-content/index.js';
import { preparePublicationHTML, publicationPlainText } from './publication-html.js';

export interface MarkdownRendererHandle {
    toggleReadAloud: () => void;
}

// Redefine types locally for component independence
type FontSize = 'sm' | 'base' | 'lg' | 'xl';
type LineHeight = 'tight' | 'normal' | 'relaxed' | 'loose';
type MaxWidth = 'sm' | 'md' | 'lg' | 'full';

interface MarkdownRendererProps {
  content: string;
  format?: PublicationContentFormat;
  language?: string;
  highlights?: Highlight[];
  reflection?: Reflection;
  onSaveReflection?: (content: string) => void;
  onOpenHighlight?: () => void;
  // Readability Props
  fontSize?: FontSize;
  lineHeight?: LineHeight;
  maxWidth?: MaxWidth;
}

const MarkdownRendererComponent = forwardRef<MarkdownRendererHandle, MarkdownRendererProps>(({ 
    content,
    format = 'markdown',
    language,
    highlights = [], 
    reflection, 
    onSaveReflection,
    onOpenHighlight,
    fontSize = 'base',
    lineHeight = 'relaxed',
    maxWidth = 'md'
}, ref) => {
  // Speech Synthesis State
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [reflectionText, setReflectionText] = useState('');
  const synth = useRef<SpeechSynthesis | null>(null);
  const [speechSupported, setSpeechSupported] = useState(false);
  const contentElement = useRef<HTMLDivElement>(null);
  const renderedHTML = useMemo(() => renderPublicationContent(content, format), [content, format]);
  const annotatedHTML = useMemo(() => preparePublicationHTML(renderedHTML, highlights), [renderedHTML, highlights]);
  const [notePositions, setNotePositions] = useState<{ highlight: Highlight; top: number }[]>([]);
  const utterance = useRef<SpeechSynthesisUtterance | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
      if (reflection) {
          setReflectionText(reflection.content);
      } else {
          setReflectionText('');
      }
  }, [reflection]);

  // Initialize Speech Synthesis
  useEffect(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      synth.current = window.speechSynthesis;
      setSpeechSupported(true);
    }
    
    // Cleanup on unmount
    return () => {
      if (synth.current) {
        synth.current.cancel();
      }
    };
  }, []);

  // Stop speech when content changes
  useEffect(() => {
      if (synth.current) {
          synth.current.cancel();
          setIsSpeaking(false);
          setIsPaused(false);
      }
  }, [content]);

  const handleSaveReflectionClick = () => {
      if (onSaveReflection) {
          onSaveReflection(reflectionText);
      }
  };

  const handleSpeak = () => {
    if (!synth.current) return;

    if (isPaused) {
      synth.current.resume();
      setIsPaused(false);
      setIsSpeaking(true);
    } else if (isSpeaking) {
      synth.current.pause();
      setIsPaused(true);
      setIsSpeaking(false);
    } else {
      const text = publicationPlainText(renderedHTML);
      utterance.current = new SpeechSynthesisUtterance(text);
      
      if (language) utterance.current.lang = language;
      // Prefer a matching language while leaving the browser default available.
      const voices = synth.current.getVoices();
      const preferredVoice = voices.find(v => v.lang.toLowerCase().startsWith((language ?? 'en').toLowerCase().split('-')[0]) && v.name.includes('Google')) || voices.find(v => v.lang.toLowerCase().startsWith((language ?? 'en').toLowerCase().split('-')[0]));
      if (preferredVoice) {
          utterance.current.voice = preferredVoice;
      }

      utterance.current.onend = () => {
        setIsSpeaking(false);
        setIsPaused(false);
      };
      
      utterance.current.onerror = () => {
          setIsSpeaking(false);
          setIsPaused(false);
      };

      synth.current.speak(utterance.current);
      setIsSpeaking(true);
    }
  };

  const handleStop = () => {
    if (synth.current) {
      synth.current.cancel();
      setIsSpeaking(false);
      setIsPaused(false);
    }
  };

  // Expose methods to parent via Ref for Keyboard Shortcuts
  useImperativeHandle(ref, () => ({
      toggleReadAloud: () => {
          handleSpeak();
      }
  }));

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
  }, [annotatedHTML, highlights, fontSize, lineHeight]);

  // Map props to classes
  const getFontSizeClass = () => {
      // Scale up sizes: Base mapped to 'lg' (18px) for better readability
      switch (fontSize) {
          case 'sm': return 'prose-base'; // 16px
          case 'base': return 'prose-lg'; // 18px (Targeted size)
          case 'lg': return 'prose-xl';   // 20px
          case 'xl': return 'prose-2xl';  // 24px
          default: return 'prose-lg';
      }
  };
  
  const getLineHeightClass = () => {
      switch (lineHeight) {
          case 'tight': return 'leading-tight';
          case 'normal': return 'leading-normal';
          case 'relaxed': return 'leading-relaxed';
          case 'loose': return 'leading-loose';
          default: return 'leading-relaxed';
      }
  };

  // Main prose container class
  const proseClass = `prose prose-indigo dark:prose-invert max-w-none prose-content text-gray-700 dark:text-gray-300 ${getFontSizeClass()} ${getLineHeightClass()}`;

  return (
    <div className="relative" ref={containerRef}>
        {/* Read Aloud Controls */}
        <div className="flex justify-end mb-4 gap-2">
            <button 
                onClick={handleSpeak}
                disabled={!speechSupported}
                aria-label={speechSupported ? undefined : "Read aloud is unavailable in this browser"}
                className={`
                    flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all shadow-sm border
                    ${isSpeaking 
                        ? 'bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-700 animate-pulse' 
                        : isPaused
                            ? 'bg-yellow-50 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 border-yellow-200 dark:border-yellow-700'
                            : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white'
                    }
                `}
                title={isSpeaking ? "Pause (Shortcut: 'a')" : isPaused ? "Resume (Shortcut: 'a')" : "Read Aloud (Shortcut: 'a')"}
            >
                {isSpeaking ? (
                    <>
                        <span className="material-symbols-outlined text-lg">pause</span>
                        Pause
                    </>
                ) : (
                    <>
                        <span className="material-symbols-outlined text-lg">volume_up</span>
                        {isPaused ? "Resume" : "Read Aloud"}
                    </>
                )}
            </button>
            
            {(isSpeaking || isPaused) && (
                <button 
                    onClick={handleStop}
                    className="p-2 rounded-full bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 border border-red-200 dark:border-red-800 transition-colors flex items-center justify-center"
                    title="Stop Reading"
                >
                    <span className="material-symbols-outlined text-lg">stop</span>
                </button>
            )}
        </div>

        <div className="relative">
          <div ref={contentElement} data-publication-content className={`${proseClass} publication-content`} dangerouslySetInnerHTML={{ __html: annotatedHTML }} />
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
            <div className="mt-16 pt-8 border-t-2 border-gray-100 dark:border-gray-800">
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
