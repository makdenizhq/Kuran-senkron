import React from 'react';
import { X, Copy, Check } from 'lucide-react';
import { Verse, TimestampSegment } from '../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  verses: Verse[];
  timestamps: TimestampSegment[];
  chapterName: string;
}

const TimestampExport: React.FC<Props> = ({ isOpen, onClose, verses, timestamps, chapterName }) => {
  const [copied, setCopied] = React.useState(false);

  if (!isOpen) return null;

  // Generate the text report
  const generateReport = () => {
    if (timestamps.length === 0) return "Bu okuyucu için zaman damgası verisi bulunamadı.";

    let report = `ZAMAN DAMGASI RAPORU\nSure: ${chapterName}\n--------------------------\n`;
    
    // Sort timestamps by time
    const sortedTimestamps = [...timestamps].sort((a, b) => a.timestamp_from - b.timestamp_from);

    sortedTimestamps.forEach((ts) => {
        const verse = verses.find(v => v.verse_key === ts.verse_key);
        const arabicText = verse ? verse.text_uthmani : "Metin bulunamadı";
        const translationText = verse?.translations?.[0]?.text.replace(/<sup.*?<\/sup>/g, '') || "";
        const transliteration = verse?.transliteration_text || ""; // Standard
        
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
        if (transliteration) {
            report += `Okunuş: ${transliteration}\n`;
        }
        if (translationText) {
            report += `Meal: ${translationText}\n`;
        }
        report += `\n`;
    });

    return report;
  };

  const reportText = generateReport();

  const handleCopy = () => {
    navigator.clipboard.writeText(reportText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[60] p-4 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-3xl rounded-2xl shadow-2xl flex flex-col max-h-[85vh]">
        <div className="flex items-center justify-between p-4 border-b border-slate-800">
          <h2 className="text-lg font-semibold text-white">Zaman Damgası Çıktısı (Export)</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>
        
        <div className="p-4 flex-1 overflow-auto bg-slate-950/50">
          <pre className="text-xs sm:text-sm font-mono text-slate-300 whitespace-pre-wrap leading-relaxed">{reportText}</pre>
        </div>

        <div className="p-4 border-t border-slate-800 flex justify-end">
          <button 
            onClick={handleCopy}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors font-medium"
          >
            {copied ? <Check size={18} /> : <Copy size={18} />}
            {copied ? 'Kopyalandı' : 'Metni Kopyala'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TimestampExport;