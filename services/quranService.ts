import { Chapter, Reciter, Language, Verse, AudioResponse, TimestampSegment, TranslationResource } from '../types';

const BASE_URL = 'https://api.quran.com/api/v4';

export const getChapters = async (): Promise<Chapter[]> => {
  const response = await fetch(`${BASE_URL}/chapters?language=en`);
  const data = await response.json();
  return data.chapters;
};

export const getReciters = async (): Promise<Reciter[]> => {
  const response = await fetch(`${BASE_URL}/resources/recitations?language=en`);
  const data = await response.json();
  
  // Return ALL reciters. 
  // Prioritize translated_name.name for readable English names.
  return data.recitations
    .map((r: any) => ({
      id: r.id,
      name: r.translated_name?.name || r.reciter_name || r.name || "Unknown Reciter",
      style: r.style
    }))
    .sort((a: Reciter, b: Reciter) => a.name.localeCompare(b.name));
};

export const getLanguages = async (): Promise<Language[]> => {
  const response = await fetch(`${BASE_URL}/resources/languages`);
  const data = await response.json();
  // Filter for languages that have at least one translation
  return data.languages
    .filter((l: any) => l.translations_count > 0)
    .sort((a: any, b: any) => a.name.localeCompare(b.name));
};

// NEW: Fetch ALL translations with iso_code
export const getAllTranslations = async (): Promise<TranslationResource[]> => {
    try {
        const response = await fetch(`${BASE_URL}/resources/translations`);
        const data = await response.json();
        
        return data.translations
            .map((t: any) => ({
                id: t.id,
                name: t.name,
                author_name: t.author_name,
                slug: t.slug,
                language_name: t.language_name,
                iso_code: t.iso_code
            }))
            .sort((a: any, b: any) => a.name.localeCompare(b.name));
    } catch (e) {
        console.error("Error fetching translations:", e);
        return [];
    }
};

// Fetch specific translation authors/resources for a given language
export const getAvailableTranslations = async (languageIso: string): Promise<TranslationResource[]> => {
    try {
        const all = await getAllTranslations();
        return all.filter(t => t.iso_code === languageIso);
    } catch (e) {
        console.error("Error fetching translations:", e);
        return [];
    }
};

export const getVerses = async (chapterId: number, translationId: number): Promise<Verse[]> => {
  const transliterationId = 57; // Standard English Transliteration
  
  // Fetch data
  const response = await fetch(`${BASE_URL}/verses/by_chapter/${chapterId}?words=false&translations=${translationId},${transliterationId}&fields=text_uthmani&per_page=286&_t=${Date.now()}`); 
  const data = await response.json();
  
  return data.verses.map((v: any) => {
    // Robustly find the translation text
    let translationText = "";
    
    // Try to find by specific resource ID
    const specificTrans = v.translations?.find((t: any) => t.resource_id === translationId);
    
    if (specificTrans) {
        translationText = specificTrans.text;
    } else if (v.translations && v.translations.length > 0) {
        // Fallback
        const fallback = v.translations.find((t: any) => t.resource_id !== transliterationId);
        translationText = fallback ? fallback.text : "";
    }

    const transliterationObj = v.translations?.find((t: any) => t.resource_id === transliterationId);

    return {
        id: v.id,
        verse_key: v.verse_key,
        text_uthmani: v.text_uthmani,
        translations: [{ resource_id: translationId, text: translationText }], 
        transliteration_text: transliterationObj?.text.replace(/<[^>]*>?/gm, '') || "" 
    };
  });
};

export const getAudioAndTimestamps = async (reciterId: number, chapterId: number): Promise<AudioResponse> => {
  try {
    const response = await fetch(`${BASE_URL}/chapter_recitations/${reciterId}/${chapterId}`);
    const data = await response.json();
    
    // Check if audio file exists
    if (!data.audio_file) {
        throw new Error("Audio file not found");
    }

    const audioFile = data.audio_file;
    let timestamps: TimestampSegment[] = [];

    // 1. Check explicit timings
    if (audioFile.verse_timings && audioFile.verse_timings.length > 0) {
        timestamps = audioFile.verse_timings; 
    } else {
        // 2. Fallback: Reconstruct from verse audio details
        try {
            const verseResponse = await fetch(`${BASE_URL}/verses/by_chapter/${chapterId}?audio=${reciterId}&per_page=286&fields=verse_key`);
            const verseData = await verseResponse.json();
            
            if (verseData.verses) {
                let currentTimeMs = 0;
                timestamps = verseData.verses.map((v: any) => {
                    let durationMs = 0;
                    if (v.audio && v.audio.duration) {
                        durationMs = v.audio.duration * 1000;
                    }
                    
                    const segment: TimestampSegment = {
                        verse_key: v.verse_key,
                        timestamp_from: currentTimeMs,
                        timestamp_to: currentTimeMs + durationMs,
                        duration: durationMs
                    };
                    currentTimeMs += durationMs;
                    return segment;
                });
            }
        } catch (innerError) {
            console.warn("Failed to reconstruct timestamps:", innerError);
        }
    }

    return {
      audio_url: audioFile.audio_url,
      timestamps: timestamps
    };
  } catch (error) {
    console.error("Error fetching audio:", error);
    return { audio_url: "", timestamps: [] };
  }
};