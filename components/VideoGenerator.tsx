import React, { useRef, useState, useEffect } from 'react';
import { X, Upload, Play, Pause, Download, Video, Loader2, AlertCircle, ArrowLeft, Check } from 'lucide-react';
import { Verse, TimestampSegment } from '../types';

interface VideoGeneratorProps {
  isOpen: boolean;
  onClose: () => void;
  verses: Verse[];
  timestamps: TimestampSegment[];
  audioUrl: string | null;
  reciterName: string;
  chapterName: string;
  generatedTransliterations: Record<string, string>;
  targetLanguage: string;
}

const VideoGenerator: React.FC<VideoGeneratorProps> = ({
  isOpen, onClose, verses, timestamps, audioUrl, reciterName, chapterName, generatedTransliterations, targetLanguage
}) => {
  const [backgroundFile, setBackgroundFile] = useState<File | null>(null);
  const [backgroundUrl, setBackgroundUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isRendering, setIsRendering] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [recordedChunks, setRecordedChunks] = useState<Blob[]>([]);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const requestRef = useRef<number>(0);

  // Cleanup URLs on unmount
  useEffect(() => {
    return () => {
      if (backgroundUrl) URL.revokeObjectURL(backgroundUrl);
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, []);

  // Auto-download when rendering finishes
  useEffect(() => {
      if (!isRendering && recordedChunks.length > 0) {
          downloadVideo();
      }
  }, [isRendering, recordedChunks]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setBackgroundFile(file);
      const url = URL.createObjectURL(file);
      setBackgroundUrl(url);
      alert("Video dosyası başarıyla yüklendi!");
    }
  };

  // Main Loop: Draw Video + Text to Canvas
  const drawFrame = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');

    if (video && canvas && ctx) {
      // 1. Draw Background Video
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      // 2. Draw Overlay Gradient (Bottom area - "3 lines")
      const bottomAreaHeight = 200; // Adjusted for 3 lines
      const yStart = canvas.height - bottomAreaHeight;
      
      const gradient = ctx.createLinearGradient(0, yStart, 0, canvas.height);
      gradient.addColorStop(0, 'rgba(0,0,0,0.6)');
      gradient.addColorStop(1, 'rgba(0,0,0,0.95)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, yStart, canvas.width, bottomAreaHeight);

      // 3. Draw Title (Surah Only) - Top Center
      ctx.shadowColor = "rgba(0,0,0,0.8)";
      ctx.shadowBlur = 4;
      ctx.shadowOffsetX = 2;
      ctx.shadowOffsetY = 2;
      ctx.textAlign = 'center';
      ctx.fillStyle = '#ffffff';
      
      // Removed Reciter Name as requested
      // Increased Surah Name font size significantly
      ctx.font = 'bold 60px Amiri, serif';
      ctx.fillText(chapterName, canvas.width / 2, 80);

      // 4. Find Active Verse
      const timeMs = (audioRef.current?.currentTime || 0) * 1000;
      const activeTs = timestamps.find(ts => timeMs >= ts.timestamp_from && timeMs <= ts.timestamp_to);
      
      if (activeTs) {
        const verse = verses.find(v => v.verse_key === activeTs.verse_key);
        if (verse) {
           const margin = 50;
           const midX = canvas.width * 0.45; 
           
           // --- ARABIC (Top Right of Bottom Area) ---
           ctx.textAlign = 'right';
           ctx.direction = 'rtl';
           ctx.font = 'bold 44px Amiri, serif';
           ctx.fillStyle = '#ffffff';
           const arabicY = yStart + 60;
           ctx.fillText(verse.text_uthmani, canvas.width - margin, arabicY);

           // --- TRANSLITERATION (Below Arabic, Right side) ---
           // INCREASED FONT SIZE & SPACING
           const transText = generatedTransliterations[verse.verse_key] || verse.transliteration_text || "";
           ctx.textAlign = 'right';
           ctx.direction = 'ltr';   
           ctx.font = 'italic 26px Inter, sans-serif'; // Bigger
           ctx.fillStyle = '#34d399'; 
           const transY = arabicY + 50; // More spacing
           ctx.fillText(transText, canvas.width - margin, transY);

           // --- TRANSLATION (Left Side) ---
           // INCREASED FONT SIZE
           const translatText = verse.translations?.[0]?.text.replace(/<sup.*?<\/sup>/g, '') || "";
           ctx.textAlign = 'left';
           ctx.direction = 'ltr';
           ctx.font = 'medium 28px Inter, sans-serif'; // Bigger
           ctx.fillStyle = '#e2e8f0'; 
           
           const maxWidth = midX - margin; 
           const words = translatText.split(' ');
           let line = '';
           let y = yStart + 60; 
           const lineHeight = 40; // Increased line height

           for(let n = 0; n < words.length; n++) {
             const testLine = line + words[n] + ' ';
             const metrics = ctx.measureText(testLine);
             const testWidth = metrics.width;
             if (testWidth > maxWidth && n > 0) {
               ctx.fillText(line, margin, y);
               line = words[n] + ' ';
               y += lineHeight; 
             } else {
               line = testLine;
             }
           }
           ctx.fillText(line, margin, y);
        }
      }

      if (!video.paused && !video.ended) {
        requestRef.current = requestAnimationFrame(drawFrame);
      }
    }
  };

  const handlePlay = () => {
    if (videoRef.current && audioRef.current) {
      videoRef.current.play();
      audioRef.current.play();
      setIsPlaying(true);
      requestRef.current = requestAnimationFrame(drawFrame);
    }
  };

  const handlePause = () => {
    if (videoRef.current && audioRef.current) {
      videoRef.current.pause();
      audioRef.current.pause();
      setIsPlaying(false);
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
      const time = Number(e.target.value);
      if (videoRef.current && audioRef.current) {
          videoRef.current.currentTime = time % videoRef.current.duration;
          audioRef.current.currentTime = time;
          setCurrentTime(time);
          setTimeout(drawFrame, 100); 
      }
  };

  // RENDER & DOWNLOAD LOGIC
  const startRendering = () => {
    if (canvasRef.current && audioRef.current && videoRef.current) {
        // Reset everything
        setRecordedChunks([]);
        audioRef.current.currentTime = 0;
        videoRef.current.currentTime = 0;
        
        const canvasStream = canvasRef.current.captureStream(30);
        const mediaRecorder = new MediaRecorder(canvasStream, {
            mimeType: 'video/webm;codecs=vp9' // Browser standard
        });

        mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
                setRecordedChunks((prev) => [...prev, event.data]);
            }
        };

        mediaRecorderRef.current = mediaRecorder;
        mediaRecorder.start();
        
        setIsRendering(true);
        handlePlay(); // Start playback, which drives the loop
    }
  };

  const downloadVideo = () => {
    if (recordedChunks.length === 0) return;
    const blob = new Blob(recordedChunks, { type: 'video/webm' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    // Requested .mp4 extension (Note: Actual container is webm, but many players handle the rename)
    a.download = `quran-video-${Date.now()}.mp4`; 
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    setRecordedChunks([]);
    alert("Video render edildi ve indirildi!");
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/95 z-[70] flex flex-col backdrop-blur-md">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-900">
         <div className="flex items-center gap-4">
             {/* Back Navigation */}
             <button onClick={onClose} className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700">
                 <ArrowLeft size={16} />
                 <span className="text-sm font-medium">Editöre Dön</span>
             </button>
             <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Video className="text-emerald-500" /> Video Production Studio
             </h2>
         </div>
         <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X size={24} />
         </button>
      </div>

      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
         {/* Sidebar Controls */}
         <div className="w-full md:w-80 bg-slate-900 border-r border-slate-800 p-6 flex flex-col gap-6 overflow-y-auto">
            
            {/* 1. Upload Background */}
            <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">1. Arka Plan Videosu (MP4)</label>
                <div className="relative border-2 border-dashed border-slate-700 rounded-xl p-6 flex flex-col items-center justify-center text-center hover:bg-slate-800/50 transition-colors overflow-hidden group">
                    <Upload className="text-slate-500 mb-2" size={24}/>
                    <span className="text-xs text-slate-400">MP4 dosyası yükleyin</span>
                    {/* Fixed click area bug */}
                    <input 
                        type="file" 
                        accept="video/mp4" 
                        onChange={handleFileChange}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    />
                </div>
                {backgroundFile && (
                    <div className="text-xs text-emerald-400 flex items-center gap-1">
                        <Check size={10} /> Yüklendi: {backgroundFile.name}
                    </div>
                )}
            </div>

            {/* 2. Audio Info */}
            <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">2. Ses Kaynağı</label>
                <div className="bg-slate-800 p-3 rounded-lg text-xs text-slate-300">
                    <p className="font-semibold text-emerald-400">{reciterName}</p>
                    <p>{chapterName}</p>
                    <p className="mt-2 opacity-70">Süre: {audioRef.current?.duration ? Math.floor(audioRef.current.duration) + 's' : '...'}</p>
                </div>
            </div>

            {/* Timestamps List (View Only) */}
             <div className="flex-1 overflow-hidden flex flex-col">
                 <label className="text-sm font-medium text-slate-300 mb-2">Zaman Damgaları (Önizleme)</label>
                 <div className="bg-slate-950/50 rounded-lg border border-slate-800 flex-1 overflow-y-auto p-2 text-xs font-mono">
                     {timestamps.length === 0 ? (
                         <p className="text-slate-500 p-2">Zaman damgası yok.</p>
                     ) : (
                         timestamps.map((ts, idx) => (
                             <div key={idx} className="flex justify-between py-1 border-b border-slate-800 last:border-0 text-slate-400">
                                 <span>{ts.verse_key}</span>
                                 <span>{Math.floor(ts.timestamp_from/1000)}s - {Math.floor(ts.timestamp_to/1000)}s</span>
                             </div>
                         ))
                     )}
                 </div>
                 <p className="text-[10px] text-slate-500 mt-1">Düzenlemek için Editöre dönün.</p>
             </div>

            {/* 3. Render Button */}
            <div className="mt-auto space-y-3 pt-4 border-t border-slate-800">
                 {!isRendering ? (
                     <button 
                        onClick={startRendering}
                        disabled={!backgroundUrl || !audioUrl}
                        className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold flex items-center justify-center gap-2 disabled:opacity-50 transition-all shadow-lg shadow-emerald-900/50"
                     >
                        <Download size={18} /> Videoyu Render Et ve İndir
                     </button>
                 ) : (
                     <button 
                        disabled
                        className="w-full py-3 bg-slate-700 text-white rounded-lg font-bold flex items-center justify-center gap-2 animate-pulse"
                     >
                        <Loader2 size={18} className="animate-spin" /> Render Ediliyor...
                     </button>
                 )}
            </div>
         </div>

         {/* Preview Area */}
         <div className="flex-1 bg-black flex flex-col items-center justify-center relative p-4">
            {/* Canvas Container */}
            <div className="relative shadow-2xl border border-slate-800 bg-slate-900 aspect-video w-full max-w-4xl">
                {!backgroundUrl && (
                    <div className="absolute inset-0 flex items-center justify-center text-slate-500">
                        Video önizlemesi için dosya yükleyin
                    </div>
                )}
                <canvas 
                    ref={canvasRef}
                    width={1280}
                    height={720}
                    className="w-full h-full object-contain"
                />
            </div>

            {/* Hidden Source Elements */}
            <video 
                ref={videoRef}
                src={backgroundUrl || ''}
                className="hidden"
                muted
                loop
                playsInline
                crossOrigin="anonymous"
            />
            <audio 
                ref={audioRef}
                src={audioUrl || ''}
                className="hidden"
                crossOrigin="anonymous"
                onTimeUpdate={() => {
                    if (audioRef.current) setCurrentTime(audioRef.current.currentTime);
                }}
                onEnded={() => {
                    setIsPlaying(false);
                    // If rendering, stop and finalize
                    if (isRendering && mediaRecorderRef.current) {
                        mediaRecorderRef.current.stop();
                        setIsRendering(false);
                    }
                }}
            />

            {/* Playback Controls */}
            <div className="w-full max-w-4xl mt-4 flex items-center gap-4">
                <button 
                    onClick={isPlaying ? handlePause : handlePlay}
                    disabled={!backgroundUrl}
                    className="w-12 h-12 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-white disabled:opacity-50"
                >
                    {isPlaying ? <Pause size={20} /> : <Play size={20} className="ml-1" />}
                </button>
                
                <input 
                    type="range"
                    min="0"
                    max={audioRef.current?.duration || 100}
                    value={currentTime}
                    onChange={handleSeek}
                    className="flex-1 h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                />
                
                <span className="text-xs font-mono text-slate-400 w-12">
                    {Math.floor(currentTime / 60)}:{Math.floor(currentTime % 60).toString().padStart(2, '0')}
                </span>
            </div>
         </div>
      </div>
    </div>
  );
};

export default VideoGenerator;