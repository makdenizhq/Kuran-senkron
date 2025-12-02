import React, { useState, useEffect } from 'react';
import { 
  getChapters, getReciters, getLanguages, getVerses, getAudioAndTimestamps, getAllTranslations
} from './services/quranService';
import { Chapter, Reciter, Language, Verse, TimestampSegment, TranslationResource } from './types';
import Selectors from './components/Selectors';
import VerseList from './components/VerseList';
import AudioPlayer from './components/AudioPlayer';
import TimestampExport from './components/TimestampExport';
import { FileText, Loader2, Database, Check } from 'lucide-react';

function App() {
  const [loading, setLoading] = useState(true);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [reciters, setReciters] = useState<Reciter[]>([]);
  const [languages, setLanguages] = useState<Language[]>([]);

  const [selectedChapter, setSelectedChapter] = useState<Chapter | null>(null);
  const [selectedReciter, setSelectedReciter] = useState<Reciter | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState<Language | null>(null);
  
  // Translation States
  const [allTranslations, setAllTranslations] = useState<TranslationResource[]>([]);
  const [availableTranslations, setAvailableTranslations] = useState<TranslationResource[]>([]);
  const [selectedTranslation, setSelectedTranslation] = useState<TranslationResource | null>(null);
  const [isCaching, setIsCaching] = useState(false);
  const [isCacheLoaded, setIsCacheLoaded] = useState(false);

  const [verses, setVerses] = useState<Verse[]>([]);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [timestamps, setTimestamps] = useState<TimestampSegment[]>([]);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTimestamp, setCurrentTimestamp] = useState(0);
  const [isExportOpen, setIsExportOpen] = useState(false);
  
  const [generatedTransliterations, setGeneratedTransliterations] = useState<Record<string, string>>({});

  // Initial Load (Fast: Only Chapters, Reciters, Languages)
  useEffect(() => {
    const initData = async () => {
      try {
        const [ch, rec, lang] = await Promise.all([
          getChapters(),
          getReciters(),
          getLanguages()
        ]);
        setChapters(ch);
        setReciters(rec);
        setLanguages(lang);
        
        // Defaults
        if (ch.length > 0) setSelectedChapter(ch[0]); // Al-Fatihah
        
        // Setup initial language
        let initialLang = lang.find((l: any) => l.iso_code === 'tr');
        if (!initialLang) initialLang = lang.find((l: any) => l.iso_code === 'en');
        if (!initialLang && lang.length > 0) initialLang = lang[0];

        if (initialLang) {
            setSelectedLanguage(initialLang);
        }

        // Set a popular reciter
        const mishari = rec.find((r: any) => r.id === 7);
        if (mishari) setSelectedReciter(mishari);
        else if (rec.length > 0) setSelectedReciter(rec[0]);

      } catch (e) {
        console.error("Initialization failed", e);
      } finally {
        setLoading(false);
      }
    };
    initData();
  }, []);

  // Filter Translations when Language OR Cache changes
  useEffect(() => {
    if (!selectedLanguage) return;

    if (allTranslations.length === 0) {
        setAvailableTranslations([]);
        setSelectedTranslation(null);
        return;
    }
    
    // Filter client-side
    const filtered = allTranslations.filter(t => t.iso_code === selectedLanguage.iso_code);
    setAvailableTranslations(filtered);
    
    // Pick default translation
    if (filtered.length > 0) {
        let def = filtered[0];
        if (selectedLanguage.iso_code === 'tr') {
            def = filtered.find(t => t.id === 77) || filtered[0]; // Diyanet
        } else if (selectedLanguage.iso_code === 'en') {
            def = filtered.find(t => t.id === 131) || filtered[0]; // Saheeh
        }
        setSelectedTranslation(def);
    } else {
        setSelectedTranslation(null);
    }

  }, [selectedLanguage, allTranslations]);

  // Fetch Verses when Chapter or specific Translation changes
  useEffect(() => {
    if (!selectedChapter || !selectedTranslation) {
        setVerses([]);
        return;
    }

    const fetchContent = async () => {
      // Local loading state for verse list to prevent full screen flash
      setVerses([]); 
      try {
        const v = await getVerses(selectedChapter.id, selectedTranslation.id);
        setVerses(v);
        setGeneratedTransliterations({}); 
      } catch (e) {
        console.error("Failed to fetch verses", e);
      }
    };
    fetchContent();
  }, [selectedChapter, selectedTranslation]);

  // Fetch Audio and Init Timestamps
  useEffect(() => {
    if (!selectedReciter || !selectedChapter) return;

    const fetchAudio = async () => {
      try {
        const result = await getAudioAndTimestamps(selectedReciter.id, selectedChapter.id);
        setAudioUrl(result.audio_url);
        
        if (result.timestamps && result.timestamps.length > 0 && result.timestamps.some(t => t.duration > 0)) {
            setTimestamps(result.timestamps);
        } else {
            setTimestamps([]);
        }
      } catch (e) {
        console.error("Failed to fetch audio", e);
        setAudioUrl(null);
        setTimestamps([]);
      }
    };
    fetchAudio();
  }, [selectedReciter, selectedChapter]);

  // Ensure timestamps array matches verse count for manual editing
  useEffect(() => {
      if (verses.length > 0 && timestamps.length === 0) {
          const defaults = verses.map(v => ({
              verse_key: v.verse_key,
              timestamp_from: 0,
              timestamp_to: 0,
              duration: 0
          }));
          setTimestamps(defaults);
      }
  }, [verses, timestamps.length]);


  // Handlers
  const handleSelectChapter = (id: number) => {
    const ch = chapters.find(c => c.id === id) || null;
    setSelectedChapter(ch);
  };
  const handleSelectReciter = (id: number) => {
    const r = reciters.find(rec => rec.id === id) || null;
    setSelectedReciter(r);
  };
  const handleSelectLanguage = (code: string) => {
    const l = languages.find(lang => lang.iso_code === code) || null;
    setSelectedLanguage(l);
  };
  const handleSelectTranslation = (id: number) => {
      const t = availableTranslations.find(tr => tr.id === id) || null;
      setSelectedTranslation(t);
  };

  const handleSetGeneratedTransliteration = (key: string, text: string) => {
    setGeneratedTransliterations(prev => ({ ...prev, [key]: text }));
  };

  const handleManualVerseStamp = (verseKey: string) => {
    setTimestamps(prev => {
        const newTimestamps = [...prev];
        const index = newTimestamps.findIndex(ts => ts.verse_key === verseKey);
        
        if (index === -1) return prev;

        newTimestamps[index] = {
            ...newTimestamps[index],
            timestamp_to: currentTimestamp,
            duration: currentTimestamp - newTimestamps[index].timestamp_from
        };

        if (index + 1 < newTimestamps.length) {
            newTimestamps[index + 1] = {
                ...newTimestamps[index + 1],
                timestamp_from: currentTimestamp
            };
        }

        return newTimestamps;
    });
  };

  const handleManualCache = async () => {
      if (isCacheLoaded) return;
      setIsCaching(true);
      try {
          const trans = await getAllTranslations();
          setAllTranslations(trans);
          setIsCacheLoaded(true);
      } catch (e) {
          console.error("Caching failed", e);
      } finally {
          setIsCaching(false);
      }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans">
      
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-500 rounded-lg flex items-center justify-center shadow-lg shadow-emerald-500/20">
                    <span className="text-xl font-bold text-white">Q</span>
                </div>
                <div>
                    <h1 className="text-lg font-bold text-white leading-tight">Quran Aligner</h1>
                    <p className="text-xs text-slate-400">Audio Sync & AI Tools</p>
                </div>
            </div>
            
            <div className="flex items-center gap-2">
                {/* Caching Button */}
                <button
                    onClick={handleManualCache}
                    disabled={isCaching || isCacheLoaded}
                    className={`flex items-center gap-2 px-4 py-2 text-sm rounded-lg border transition-colors ${
                        isCacheLoaded 
                        ? 'bg-emerald-900/30 text-emerald-400 border-emerald-900 cursor-default'
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                    }`}
                >
                    {isCaching ? (
                        <Loader2 size={16} className="animate-spin" />
                    ) : isCacheLoaded ? (
                        <Check size={16} />
                    ) : (
                        <Database size={16} />
                    )}
                    {isCaching ? 'Caching...' : isCacheLoaded ? 'Cached (Hazır)' : 'Caching'}
                </button>

                {/* Export Button */}
                <button 
                    onClick={() => setIsExportOpen(true)}
                    disabled={verses.length === 0}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm rounded-lg border border-slate-700 transition-colors"
                >
                    <FileText size={16} className="text-emerald-400" />
                    <span className="hidden sm:inline">Zaman Damgalarını Al</span>
                </button>
            </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        
        {loading ? (
           <div className="flex flex-col items-center justify-center h-64">
               <Loader2 className="animate-spin text-emerald-500 mb-4" size={40} />
               <p className="text-slate-400">Yükleniyor...</p>
           </div>
        ) : (
            <>
                <Selectors 
                    chapters={chapters}
                    reciters={reciters}
                    languages={languages}
                    availableTranslations={availableTranslations}
                    selectedChapter={selectedChapter}
                    selectedReciter={selectedReciter}
                    selectedLanguage={selectedLanguage}
                    selectedTranslation={selectedTranslation}
                    onSelectChapter={handleSelectChapter}
                    onSelectReciter={handleSelectReciter}
                    onSelectLanguage={handleSelectLanguage}
                    onSelectTranslation={handleSelectTranslation}
                />

                <VerseList 
                    key={`${selectedChapter?.id}-${selectedTranslation?.id}`}
                    verses={verses}
                    currentTimestamp={currentTimestamp}
                    timestamps={timestamps}
                    targetLanguage={selectedLanguage?.name || 'English'}
                    generatedTransliterations={generatedTransliterations}
                    setGeneratedTransliteration={handleSetGeneratedTransliteration}
                    onManualStamp={handleManualVerseStamp}
                />
            </>
        )}

      </main>

      <AudioPlayer 
        audioUrl={audioUrl}
        timestamps={timestamps}
        onTimeUpdate={setCurrentTimestamp}
        isPlaying={isPlaying}
        setIsPlaying={setIsPlaying}
      />

      <TimestampExport 
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        verses={verses}
        timestamps={timestamps}
        chapterName={selectedChapter?.name_simple || ''}
      />

    </div>
  );
}

export default App;