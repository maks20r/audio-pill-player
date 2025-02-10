'use client';

import React, { useState, useRef, useEffect } from 'react';
import WaveSurfer from 'wavesurfer.js';
import { useDrag, useDrop, DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { Music, Volume2, VolumeX, Trash2, Play, Pause, Upload } from 'lucide-react';


//defines structure of auditrack 
interface AudioTrack {
  id: string;
  file: File;
  waveSurfer: WaveSurfer | null;
  isPlaying: boolean;
  isReady: boolean;
  volume: number;
  isMuted: boolean;
  objectUrl: string;
  currentTime: number;
  duration: number;
}


//data passed on during drag and drop 
const ItemType = 'track';
interface DragItem {
  id: string;
  index: number;
}


//Timeline
const TimelineGraph = ({ duration = 210, currentTime = 0 }) => {
  const marks = Array.from({ length: Math.ceil(duration / 10) + 1 }, (_, i) => i * 10);
  
  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const progressWidth = `${(currentTime / duration) * 100}%`;

  return (
    <div className="w-full py-2">
      <div className="relative w-full h-8">
        {marks.map((seconds) => (
          <div
            key={seconds}
            className="absolute transform -translate-x-1/2"
            style={{ left: `${(seconds / duration) * 100}%` }}
          >
            <div className={`h-2 w-px bg-gray-600 mx-auto ${seconds % 30 === 0 ? 'h-3' : ''}`} />
            {seconds % 30 === 0 && (
              <div className="mt-1 text-xs text-gray-400 font-mono">
                {formatTime(seconds)}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

const formatTime = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
};


//defining individual track components
const TrackItem = React.memo(({ 
  track, 
  index,
  moveTrack,
  toggleMute,
  handleVolumeChange,
  removeTrack,
  togglePlayPause,
}: {
  track: AudioTrack;
  index: number;
  moveTrack: (dragIndex: number, hoverIndex: number) => void;
  toggleMute: (id: string) => void;
  handleVolumeChange: (id: string, volume: number) => void;
  removeTrack: (id: string) => void;
  togglePlayPause: (id: string) => void;
}) => {
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isDraggingWaveform, setIsDraggingWaveform] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const wasPlayingRef = useRef(false);



  //drag and drop logic 
  const [{ isDragging }, drag] = useDrag({
    type: ItemType,
    item: { id: track.id, index } as DragItem,
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  const [, drop] = useDrop({
    accept: ItemType,
    hover: (item: DragItem, monitor) => {
      if (!monitor.isOver({ shallow: true })) return;
      if (item.id === track.id) return;
      
      moveTrack(item.index, index);
      item.index = index;
    },
  });



  //waveform integration 
  const waveformContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (waveformContainerRef.current && track.waveSurfer) {
      track.waveSurfer.setOptions({ 
        container: waveformContainerRef.current,
        dragToSeek: true,  
      });
      track.waveSurfer.load(track.objectUrl);
      
      track.waveSurfer.on('ready', () => {
        track.waveSurfer?.seekTo(track.currentTime);
        setDuration(track.waveSurfer?.getDuration() || 0);
        if (track.isPlaying) {
          track.waveSurfer?.play();
        }
      });

      track.waveSurfer.on('audioprocess', () => {
        if (!isDraggingWaveform) {
          setCurrentTime(track.waveSurfer?.getCurrentTime() || 0);
        }
      });
  
      track.waveSurfer.on('seek', () => {
        setCurrentTime(track.waveSurfer?.getCurrentTime() || 0);
      });
  
      return () => {
        track.waveSurfer.un('audioprocess');
        track.waveSurfer.un('seek');
      };
    }
  }, [track.waveSurfer, track.objectUrl]); 

  const handleMouseEnter = () => {
    setIsHovering(true);
  };

  const handleMouseLeave = () => {
    setIsHovering(false);
  };





  //controls UI
  return (
    <div ref={(node) => drag(drop(node))}
      className={`
        p-6 rounded-lg mb-4 
        bg-gradient-to-r from-gray-900 to-gray-800
        border border-purple-900
        shadow-lg
        transition-all duration-300
        hover:shadow-purple-900/20 hover:shadow-xl
        ${isDragging ? 'opacity-50' : 'opacity-100'}
      `}>
      <div className="flex items-center gap-4 mb-4">
        <Music className="w-6 h-6 text-purple-400" />
        <span className="font-gothic text-lg text-purple-300">
          {track.file.name}
        </span>
      </div>

      <div
        ref={waveformContainerRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className={`w-full h-28 rounded-md mb-2 bg-gray-950/50 p-4 transition-all duration-300
          ${isHovering ? 'cursor-grab' : ''}
          ${isDraggingWaveform ? 'cursor-grabbing' : ''}
          ${isHovering ? 'ring-2 ring-purple-500/30' : ''}
        `}
      ></div>

      <TimelineGraph 
        duration={duration}
        currentTime={currentTime}
      />

      <div className="flex items-center justify-between">  
        <div className="flex items-center gap-4"> 
          <button 
            onClick={() => togglePlayPause(track.id)}
            disabled={!track.isReady}
            className={`p-3 rounded-full ${track.isReady 
                ? 'bg-purple-700 hover:bg-purple-600 text-white' 
                : 'bg-gray-700 text-gray-400'
              }
              transition-colors duration-300
            `}
          >
            {!track.isReady ? (
              <div className="w-6 h-6 animate-pulse">...</div>
            ) : track.isPlaying ? (
              <Pause className="w-6 h-6" />
            ) : (
              <Play className="w-6 h-6" />
            )}
          </button>

          <button 
            onClick={() => toggleMute(track.id)}
            className={`
              p-2 rounded-full 
              ${track.isMuted ? 'bg-red-900/50' : 'bg-gray-800'} 
              hover:bg-purple-700/50 
              transition-colors duration-300
            `}
          >
            {track.isMuted ? (
              <VolumeX className="w-5 h-5 text-red-400" />
            ) : (
              <Volume2 className="w-5 h-5 text-purple-400" />
            )}
          </button>

          <input 
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={track.volume}
            onChange={(e) => handleVolumeChange(track.id, parseFloat(e.target.value))}
            className="w-24 accent-purple-600"
          />
        </div>

        <button
          onClick={() => removeTrack(track.id)}
          className="p-2 rounded-full hover:bg-red-900/30 transition-colors duration-300"
        >
          <Trash2 className="w-5 h-5 text-red-400" />
        </button>
      </div>
    </div>
  );
});




//main and track managment 
TrackItem.displayName = 'TrackItem';

export default function MultiAudioPlayer() {
  const [audioTracks, setAudioTracks] = useState<AudioTrack[]>([]);
  const [isAllPlaying, setIsAllPlaying] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const moveTrack = (dragIndex: number, hoverIndex: number) => {
    setAudioTracks(prev => {
      const newTracks = [...prev];
      const trackToMove = newTracks[dragIndex];
      const currentTime = trackToMove.waveSurfer?.getCurrentTime() || 0;
      const isPlaying = trackToMove.isPlaying;
      
      trackToMove.currentTime = currentTime / (trackToMove.waveSurfer?.getDuration() || 1);
      
      const [removed] = newTracks.splice(dragIndex, 1);
      newTracks.splice(hoverIndex, 0, removed);
      
      return newTracks;
    });
  };

  const togglePlayPause = async (trackId: string) => {
    const track = audioTracks.find(t => t.id === trackId);
    if (!track?.waveSurfer) return;

    if (track.isPlaying) {
      await track.waveSurfer.pause();
    } else {
      await track.waveSurfer.play();
    }

    setAudioTracks(prev =>
      prev.map(t =>
        t.id === trackId ? { ...t, isPlaying: !t.isPlaying } : t
      )
    );
  };

  const removeTrack = (trackId: string) => {
    const track = audioTracks.find(t => t.id === trackId);
    if (track) {
      if (track.waveSurfer) {
        track.waveSurfer.destroy();
      }
      URL.revokeObjectURL(track.objectUrl);
    }
    setAudioTracks(prev => prev.filter(t => t.id !== trackId));
  };

  const handleVolumeChange = (trackId: string, volume: number) => {
    const track = audioTracks.find(t => t.id === trackId);
    if (!track?.waveSurfer) return;

    track.waveSurfer.setVolume(volume);
    setAudioTracks(prev =>
      prev.map(t =>
        t.id === trackId ? { ...t, volume, isMuted: volume === 0 } : t
      )
    );
  };

  const toggleMute = (trackId: string) => {
    const track = audioTracks.find(t => t.id === trackId);
    if (!track?.waveSurfer) return;

    const newIsMuted = !track.isMuted;
    track.waveSurfer.setVolume(newIsMuted ? 0 : track.volume);
    setAudioTracks(prev =>
      prev.map(t =>
        t.id === trackId ? { ...t, isMuted: newIsMuted } : t
      )
    );
  };



  //file upload and track cration 
  const createTrack = (file: File): AudioTrack => {
    const id = `track-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const objectUrl = URL.createObjectURL(file);
    
    const waveSurfer = WaveSurfer.create({
      container: document.createElement('div'),
      waveColor: '#a78bfa',
      progressColor: '#7c3aed',
      barWidth: 2,
      barGap: 2,
      height: 80,
      cursorColor: '#d8b4fe',
      cursorWidth: 2,
    });

    const track: AudioTrack = {
      id,
      file,
      waveSurfer,
      isPlaying: false,
      isReady: false,
      volume: 1,
      isMuted: false,
      objectUrl,
      currentTime: 0,
      duration: 0,
    };

    waveSurfer.on('ready', () => {
      setAudioTracks(prev =>
        prev.map(t => (t.id === id ? { 
          ...t, 
          isReady: true,
          duration: waveSurfer.getDuration() 
        } : t))
      );
    });

    waveSurfer.on('audioprocess', () => {
      setAudioTracks(prev =>
        prev.map(t => (t.id === id ? {
          ...t,
          currentTime: waveSurfer.getCurrentTime() / waveSurfer.getDuration()
        } : t))
      );
    });

    return track;
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    const audioFiles = files.filter(file => file.type.startsWith('audio/'));
    
    const newTracks = audioFiles.map(createTrack);
    
    setAudioTracks(prev => [...prev, ...newTracks]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };


  //destroying waveform 
  useEffect(() => {
    return () => {
      audioTracks.forEach(track => {
        if (track.waveSurfer) {
          track.waveSurfer.destroy();
        }
        URL.revokeObjectURL(track.objectUrl);
      });
    };
  }, []);

  //ui structure 
  return (
    <DndProvider backend={HTML5Backend}>
      <div className="absolute inset-0 min-h-screen w-full bg-gradient-to-b from-gray-900 to-black overflow-auto">
        <div className="max-w-3xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
          <h1 className="text-4xl font-gothic text-center text-purple-300 mb-8 tracking-wider">
            Oblivion Audio
          </h1>

          <div className="mb-8 flex justify-center gap-4">
            <input
              ref={fileInputRef}
              type="file"
              accept="audio/*"
              onChange={handleFileUpload}
              className="hidden"
              id="audio-upload"
              multiple
            />
            <label
              htmlFor="audio-upload"
              className="
                flex items-center gap-2 px-6 py-3 
                bg-purple-600 text-purple-100 
                rounded-lg cursor-pointer 
                hover:bg-purple-500 
                transition-colors duration-300
                shadow-lg shadow-purple-900/30
              "
            >
              <Upload className="w-5 h-5" />
              Upload Audio Files
            </label>
          
          {audioTracks.length > 0 && (
            <button
              onClick={() => {
                setIsAllPlaying(!isAllPlaying);
                audioTracks.forEach(track => {
                  if (track.isReady && track.waveSurfer) {
                    isAllPlaying ? track.waveSurfer.pause() : track.waveSurfer.play();
                  }
                });
                setAudioTracks(prev =>
                  prev.map(t =>
                    t.isReady ? { ...t, isPlaying: !isAllPlaying } : t
                  )
                );
              }}
              className="
                flex items-center gap-2 px-6 py-3 
                bg-gray-800 text-purple-300 
                rounded-lg
                hover:bg-gray-700 
                transition-colors duration-300
                shadow-lg shadow-black/50
              "
            >
              {isAllPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
              {isAllPlaying ? 'Pause All' : 'Play All'}
            </button>
          )}
        </div>
        

        
        <div className="space-y-2"> 
          {audioTracks.map((track, index) => (
            <TrackItem
              key={track.id}
              track={track}
              index={index}
              moveTrack={moveTrack}
              toggleMute={toggleMute}
              handleVolumeChange={handleVolumeChange}
              removeTrack={removeTrack}
              togglePlayPause={togglePlayPause}
            />
          ))}
        </div>
      </div>
    </div>
  </DndProvider>
);
}