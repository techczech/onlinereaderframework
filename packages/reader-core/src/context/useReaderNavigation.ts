import { useEffect, useState } from 'react';
import { SectionId } from '../types';

const DEFAULT_SECTION: SectionId = 'home';

export function useReaderNavigation() {
  const getInitialSection = (): SectionId => {
    const params = new URLSearchParams(window.location.search);
    const section = params.get('section');
    return section || DEFAULT_SECTION;
  };

  const getInitialHighlight = (): string | null => {
    const params = new URLSearchParams(window.location.search);
    return params.get('text');
  };

  const [activeSectionId, setActiveSectionId] = useState<SectionId>(getInitialSection);
  const [highlightQuery, setHighlightQuery] = useState<string | null>(getInitialHighlight);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (activeSectionId === 'home') {
      params.delete('section');
      params.delete('text');
    } else {
      params.set('section', activeSectionId);
      if (highlightQuery) {
        params.set('text', highlightQuery);
      } else {
        params.delete('text');
      }
    }

    const next = `${window.location.pathname}?${params.toString()}`.replace(/\?$/, '');
    window.history.replaceState({}, '', next);
  }, [activeSectionId, highlightQuery]);

  return {
    activeSectionId,
    setActiveSectionId,
    highlightQuery,
    setHighlightQuery,
    isHome: activeSectionId === 'home'
  };
}
