import { GoogleGenAI, Type } from "@google/genai";

// API Anahtarını işlem ortamından alıyoruz veya kullanıcının sağladığı anahtarı kullanıyoruz
const apiKey = process.env.API_KEY || "AIzaSyBmNUMLsr2QqrOwMxjCKTkZx-SBMXBIQx0";

// Eğer key yoksa konsola uyarı basıyoruz (F12 Console sekmesinde görünür)
if (!apiKey) {
  console.error("KRİTİK HATA: Google Gemini API Key bulunamadı! Lütfen .env dosyasını veya environment variables ayarlarını kontrol edin.");
}

const ai = new GoogleGenAI({ apiKey: apiKey || 'DUMMY_KEY' });

export const generateTransliteration = async (arabicText: string, targetLanguage: string): Promise<string> => {
  // Key yoksa boşuna istek atıp hata vermesin, direkt uyarsın.
  if (!apiKey) {
    return "HATA: API Key Eksik.";
  }

  try {
    const prompt = `
      Act as an expert linguist and phonetician. 
      Your task is to transliterate the following Quranic Arabic text into the alphabet and phonetics of "${targetLanguage}".
      
      STRICT RULES:
      1. Use ONLY the letters and special characters found in the ${targetLanguage} alphabet.
      2. Do NOT use standard English/Latin transliteration (like 'sh', 'th', 'kh') unless those specific letter combinations exist and represent the same sound in ${targetLanguage}.
      3. Adapt the sounds to how a native speaker of ${targetLanguage} would write them to pronounce the Arabic correctly.
      
      EXAMPLES:
      - If Language is Turkish: Use 'ş' for 'sh', 'ç' for 'ch', 'c' for 'j', 'ı' for undotted i. (e.g., 'Bismillahirrahmanirrahim')
      - If Language is German: Use 'sch' for 'sh', 'j' for 'y', 'z' for 'ts'.
      - If Language is Indonesian: Use 'sy' for 'sh', 'j' for 'j', 'c' for 'ch'.
      
      Arabic Text to Transliterate: "${arabicText}"
      
      Return ONLY the transliterated string in ${targetLanguage}. No explanations.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        maxOutputTokens: 200,
        temperature: 0.1, // Very low temperature for strict adherence to rules
      }
    });

    return response.text?.trim() || "Transliteration unavailable.";
  } catch (error: any) {
    // Hatanın tüm detayını konsola yazdır
    console.error("Gemini API Hatası Detayı:", error);
    
    if (error.toString().includes("401")) return "HATA: API Key Geçersiz";
    if (error.toString().includes("429")) return "HATA: Çok Fazla İstek (Kota Doldu)";
    if (error.toString().includes("500")) return "HATA: Google Sunucu Hatası";
    
    return "AI Hatası (Konsolu Kontrol Edin)";
  }
};

export const batchAnalyzeTimestamps = async (audioDuration: number, verseCount: number): Promise<string> => {
    // This is a simulation since we cannot easily upload audio bytes in this web-only environment without backend.
    return "";
};