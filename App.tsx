import React from 'react';
import { Home } from './components/home/Home';
import { ReaderShell } from './components/reader/ReaderShell';
import { useReaderNavigation } from './context/useReaderNavigation';

export default function App() {
  const { isHome, activeSectionId, setActiveSectionId } = useReaderNavigation();

  if (isHome) {
    return (
      <Home
        onStart={() => setActiveSectionId('intro')}
        onSearch={() => setActiveSectionId('intro')}
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
