import React, { useState, useEffect } from 'react';
import { 
  getChapters, getReciters, getLanguages, getVerses, getAudioAndTimestamps, getAllTranslations
} from './services/quranService';
import { Chapter, Reciter, Language, Verse, TimestampSegment, TranslationResource, DataSource } from './types';
import Selectors from './components/Selectors';
import VerseList from './components/VerseList';
import AudioPlayer from './components/AudioPlayer';
import TimestampExport from './components/TimestampExport';
import VideoGenerator from './components/VideoGenerator';
import { FileText, Loader2, Database, Check, Download, Video } from 'lucide-react';

// EXTENSIVE Default Translation IDs to use when Cache is not loaded
// Sourced from common Quran.com resource IDs
const DEFAULT_TRANSLATION_IDS: Record<string, number> = {
  default: 131, // English Saheeh
  en: 131,  // English
  tr: 77,   // Turkish (Diyanet)
  fr: 31,   // French
  de: 27,   // German
  es: 83,   // Spanish
  ru: 78,   // Russian
  ur: 54,   // Urdu
  id: 33,   // Indonesian
  bs: 26,   // Bosnian
  az: 76,   // Azerbaijani
  it: 32,   // Italian
  nl: 35,   // Dutch
  fa: 233,  // Persian
  zh: 56,   // Chinese (Simplified)
  ja: 218,  // Japanese
  ko: 212,  // Korean
  ms: 34,   // Malay
  sq: 88,   // Albanian
  bn: 161,  // Bengali
  th: 206,  // Thai
  vi: 219,  // Vietnamese
  so: 216,  // Somali
  ha: 215,  // Hausa
  sw: 162,  // Swahili
  uz: 55,   // Uzbek
  tt: 147,  // Tatar
  tg: 214,  // Tajik
  ml: 156,  // Malayalam
  ta: 217,  // Tamil
  hi: 153,  // Hindi
  pt: 151,  // Portuguese
  sv: 173,  // Swedish
  no: 174,  // Norwegian
  bg: 157,  // Bulgarian
  cs: 168,  // Czech
  pl: 172,  // Polish
  ro: 158,  // Romanian
  ku: 164,  // Kurdish
  ug: 225,  // Uyghur
  am: 170,  // Amharic
  yo: 175,  // Yoruba
  or: 236,  // Oromo
  kk: 149,  // Kazakh
  dv: 169,  // Divehi
  he: 237,  // Hebrew
};

