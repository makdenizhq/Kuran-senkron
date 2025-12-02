import React from 'react';
import { Chapter, Reciter, Language, TranslationResource } from '../types';
import { ChevronDown, BookOpen, Mic, Globe, PenTool } from 'lucide-react';

interface SelectorsProps {
  chapters: Chapter[];
  reciters: Reciter[];
  languages: Language[];
  availableTranslations: TranslationResource[];
  
  selectedChapter: Chapter | null;
  selectedReciter: Reciter | null;
  selectedLanguage: Language | null;
  selectedTranslation: TranslationResource | null;

  onSelectChapter: (id: number) => void;
  onSelectReciter: (id: number) => void;
  onSelectLanguage: (code: string) => void;
  onSelectTranslation: (id: number) => void;
}

const Selectors: React.FC<SelectorsProps> = ({
  chapters, reciters, languages, availableTranslations,
  selectedChapter, selectedReciter, selectedLanguage, selectedTranslation,
  onSelectChapter, onSelectReciter, onSelectLanguage, onSelectTranslation
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6 bg-slate-900 p-4 rounded-xl border border-slate-800 shadow-lg">
      
      {/* 1. Reciter Select */}
      <div className="relative">
        <label className="block text-xs font-medium text-slate-400 mb-1 flex items-center gap-2">
          <Mic size={14} className="text-emerald-500"/> Reciter
        </label>
        <div className="relative">
          <select 
            className="w-full bg-slate-800 text-slate-200 border border-slate-700 rounded-lg py-2.5 px-3 appearance-none focus:ring-2 focus:ring-emerald-500 focus:outline-none transition-all"
            value={selectedReciter?.id || ''}
            onChange={(e) => onSelectReciter(Number(e.target.value))}
          >
            <option value="" disabled>Select Reciter</option>
            {reciters.map(r => (
              <option key={r.id} value={r.id}>
                {r.name} {r.style ? `(${r.style})` : ''}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-3 text-slate-500 pointer-events-none" size={16} />
        </div>
      </div>

      {/* 2. Chapter Select */}
      <div className="relative">
        <label className="block text-xs font-medium text-slate-400 mb-1 flex items-center gap-2">
          <BookOpen size={14} className="text-emerald-500"/> Surah (Chapter)
        </label>
        <div className="relative">
          <select 
            className="w-full bg-slate-800 text-slate-200 border border-slate-700 rounded-lg py-2.5 px-3 appearance-none focus:ring-2 focus:ring-emerald-500 focus:outline-none transition-all"
            value={selectedChapter?.id || ''}
            onChange={(e) => onSelectChapter(Number(e.target.value))}
          >
            <option value="" disabled>Select Surah</option>
            {chapters.map(c => (
              <option key={c.id} value={c.id}>
                {c.id}. {c.name_simple} ({c.name_arabic})
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-3 text-slate-500 pointer-events-none" size={16} />
        </div>
      </div>

      {/* 3. Language Select */}
      <div className="relative">
        <label className="block text-xs font-medium text-slate-400 mb-1 flex items-center gap-2">
          <Globe size={14} className="text-emerald-500"/> Translation Language
        </label>
        <div className="relative">
          <select 
            className="w-full bg-slate-800 text-slate-200 border border-slate-700 rounded-lg py-2.5 px-3 appearance-none focus:ring-2 focus:ring-emerald-500 focus:outline-none transition-all"
            value={selectedLanguage?.iso_code || 'en'}
            onChange={(e) => onSelectLanguage(e.target.value)}
          >
            {languages.map(l => (
              <option key={l.id} value={l.iso_code}>
                {l.name}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-3 text-slate-500 pointer-events-none" size={16} />
        </div>
      </div>

      {/* 4. Translator/Author Select */}
      <div className="relative">
        <label className="block text-xs font-medium text-slate-400 mb-1 flex items-center gap-2">
          <PenTool size={14} className="text-emerald-500"/> Translator
        </label>
        <div className="relative">
          <select 
            className="w-full bg-slate-800 text-slate-200 border border-slate-700 rounded-lg py-2.5 px-3 appearance-none focus:ring-2 focus:ring-emerald-500 focus:outline-none transition-all"
            value={selectedTranslation?.id || ''}
            onChange={(e) => onSelectTranslation(Number(e.target.value))}
            disabled={availableTranslations.length === 0}
          >
            {availableTranslations.length === 0 ? (
                <option>Önce Caching Yapınız</option>
            ) : (
                availableTranslations.map(t => (
                <option key={t.id} value={t.id}>
                    {t.name}
                </option>
                ))
            )}
          </select>
          <ChevronDown className="absolute right-3 top-3 text-slate-500 pointer-events-none" size={16} />
        </div>
      </div>

    </div>
  );
};

export default Selectors;