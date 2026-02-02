import React from 'react';
import { Home } from './components/home/Home';
import { ReaderShell } from './components/reader/ReaderShell';
import { useReaderNavigation } from './context/useReaderNavigation';
import { SAMPLE_CONTENT } from './data/content/sampleContent';

export default function App() {
  const { isHome, activeSectionId, setActiveSectionId } = useReaderNavigation();
  const firstSectionId = SAMPLE_CONTENT[0]?.id || 'home';

  if (isHome) {
    return (
      <Home
        onStart={() => setActiveSectionId(firstSectionId)}
        onSearch={() => setActiveSectionId(firstSectionId)}
      />
    );
  }

  return (
    <ReaderShell
      activeSectionId={activeSectionId}
      onNavigate={setActiveSectionId}
    />
  );
}
