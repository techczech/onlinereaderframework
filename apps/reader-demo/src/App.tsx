import React, { useMemo, useState } from 'react';
import defaultMarkdown from './defaultMarkdown.md?raw';
import {
  Home,
  ReaderShell,
  parseMarkdown,
  MarkdownParseOptions,
  SectionConfig
} from 'reader-core';

const DEFAULT_OPTIONS: MarkdownParseOptions = {
  sectionHeadingLevel: 'auto',
  tocMinLevel: 2,
  fallbackTitle: 'Reader Framework'
};

export default function App() {
  const [markdown, setMarkdown] = useState(defaultMarkdown);
  const [options, setOptions] = useState<MarkdownParseOptions>(DEFAULT_OPTIONS);
  const [isHome, setIsHome] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const sections = useMemo<SectionConfig[]>(() => parseMarkdown(markdown, options), [markdown, options]);
  const firstSectionId = sections[0]?.id;

  const handleFile = async (file: File) => {
    const text = await file.text();
    setMarkdown(text);
    setIsHome(false);
    setShowUpload(false);
    setSelectedFile(null);
  };

  const loadTemplate = async () => {
    const response = await fetch('/upload.md');
    const text = await response.text();
    setMarkdown(text);
    setIsHome(false);
    setShowUpload(false);
    setSelectedFile(null);
  };

  const updateSectionLevel = (value: string) => {
    setOptions((prev) => ({
      ...prev,
      sectionHeadingLevel: value === 'auto' ? 'auto' : (Number(value) as 1 | 2)
    }));
  };

  const updateTocLevel = (value: string) => {
    setOptions((prev) => ({
      ...prev,
      tocMinLevel: Number(value) as 2 | 3 | 4
    }));
  };

  if (isHome) {
    return (
      <div>
        <Home
          onStart={() => setIsHome(false)}
          onSearch={() => setIsHome(false)}
          onUpload={() => setShowUpload(true)}
        />
        {showUpload ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-6">
            <div className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold">Upload Markdown</h2>
                  <p className="mt-2 text-sm text-slate-600">
                    Upload a Markdown file or start from the template. Files are processed locally.
                  </p>
                </div>
                <button
                  onClick={() => setShowUpload(false)}
                  className="rounded-full border border-slate-200 px-3 py-1 text-sm text-slate-600 hover:bg-slate-100"
                  aria-label="Close upload dialog"
                >
                  Close
                </button>
              </div>
              <div className="mt-6 space-y-4">
                <div>
                  <label className="text-sm font-medium text-slate-700">Markdown file</label>
                  <input
                    type="file"
                    accept=".md"
                    className="mt-2 w-full rounded border border-slate-200 px-3 py-2 text-sm"
                    onChange={(event) => {
                      const file = event.target.files?.[0] ?? null;
                      setSelectedFile(file);
                    }}
                  />
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    onClick={() => selectedFile && handleFile(selectedFile)}
                    disabled={!selectedFile}
                    className="px-4 py-2 text-sm rounded bg-slate-900 text-white disabled:opacity-40"
                  >
                    Upload & Preview
                  </button>
                  <button
                    onClick={loadTemplate}
                    className="px-3 py-2 text-sm rounded border border-slate-200 text-slate-700 hover:bg-slate-100"
                  >
                    Use upload template
                  </button>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <label className="text-sm text-slate-600">
                    Section headings
                    <select
                      className="mt-1 w-full rounded border border-slate-200 px-2 py-1"
                      value={options.sectionHeadingLevel}
                      onChange={(e) => updateSectionLevel(e.target.value)}
                    >
                      <option value="auto">Auto</option>
                      <option value="1">H1</option>
                      <option value="2">H2</option>
                    </select>
                  </label>
                  <label className="text-sm text-slate-600">
                    TOC min level
                    <select
                      className="mt-1 w-full rounded border border-slate-200 px-2 py-1"
                      value={options.tocMinLevel}
                      onChange={(e) => updateTocLevel(e.target.value)}
                    >
                      <option value={2}>H2</option>
                      <option value={3}>H3</option>
                      <option value={4}>H4</option>
                    </select>
                  </label>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <ReaderShell
      sections={sections}
      initialSectionId={firstSectionId}
      headingLevels={{
        section: options.sectionHeadingLevel === 'auto' ? 2 : (options.sectionHeadingLevel as number),
        tocMin: options.tocMinLevel
      }}
      onBackHome={() => setIsHome(true)}
    />
  );
}
