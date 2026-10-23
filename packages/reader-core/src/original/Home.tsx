
import React from 'react';
import type { PublicationBook } from './types';
import { safePublicationHref } from './publication-model';

interface HomeProps {
  book: PublicationBook;
  onStart: () => void;
  onSelectSection: (id: string) => void;
  onOpenSearch: () => void;
}

export const Home: React.FC<HomeProps> = ({ book, onStart, onSelectSection, onOpenSearch }) => {
  const GUIDE_CONTENT = book.sections;
  const categories = Array.from(new Set(GUIDE_CONTENT.map(s => s.category)));
  const downloads = (book.downloads ?? []).filter(download => safePublicationHref(download.href));

  return (
    <div className="bg-white dark:bg-gray-900">
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-indigo-600 to-purple-700 dark:from-indigo-900 dark:to-purple-900 text-white relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
            <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                <path d="M0 100 C 20 0 50 0 100 100 Z" fill="white" />
            </svg>
        </div>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-24 lg:py-32 relative z-10">
            <div className="max-w-3xl">
                <div className="inline-block px-4 py-1 rounded-full bg-indigo-500/30 border border-indigo-400/30 text-indigo-100 text-sm font-medium mb-6 backdrop-blur-sm">
                    {book.home?.badge ?? 'Reading Guide'}
                </div>
                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight mb-6">
                    {book.title}{book.subtitle && <><br/><span className="text-indigo-200">{book.subtitle}</span></>}
                </h1>
                <p className="text-xl text-indigo-100 mb-10 leading-relaxed max-w-2xl">
                    {book.description}
                </p>
                
                <div className="flex flex-wrap gap-4">
                    <button 
                        onClick={onStart}
                        disabled={GUIDE_CONTENT.length === 0}
                        className="px-8 py-4 bg-white text-indigo-600 font-bold rounded-full shadow-xl hover:bg-indigo-50 transition-all transform hover:-translate-y-1 text-lg flex items-center gap-2"
                    >
                        Start Reading
                    </button>
                    
                    <button 
                        onClick={onOpenSearch}
                        className="px-8 py-4 bg-indigo-500/40 border border-indigo-300/40 text-white font-bold rounded-full shadow-lg hover:bg-indigo-500/60 transition-all backdrop-blur-sm flex items-center gap-2"
                    >
                        <span className="material-symbols-outlined">search</span>
                        Search Guide
                    </button>
                    
                    {downloads.map(download => (
                      <a key={download.href} href={download.href}
                        className="px-8 py-4 bg-indigo-800/50 border border-indigo-400/50 text-white font-semibold rounded-full shadow-lg hover:bg-indigo-800/70 transition-all flex items-center gap-2 backdrop-blur-sm">
                        <span className="material-symbols-outlined">download</span>
                        {download.label}
                      </a>
                    ))}
                </div>
            </div>
        </div>
      </div>

      {/* Original concept-card layout; the publication supplies its actual copy. */}
      {!!book.home?.features?.length && (
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <h2 className="sr-only">Key Concepts</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {book.home.features.map((feature, index) => (
              <div key={feature.title} className="bg-white dark:bg-gray-800 p-8 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow group">
                <div className={`w-14 h-14 rounded-xl flex items-center justify-center mb-6 transition-colors ${index % 3 === 0 ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400' : index % 3 === 1 ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400' : 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400'}`}>
                  <span className="material-symbols-outlined text-3xl">{feature.icon ?? 'menu_book'}</span>
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">{feature.title}</h3>
                <p className="text-gray-600 dark:text-gray-400 leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Course Map / TOC */}
      <div className="bg-gray-50 dark:bg-gray-900 py-20 border-t border-gray-200 dark:border-gray-800">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
                <h2 className="text-3xl font-bold text-gray-900 dark:text-white">{book.home?.overviewTitle ?? 'Contents'}</h2>
                <p className="mt-4 text-gray-500 dark:text-gray-400 max-w-2xl mx-auto">{book.home?.overviewDescription ?? book.subtitle}</p>
            </div>
            
            <div className="grid md:grid-cols-2 gap-8">
                {categories.map((category) => (
                    <div key={category} className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 hover:border-indigo-200 dark:hover:border-indigo-700 transition-colors">
                        <h3 className="text-lg font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wide mb-6 flex items-center gap-2">
                            <span className="w-8 h-1 bg-indigo-100 dark:bg-indigo-900 block rounded-full"></span>
                            {category}
                        </h3>
                        <ul className="space-y-4">
                            {GUIDE_CONTENT.filter(s => s.category === category).map(section => (
                                <li key={section.id}>
                                    <button 
                                        onClick={() => onSelectSection(section.id)}
                                        className="group flex items-center text-gray-700 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 w-full text-left transition-colors"
                                    >
                                        <span className="w-1.5 h-1.5 rounded-full bg-gray-300 dark:bg-gray-600 mr-3 group-hover:bg-indigo-500 transition-colors"></span>
                                        <span className="group-hover:underline decoration-indigo-200 dark:decoration-indigo-500 underline-offset-4">{section.title}</span>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </div>
                ))}
            </div>
        </div>
      </div>
      
      {/* Footer / Author */}
      <div className="bg-white dark:bg-gray-900 py-12 border-t border-gray-200 dark:border-gray-800 text-center">
        <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">{book.home?.authorNote ?? `Written by ${book.author}.`}</p>
        {book.home?.license && safePublicationHref(book.home.license.href) && (
          <div className="flex flex-col items-center justify-center gap-2">
            {book.home.license.imageUrl && safePublicationHref(book.home.license.imageUrl) && <img alt={book.home.license.label} src={book.home.license.imageUrl} width="88" height="31" />}
            <a href={book.home.license.href} rel="license noopener noreferrer" target="_blank" className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline">{book.home.license.label}</a>
          </div>
        )}
        {book.sourceUrl && safePublicationHref(book.sourceUrl) && <a href={book.sourceUrl} className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline">Publication source</a>}
      </div>
    </div>
  );
};
