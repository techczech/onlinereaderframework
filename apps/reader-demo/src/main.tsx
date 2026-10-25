import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import '@fontsource/inter/300.css';
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/inter/700.css';
import '@fontsource/merriweather/300.css';
import '@fontsource/merriweather/400.css';
import '@fontsource/merriweather/700.css';
import '@fontsource/merriweather/300-italic.css';
import '@fontsource/material-symbols-outlined/400.css';
import '../../../packages/reader-core/src/original/reader-original.css';
import '../../../packages/reader-core/src/original/reading-support/support.css';
import '../../../packages/reader-core/src/original/listening/listening.css';
import '../../../packages/reader-core/src/original/reader-integrations.css';
import '../../../packages/reader-core/src/original/frontpage/frontpage.css';
import './index.css';

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Root element not found');

createRoot(rootElement).render(<App />);
