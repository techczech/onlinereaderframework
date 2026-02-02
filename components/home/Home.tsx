import React from 'react';

interface HomeProps {
  onStart: () => void;
  onSearch: () => void;
}

export function Home({ onStart, onSearch }: HomeProps) {
  return (
    <main className="min-h-screen bg-white text-slate-900">
      <section className="max-w-4xl mx-auto px-6 py-20">
        <h1 className="text-4xl font-bold">Reader Framework</h1>
        <p className="mt-4 text-lg text-slate-600">
          Build teaching guides with a consistent, reader-first experience.
        </p>
        <div className="mt-8 flex gap-4">
          <button className="px-6 py-3 bg-slate-900 text-white rounded-lg" onClick={onStart}>
            Start Reading
          </button>
          <button className="px-6 py-3 border border-slate-300 rounded-lg" onClick={onSearch}>
            Search Guide
          </button>
        </div>
      </section>
    </main>
  );
}
