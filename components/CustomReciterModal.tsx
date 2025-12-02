import React, { useState } from 'react';
import { X, UserPlus, Save } from 'lucide-react';
import { Reciter } from '../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onAddReciter: (reciter: Reciter) => void;
}

const CustomReciterModal: React.FC<Props> = ({ isOpen, onClose, onAddReciter }) => {
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const newReciter: Reciter = {
      id: 90000 + Math.floor(Math.random() * 10000), // Random ID range for custom
      name: name.trim(),
      style: 'Custom',
      slug: slug.trim() || undefined
    };

    onAddReciter(newReciter);
    setName('');
    setSlug('');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[80] p-4 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-md rounded-2xl shadow-2xl flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-900 rounded-t-2xl">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <UserPlus size={20} className="text-emerald-500"/>
                Yeni Hafız Ekle
            </h2>
            <button onClick={onClose}><X className="text-slate-400 hover:text-white"/></button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4 bg-slate-950/50 flex-1">
            <div>
                <label className="block text-sm text-slate-400 mb-1">Hafız Adı</label>
                <input 
                    type="text" 
                    value={name} 
                    onChange={e => setName(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
                    placeholder="Örn: Fatih Çollak"
                    required
                />
            </div>
            <div>
                <label className="block text-sm text-slate-400 mb-1">Slug (Opsiyonel - QuranCentral)</label>
                <input 
                    type="text" 
                    value={slug} 
                    onChange={e => setSlug(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
                    placeholder="Örn: fatih-collak"
                />
                <p className="text-[10px] text-slate-500 mt-1">Eğer kendi ses dosyanızı yükleyecekseniz burayı boş bırakın. QuranCentral'da varsa link uzantısını (slug) yazın.</p>
            </div>
            
            <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-2.5 rounded-lg font-bold flex items-center justify-center gap-2 mt-4 transition-colors shadow-lg shadow-emerald-900/40">
                <Save size={18} /> Kaydet ve Listeye Ekle
            </button>
        </form>
      </div>
    </div>
  );
};

export default CustomReciterModal;