import React, { useEffect, useRef, useState } from 'react';
import { Play, Pause, AlertCircle } from 'lucide-react';

interface AudioPlayerProps {
  audioUrl: string | null;
  timestamps: any[];
  onTimeUpdate: (currentTime: number) => void;
  isPlaying: boolean;
  setIsPlaying: (playing: boolean) => void;
}

const AudioPlayer: React.FC<AudioPlayerProps> = ({ 
  audioUrl, timestamps, onTimeUpdate, isPlaying, setIsPlaying 
}) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [duration, setDuration] = useState(0);
  const [currentTimeSec, setCurrentTimeSec] = useState(0);

  useEffect(() => {
    if (audioRef.current) {
      if (isPlaying) {
          const playPromise = audioRef.current.play();
          if (playPromise !== undefined) {
              playPromise.catch(error => {
                  // This handles "Autoplay prevented" and "Aborted" errors gracefully
                  console.warn("Playback prevented or interrupted:", error.message || error);
                  setIsPlaying(false);
              });
          }
      } else {
          audioRef.current.pause();
      }
    }
  }, [isPlaying]);

  useEffect(() => {
    // Reset when URL changes
    setIsPlaying(false);
    setCurrentTimeSec(0);
  }, [audioUrl, setIsPlaying]);

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      const curr = audioRef.current.currentTime;
      setCurrentTimeSec(curr);
      // Convert seconds to ms for compatibility with API timestamps logic
      onTimeUpdate(curr * 1000);
    }
  };

  const handleLoadedMetadata = () => {
      if (audioRef.current) {
          setDuration(audioRef.current.duration);
      }
  };
  
  const handleAudioError = (e: any) => {
    // FIX: Do NOT log the event object 'e' directly. It contains circular references to the DOM (HTMLAudioElement),
    // which causes "Converting circular structure to JSON" errors in some console environments.
    console.error("Audio failed to load. Source possibly missing or 404.");
    setIsPlaying(false);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
      const time = Number(e.target.value);
      if (audioRef.current) {
          audioRef.current.currentTime = time;
          setCurrentTimeSec(time);
          onTimeUpdate(time * 1000);
      }
  };

  const formatTimeSeconds = (seconds: number) => {
      if (!seconds || isNaN(seconds)) return "00:00";
      const mins = Math.floor(seconds / 60);
      const secs = Math.floor(seconds % 60);
      return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (!audioUrl) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-slate-900 border-t border-slate-800 p-4 shadow-xl z-50 backdrop-blur-md bg-opacity-95">
      <div className="max-w-5xl mx-auto flex items-center gap-6">
        {/* Main Play Button */}
        <button
          onClick={() => setIsPlaying(!isPlaying)}
          className="w-14 h-14 flex-shrink-0 flex items-center justify-center rounded-full bg-emerald-500 hover:bg-emerald-400 text-white shadow-lg shadow-emerald-900/50 transition-all active:scale-95"
        >
          {isPlaying ? <Pause size={28} fill="currentColor" /> : <Play size={28} fill="currentColor" className="ml-1" />}
        </button>

        {/* Custom Progress Bar & Info */}
        <div className="flex-1 flex flex-col gap-1">
            <div className="flex justify-between text-xs font-mono text-slate-400">
                <span>{formatTimeSeconds(currentTimeSec)}</span>
                <span className="flex items-center gap-2">
                    {timestamps.length > 0 ? (
                        <span className="text-emerald-500 flex items-center gap-1">
                           <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                           Sync Active
                        </span>
                    ) : (
                        <span className="text-amber-500 flex items-center gap-1">
                            <AlertCircle size={10}/> No timestamps
                        </span>
                    )}
                    <span>/</span>
                    <span>{formatTimeSeconds(duration)}</span>
                </span>
            </div>
            
            <input 
                type="range"
                min="0"
                max={duration || 100}
                value={currentTimeSec}
                onChange={handleSeek}
                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500 hover:accent-emerald-400 transition-all"
            />
        </div>

        {/* Hidden Audio Element (Logic Only) */}
        <audio 
            ref={audioRef}
            src={audioUrl}
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
            onEnded={() => setIsPlaying(false)}
            onError={handleAudioError}
            className="hidden" 
        />
      </div>
    </div>
  );
};

export default AudioPlayer;