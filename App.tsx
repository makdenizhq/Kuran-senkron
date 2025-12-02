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
import { FileText, Loader2, Database, Check, Download, Video, Upload, Music } from 'lucide-react';

// EXTENSIVE Default Translation IDs to use when Cache is not loaded
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
  
  // Audio State
  const [apiAudioUrl, setApiAudioUrl] = useState<string | null>(null);
  const [localAudioUrl, setLocalAudioUrl] = useState<string | null>(null);
  const [timestamps, setTimestamps] = useState<TimestampSegment[]>([]);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTimestamp, setCurrentTimestamp] = useState(0);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isVideoOpen, setIsVideoOpen] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  
  const [generatedTransliterations, setGeneratedTransliterations] = useState<Record<string, string>>({});

  // Use local audio if available, otherwise API audio
  const activeAudioUrl = localAudioUrl || apiAudioUrl;

  // Initial Load
  useEffect(() => {
    const initData = async () => {
      try {
        const [ch, lang] = await Promise.all([
          getChapters(),
          getLanguages()
        ]);
        setChapters(ch);
        setLanguages(lang);
        
        if (ch.length > 0) setSelectedChapter(ch[0]); 
        
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

  // Fetch Reciters
  useEffect(() => {
    const fetchReciters = async () => {
        setLoading(true);
        try {
            const rec = await getReciters(dataSource);
            setReciters(rec);
            if (rec.length > 0) {
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

  // Filter Translations
  useEffect(() => {
    if (!selectedLanguage) return;

    if (allTranslations.length === 0) {
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
    
    const filtered = allTranslations.filter(t => t.language_name.toLowerCase() === selectedLanguage.name.toLowerCase());
    setAvailableTranslations(filtered);
    
    if (filtered.length > 0) {
        let def = filtered[0];
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

  // Fetch Verses
  useEffect(() => {
    if (!selectedChapter || !selectedTranslation) {
        setVerses([]);
        return;
    }

    const fetchContent = async () => {
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

  // Fetch API Audio
  useEffect(() => {
    if (!selectedReciter || !selectedChapter) return;
    
    // If user uploaded local audio, don't fetch API audio
    if (localAudioUrl) return;

    const fetchAudio = async () => {
      try {
        setApiAudioUrl(null);
        const result = await getAudioAndTimestamps(dataSource, selectedReciter, selectedChapter.id);
        setApiAudioUrl(result.audio_url);
        
        if (result.timestamps && result.timestamps.length > 0 && result.timestamps.some(t => t.duration > 0)) {
            setTimestamps(result.timestamps);
        } else {
            setTimestamps([]);
        }
      } catch (e) {
        console.error("Failed to fetch audio", e);
        setApiAudioUrl(null);
        setTimestamps([]);
      }
    };
    fetchAudio();
  }, [selectedReciter, selectedChapter, dataSource, localAudioUrl]); 

  // Init Timestamps array if empty
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

  const handleLocalAudioUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
        const file = e.target.files[0];
        const url = URL.createObjectURL(file);
        setLocalAudioUrl(url);
        setIsPlaying(false);
        // Reset timestamps for fresh start with new audio
        setTimestamps(verses.map(v => ({
            verse_key: v.verse_key,
            timestamp_from: 0,
            timestamp_to: 0,
            duration: 0
        })));
        alert("Ses dosyası başarıyla yüklendi! Şimdi manuel senkronizasyon yapabilirsiniz.");
    }
  };

  const clearLocalAudio = () => {
      if (localAudioUrl) URL.revokeObjectURL(localAudioUrl);
      setLocalAudioUrl(null);
      // Trigger API fetch again via useEffect
  };

  const handleDownloadAudio = async () => {
    if (!activeAudioUrl) return;
    setIsDownloading(true);
    try {
        const response = await fetch(activeAudioUrl);
        if (!response.ok) throw new Error("Network response was not ok");
        
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        
        const reciterName = selectedReciter?.name.replace(/[^a-zA-Z0-9]/g, '_') || 'Reciter';
        const surahName = selectedChapter?.name_simple.replace(/[^a-zA-Z0-9]/g, '_') || 'Surah';
        a.download = `${reciterName}-${surahName}.mp3`;
        
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
    } catch (error) {
        console.warn("Direct download failed, trying fallback:", error);
        window.open(activeAudioUrl, '_blank');
    } finally {
        setIsDownloading(false);
    }
  };

  const openVideoStudio = () => {
      setIsPlaying(false);
      setIsVideoOpen(true);
  };

  const handleSelectChapter = (id: number) => {
    const chapter = chapters.find(c => c.id === id);
    if (chapter) setSelectedChapter(chapter);
  };

  const handleSelectReciter = (id: number) => {
    const reciter = reciters.find(r => r.id === id);
    if (reciter) setSelectedReciter(reciter);
  };

  const handleSelectLanguage = (code: string) => {
    const language = languages.find(l => l.iso_code === code);
    if (language) setSelectedLanguage(language);
  };

  const handleSelectTranslation = (id: number) => {
    const translation = availableTranslations.find(t => t.id === id);
    if (translation) setSelectedTranslation(translation);
  };

  const handleSetGeneratedTransliteration = (key: string, text: string) => {
    setGeneratedTransliterations(prev => ({
      ...prev,
      [key]: text
    }));
  };

  const handleUpdateFromReport = (updatedData: { verse_key: string, timestamp_from: number, timestamp_to: number, translation: string, transliteration: string }[]) => {
      // 1. Update Timestamps
      setTimestamps(prev => {
          const newTimestamps = [...prev];
          updatedData.forEach(item => {
              const idx = newTimestamps.findIndex(ts => ts.verse_key === item.verse_key);
              if (idx !== -1) {
                  newTimestamps[idx] = {
                      ...newTimestamps[idx],
                      timestamp_from: item.timestamp_from,
                      timestamp_to: item.timestamp_to,
                      duration: item.timestamp_to - item.timestamp_from
                  };
              }
          });
          return newTimestamps;
      });

      // 2. Update Verses (Translation Text)
      setVerses(prev => {
          const newVerses = prev.map(v => {
              const updateItem = updatedData.find(u => u.verse_key === v.verse_key);
              if (updateItem) {
                  // Create a deep copy of translations array to update the text
                  const newTranslations = v.translations ? [...v.translations] : [];
                  if (newTranslations.length > 0) {
                      newTranslations[0] = { ...newTranslations[0], text: updateItem.translation };
                  }
                  return { ...v, translations: newTranslations };
              }
              return v;
          });
          return newVerses;
      });

      // 3. Update Transliterations
      setGeneratedTransliterations(prev => {
          const newMap = { ...prev };
          updatedData.forEach(item => {
              if (item.transliteration) {
                  newMap[item.verse_key] = item.transliteration;
              }
          });
          return newMap;
      });
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
                 {/* Upload Local Audio Button */}
                 <div className="relative group">
                    <button className="flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-xs rounded-lg border border-slate-700 transition-colors">
                        <Upload size={14} className="text-orange-400" />
                        <span className="hidden sm:inline">{localAudioUrl ? 'Ses Dosyasını Kaldır' : 'Ses Dosyası Yükle'}</span>
                    </button>
                    {localAudioUrl ? (
                         <div onClick={clearLocalAudio} className="absolute inset-0 cursor-pointer" />
                    ) : (
                        <input 
                            type="file" 
                            accept="audio/*" 
                            onChange={handleLocalAudioUpload}
                            className="absolute inset-0 opacity-0 cursor-pointer"
                        />
                    )}
                 </div>

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
                    {isCaching ? <Loader2 size={14} className="animate-spin" /> : <Database size={14} />}
                    {isCaching ? 'Caching...' : isCacheLoaded ? 'Cached' : 'Cache DB'}
                </button>

                {/* Download Button */}
                <button 
                    onClick={handleDownloadAudio}
                    disabled={!activeAudioUrl || isDownloading}
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
                
                {localAudioUrl && (
                     <div className="mb-4 p-3 bg-blue-900/20 border border-blue-800 rounded-lg flex items-center gap-2 text-blue-200 text-sm">
                         <Music size={16} />
                         <span>Yerel ses dosyası aktif. Zaman damgalarını manuel ayarlayın.</span>
                     </div>
                )}

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

      {!isVideoOpen && (
        <AudioPlayer 
            audioUrl={activeAudioUrl}
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
        generatedTransliterations={generatedTransliterations}
        onApplyChanges={handleUpdateFromReport}
      />

      <VideoGenerator 
        isOpen={isVideoOpen}
        onClose={() => setIsVideoOpen(false)}
        verses={verses}
        timestamps={timestamps}
        audioUrl={activeAudioUrl}
        reciterName={localAudioUrl ? 'Yerel Ses Dosyası' : (selectedReciter?.name || 'Reciter')}
        chapterName={selectedChapter?.name_simple || 'Surah'}
        generatedTransliterations={generatedTransliterations}
        targetLanguage={selectedLanguage?.name || 'English'}
      />

    </div>
  );
}

export default App;