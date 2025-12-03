import React, { useEffect, useState } from 'react';
import { X, Copy, Check, Save, Plus } from 'lucide-react';
import { Verse, TimestampSegment } from '../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  verses: Verse[];
  timestamps: TimestampSegment[];
  chapterName: string;
  generatedTransliterations: Record<string, string>;
  onApplyChanges: (data: { verse_key: string, timestamp_from: number, timestamp_to: number, translation: string, transliteration: string, arabicText: string }[]) => void;
}

const TimestampExport: React.FC<Props> = ({ isOpen, onClose, verses, timestamps, chapterName, generatedTransliterations, onApplyChanges }) => {
  const [copied, setCopied] = useState(false);
  const [editableText, setEditableText] = useState('');

  // Generate the text report when modal opens or data changes
  useEffect(() => {
    if (!isOpen) return;

    const generateReport = () => {
        if (timestamps.length === 0) return "Bu okuyucu için zaman damgası verisi bulunamadı.";
    
        let report = `ZAMAN DAMGASI RAPORU\nSure: ${chapterName}\n--------------------------\n`;
        
        // Sort timestamps by time
        const sortedTimestamps = [...timestamps].sort((a, b) => a.timestamp_from - b.timestamp_from);
    
        sortedTimestamps.forEach((ts) => {
            const verse = verses.find(v => v.verse_key === ts.verse_key);
            const arabicText = verse ? verse.text_uthmani : "Metin bulunamadı";
            const translationText = verse?.translations?.[0]?.text.replace(/<sup.*?<\/sup>/g, '') || "";
            
            // Prioritize generated/edited transliteration, fall back to API
            const transliteration = generatedTransliterations[ts.verse_key] || verse?.transliteration_text || ""; 
            
            // Format mm:ss.ms
            const formatTime = (ms: number) => {
                const totalSeconds = Math.floor(ms / 1000);
                const mins = Math.floor(totalSeconds / 60);
                const secs = totalSeconds % 60;
                const millis = Math.floor(ms % 1000);
                return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${millis.toString().padStart(3, '0')}`;
            };
    
            report += `[${formatTime(ts.timestamp_from)} -> ${formatTime(ts.timestamp_to)}] ${ts.verse_key}\n`;
            report += `Arapça: ${arabicText}\n`;
            report += `Okunuş: ${transliteration}\n`;
            report += `Meal: ${translationText}\n`;
            report += `\n`;
        });
    
        return report;
      };

      setEditableText(generateReport());
  }, [isOpen, verses, timestamps, chapterName, generatedTransliterations]);

  const handleCopy = () => {
    navigator.clipboard.writeText(editableText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleAddIstiakha = () => {
      const template = `[00:00.000 -> 00:00.000] 0:0\nArapça: أَعُوذُ بِاللَّهِ مِنَ الشَّيْطَانِ الرَّجِيمِ\nOkunuş: Euzübillahimineşşeytanirracim\nMeal: Kovulmuş şeytandan Allah'a sığınırım\n\n`;
      // Find where the actual content starts (skip header)
      const headerEndIndex = editableText.indexOf('--------------------------\n');
      if (headerEndIndex !== -1) {
          const prefix = editableText.substring(0, headerEndIndex + 27);
          const suffix = editableText.substring(headerEndIndex + 27);
          setEditableText(prefix + template + suffix);
      } else {
          setEditableText(template + editableText);
      }
  };

  const handleAddBasmalah = () => {
      const template = `[00:00.000 -> 00:00.000] 0:1\nArapça: بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ\nOkunuş: Bismillâhirrahmânirrahîm\nMeal: Rahman ve Rahim olan Allah'ın adıyla\n\n`;
      const headerEndIndex = editableText.indexOf('--------------------------\n');
      if (headerEndIndex !== -1) {
          const prefix = editableText.substring(0, headerEndIndex + 27);
          const suffix = editableText.substring(headerEndIndex + 27);
          setEditableText(prefix + template + suffix);
      } else {
          setEditableText(template + editableText);
      }
  };

  const handleSaveAndApply = () => {
      // Parsing Logic
      const lines = editableText.split('\n');
      const parsedUpdates: any[] = [];
      
      let currentItem: any = null;

      // Regex to find timestamp header: [00:00.000 -> 00:05.000] 1:1
      const headerRegex = /^\[(\d{2}):(\d{2})\.(\d{3})\s->\s(\d{2}):(\d{2})\.(\d{3})\]\s(.*)/;

      lines.forEach(line => {
          const headerMatch = line.match(headerRegex);
          if (headerMatch) {
              // Save previous item if exists
              if (currentItem) parsedUpdates.push(currentItem);

              // Start new item
              const fromMs = (parseInt(headerMatch[1]) * 60 + parseInt(headerMatch[2])) * 1000 + parseInt(headerMatch[3]);
              const toMs = (parseInt(headerMatch[4]) * 60 + parseInt(headerMatch[5])) * 1000 + parseInt(headerMatch[6]);
              
              currentItem = {
                  verse_key: headerMatch[7].trim(),
                  timestamp_from: fromMs,
                  timestamp_to: toMs,
                  translation: '',
                  transliteration: '',
                  arabicText: ''
              };
          } else if (currentItem) {
              if (line.startsWith('Okunuş: ')) {
                  currentItem.transliteration = line.replace('Okunuş: ', '').trim();
              } else if (line.startsWith('Meal: ')) {
                  currentItem.translation = line.replace('Meal: ', '').trim();
              } else if (line.startsWith('Arapça: ')) {
                  currentItem.arabicText = line.replace('Arapça: ', '').trim();
              }
          }
      });
      // Push last item
      if (currentItem) parsedUpdates.push(currentItem);

      if (parsedUpdates.length > 0) {
          onApplyChanges(parsedUpdates);
          alert("Değişiklikler (Euzü/Besmele ve diğerleri) başarıyla kaydedildi ve listeye eklendi!");
          onClose();
      } else {
          alert("Ayrıştırma hatası: Format bozulmuş olabilir.");
      }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[60] p-4 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-3xl rounded-2xl shadow-2xl flex flex-col h-[85vh]">
        <div className="flex items-center justify-between p-4 border-b border-slate-800">
          <h2 className="text-lg font-semibold text-white">Zaman Damgası ve Metin Editörü</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>
        
        <div className="p-4 flex-1 flex flex-col bg-slate-950/50">
            <div className="flex gap-2 mb-2">
                 <button onClick={handleAddIstiakha} className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-xs text-emerald-400 rounded border border-slate-700 flex items-center gap-1">
                    <Plus size={12}/> Euzü Ekle
                 </button>
                 <button onClick={handleAddBasmalah} className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-xs text-emerald-400 rounded border border-slate-700 flex items-center gap-1">
                    <Plus size={12}/> Besmele Ekle
                 </button>
                 <span className="text-xs text-slate-500 flex items-center ml-auto">Manuel eklemeler 0:0 anahtarı ile başa eklenir.</span>
            </div>
            <textarea 
                value={editableText}
                onChange={(e) => setEditableText(e.target.value)}
                className="w-full h-full bg-slate-900 text-slate-300 font-mono text-xs sm:text-sm p-4 rounded-lg border border-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none resize-none leading-relaxed"
                spellCheck={false}
            />
        </div>

        <div className="p-4 border-t border-slate-800 flex justify-between items-center bg-slate-900 rounded-b-2xl">
          <button 
            onClick={handleCopy}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors text-sm"
          >
            {copied ? <Check size={16} /> : <Copy size={16} />}
            {copied ? 'Kopyalandı' : 'Panoya Kopyala'}
          </button>

          <button 
            onClick={handleSaveAndApply}
            className="flex items-center gap-2 px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-all font-bold shadow-lg shadow-emerald-900/40"
          >
            <Save size={18} />
            Değişiklikleri Kaydet ve Uygula
          </button>
        </div>
      </div>
    </div>
  );
};

export default TimestampExport;