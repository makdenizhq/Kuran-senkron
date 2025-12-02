import React from 'react';
import { Verse, TimestampSegment } from '../types';
import { Wand2, Loader2, Clock, Flag } from 'lucide-react';
import { generateTransliteration } from '../services/geminiService';

interface VerseListProps {
  verses: Verse[];
  currentTimestamp: number;
  timestamps: TimestampSegment[];
  targetLanguage: string;
  generatedTransliterations: Record<string, string>;
  setGeneratedTransliteration: (key: string, text: string) => void;
  onManualStamp: (verseKey: string) => void;
}

const VerseList: React.FC<VerseListProps> = ({ 
  verses, currentTimestamp, timestamps, targetLanguage, generatedTransliterations, setGeneratedTransliteration, onManualStamp
}) => {
  const [loadingKeys, setLoadingKeys] = React.useState<Set<string>>(new Set());

  // Determine active verse based on timestamp
  const activeVerseKey = React.useMemo(() => {
    if (timestamps.length === 0) return null;
    const active = timestamps.find(
      ts => currentTimestamp >= ts.timestamp_from && currentTimestamp <= ts.timestamp_to && ts.timestamp_to > 0
    );
    // If no active timestamp range is found (e.g. gap silence), find the next upcoming one or the one we are manually editing
    if (!active) {
        // Find the first one that hasn't finished yet or is 0
        const next = timestamps.find(ts => ts.timestamp_to === 0 || ts.timestamp_from > currentTimestamp);
        return next ? next.verse_key : null;
    }
    return active ? active.verse_key : null;
  }, [currentTimestamp, timestamps]);

  // Scroll active verse into view
  React.useEffect(() => {
    if (activeVerseKey) {
      const el = document.getElementById(`verse-${activeVerseKey}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [activeVerseKey]);

  const handleTransliterate = async (verse: Verse) => {
    if (generatedTransliterations[verse.verse_key]) return;

    setLoadingKeys(prev => new Set(prev).add(verse.verse_key));
    const result = await generateTransliteration(verse.text_uthmani, targetLanguage);
    setGeneratedTransliteration(verse.verse_key, result);
    setLoadingKeys(prev => {
        const next = new Set(prev);
        next.delete(verse.verse_key);
        return next;
    });
  };

  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    const millis = Math.floor((ms % 1000) / 100); // Tenths of second
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${millis}`;
  };

  if (verses.length === 0) {
    return (
      <div className="text-center py-20 text-slate-500">
        <p>Ayetleri görüntülemek için bir Sure seçiniz.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-40">
      {verses.map((verse) => {
        const isActive = activeVerseKey === verse.verse_key;
        const aiTransliteration = generatedTransliterations[verse.verse_key];
        const isLoading = loadingKeys.has(verse.verse_key);
        
        // Find timestamps for this specific verse
        const verseTiming = timestamps.find(ts => ts.verse_key === verse.verse_key);

        return (
          <div 
            key={verse.id} 
            id={`verse-${verse.verse_key}`}
            className={`p-6 rounded-2xl transition-all duration-500 border relative ${
              isActive 
                ? 'bg-slate-800/80 border-emerald-500/50 shadow-[0_0_40px_rgba(16,185,129,0.15)] ring-1 ring-emerald-500/20' 
                : 'bg-slate-900 border-slate-800 hover:border-slate-700 opacity-80 hover:opacity-100'
            }`}
          >
            {/* Header: Number & Timing */}
            <div className="flex justify-between items-start mb-6">
               <div className="flex items-start gap-3 w-full">
                    {/* Verse Number Circle */}
                   <span className={`flex-shrink-0 inline-flex items-center justify-center w-10 h-10 rounded-full text-sm font-bold border ${isActive ? 'bg-emerald-900 text-emerald-100 border-emerald-700' : 'bg-slate-800 text-slate-400 border-slate-700'}`}>
                        {verse.verse_key.split(':')[1]}
                   </span>

                   {/* Controls Column */}
                   <div className="flex flex-col items-start gap-2">
                        {/* Timestamp Display */}
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-950 rounded-lg border border-slate-800 text-xs font-mono text-slate-400">
                            <Clock size={12} className={isActive ? "text-emerald-500" : "text-slate-600"} />
                            <span>
                                {verseTiming ? `${formatTime(verseTiming.timestamp_from)} - ${formatTime(verseTiming.timestamp_to)}` : '00:00 - 00:00'}
                            </span>
                        </div>

                        {/* Manual Sync Button */}
                        <button 
                                onClick={() => onManualStamp(verse.verse_key)}
                                className={`group flex items-center gap-2 px-3 py-2 rounded-lg border transition-all shadow-md active:scale-95 ${
                                    isActive 
                                    ? 'bg-emerald-600 hover:bg-emerald-500 border-emerald-500 text-white shadow-emerald-900/20' 
                                    : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300'
                                }`}
                        >
                            <Flag size={14} className={isActive ? "fill-current" : "group-hover:text-emerald-400"} />
                            <span className="font-semibold text-xs sm:text-sm">Bitiş Zamanını Kaydet</span>
                        </button>
                   </div>
               </div>
            </div>

            {/* Arabic Text */}
            <p className="text-right text-4xl sm:text-5xl font-arabic leading-[2.2] text-slate-100 mb-8 px-2" dir="rtl">
              {verse.text_uthmani}
            </p>

            {/* Standard Transliteration */}
            {verse.transliteration_text && !aiTransliteration && (
                 <div className="text-center mb-6">
                     <p className="inline-block text-emerald-400 text-lg sm:text-2xl font-medium font-sans tracking-wide leading-relaxed px-6 py-3 bg-emerald-950/20 rounded-xl border border-emerald-500/10">
                        {verse.transliteration_text}
                     </p>
                 </div>
            )}

            {/* AI Transliteration */}
            {aiTransliteration && (
                <div className="mb-6 p-5 bg-emerald-950/30 border-l-4 border-emerald-500 rounded-r-xl text-center shadow-inner">
                    <p className="text-emerald-300 text-lg sm:text-2xl font-medium tracking-wide leading-relaxed">
                        {aiTransliteration}
                    </p>
                </div>
            )}

            {/* Translation & Actions */}
            <div className="border-t border-slate-800 pt-5 flex flex-col sm:flex-row gap-4 justify-between items-end">
                <div className="flex-1 w-full">
                    <span className="text-[10px] uppercase tracking-wider text-slate-500 mb-2 block font-semibold opacity-70">{targetLanguage} Meali</span>
                    <p className="text-slate-300 text-lg leading-relaxed font-light">
                    {verse.translations?.[0]?.text.replace(/<sup.*?<\/sup>/g, '')}
                    </p>
                </div>

                <button 
                   onClick={() => handleTransliterate(verse)}
                   disabled={!!aiTransliteration || isLoading}
                   className={`flex-shrink-0 text-xs flex items-center gap-1.5 px-3 py-2 rounded-md transition-colors font-medium border ${
                     aiTransliteration 
                        ? 'text-emerald-500/50 border-transparent cursor-default' 
                        : 'text-slate-400 hover:text-emerald-400 bg-slate-800 hover:bg-slate-750 border-slate-700'
                   }`}
                >
                   {isLoading ? <Loader2 size={14} className="animate-spin" /> : <Wand2 size={14} />}
                   {aiTransliteration ? 'AI Çevirisi Yapıldı' : `AI: ${targetLanguage} Okunuş`}
                </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default VerseList;