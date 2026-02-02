import { useEffect, useState } from 'react';
import { SectionId } from '../types';

const DEFAULT_SECTION: SectionId = 'home';

export function useReaderNavigation() {
  const getInitialSection = (): SectionId => {
    const params = new URLSearchParams(window.location.search);
    const section = params.get('section');
    return section || DEFAULT_SECTION;
  };

  const [activeSectionId, setActiveSectionId] = useState<SectionId>(getInitialSection);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (activeSectionId === 'home') {
      params.delete('section');
    } else {
      params.set('section', activeSectionId);
    }
    const next = `${window.location.pathname}?${params.toString()}`.replace(/\?$/, '');
    window.history.replaceState({}, '', next);
  }, [activeSectionId]);

  return {
    activeSectionId,
    setActiveSectionId,
    isHome: activeSectionId === 'home'
  };
}
