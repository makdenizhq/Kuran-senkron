import React, { useState } from 'react';
import { X, Check, UploadCloud, AlertTriangle } from 'lucide-react';
import { Verse } from '../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  verses: Verse[];
  onApplyImport: (verseMap: Record<string, string>) => void;
}

const TransliterationImport: React.FC<Props> = ({ isOpen, onClose, verses, onApplyImport }) => {
  const [inputText, setInputText] = useState('');
  
  if (!isOpen) return null;

  const handleApply = () => {
      // Split by new line and filter out empty lines
      const lines = inputText.split('\n').filter(line => line.trim() !== '');
      
      if (lines.length === 0) {
          alert("Lütfen metin kutusuna bir şeyler yapıştırın.");
          return;
      }

      // Check count mismatch
      if (lines.length !== verses.length) {
          const confirmMismatch = window.confirm(
              `UYARI: Surede ${verses.length} ayet var, ancak siz ${lines.length} satır yapıştırdınız.\n\nEşleşme sırayla yapılacaktır (1. Satır -> 1. Ayet). Devam edilsin mi?`
          );
          if (!confirmMismatch) return;
      }

      const newMap: Record<string, string> = {};
      
      // Map lines to verses
      verses.forEach((verse, index) => {
          if (lines[index]) {
              // Clean up potential verse numbers like "1. Bismillah" or "1) Bismillah" -> "Bismillah"
              // Regex: Start of line (^), digits (\d+), optional dots/parentheses ([\.\)]?), whitespace (\s*)
              const cleanText = lines[index].replace(/^\d+[\.\)]?\s*/, '').trim();
              newMap[verse.verse_key] = cleanText;
          }
      });

      onApplyImport(newMap);
      onClose();
      alert(`${Object.keys(newMap).length} ayet için transliterasyon başarıyla güncellendi!`);
      setInputText('');
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[80] p-4 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col h-[80vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-900 rounded-t-2xl">
          <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-500/20 rounded-lg">
                <UploadCloud size={24} className="text-indigo-400" />
              </div>
              <div>
                  <h2 className="text-lg font-bold text-white">Toplu Transliterasyon Yükle</h2>
                  <p className="text-xs text-slate-400">Harici bir kaynaktan (ChatGPT vb.) metin yapıştırın</p>
              </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>
        
        {/* Body */}
        <div className="p-5 flex-1 flex flex-col bg-slate-950/50 overflow-hidden">
            <div className="mb-4 bg-indigo-900/20 border border-indigo-500/30 p-4 rounded-lg flex gap-3">
                <AlertTriangle className="text-indigo-400 flex-shrink-0" size={20} />
                <div className="text-xs text-indigo-200 space-y-1">
                    <p className="font-semibold">Format Nasıl Olmalı?</p>
                    <p>Metni <strong>satır satır</strong> yapıştırın. Her satır bir ayete denk gelmelidir.</p>
                    <ul className="list-disc pl-4 opacity-80 mt-1">
                        <li>1. Satır -> 1. Ayet</li>
                        <li>2. Satır -> 2. Ayet</li>
                    </ul>
                    <p className="mt-1 opacity-70">Ayet sayısı: <strong>{verses.length}</strong></p>
                    <p className="mt-1 text-emerald-400">Not: Başındaki numaralar (1. , 2. vb) otomatik temizlenir.</p>
                </div>
            </div>

            <textarea 
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder={`Örnek:\n1. Bismillâhirrahmânirrahîm.\n2. Elhamdulillâhi rabbil âlemîn.\n...`}
                className="flex-1 w-full bg-slate-900 text-slate-200 font-sans text-sm p-4 rounded-xl border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none resize-none leading-relaxed placeholder:opacity-30"
                spellCheck={false}
            />
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-slate-800 flex justify-end gap-3 bg-slate-900 rounded-b-2xl">
          <button 
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors text-sm font-medium"
          >
            İptal
          </button>

          <button 
            onClick={handleApply}
            className="flex items-center gap-2 px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-all font-bold shadow-lg shadow-indigo-900/40 text-sm"
          >
            <Check size={18} />
            Metni İşle ve Uygula
          </button>
        </div>
      </div>
    </div>
  );
};

export default TransliterationImport;