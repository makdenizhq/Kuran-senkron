import { Chapter, Reciter, Language, Verse, AudioResponse, TimestampSegment, TranslationResource, DataSource } from '../types';

const BASE_URL = 'https://api.quran.com/api/v4';

// Helper to convert names to QuranCentral slugs
const slugifyName = (name: string): string => {
    let slug = name.toLowerCase();
    
    // Remove content in parentheses (styles like Murattal)
    slug = slug.replace(/\(.*\)/g, '').trim();

    // Specific mappings for common mismatched names on QuranCentral
    if (slug.includes('mishary') || slug.includes('mishari') || slug.includes('afasy')) return 'mishary-rashid-alafasy';
    if (slug.includes('husary')) return 'mahmoud-khalil-al-husary';
    if (slug.includes('minshawi')) return 'mohamed-siddiq-al-minshawi';
    if (slug.includes('sudais')) return 'abdul-rahman-al-sudais';
    if (slug.includes('shuraim')) return 'saud-al-shuraim';
    if (slug.includes('ghamdi')) return 'saad-al-ghamdi';
    if (slug.includes('basit')) return 'abdul-basit-abdul-samad';
    if (slug.includes('ajmi')) return 'ahmed-al-ajmi';
    if (slug.includes('juhany')) return 'abdullah-awad-al-juhany';
    if (slug.includes('maher')) return 'maher-al-mueaqly';
    if (slug.includes('shatri')) return 'abu-bakr-al-shatri';
    if (slug.includes('rifai')) return 'hani-ar-rifai';
    if (slug.includes('tablawi')) return 'mohamed-al-tablawi';
    if (slug.includes('dosari')) return 'yasser-al-dosari';
    if (slug.includes('abkar')) return 'idrees-abkar';
    if (slug.includes('jaber')) return 'ali-jaber';
    
    // General cleanup
    slug = slug.replace(/['`’]/g, ''); // Remove apostrophes
    slug = slug.replace(/\s+/g, '-'); // Spaces to dashes
    slug = slug.replace(/[^a-z0-9-]/g, ''); // Remove other special chars
    
    return slug;
}

export const getChapters = async (): Promise<Chapter[]> => {
  const response = await fetch(`${BASE_URL}/chapters?language=en`);
  const data = await response.json();
  return data.chapters;
};

export const getReciters = async (source: DataSource): Promise<Reciter[]> => {
  // Always fetch ALL reciters from Quran.com API to get the comprehensive list
  const response = await fetch(`${BASE_URL}/resources/recitations?language=en`);
  const data = await response.json();
  
  return data.recitations
    .map((r: any) => {
        const displayName = r.translated_name?.name || r.reciter_name || r.name || "Unknown Reciter";
        return {
            id: r.id,
            name: displayName,
            style: r.style,
            // Dynamically generate slug for QuranCentral usage
            slug: slugifyName(displayName)
        };
    })
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

// NEW: Fetch ALL translations without relying on iso_code
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
                language_name: t.language_name
            }))
            .sort((a: any, b: any) => a.name.localeCompare(b.name));
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

export const getAudioAndTimestamps = async (source: DataSource, reciter: Reciter, chapterId: number): Promise<AudioResponse> => {
  try {
    // === SOURCE 2: QURAN CENTRAL ===
    if (source === 'quran_central') {
        const slug = reciter.slug || slugifyName(reciter.name);
        
        // Pad chapter ID (e.g. 1 -> 001)
        const paddedId = chapterId.toString().padStart(3, '0');
        
        // Construct URL
        const audioUrl = `https://download.qurancentral.com/${slug}/${paddedId}.mp3`;
        
        // Quran Central provides NO timestamps. Return empty array to force manual sync.
        return {
            audio_url: audioUrl,
            timestamps: []
        };
    }

    // === SOURCE 1: QURAN.COM ===
    const response = await fetch(`${BASE_URL}/chapter_recitations/${reciter.id}/${chapterId}`);
    const data = await response.json();
    
    if (!data.audio_file) {
        throw new Error("Audio file not found from API");
    }

    const audioFile = data.audio_file;
    let timestamps: TimestampSegment[] = [];

    // 1. Check explicit timings
    if (audioFile.verse_timings && audioFile.verse_timings.length > 0) {
        timestamps = audioFile.verse_timings; 
    } else {
        // 2. Fallback: Reconstruct from verse audio details
        try {
            const verseResponse = await fetch(`${BASE_URL}/verses/by_chapter/${chapterId}?audio=${reciter.id}&per_page=286&fields=verse_key`);
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