function App() {
  const [loading, setLoading] = useState(true);
  // Forced to quran_com to prevent errors from the secondary source
  const [dataSource] = useState<DataSource>('quran_com');
  
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
  const [isVideoOpen, setIsVideoOpen] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  
  const [generatedTransliterations, setGeneratedTransliterations] = useState<Record<string, string>>({});

  // Initial Load (Fast: Only Chapters, Languages) - Reciters depend on Source
  useEffect(() => {
    const initData = async () => {
      try {
        const [ch, lang] = await Promise.all([
          getChapters(),
          getLanguages()
        ]);
        setChapters(ch);
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
      } catch (e) {
        console.error("Initialization failed", e);
      } finally {
        setLoading(false);
      }
    };
    initData();
  }, []);

  // Fetch Reciters when Source changes
  useEffect(() => {
    const fetchReciters = async () => {
        setLoading(true);
        try {
            const rec = await getReciters(dataSource);
            setReciters(rec);
            
            // Set default reciter based on source
            if (rec.length > 0) {
                // Try to keep selection if possible, otherwise reset
                // Default to Mishary if available, else first one
                const mishary = rec.find(r => r.name.toLowerCase().includes('mishary') || r.name.toLowerCase().includes('afasy'));
                setSelectedReciter(mishary || rec[0]);
            } else {
                setSelectedReciter(null);
            }
        } catch (e) {
            console.error("Reciters fetch failed", e);
        } finally {
            setLoading(false);
        }
    };
    fetchReciters();
  }, [dataSource]);

  // Filter Translations when Language OR Cache changes
  useEffect(() => {
    if (!selectedLanguage) return;

    if (allTranslations.length === 0) {
        // Cache NOT loaded: Use fallback default ID so verses can still load
        setAvailableTranslations([]);
        
        const iso = selectedLanguage.iso_code;
        const defaultId = DEFAULT_TRANSLATION_IDS[iso] || DEFAULT_TRANSLATION_IDS['default'];
        
        setSelectedTranslation({
            id: defaultId,
            name: `Standard ${selectedLanguage.name} Translation`,
            author_name: "Default",
            slug: "default",
            language_name: selectedLanguage.name
        });
        return;
    }
    
    // Cache LOADED: Filter client-side based on Language Name matching (Case insensitive)
    const filtered = allTranslations.filter(t => t.language_name.toLowerCase() === selectedLanguage.name.toLowerCase());
    setAvailableTranslations(filtered);
    
    // Pick default translation from the filtered list
    if (filtered.length > 0) {
        let def = filtered[0];
        // Prefer known IDs if present in the list
        const prefId = DEFAULT_TRANSLATION_IDS[selectedLanguage.iso_code];
        if (prefId) {
             const found = filtered.find(t => t.id === prefId);
             if (found) def = found;
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
        setAudioUrl(null); // Reset player
        const result = await getAudioAndTimestamps(dataSource, selectedReciter, selectedChapter.id);
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
  }, [selectedReciter, selectedChapter, dataSource]); 

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

  const handleDownloadAudio = async () => {
    if (!audioUrl) return;
    setIsDownloading(true);
    try {
        // Attempt to fetch blob first to allow clean download
        const response = await fetch(audioUrl);
        if (!response.ok) throw new Error("Network response was not ok");
        
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        
        // Filename: Reciter Name - SurahName.mp3
        const reciterName = selectedReciter?.name.replace(/[^a-zA-Z0-9]/g, '_') || 'Reciter';
        const surahName = selectedChapter?.name_simple.replace(/[^a-zA-Z0-9]/g, '_') || 'Surah';
        a.download = `${reciterName}-${surahName}.mp3`;
        
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
    } catch (error) {
        console.warn("Direct download failed (likely CORS), trying fallback:", error);
        // Fallback: Open audio in new tab so user can save manually
        window.open(audioUrl, '_blank');
    } finally {
        setIsDownloading(false);
    }
  };

  const openVideoStudio = () => {
      setIsPlaying(false); // Pause main player
      setIsVideoOpen(true);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans">
      
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 py-4 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-500 rounded-lg flex items-center justify-center shadow-lg shadow-emerald-500/20">
                    <span className="text-xl font-bold text-white">Q</span>
                </div>
                <div>
                    <h1 className="text-lg font-bold text-white leading-tight">Quran Aligner</h1>
                    <p className="text-xs text-slate-400">Audio Sync & AI Tools</p>
                </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 justify-center">
                {/* Caching Button */}
                <button
                    onClick={handleManualCache}
                    disabled={isCaching || isCacheLoaded}
                    className={`flex items-center gap-2 px-3 py-2 text-xs rounded-lg border transition-colors ${
                        isCacheLoaded 
                        ? 'bg-emerald-900/30 text-emerald-400 border-emerald-900 cursor-default'
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                    }`}
                >
                    {isCaching ? (
                        <Loader2 size={14} className="animate-spin" />
                    ) : isCacheLoaded ? (
                        <Check size={14} />
                    ) : (
                        <Database size={14} />
                    )}
                    {isCaching ? 'Caching...' : isCacheLoaded ? 'Cached' : 'Cache DB'}
                </button>

                {/* Download Button */}
                <button 
                    onClick={handleDownloadAudio}
                    disabled={!audioUrl || isDownloading}
                    className="flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed text-xs rounded-lg border border-slate-700 transition-colors"
                >
                    {isDownloading ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} className="text-sky-400" />}
                    <span className="hidden sm:inline">MP3 İndir</span>
                </button>

                {/* Export Button */}
                <button 
                    onClick={() => setIsExportOpen(true)}
                    disabled={verses.length === 0}
                    className="flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed text-xs rounded-lg border border-slate-700 transition-colors"
                >
                    <FileText size={14} className="text-emerald-400" />
                    <span className="hidden sm:inline">Zaman Damgalarını Al</span>
                </button>

                 {/* Video Studio Button */}
                 <button 
                    onClick={openVideoStudio}
                    disabled={verses.length === 0}
                    className="flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed text-xs rounded-lg border border-slate-700 transition-colors"
                >
                    <Video size={14} className="text-purple-400" />
                    <span className="hidden sm:inline">Video Stüdyosu</span>
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
                    isCacheLoaded={isCacheLoaded}
                    dataSource={dataSource}
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

      {/* Main Audio Player (Hidden when Video Studio is open) */}
      {!isVideoOpen && (
        <AudioPlayer 
            audioUrl={audioUrl}
            timestamps={timestamps}
            onTimeUpdate={setCurrentTimestamp}
            isPlaying={isPlaying}
            setIsPlaying={setIsPlaying}
        />
      )}

      <TimestampExport 
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        verses={verses}
        timestamps={timestamps}
        chapterName={selectedChapter?.name_simple || ''}
      />

      <VideoGenerator 
        isOpen={isVideoOpen}
        onClose={() => setIsVideoOpen(false)}
        verses={verses}
        timestamps={timestamps}
        audioUrl={audioUrl}
        reciterName={selectedReciter?.name || 'Reciter'}
        chapterName={selectedChapter?.name_simple || 'Surah'}
        generatedTransliterations={generatedTransliterations}
        targetLanguage={selectedLanguage?.name || 'English'}
      />

    </div>
  );
}

export default App;