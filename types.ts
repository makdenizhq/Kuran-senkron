export interface Chapter {
  id: number;
  revelation_place: string;
  revelation_order: number;
  bismillah_pre: boolean;
  name_simple: string;
  name_complex: string;
  name_arabic: string;
  verses_count: number;
  translated_name: {
    language_name: string;
    name: string;
  };
}

export interface Reciter {
  id: number;
  name: string;
  style?: string;
  recitation_style?: string;
}

export interface Verse {
  id: number;
  verse_key: string;
  text_uthmani: string; // Arabic
  translations?: {
    resource_id: number;
    text: string;
  }[];
  transliteration_text?: string; // Standard API transliteration
  transliteration?: string; // AI generated
}

export interface AudioResponse {
  audio_url: string;
  timestamps: TimestampSegment[]; // Converted from API response
}

export interface TimestampSegment {
  verse_key: string;
  timestamp_from: number; // ms
  timestamp_to: number; // ms
  duration: number; // ms
  segments?: [number, number, number][]; // specific word segments if available
}

export interface Language {
  id: number;
  name: string;
  iso_code: string;
  direction: string;
}

export interface TranslationResource {
  id: number;
  name: string;
  author_name: string;
  slug: string;
  language_name: string;
  iso_code: string;
}

export interface AppState {
  chapters: Chapter[];
  reciters: Reciter[];
  languages: Language[];
  selectedChapter: Chapter | null;
  selectedReciter: Reciter | null;
  selectedLanguage: Language | null;
  verses: Verse[];
  audioUrl: string | null;
  timestamps: TimestampSegment[];
  currentTimestamp: number;
  isLoading: boolean;
  isAudioLoading: boolean;
  error: string | null;
  isPlaying: boolean;
  generatedTransliterations: Record<string, string>; // verse_key -> text
}