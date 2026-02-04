# Reuse Guide: Reader Core

This project is split into two parts:
- `packages/reader-core`: reusable library (components + parsing + utilities)
- `apps/reader-demo`: demo application and Markdown uploader

## Install in another project
```
npm install file:../path/to/onlinereaderframework/packages/reader-core
```

## Minimal integration
```tsx
import React from 'react';
import { ReaderShell, parseMarkdown } from 'reader-core';

const markdown = '# My Guide\n\n## Section\nContent here.';
const sections = parseMarkdown(markdown, { sectionHeadingLevel: 'auto' });

export default function App() {
  return <ReaderShell sections={sections} />;
}
```

## Configuration knobs
- `sectionHeadingLevel`: auto, 1, or 2
- `tocMinLevel`: 2, 3, or 4
- `enableSearch`, `enableHighlights`, `enableReadingStats`

## Custom adapters
If your content does not start as Markdown, create an adapter that outputs `SectionConfig[]` and pass it to `ReaderShell`.
