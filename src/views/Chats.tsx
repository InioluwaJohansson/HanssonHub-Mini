import React, { useState, useEffect, useRef, useMemo, ChangeEvent } from 'react';
import { 
  Search, ChevronLeft, Send, User, MessageCircle, Mic, Paperclip, X, 
  Play, Pause, Square, Users, MessageSquarePlus, CheckCheck, UserPlus, 
  CirclePlus, LoaderCircle, Trash2, Edit2, Info, Plus, UserMinus,
  Reply, Forward, Copy, Check, Lock, Calendar, AlertCircle, Repeat,
  FileText, Download, Image, ChevronDown, Clock
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  createDirectChat, createGroupChat, getChatById, getMyChats, 
  removeParticipant, addParticipants, sendMessage, editMessage, 
  getChatMessages, deleteMessage, getUnreadCount, getUserDetails,
  getStoredAppNamesList, updateGroupChat, deleteChat,
  sendTypingStatus, joinChatRoom, getBaseUrl, getImageUrl
} from '../utils/api';
import { MessageType } from '../types/chat';
import { saveData, getData, getAllData, STORES, clearStore } from '../utils/db';
import { homeSecurityHubConnection, startHomeSecurityHub } from '../utils/signalr';
import { playNotificationSound, pauseAllAudio, setCurrentlyPlaying } from '../utils/audio';
import Cropper from 'react-easy-crop';

// Helper to trigger haptic feedback
const triggerHaptic = (type: 'light' | 'medium' | 'heavy' | 'incoming' = 'light') => {
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    try {
      if (type === 'incoming') {
        navigator.vibrate([100, 50, 100]); // Two distinct pulses
      } else if (type === 'heavy') {
        navigator.vibrate([50, 30, 50]);
      } else if (type === 'medium') {
        navigator.vibrate(30);
      } else {
        navigator.vibrate(15);
      }
    } catch (e) {}
  }
};

// Helper to convert cropped image
const getCroppedImg = (imageSrc: string, pixelCrop: any): Promise<File> => {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.src = imageSrc;
    image.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = pixelCrop.width;
      canvas.height = pixelCrop.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject('No context');
      
      ctx.drawImage(
        image,
        pixelCrop.x,
        pixelCrop.y,
        pixelCrop.width,
        pixelCrop.height,
        0,
        0,
        pixelCrop.width,
        pixelCrop.height
      );
      
      canvas.toBlob((blob) => {
        if (!blob) return reject('Canvas is empty');
        const file = new File([blob], 'avatar.jpg', { type: 'image/jpeg' });
        resolve(file);
      }, 'image/jpeg');
    };
  });
};

function VoicePlayer({ mediaUrl, duration }: { mediaUrl?: string; duration?: number }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [totalDuration, setTotalDuration] = useState(duration || 5);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    if (mediaUrl && !mediaUrl.includes('GkXfo69Chu1')) {
      const audio = new Audio(mediaUrl);
      audioRef.current = audio;

      const handleLoadedMetadata = () => {
        if (audio.duration && !isNaN(audio.duration) && isFinite(audio.duration)) {
          setTotalDuration(Math.round(audio.duration));
        }
      };

      const handleEnded = () => {
        setIsPlaying(false);
        setCurrentTime(0);
        if (intervalRef.current) clearInterval(intervalRef.current);
      };

      const handlePause = () => {
        setIsPlaying(false);
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      };

      audio.addEventListener('loadedmetadata', handleLoadedMetadata);
      audio.addEventListener('ended', handleEnded);
      audio.addEventListener('pause', handlePause);

      return () => {
        audio.pause();
        audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
        audio.removeEventListener('ended', handleEnded);
        audio.removeEventListener('pause', handlePause);
        if (intervalRef.current) clearInterval(intervalRef.current);
      };
    }
  }, [mediaUrl]);

  const handlePlayPause = () => {
    triggerHaptic('light');
    if (isPlaying) {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      setIsPlaying(false);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    } else {
      pauseAllAudio();
      setCurrentlyPlaying(audioRef.current);
      setIsPlaying(true);
      if (audioRef.current) {
        audioRef.current.play().catch(e => {
          console.warn("Real audio play failed, falling back to simulated playback", e);
        });
      }

      if (intervalRef.current) clearInterval(intervalRef.current);
      
      const startTime = Date.now() - (currentTime * 1000);
      intervalRef.current = window.setInterval(() => {
        if (audioRef.current) {
          setCurrentTime(audioRef.current.currentTime);
        } else {
          const elapsed = (Date.now() - startTime) / 1000;
          if (elapsed >= totalDuration) {
            setIsPlaying(false);
            setCurrentTime(0);
            if (intervalRef.current) clearInterval(intervalRef.current);
          } else {
            setCurrentTime(elapsed);
          }
        }
      }, 100);
    }
  };

  const percent = totalDuration > 0 ? (currentTime / totalDuration) * 100 : 0;

  return (
    <div className="flex items-center gap-3 w-52 bg-zinc-100/80 border border-zinc-200/50 rounded-2xl p-1.5 pr-4 shadow-sm select-none">
      <button 
        onClick={handlePlayPause}
        className="w-8 h-8 rounded-full bg-indigo-600 hover:bg-indigo-700 active:scale-95 flex items-center justify-center text-white shrink-0 transition-all shadow-sm cursor-pointer"
      >
        {isPlaying ? <Pause size={14} fill="currentColor" /> : <Play size={14} className="ml-0.5" fill="currentColor" />}
      </button>
      <div className="flex-1 flex flex-col justify-center">
        <div className="w-full h-1.5 bg-zinc-200 rounded-full overflow-hidden relative">
          <div 
            className="h-full bg-indigo-600 transition-all duration-75"
            style={{ width: `${percent}%` }}
          />
        </div>
        <div className="flex justify-between items-center mt-1">
          <span className="text-[9px] text-zinc-500 font-bold font-mono">
            {Math.floor(currentTime / 60)}:{(Math.floor(currentTime) % 60).toString().padStart(2, '0')}
          </span>
          <span className="text-[9px] text-zinc-400 font-bold font-mono">
            {Math.floor(totalDuration / 60)}:{(Math.floor(totalDuration) % 60).toString().padStart(2, '0')}
          </span>
        </div>
      </div>
    </div>
  );
}

const getDescriptiveLastMessage = (msg: any): string => {
  if (!msg) return "";
  const content = msg.content || msg.Content;
  if (content && content.trim() !== "") {
    return content;
  }
  
  const attachments = msg.attachments || msg.Attachments || [];
  if (attachments.length === 0) {
    const type = msg.type !== undefined ? msg.type : msg.Type;
    if (type === 'audio' || type === MessageType.Audio) return "🎤 Voice Note";
    if (type === 'image' || type === MessageType.Image) return "📷 Image";
    if (type === 'video' || type === MessageType.Video) return "🎥 Video";
    return "No messages yet";
  }

  // Count types
  let imgCount = 0;
  let vidCount = 0;
  let audCount = 0;
  let fileCount = 0;
  let firstFileName = "";

  attachments.forEach((att: any) => {
    const type = att.type !== undefined ? att.type : att.Type;
    const contentType = (att.contentType || att.ContentType || "").toLowerCase();
    const fileName = att.fileName || att.FileName || "";
    const fileNameLower = fileName.toLowerCase();
    
    const isImg = type === MessageType.Image || type === 'image' || contentType.includes('image') || fileNameLower.match(/\.(jpg|jpeg|png|gif|webp|svg|bmp)$/);
    const isVid = type === MessageType.Video || type === 'video' || contentType.includes('video') || fileNameLower.match(/\.(mp4|webm|ogg|mov|avi|mkv)$/);
    const isAud = type === MessageType.Audio || type === 'audio' || contentType.includes('audio') || fileNameLower.match(/\.(mp3|wav|ogg|m4a|aac|flac)$/);

    if (isImg) {
      imgCount++;
    } else if (isVid) {
      vidCount++;
    } else if (isAud) {
      audCount++;
    } else {
      fileCount++;
      if (!firstFileName) {
        firstFileName = fileName;
      }
    }
  });

  // If there's only 1 attachment in total
  if (attachments.length === 1) {
    if (imgCount === 1) return "📷 Image";
    if (vidCount === 1) return "🎥 Video";
    if (audCount === 1) return "🎤 Voice Note";
    const name = attachments[0].fileName || attachments[0].FileName || firstFileName || "File";
    return `📎 ${name}`;
  }

  // If there are multiple attachments
  if (imgCount > 0 && vidCount === 0 && audCount === 0 && fileCount === 0) {
    return `📷 ${imgCount} images`;
  }
  if (vidCount > 0 && imgCount === 0 && audCount === 0 && fileCount === 0) {
    return `🎥 ${vidCount} videos`;
  }
  if (audCount > 0 && imgCount === 0 && vidCount === 0 && fileCount === 0) {
    return `🎤 ${audCount} voice notes`;
  }
  if (fileCount > 0 && imgCount === 0 && vidCount === 0 && audCount === 0) {
    return `📎 (${fileCount} files)`;
  }

  // Mixed attachments, prioritize listing or summary
  const total = attachments.length;
  if (vidCount > 0) {
    return `🎥 ${vidCount} video${vidCount > 1 ? 's' : ''}`;
  }
  if (imgCount > 0) {
    return `📷 ${imgCount} image${imgCount > 1 ? 's' : ''}`;
  }
  if (fileCount > 0) {
    return `📎 ${fileCount} file${fileCount > 1 ? 's' : ''}`;
  }
  return `📎 ${total} files`;
};

function AudioAttachmentPlayer({ mediaUrl, fileName, fileSize, isMe = false }: { mediaUrl?: string; fileName?: string; fileSize?: number; isMe?: boolean }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const progressBarRef = useRef<HTMLDivElement | null>(null);

  // Auto download voice notes so they are ready on play
  useEffect(() => {
    if (!mediaUrl) return;
    const audio = new Audio(mediaUrl);
    audio.preload = "auto";
    audio.load(); // Fetch immediately
    audioRef.current = audio;

    const handleLoadedMetadata = () => {
      if (audio.duration && !isNaN(audio.duration) && isFinite(audio.duration)) {
        setDuration(audio.duration);
      }
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    const handlePause = () => {
      setIsPlaying(false);
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('pause', handlePause);

    if (audio.readyState >= 1) {
      setDuration(audio.duration);
    }

    return () => {
      audio.pause();
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('pause', handlePause);
    };
  }, [mediaUrl]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      pauseAllAudio();
      setCurrentlyPlaying(audioRef.current);
      audioRef.current.playbackRate = playbackRate;
      audioRef.current.play().then(() => {
        setIsPlaying(true);
      }).catch(err => {
        console.error("Audio play failed:", err);
      });
    }
  };

  const toggleSpeed = () => {
    const nextSpeed = playbackRate === 1 ? 1.5 : playbackRate === 1.5 ? 2 : 1;
    setPlaybackRate(nextSpeed);
    if (audioRef.current) audioRef.current.playbackRate = nextSpeed;
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioRef.current || !progressBarRef.current || !duration) return;
    const rect = progressBarRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const width = rect.width;
    const clickPercent = Math.max(0, Math.min(1, clickX / width));
    const newTime = clickPercent * duration;
    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const formatTime = (timeSecs: number) => {
    if (isNaN(timeSecs) || !isFinite(timeSecs)) return "0:00";
    const mins = Math.floor(timeSecs / 60);
    const secs = Math.floor(timeSecs % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Coherent WhatsApp style waveform blocks/frequency bars
  // Coherent WhatsApp style waveform blocks/frequency bars
  const bars = useMemo(() => {
    const seed = mediaUrl || fileName || "voice_note_seed";
    const count = 28; // Standard WhatsApp number of blocks to prevent shrinking to 0px
    const result: number[] = [];
    let h = 0;
    for (let i = 0; i < seed.length; i++) {
      h = (h << 5) - h + seed.charCodeAt(i);
      h |= 0;
    }
    for (let i = 0; i < count; i++) {
      // Deterministic pseudo-random heights coherent with this voice note
      const pseudoRandom = Math.abs(Math.sin(h + i * 17)) * 75 + 25; // 25% to 100%
      result.push(Math.round(pseudoRandom));
    }
    return result;
  }, [mediaUrl, fileName]);

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="w-full max-w-[320px] bg-transparent flex items-center gap-3 select-none">
      <button
        onClick={togglePlay}
        className="w-9 h-9 rounded-full bg-[#00a884] hover:bg-[#008f70] active:scale-95 flex items-center justify-center text-white shrink-0 transition-all shadow-md cursor-pointer"
        title={isPlaying ? "Pause" : "Play"}
      >
        {isPlaying ? (
          <Pause size={14} fill="currentColor" />
        ) : (
          <Play size={14} className="ml-0.5" fill="currentColor" />
        )}
      </button>

      {/* Center: Waveform Slider and Times display */}
      <div className="flex-1 flex flex-col gap-1 px-1 min-w-0">
        <div 
          ref={progressBarRef}
          onClick={handleProgressClick}
          className="w-full flex items-end gap-[2px] h-7 cursor-pointer relative"
        >
          {bars.map((height, i) => {
            const barPercent = (i / bars.length) * 100;
            const isActive = progressPercent >= barPercent;
            return (
              <div 
                key={i}
                className={`w-[3px] min-w-[3px] md:w-[3.5px] md:min-w-[3.5px] rounded-full transition-all duration-75 ${
                  isActive 
                    ? 'bg-[#00a884]' 
                    : 'bg-black/30 dark:bg-white/30'
                }`}
                style={{ 
                  height: `${height}%`
                }}
              />
            );
          })}
        </div>
        <div className="flex justify-between items-center text-[10px] font-bold font-mono text-zinc-650 dark:text-zinc-300">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      {/* Speed Button on Right */}
      <button
        onClick={toggleSpeed}
        className="w-8 h-8 rounded-full bg-black/5 hover:bg-black/10 dark:bg-white/10 dark:hover:bg-white/15 flex items-center justify-center text-xs font-bold transition-all text-zinc-700 dark:text-zinc-200 shrink-0 border border-transparent cursor-pointer"
        title="Playback Speed"
      >
        {playbackRate}x
      </button>
    </div>
  );
}

function VideoPlayerOverlay({ mediaUrl, onClose }: { mediaUrl: string; onClose: () => void }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const progressBarRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!videoRef.current) return;
    const video = videoRef.current;

    const handleLoadedMetadata = () => {
      if (video.duration && !isNaN(video.duration) && isFinite(video.duration)) {
        setDuration(video.duration);
      }
    };

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('ended', handleEnded);

    if (video.readyState >= 1) {
      setDuration(video.duration);
    }

    return () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('ended', handleEnded);
    };
  }, [mediaUrl]);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.playbackRate = playbackRate;
      videoRef.current.play().then(() => {
        setIsPlaying(true);
      }).catch(err => {
        console.error("Video play failed:", err);
      });
    }
  };

  const toggleSpeed = () => {
    const nextSpeed = playbackRate === 1 ? 1.5 : playbackRate === 1.5 ? 2 : 1;
    setPlaybackRate(nextSpeed);
    if (videoRef.current) videoRef.current.playbackRate = nextSpeed;
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!videoRef.current || !progressBarRef.current || !duration) return;
    const rect = progressBarRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const width = rect.width;
    const clickPercent = Math.max(0, Math.min(1, clickX / width));
    const newTime = clickPercent * duration;
    videoRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const formatTime = (timeSecs: number) => {
    if (isNaN(timeSecs) || !isFinite(timeSecs)) return "0:00";
    const mins = Math.floor(timeSecs / 60);
    const secs = Math.floor(timeSecs % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="fixed inset-0 z-[100] bg-black/90 flex flex-col items-center justify-center p-4">
      <button onClick={onClose} className="absolute top-4 right-4 text-white p-2 z-[101]">
        <X size={32} />
      </button>

      <div className="relative w-full max-w-4xl flex flex-col items-center group">
        <video 
          ref={videoRef}
          src={mediaUrl || undefined} 
          className="max-w-full max-h-[80vh] rounded-lg shadow-2xl cursor-pointer" 
          onClick={togglePlay}
          playsInline
        />

        {/* Video Controls Overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-b-lg flex flex-col gap-2">
          
          <div 
            ref={progressBarRef}
            onClick={handleProgressClick}
            className="w-full h-1.5 bg-white/30 rounded-full overflow-hidden cursor-pointer relative"
          >
            <div 
              className="h-full bg-emerald-500 rounded-full transition-all duration-75"
              style={{ width: `${progressPercent}%` }}
            />
            {/* Thumb */}
            <div 
              className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-emerald-500 rounded-full shadow-sm -ml-1.5"
              style={{ left: `${progressPercent}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-white mt-1">
            <div className="flex items-center gap-4">
              <button onClick={togglePlay} className="hover:text-emerald-400 transition-colors">
                {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" />}
              </button>
              <div className="text-xs font-mono font-medium opacity-90">
                {formatTime(currentTime)} / {formatTime(duration)}
              </div>
            </div>

            <button 
              onClick={toggleSpeed}
              className="px-2 py-1 bg-white/10 hover:bg-white/20 rounded text-xs font-bold transition-all"
            >
              {playbackRate}x
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

interface AudioRecordingVisualizerProps {
  stream: MediaStream | null;
  isRecording: boolean;
}

function AudioRecordingVisualizer({ stream, isRecording }: AudioRecordingVisualizerProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!stream || !isRecording) return;

    let audioCtx: AudioContext | null = null;
    let source: MediaStreamAudioSourceNode | null = null;
    let analyser: AnalyserNode | null = null;
    let animationId: number;

    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      audioCtx = new AudioContextClass();
      source = audioCtx.createMediaStreamSource(stream);
      analyser = audioCtx.createAnalyser();
      
      analyser.fftSize = 64; 
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      
      source.connect(analyser);

      const updateWaveform = () => {
        if (!analyser || !containerRef.current) return;
        analyser.getByteFrequencyData(dataArray);

        const bars = containerRef.current.children;
        const len = Math.min(bars.length, bufferLength);
        
        for (let i = 0; i < len; i++) {
          const bar = bars[i] as HTMLDivElement;
          if (bar) {
            const value = dataArray[i];
            const height = Math.max(4, (value / 255) * 24);
            bar.style.height = `${height}px`;
          }
        }

        animationId = requestAnimationFrame(updateWaveform);
      };

      updateWaveform();
    } catch (e) {
      console.warn("Web Audio API not supported or failed to initialize:", e);
    }

    return () => {
      if (animationId) cancelAnimationFrame(animationId);
      if (source) source.disconnect();
      if (audioCtx && audioCtx.state !== 'closed') {
        audioCtx.close().catch(() => {});
      }
    };
  }, [stream, isRecording]);

  return (
    <div ref={containerRef} className="flex gap-0.5 items-center h-6 px-1.5 bg-red-100/50 dark:bg-red-950/20 rounded-full border border-red-200/50 dark:border-red-900/30">
      {[...Array(14)].map((_, i) => (
        <div 
          key={i} 
          className="w-[2.5px] bg-red-500 rounded-full transition-all duration-75"
          style={{ height: '4px' }}
        />
      ))}
    </div>
  );
}

type ChatRoom = {
  id: string;
  name: string;
  lastMessage: string;
  time: string;
  unread: number;
  isGroup: boolean;
  description?: string;
  participants: any[];
  imageUrl?: string;
  lastMessageSenderId?: number;
  lastMessageSentAt?: string;
};

export default function Chats({ onChatActive, onRefreshPage }: { onChatActive: (isActive: boolean) => void, onRefreshPage?: () => void }) {
  const [localChatList, setLocalChatList] = useState<ChatRoom[]>([]);
  const [activeChat, setActiveChat] = useState<ChatRoom | null>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [replyTo, setReplyTo] = useState<{ id: string, text: string } | null>(null);
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);
  const [overlayMessage, setOverlayMessage] = useState<any>(null);
  const [previewItems, setPreviewItems] = useState<any[]>([]);
  const [previewIndex, setPreviewIndex] = useState<number>(0);

  const handleOpenMediaPreview = (items: any[], activeIdx: number) => {
    const formatted = items.map(item => {
      const path = item.filePath || item.FilePath;
      const url = getImageUrl(path);
      return {
        type: (item.isImg || item.type === MessageType.Image || (item.contentType && item.contentType.toLowerCase().includes('image'))) ? 'image' : 'video',
        mediaUrl: url,
        fileName: item.fileName || item.FileName || ''
      };
    });
    setPreviewItems(formatted);
    setPreviewIndex(activeIdx);
    setOverlayMessage(formatted[activeIdx]);
  };
  const swipeTriggeredRef = useRef<boolean>(false);

  // User context
  const [currentUserId, setCurrentUserId] = useState<number>(0);
  const [onlineUsers, setOnlineUsers] = useState<Set<number>>(new Set());

  // Chat Bubble Theme and recording state enhancements
  const [chatThemeColor, setChatThemeColor] = useState(() => {
    return localStorage.getItem('chat_theme_color') || '#00A884';
  });

  const [recordingState, setRecordingState] = useState<'idle' | 'recording' | 'paused'>('idle');
  const [recordedBlobs, setRecordedBlobs] = useState<Blob[]>([]);
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(false);
  const [previewCurrentTime, setPreviewCurrentTime] = useState(0);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);
  const previewIntervalRef = useRef<number | null>(null);

  useEffect(() => {
    const handleStorageChange = () => {
      const color = localStorage.getItem('chat_theme_color') || '#00A884';
      setChatThemeColor(color);
    };
    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  // API Loading states
  const [isChatsLoading, setIsChatsLoading] = useState(false);
  const [isMessagesLoading, setIsMessagesLoading] = useState(false);
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const [chatGroupError, setChatGroupError] = useState('');
  const [isCreatingDirect, setIsCreatingDirect] = useState(false);
  const [chatDirectError, setChatDirectError] = useState('');

  // Audio / Recording states
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [recordingStream, setRecordingStream] = useState<MediaStream | null>(null);
  const recordingIntervalRef = useRef<number | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // File Inputs & Attachments
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaInputRef = useRef<HTMLInputElement>(null);
  const messageInputRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  
  // Modals / Overlays
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showDirectMessage, setShowDirectMessage] = useState(false);
  const [showChatInfo, setShowChatInfo] = useState(false);

  // Group creation inputs
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDescription, setNewGroupDescription] = useState('');
  const [newGroupParticipants, setNewGroupParticipants] = useState<number[]>([]);
  const [newGroupImage, setNewGroupImage] = useState<File | null>(null);
  const [newDirectUserId, setNewDirectUserId] = useState<number | null>(null);

  // App names list for selection
  const [availablePersons, setAvailablePersons] = useState<any[]>([]);

  // Cropping States
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [showCropper, setShowCropper] = useState(false);
  const [groupImagePreview, setGroupImagePreview] = useState<string | null>(null);
  const [cropperTarget, setCropperTarget] = useState<'create' | 'edit' | null>(null);

  // Group Editing & Deletion States
  const [isEditingGroupChat, setIsEditingGroupChat] = useState(false);
  const [editGroupName, setEditGroupName] = useState('');
  const [editGroupDescription, setEditGroupDescription] = useState('');
  const [editGroupImage, setEditGroupImage] = useState<File | null>(null);
  const [editGroupImagePreview, setEditGroupImagePreview] = useState<string | null>(null);
  const [isUpdatingGroup, setIsUpdatingGroup] = useState(false);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeletingChat, setIsDeletingChat] = useState(false);
  const [selectedToAdd, setSelectedToAdd] = useState<number[]>([]);
  const [pressedMessageRect, setPressedMessageRect] = useState<DOMRect | null>(null);

  // Inline Message Action states
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');

  // Long-press Selection & Forwarding States
  const [overlayMessageId, setOverlayMessageId] = useState<string | null>(null);
  const [showForwardDialog, setShowForwardDialog] = useState(false);
  const [messageToForward, setMessageToForward] = useState<any>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const touchStartPosRef = useRef<{ clientX: number, clientY: number } | null>(null);

  // Auto-filled Attachment field states (MessageAttachmentDto)
  const [showAttachmentModal, setShowAttachmentModal] = useState(false);
  const [attachmentFileName, setAttachmentFileName] = useState('');
  const [attachmentContentType, setAttachmentContentType] = useState('');
  const [attachmentFileSize, setAttachmentFileSize] = useState(0);
  const [attachmentPathBase64, setAttachmentPathBase64] = useState('');
  const [attachmentThumbnailPath, setAttachmentThumbnailPath] = useState('');
  const [attachmentType, setAttachmentType] = useState<MessageType>(MessageType.File);
  const [attachmentCaption, setAttachmentCaption] = useState('');

  type MediaPreviewItem = {
    fileName: string;
    contentType: string;
    fileSize: number;
    pathBase64: string;
    type: MessageType;
  };
  const [mediaPreviews, setMediaPreviews] = useState<MediaPreviewItem[]>([]);
  const [mediaActiveIndex, setMediaActiveIndex] = useState(0);

  // Participant Management input
  const [recipientIdToAdd, setRecipientIdToAdd] = useState('');
  const [isManagingParticipants, setIsManagingParticipants] = useState(false);

  // Messages log list
  const [messages, setMessages] = useState<any[]>([]);

  // Fetch Current User Details to determine isMe
  useEffect(() => {
    try {
      const user = getUserDetails();
      if (user) {
        setCurrentUserId(user.id || user.Id || 0);
      }
      const appNames = getStoredAppNamesList();
      if (appNames) {
        const possibleArrays = [
          appNames,
          appNames.personIdNames,
          appNames.PersonIdNames,
          appNames.personNamesId,
          appNames.PersonNamesId,
          appNames.result?.personIdNames,
          appNames.result?.PersonIdNames,
          appNames.result?.personNamesId,
          appNames.result?.PersonNamesId,
          appNames.Result?.personIdNames,
          appNames.Result?.PersonIdNames,
          appNames.Result?.personNamesId,
          appNames.Result?.PersonNamesId,
          appNames.data?.personIdNames,
          appNames.data?.PersonIdNames,
          appNames.data?.personNamesId,
          appNames.data?.PersonNamesId,
          appNames.Data?.personIdNames,
          appNames.Data?.PersonIdNames,
          appNames.Data?.personNamesId,
          appNames.Data?.PersonNamesId,
        ];
        const foundArray = possibleArrays.find(arr => Array.isArray(arr));
        if (foundArray) {
          setAvailablePersons(foundArray);
        }
      }
    } catch (err) {
      console.warn("Could not retrieve current user details", err);
    }
  }, []);

  // Send active chat room joining update when user switches active chat
  useEffect(() => {
    if (activeChat && activeChat.id) {
      const numericId = parseInt(activeChat.id);
      if (!isNaN(numericId)) {
        joinChatRoom(numericId).catch(err => {
          console.warn("Join Chat API returned error:", err.message);
        });
      }

      // Invoke SignalR JoinChat on open
      const joinHub = async () => {
        try {
          if (String(homeSecurityHubConnection.state) === 'Connected') {
            await homeSecurityHubConnection.invoke("JoinChat", Number(activeChat.id));
            console.log(`JoinChat invoked for room ${activeChat.id}`);
          } else {
            console.log(`Connection state is: ${homeSecurityHubConnection.state}, waiting or auto-started`);
            // Attempt starts if disconnected
            await startHomeSecurityHub();
            if (String(homeSecurityHubConnection.state) === 'Connected') {
              await homeSecurityHubConnection.invoke("JoinChat", Number(activeChat.id));
              console.log(`JoinChat successfully invoked after start for ${activeChat.id}`);
            }
          }
        } catch (e: any) {
          console.warn(`Could not invoke JoinHub for room ${activeChat.id}:`, e.message);
        }
      };
      joinHub();
    }
  }, [activeChat?.id]);

  // Keep references to active States for Event Listeners
  const activeChatRef = useRef<ChatRoom | null>(null);
  useEffect(() => {
    (window as any).__activeChatId = activeChat?.id || null;
    activeChatRef.current = activeChat;
    setIsSearchingMessages(false);
    setMessageSearchQuery('');
  }, [activeChat]);

  const currentUserIdRef = useRef<number>(0);
  useEffect(() => {
    currentUserIdRef.current = currentUserId;
  }, [currentUserId]);

  const getMessageTickColor = (msg: any) => {
    if (msg.error) return 'text-red-500';
    if (!activeChat) return msg.isMe ? 'text-white/60' : 'text-zinc-400';

    const isMe = msg.isMe;

    if (isMe) {
      const recipientParticipants = (activeChat.participants || []).filter(
        p => Number(p.personId || p.PersonId || p.id || p.Id) !== Number(currentUserId)
      );

      if (recipientParticipants.length === 0) return 'text-white/60';

      const isGroupChat = activeChat.isGroup || activeChat.IsGroup;

      if (isGroupChat) {
        // Find the last message in the chat
        const lastMsg = messages[messages.length - 1];
        if (!lastMsg) return 'text-white/60';
        const lastMsgTime = new Date(lastMsg.sentAt || lastMsg.SentAt || 0).getTime();

        // If the last read at of all the recipient participants is greater than the time the last message was sent, blue tick
        const allRead = recipientParticipants.every(p => {
          const pReadAt = p.lastReadAt || p.LastReadAt;
          if (!pReadAt) return false;
          return new Date(pReadAt).getTime() >= lastMsgTime;
        });

        return allRead ? 'text-[#53bdeb]' : 'text-white/60';
      } else {
        // If the chat is not a group, if any of the messages is greater than the last read of the recipient, just double tick it (else blue tick)
        const msgTime = new Date(msg.sentAt || msg.SentAt || 0).getTime();
        const recipient = recipientParticipants[0];
        if (!recipient) return 'text-white/60';
        
        const pReadAt = recipient.lastReadAt || recipient.LastReadAt;
        if (!pReadAt) return 'text-white/60';

        const isUnread = msgTime > new Date(pReadAt).getTime();
        return isUnread ? 'text-white/60' : 'text-[#53bdeb]';
      }
    } else {
      // Message received from the recipient
      const myParticipant = (activeChat.participants || []).find(
        p => Number(p.personId || p.PersonId || p.id || p.Id) === Number(currentUserId)
      );
      if (!myParticipant) return 'text-zinc-400';

      const myReadAt = myParticipant.lastReadAt || myParticipant.LastReadAt;
      if (!myReadAt) return 'text-zinc-400';

      const msgTime = new Date(msg.sentAt || msg.SentAt || 0).getTime();
      const isUnread = msgTime > new Date(myReadAt).getTime();
      return isUnread ? 'text-zinc-400' : 'text-[#53bdeb]';
    }
  };

  const renderMsgAttachments = (msg: any) => {
    if (!msg.attachments || msg.attachments.length === 0) return null;

    // Split attachments into media and non-media
    const mediaItems: any[] = [];
    const nonMediaItems: any[] = [];

    msg.attachments.forEach((att: any) => {
      const name = att.fileName || att.FileName || 'Attachment';
      const cType = (att.contentType || att.ContentType || '').toLowerCase();
      const typeVal = att.type !== undefined ? att.type : att.Type;

      const isImg = cType.includes('image') || 
                    typeVal === MessageType.Image || 
                    typeVal === 'Image' || 
                    typeVal === 1 ||
                    name.toLowerCase().match(/\.(jpg|jpeg|png|gif|webp|svg|bmp)$/);
                    
      const isVid = cType.includes('video') || 
                    typeVal === MessageType.Video || 
                    typeVal === 'Video' || 
                    typeVal === 3 || 
                    name.toLowerCase().match(/\.(mp4|webm|ogg|mov|avi|mkv)$/);

      if (isImg || isVid) {
        mediaItems.push({ ...att, isImg, isVid });
      } else {
        nonMediaItems.push(att);
      }
    });

    const renderedElements: React.ReactNode[] = [];

    // 1. Render Media Gallery if we have media items
    if (mediaItems.length > 0) {
      if (mediaItems.length === 1) {
        const att = mediaItems[0];
        const path = att.filePath || att.FilePath;
        const url = getImageUrl(path);
        const name = att.fileName || att.FileName || 'Attachment';
        
        if (att.isImg && url) {
          renderedElements.push(
            <div key="media-0" className="relative overflow-hidden rounded-lg border border-black/10 shadow-sm max-w-full">
              <img 
                src={url} 
                alt={name} 
                className="rounded-lg max-h-56 object-cover w-full cursor-pointer hover:opacity-95 transition-opacity" 
                referrerPolicy="no-referrer"
                onClick={() => handleOpenMediaPreview(mediaItems, 0)}
              />
            </div>
          );
        } else if (att.isVid && url) {
          renderedElements.push(
            <div key="media-0" className="relative overflow-hidden rounded-lg border border-black/10 bg-black/5 p-1 max-w-full">
              <video 
                src={url} 
                controls 
                className="rounded-lg max-h-56 w-full object-contain cursor-pointer" 
                preload="metadata"
                onClick={() => handleOpenMediaPreview(mediaItems, 0)}
              />
            </div>
          );
        }
      } else if (mediaItems.length === 2) {
        // Split the div into 2 columns
        renderedElements.push(
          <div key="media-gallery" className="grid grid-cols-2 gap-1 rounded-xl overflow-hidden w-full h-36 border border-black/10 shadow-sm bg-black/5">
            {mediaItems.map((att, idx) => {
              const path = att.filePath || att.FilePath;
              const url = getImageUrl(path);
              const name = att.fileName || att.FileName || 'Attachment';
              return (
                <div 
                  key={idx} 
                  className="relative h-full w-full cursor-pointer hover:opacity-90 transition-opacity bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center overflow-hidden"
                  onClick={() => handleOpenMediaPreview(mediaItems, idx)}
                >
                  {att.isImg ? (
                    <img src={url} alt={name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="w-full h-full relative flex items-center justify-center">
                      <video src={url} className="w-full h-full object-cover" preload="metadata" />
                      <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                        <Play size={24} className="text-white" fill="currentColor" />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        );
      } else if (mediaItems.length === 3) {
        // 2 up, 1 below
        renderedElements.push(
          <div key="media-gallery" className="grid grid-cols-2 gap-1 rounded-xl overflow-hidden w-full border border-black/10 shadow-sm bg-black/5">
            {/* First 2 items in top row */}
            {mediaItems.slice(0, 2).map((att, idx) => {
              const path = att.filePath || att.FilePath;
              const url = getImageUrl(path);
              const name = att.fileName || att.FileName || 'Attachment';
              return (
                <div 
                  key={idx} 
                  className="h-24 cursor-pointer hover:opacity-90 transition-opacity bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center overflow-hidden"
                  onClick={() => handleOpenMediaPreview(mediaItems, idx)}
                >
                  {att.isImg ? (
                    <img src={url} alt={name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="w-full h-full relative flex items-center justify-center">
                      <video src={url} className="w-full h-full object-cover" preload="metadata" />
                      <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                        <Play size={20} className="text-white" fill="currentColor" />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
            {/* 3rd item at the bottom takes full width (col-span-2) */}
            {(() => {
              const att = mediaItems[2];
              const path = att.filePath || att.FilePath;
              const url = getImageUrl(path);
              const name = att.fileName || att.FileName || 'Attachment';
              return (
                <div 
                  key={2} 
                  className="col-span-2 h-28 cursor-pointer hover:opacity-90 transition-opacity bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center overflow-hidden"
                  onClick={() => handleOpenMediaPreview(mediaItems, 2)}
                >
                  {att.isImg ? (
                    <img src={url} alt={name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="w-full h-full relative flex items-center justify-center">
                      <video src={url} className="w-full h-full object-cover" preload="metadata" />
                      <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                        <Play size={24} className="text-white" fill="currentColor" />
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        );
      } else {
        // 4 or more: square layout of first 4, with overlay on the 4th
        const hasMore = mediaItems.length > 4;
        renderedElements.push(
          <div key="media-gallery" className="grid grid-cols-2 gap-1 rounded-xl overflow-hidden w-full border border-black/10 shadow-sm bg-black/5">
            {mediaItems.slice(0, 4).map((att, idx) => {
              const path = att.filePath || att.FilePath;
              const url = getImageUrl(path);
              const name = att.fileName || att.FileName || 'Attachment';
              const isLast = idx === 3;

              return (
                <div 
                  key={idx} 
                  className="h-24 relative cursor-pointer hover:opacity-90 transition-opacity bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center overflow-hidden"
                  onClick={() => handleOpenMediaPreview(mediaItems, idx)}
                >
                  {att.isImg ? (
                    <img src={url} alt={name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="w-full h-full relative flex items-center justify-center">
                      <video src={url} className="w-full h-full object-cover" preload="metadata" />
                      <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                        <Play size={20} className="text-white" fill="currentColor" />
                      </div>
                    </div>
                  )}
                  
                  {isLast && hasMore && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white font-extrabold text-lg tracking-wider">
                      +{mediaItems.length - 3}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        );
      }
    }

    // 2. Render Non-Media Items (Audio, PDF, Files, etc.)
    nonMediaItems.forEach((att, idx) => {
      const path = att.filePath || att.FilePath;
      const url = getImageUrl(path);
      const name = att.fileName || att.FileName || 'Attachment';
      const cType = (att.contentType || att.ContentType || '').toLowerCase();
      const typeVal = att.type !== undefined ? att.type : att.Type;

      const isAud = cType.includes('audio') || 
                    typeVal === MessageType.Audio || 
                    typeVal === 'Audio' || 
                    typeVal === 2 || 
                    name.toLowerCase().match(/\.(mp3|wav|ogg|m4a|aac|flac)$/);

      if (isAud) {
        renderedElements.push(
          <div key={`non-media-${idx}`} className="w-full mt-1">
            <AudioAttachmentPlayer mediaUrl={url} fileName={name} fileSize={att.fileSize || att.FileSize} isMe={msg.isMe} />
          </div>
        );
      } else {
        renderedElements.push(
          <div 
            key={`non-media-${idx}`}
            className="flex items-center gap-2.5 p-2 bg-black/5 dark:bg-white/10 hover:bg-black/10 hover:dark:bg-white/15 rounded-xl border border-zinc-200/40 text-zinc-800 dark:text-zinc-100 transition-all text-xs w-full"
          >
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-600 shrink-0">
              <FileText size={16} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold truncate text-zinc-800 dark:text-zinc-100">{name}</p>
              <p className="text-[10px] text-zinc-500">{att.fileSize || att.FileSize ? `${((att.fileSize || att.FileSize) / 1024).toFixed(1)} KB` : 'Document'}</p>
            </div>
            <a 
              href={url} 
              download={name} 
              className="p-1.5 text-zinc-500 hover:text-[#53bdeb] dark:text-zinc-400 rounded-lg bg-white dark:bg-zinc-800 shadow-sm border border-zinc-200/50 hover:scale-105 transition-all cursor-pointer"
              title="Download File"
            >
              <Download size={12} />
            </a>
          </div>
        );
      }
    });

    return (
      <div className="flex flex-col gap-2 max-w-sm mt-1">
        {renderedElements}
      </div>
    );
  };

  const [typingUsers, setTypingUsers] = useState<{ [chatId: string]: { name: string, action: string }[] }>({});

  useEffect(() => {
    // WebSocket real-time event listeners
    const handleMessageSent = (msg: any) => {
      if (!msg) return;
      const chatIdStr = (msg.chatId || msg.ChatId)?.toString();
      if (!chatIdStr) return;

      const currentActive = activeChatRef.current;
      const currentUid = currentUserIdRef.current;

      const senderId = Number(msg.senderPersonId || msg.SenderPersonId);
      if (senderId && senderId !== currentUid) {
        // Trigger incoming haptic vibration
        triggerHaptic('incoming');
        
        // Silently mark as read when message is received
        fetch(`https://kv5zhpcr-7190.uks1.devtunnels.ms/Home_Security/Message/MarkAsRead?chatId=${chatIdStr}`, {
          method: 'GET',
          headers: {
            'accept': '*/*'
          }
        }).catch(() => {});

        setOnlineUsers(prev => {
          if (!prev.has(senderId)) {
            const next = new Set(prev);
            next.add(senderId);
            return next;
          }
          return prev;
        });
      }

      // 1. If this message is for the currently active chat, append it to visual logs
      if (currentActive && chatIdStr === currentActive.id) {
        setMessages(prev => {
          const isMe = (msg.senderPersonId || msg.SenderPersonId) === currentUid;
          if (isMe) return prev;
          const msgId = (msg.id || msg.Id || '').toString();
          if (!msgId || prev.some(m => m.id === msgId)) return prev;
          
          const mapped = {
            id: msgId,
            text: msg.content || msg.Content || '',
            time: new Date(msg.sentAt || msg.SentAt || new Date()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            sentAt: msg.sentAt || msg.SentAt || new Date().toISOString(),
            isMe: isMe,
            senderName: msg.senderName || msg.SenderName || 'Anonymous',
            type: msg.type === MessageType.Image ? 'image' : msg.type === MessageType.Audio ? 'audio' : 'text',
            mediaUrl: msg.attachments && msg.attachments.length > 0 ? (msg.attachments[0].fileUrl || msg.attachments[0].filePath || msg.attachments[0].FilePath) : undefined,
            attachments: msg.attachments || [],
            replyToMessageId: msg.replyToMessageId || msg.ReplyToMessageId || msg.replyTo?.id || msg.ReplyTo?.Id,
            replyTo: msg.replyTo || msg.ReplyTo
          };
          const next = [...prev, mapped];
          saveData(STORES.MESSAGES, { chatId: currentActive.id, list: next }).catch(() => {});
          return next;
        });
        setTimeout(() => scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight), 100);
      }

      // 2. Clear typing status for this sender now that they successfully sent a message
      const senderName = msg.senderName || msg.SenderName || '';
      if (senderName) {
        setTypingUsers(prev => {
          const current = prev[chatIdStr] || [];
          return { ...prev, [chatIdStr]: current.filter(n => n !== senderName) };
        });
      }

      // 3. Update the chat sidebar & IndexedDB cache
      setLocalChatList(prevList => {
        let updatedItem: any = null;
        const nextList = prevList.map(c => {
          if (c.id === chatIdStr) {
            updatedItem = {
              ...c,
              lastMessage: getDescriptiveLastMessage(msg),
              time: new Date(msg.sentAt || msg.SentAt || new Date()).toLocaleDateString([], { month: 'short', day: 'numeric' }),
              unread: (msg.senderPersonId || msg.SenderPersonId) === currentUid ? c.unread : c.unread + 1,
              lastMessageSenderId: msg.senderPersonId || msg.SenderPersonId || 0,
              lastMessageSentAt: msg.sentAt || msg.SentAt || new Date().toISOString()
            };
            saveData(STORES.CHATS, updatedItem).catch(() => {});
            return updatedItem;
          }
          return c;
        });
        if (updatedItem) {
          return [updatedItem, ...nextList.filter(c => c.id !== chatIdStr)];
        }
        return nextList;
      });
    };

    const handleMessageEdited = (msg: any) => {
      if (!msg) return;
      const chatIdStr = (msg.chatId || msg.ChatId)?.toString();
      if (!chatIdStr) return;

      const currentActive = activeChatRef.current;
      if (currentActive && chatIdStr === currentActive.id) {
        setMessages(prev => {
          const next = prev.map(m => {
            if (m.id === (msg.id || msg.Id).toString()) {
              return {
                ...m,
                text: msg.content || msg.Content || '',
                isEdited: true
              };
            }
            return m;
          });
          saveData(STORES.MESSAGES, { chatId: currentActive.id, list: next }).catch(() => {});
          return next;
        });
      }

      setLocalChatList(prevList => {
        return prevList.map(c => {
          if (c.id === chatIdStr) {
            const updated = {
              ...c,
              lastMessage: getDescriptiveLastMessage(msg) || c.lastMessage
            };
            saveData(STORES.CHATS, updated).catch(() => {});
            return updated;
          }
          return c;
        });
      });
    };

    const handleMessageDeleted = (pkg: any) => {
      if (!pkg) return;
      const chatIdStr = (pkg.chatId || pkg.ChatId)?.toString();
      const msgIdStr = (pkg.messageId || pkg.MessageId)?.toString();
      if (!chatIdStr || !msgIdStr) return;

      const currentActive = activeChatRef.current;
      if (currentActive && chatIdStr === currentActive.id) {
        setMessages(prev => {
          const next = prev.filter(m => m.id !== msgIdStr);
          saveData(STORES.MESSAGES, { chatId: currentActive.id, list: next }).catch(() => {});
          return next;
        });
      }
    };

    const handleUserTyping = (dto: any) => {
      if (!dto) return;
      const chatIdStr = (dto.chatId || dto.ChatId)?.toString();
      if (!chatIdStr) return;

      const senderName = dto.senderName || dto.SenderName || "Someone";
      const currentUid = currentUserIdRef.current;
      const senderPersonId = dto.senderPersonId || dto.SenderPersonId || dto.personId || dto.PersonId;
      
      // Ignore typing broadcasts initiated by the logged in user themselves
      if (senderPersonId === currentUid) return;

      const action = dto.action || dto.Action || 'typing';

      // Play sound only if it's a new or changed typing action
      const prevTyping = typingUsers[chatIdStr] || [];
      const isNew = !prevTyping.some(t => t.name === senderName);
      if (isNew) {
        if (action.includes('recording')) {
          playNotificationSound('recording');
        } else {
          playNotificationSound('typingKeyStroke');
        }
      }

      setTypingUsers(prev => {
        const current = prev[chatIdStr] || [];
        const existing = current.find(t => t.name === senderName);
        if (existing) {
          if (existing.action === action) return prev;
          return { ...prev, [chatIdStr]: current.map(t => t.name === senderName ? { name: senderName, action } : t) };
        }
        return { ...prev, [chatIdStr]: [...current, { name: senderName, action }] };
      });

      // Clear after 5 seconds of inactivity
      setTimeout(() => {
        setTypingUsers(prev => {
          const current = prev[chatIdStr] || [];
          return { ...prev, [chatIdStr]: current.filter(t => t.name !== senderName) };
        });
      }, 5000);
    };

    const handleChatCreated = (chat: any) => {
      if (!chat) return;
      const chatIdStr = (chat.id || chat.Id).toString();
      setLocalChatList(prev => {
        if (prev.some(c => c.id === chatIdStr)) return prev;
        const mapped = {
          id: chatIdStr,
          name: chat.name || chat.Name || 'New Chat',
          lastMessage: getDescriptiveLastMessage(chat.lastMessage || chat.LastMessage) || 'Created chat',
          time: (chat.lastMessage?.sentAt || chat.LastMessage?.SentAt) ? new Date(chat.lastMessage?.sentAt || chat.LastMessage?.SentAt).toLocaleDateString([], { month: 'short', day: 'numeric' }) : 'Now',
          unread: chat.unreadCount || chat.UnreadCount || 0,
          isGroup: chat.isGroup || chat.IsGroup || false,
          description: chat.description || chat.Description || '',
          imgUrl: chat.imageUrl || chat.ImageUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop',
          participants: chat.participants || chat.Participants || [],
          lastMessageSentAt: chat.lastMessage?.sentAt || chat.LastMessage?.SentAt || new Date().toISOString()
        };
        saveData(STORES.CHATS, mapped).catch(() => {});
        return [mapped, ...prev];
      });
    };

    const handleGroupChatUpdated = (chat: any) => {
      if (!chat) return;
      const chatIdStr = (chat.id || chat.Id).toString();
      setLocalChatList(prev => {
        const next = prev.map(c => {
          if (c.id === chatIdStr) {
            const updated = {
              ...c,
              name: chat.name || chat.Name || c.name,
              description: chat.description || chat.Description || c.description,
              imgUrl: chat.imageUrl || chat.ImageUrl || c.imgUrl,
              participants: chat.participants || chat.Participants || c.participants
            };
            saveData(STORES.CHATS, updated).catch(() => {});
            return updated;
          }
          return c;
        });
        return next;
      });

      const currentActive = activeChatRef.current;
      if (currentActive && currentActive.id === chatIdStr) {
        setActiveChat(prev => {
          if (!prev) return null;
          return {
            ...prev,
            name: chat.name || chat.Name || prev.name,
            description: chat.description || chat.Description || prev.description,
            imgUrl: chat.imageUrl || chat.ImageUrl || prev.imgUrl,
            participants: chat.participants || chat.Participants || prev.participants
          };
        });
      }
    };

    const handleChatDeleted = (pkg: any) => {
      if (!pkg) return;
      const chatIdStr = (pkg.chatId || pkg.ChatId).toString();
      setLocalChatList(prev => prev.filter(c => c.id !== chatIdStr));
      const currentActive = activeChatRef.current;
      if (currentActive && currentActive.id === chatIdStr) {
        setActiveChat(null);
      }
    };

    const handleParticipantsAdded = (pkg: any) => {
      if (!pkg) return;
      const list = Array.isArray(pkg) ? pkg : [pkg];
      if (list.length === 0) return;
      const chatIdStr = (list[0].chatId || list[0].ChatId).toString();

      const updateList = (participants: any[]) => {
        const existing = participants || [];
        const added = list.filter(item => !existing.some(p => p.personId === (item.personId || item.PersonId)))
                          .map(item => ({
                             personId: item.personId || item.PersonId,
                             isAdmin: item.isAdmin || item.IsAdmin || false,
                             fullName: item.fullName || item.FullName || "",
                             profileImageUrl: item.profileImageUrl || item.ProfileImageUrl || null
                          }));
        return [...existing, ...added];
      };

      setLocalChatList(prev => {
        return prev.map(c => {
          if (c.id === chatIdStr) {
            const updated = {
              ...c,
              participants: updateList(c.participants)
            };
            saveData(STORES.CHATS, updated).catch(() => {});
            return updated;
          }
          return c;
        });
      });

      const currentActive = activeChatRef.current;
      if (currentActive && currentActive.id === chatIdStr) {
        setActiveChat(prev => {
          if (!prev) return null;
          return {
            ...prev,
            participants: updateList(prev.participants)
          };
        });
      }
    };

    const handleParticipantRemoved = (pkg: any) => {
      if (!pkg) return;
      const chatIdStr = (pkg.chatId || pkg.ChatId).toString();
      const pid = pkg.personId || pkg.PersonId;
      if (!chatIdStr || !pid) return;

      const removePid = (participants: any[]) => {
        return (participants || []).filter(p => p.personId !== pid);
      };

      setLocalChatList(prev => {
        return prev.map(c => {
          if (c.id === chatIdStr) {
            const updated = {
              ...c,
              participants: removePid(c.participants)
            };
            saveData(STORES.CHATS, updated).catch(() => {});
            return updated;
          }
          return c;
        });
      });

      const currentActive = activeChatRef.current;
      if (currentActive && currentActive.id === chatIdStr) {
        setActiveChat(prev => {
          if (!prev) return null;
          return {
            ...prev,
            participants: removePid(prev.participants)
          };
        });
      }
    };

    const handleMessagesRead = (pkg: any) => {
      if (!pkg) return;
      const chatIdStr = (pkg.chatId || pkg.ChatId || "").toString();
      const pid = Number(pkg.personId || pkg.PersonId || 0);
      const readAtStr = pkg.readAt || pkg.ReadAt || new Date().toISOString();
      const currentUid = Number(currentUserIdRef.current);

      setLocalChatList(prev => {
        return prev.map(c => {
          if (c.id === chatIdStr) {
            let updatedUnread = c.unread;
            if (pid === currentUid) {
              updatedUnread = 0;
            }

            const updatedParticipants = (c.participants || []).map((p: any) => {
              const pIdNum = Number(p.personId || p.PersonId || p.id || p.Id || 0);
              
              if (pIdNum === pid) {
                return {
                  ...p,
                  lastReadAt: readAtStr,
                  LastReadAt: readAtStr
                };
              }
              return p;
            });

            const updatedChat = {
              ...c,
              unread: updatedUnread,
              participants: updatedParticipants,
              Participants: updatedParticipants
            };

            saveData(STORES.CHATS, updatedChat).catch(() => {});
            return updatedChat;
          }
          return c;
        });
      });

      setActiveChat(prev => {
        if (!prev || prev.id !== chatIdStr) return prev;
        
        const updatedParticipants = (prev.participants || []).map((p: any) => {
          const pIdNum = Number(p.personId || p.PersonId || p.id || p.Id || 0);
          
          if (pIdNum === pid) {
            return {
              ...p,
              lastReadAt: readAtStr,
              LastReadAt: readAtStr
            };
          }
          return p;
        });

        return {
          ...prev,
          participants: updatedParticipants,
          Participants: updatedParticipants
        };
      });
    };

    const extractPayload = (rawMsg: any) => {
      if (rawMsg && typeof rawMsg === 'object') {
        if ('result' in rawMsg && rawMsg.result) return rawMsg.result;
        if ('Result' in rawMsg && rawMsg.Result) return rawMsg.Result;
      }
      return rawMsg;
    };

    // Bind Hub connections
    const handleMessageSentWrapped = (...args: any[]) => { 
      console.log("[HOME_SIGNALR_EVENT: MessageSent]", ...args); 
      // If backend sends (user, message), the message is usually the object
      let msg = args[0];
      if (typeof args[0] === 'string' && args.length > 1 && typeof args[1] === 'object') {
        msg = args[1];
      }
      handleMessageSent(extractPayload(msg)); 
    };
    const handleReceiveMessageWrapped = (...args: any[]) => { 
      console.log("[HOME_SIGNALR_EVENT: ReceiveMessage]", ...args); 
      let msg = args[0];
      if (typeof args[0] === 'string' && args.length > 1 && typeof args[1] === 'object') {
        msg = args[1];
      }
      handleMessageSent(extractPayload(msg)); 
    };
    const handleMessageEditedWrapped = (...args: any[]) => { console.log("[HOME_SIGNALR_EVENT: MessageEdited]", ...args); handleMessageEdited(extractPayload(args[0])); };
    const handleMessageDeletedWrapped = (...args: any[]) => { console.log("[HOME_SIGNALR_EVENT: MessageDeleted]", ...args); handleMessageDeleted(extractPayload(args[0])); };
    const handleUserTypingWrapped = (...args: any[]) => { console.log("[HOME_SIGNALR_EVENT: UserTyping]", ...args); handleUserTyping(extractPayload(args[0])); };
    const handleChatCreatedWrapped = (...args: any[]) => { console.log("[HOME_SIGNALR_EVENT: ChatCreated]", ...args); handleChatCreated(extractPayload(args[0])); };
    const handleGroupChatUpdatedWrapped = (...args: any[]) => { console.log("[HOME_SIGNALR_EVENT: GroupChatUpdated]", ...args); handleGroupChatUpdated(extractPayload(args[0])); };
    const handleChatDeletedWrapped = (...args: any[]) => { console.log("[HOME_SIGNALR_EVENT: ChatDeleted]", ...args); handleChatDeleted(extractPayload(args[0])); };
    const handleParticipantsAddedWrapped = (...args: any[]) => { console.log("[HOME_SIGNALR_EVENT: ParticipantsAdded]", ...args); handleParticipantsAdded(extractPayload(args[0])); };
    const handleParticipantRemovedWrapped = (...args: any[]) => { console.log("[HOME_SIGNALR_EVENT: ParticipantRemoved]", ...args); handleParticipantRemoved(extractPayload(args[0])); };
    const handleMessagesReadWrapped = (...args: any[]) => { console.log("[HOME_SIGNALR_EVENT: MessagesRead]", ...args); handleMessagesRead(extractPayload(args[0])); };
    const handleUpdateChatWrapped = (...args: any[]) => {
      console.log("[HOME_SIGNALR_EVENT: UpdateChat]", ...args);
      if (args.length >= 3 && args[0] === "MessagesRead") {
        handleMessagesRead(extractPayload(args[2]));
      } else if (args.length >= 3 && args[0] === "MessageDeleted") {
        handleMessageDeleted(extractPayload(args[2]));
      } else if (args.length === 1) {
        const payload = extractPayload(args[0]);
        if (payload && (payload.eventName === "MessagesRead" || payload.EventName === "MessagesRead" || payload.chatId)) {
          handleMessagesRead(payload);
        } else if (payload && (payload.eventName === "MessageDeleted" || payload.EventName === "MessageDeleted" || payload.isDeleted || payload.IsDeleted)) {
          handleMessageDeleted(payload);
        }
      }
    };
    const handleUserOnlineWrapped = (...args: any[]) => {
      console.log("[HOME_SIGNALR_EVENT: UserOnline]", ...args);
      const personId = Number(extractPayload(args[0]));
      if (!isNaN(personId)) {
        setOnlineUsers(prev => {
          const next = new Set(prev);
          next.add(personId);
          return next;
        });
      }
    };

    homeSecurityHubConnection.on("MessageSent", handleMessageSentWrapped);
    homeSecurityHubConnection.on("ReceiveMessage", handleReceiveMessageWrapped);
    homeSecurityHubConnection.on("MessageEdited", handleMessageEditedWrapped);
    homeSecurityHubConnection.on("MessageDeleted", handleMessageDeletedWrapped);
    homeSecurityHubConnection.on("UserTyping", handleUserTypingWrapped);
    homeSecurityHubConnection.on("ChatCreated", handleChatCreatedWrapped);
    homeSecurityHubConnection.on("GroupChatCreated", handleChatCreatedWrapped);
    homeSecurityHubConnection.on("GroupChatUpdated", handleGroupChatUpdatedWrapped);
    homeSecurityHubConnection.on("ChatDeleted", handleChatDeletedWrapped);
    homeSecurityHubConnection.on("ParticipantsAdded", handleParticipantsAddedWrapped);
    homeSecurityHubConnection.on("ParticipantRemoved", handleParticipantRemovedWrapped);
    homeSecurityHubConnection.on("MessagesRead", handleMessagesReadWrapped);
    homeSecurityHubConnection.on("UpdateChat", handleUpdateChatWrapped);
    homeSecurityHubConnection.on("UserOnline", handleUserOnlineWrapped);

    return () => {
      homeSecurityHubConnection.off("MessageSent", handleMessageSentWrapped);
      homeSecurityHubConnection.off("ReceiveMessage", handleReceiveMessageWrapped);
      homeSecurityHubConnection.off("MessageEdited", handleMessageEditedWrapped);
      homeSecurityHubConnection.off("MessageDeleted", handleMessageDeletedWrapped);
      homeSecurityHubConnection.off("UserTyping", handleUserTypingWrapped);
      homeSecurityHubConnection.off("ChatCreated", handleChatCreatedWrapped);
      homeSecurityHubConnection.off("GroupChatCreated", handleChatCreatedWrapped);
      homeSecurityHubConnection.off("GroupChatUpdated", handleGroupChatUpdatedWrapped);
      homeSecurityHubConnection.off("ChatDeleted", handleChatDeletedWrapped);
      homeSecurityHubConnection.off("ParticipantsAdded", handleParticipantsAddedWrapped);
      homeSecurityHubConnection.off("ParticipantRemoved", handleParticipantRemovedWrapped);
      homeSecurityHubConnection.off("MessagesRead", handleMessagesReadWrapped);
      homeSecurityHubConnection.off("UpdateChat", handleUpdateChatWrapped);
      homeSecurityHubConnection.off("UserOnline", handleUserOnlineWrapped);
    };
  }, []);

  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchingMessages, setIsSearchingMessages] = useState(false);
  const [messageSearchQuery, setMessageSearchQuery] = useState('');
  const [swipeOffset, setSwipeOffset] = useState<number>(0);
  const [swipingMessageId, setSwipingMessageId] = useState<string | null>(null);
  const [activeScrollDate, setActiveScrollDate] = useState<string>('');
  const [showDateBadge, setShowDateBadge] = useState<boolean>(false);
  const pullStartRef = useRef<number | null>(null);
  const listScrollRef = useRef<HTMLDivElement>(null);
  const longPressTimersRef = useRef<{ [msgId: string]: NodeJS.Timeout }>({});
  const dateBadgeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const getPartitionLabel = (dateStr: string) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    if (d.toDateString() === today.toDateString()) {
      return "TODAY";
    } else if (d.toDateString() === yesterday.toDateString()) {
      return "YESTERDAY";
    } else {
      return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase();
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    const el = listScrollRef.current;
    if (el && el.scrollTop === 0) {
      pullStartRef.current = e.touches[0].clientY;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (pullStartRef.current !== null && listScrollRef.current) {
      const currentY = e.touches[0].clientY;
      const deltaY = currentY - pullStartRef.current;
      if (deltaY > 0) {
        const distance = Math.min(80, deltaY * 0.5);
        setPullDistance(distance);
        if (distance > 5 && e.cancelable) {
          e.preventDefault();
        }
      }
    }
  };

  const handleTouchEnd = async () => {
    if (pullStartRef.current !== null) {
      pullStartRef.current = null;
      if (pullDistance >= 50) {
        setIsRefreshing(true);
        setPullDistance(55);
        try {
          await clearStore(STORES.CHATS);
        } catch (e) {
          console.warn("Could not clear chats cache:", e);
        }
        if (onRefreshPage) {
           onRefreshPage();
        } else {
           await fetchChats();
        }
        setTimeout(() => setIsRefreshing(false), 500);
      }
      setPullDistance(0);
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    const el = listScrollRef.current;
    if (el && el.scrollTop === 0) {
      pullStartRef.current = e.clientY;
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (pullStartRef.current !== null && listScrollRef.current) {
      const deltaY = e.clientY - pullStartRef.current;
      if (deltaY > 0) {
        const distance = Math.min(80, deltaY * 0.5);
        setPullDistance(distance);
      }
    }
  };

  const handleMouseUp = async () => {
    if (pullStartRef.current !== null) {
      pullStartRef.current = null;
      if (pullDistance >= 50) {
        setIsRefreshing(true);
        setPullDistance(55);
        try {
          await clearStore(STORES.CHATS);
        } catch (e) {
          console.warn("Could not clear chats cache:", e);
        }
        if (onRefreshPage) {
           onRefreshPage();
        } else {
           await fetchChats();
        }
        setTimeout(() => setIsRefreshing(false), 500);
      }
      setPullDistance(0);
    }
  };

  // Fetch all chats on component mount / navigation
  const fetchChats = async (silent = false) => {
    if (!silent && localChatList.length === 0) {
      setIsChatsLoading(true);
    }
    const timeoutPromise = new Promise<never>((_, reject) => 
      setTimeout(() => reject(new Error("Timeout")), 8000)
    );
    try {
      const data = await Promise.race([getMyChats(), timeoutPromise]);
      if (Array.isArray(data)) {
        const mapped = data.map((chat: any) => {
          let lastMsgText = "No messages yet";
          let lastMsgTime = "Just now";
          if (chat.lastMessage) {
            lastMsgText = getDescriptiveLastMessage(chat.lastMessage);
            lastMsgTime = new Date(chat.lastMessage.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          }

          return {
            id: chat.id.toString(),
            name: chat.name || (chat.isGroup ? "Group Chat" : "Direct Chat"),
            lastMessage: lastMsgText,
            time: lastMsgTime,
            unread: chat.unreadCount || 0,
            isGroup: !!chat.isGroup,
            description: chat.description || '',
            participants: chat.participants || [],
            imageUrl: chat.imageUrl || chat.ImageUrl || chat.imgUrl || chat.ImgUrl || '',
            lastMessageSenderId: chat.lastMessage ? (chat.lastMessage.senderPersonId || chat.lastMessage.SenderPersonId || 0) : 0,
            lastMessageSentAt: chat.lastMessage?.sentAt || chat.createdAt || chat.CreatedAt || new Date().toISOString()
          };
        });
        
        // Immediate set with raw counts
        setLocalChatList(mapped);
        
        // Save to IndexedDB cache
        Promise.all(mapped.map(chat => saveData(STORES.CHATS, chat))).catch(err => console.warn('Cache failed:', err));

        // Asynchronously query live unread counts for all loaded chats
        Promise.all(
          mapped.map(async (c: any) => {
            try {
              const res = await getUnreadCount(parseInt(c.id));
              const unread = typeof res === 'number' ? res : (res?.unreadCount ?? res?.count ?? 0);
              const updated = { ...c, unread };
              await saveData(STORES.CHATS, updated);
              return updated;
            } catch (err) {
              console.warn(`Unread check failed for chat ${c.id}:`, err);
              return c;
            }
          })
        ).then(updatedList => {
          setLocalChatList(updatedList);
        });
        
        return mapped;
      }
    } catch (err) {
      console.error("Failed to load real chats", err);
      if (!silent) {
        setLocalChatList([]);
      }
      return [];
    } finally {
      setIsChatsLoading(false);
    }
  };

  // Fetch All data from cache or network
  useEffect(() => {
    const loadInitial = async () => {
      try {
        const cached = await getAllData(STORES.CHATS);
        if (Array.isArray(cached) && cached.length > 0) {
          setLocalChatList(cached as ChatRoom[]);
          setIsChatsLoading(false);
          // Still fetch in background to sync
          fetchChats(true);
        } else {
          fetchChats();
        }
      } catch (err) {
        fetchChats();
      }
    };
    loadInitial();

    // Listen for storage changes from other components or SignalR
    const handleStorageChange = () => {
      const appNames = getStoredAppNamesList();
      if (appNames) {
        const possibleArrays = [
          appNames,
          appNames.personIdNames,
          appNames.PersonIdNames,
          appNames.personNamesId,
          appNames.PersonNamesId,
          appNames.result?.personIdNames,
          appNames.result?.PersonIdNames,
          appNames.result?.personNamesId,
          appNames.result?.PersonNamesId,
          appNames.Result?.personIdNames,
          appNames.Result?.PersonIdNames,
          appNames.Result?.personNamesId,
          appNames.Result?.PersonNamesId,
          appNames.data?.personIdNames,
          appNames.data?.PersonIdNames,
          appNames.data?.personNamesId,
          appNames.data?.PersonNamesId,
          appNames.Data?.personIdNames,
          appNames.Data?.PersonIdNames,
          appNames.Data?.personNamesId,
          appNames.Data?.PersonNamesId,
        ];
        const foundArray = possibleArrays.find(arr => Array.isArray(arr));
        if (foundArray) {
          setAvailablePersons(foundArray);
        }
      }
    };

    // Initial load
    handleStorageChange();

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('app_names_updated', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('app_names_updated', handleStorageChange);
    };
  }, []);

  // Automatically join all chat rooms on the SignalR connection as soon as they are loaded
  useEffect(() => {
    const joinAllActiveChats = async () => {
      if (localChatList.length > 0 && String(homeSecurityHubConnection.state) === 'Connected') {
        for (const chat of localChatList) {
          try {
            const parsedId = parseInt(chat.id);
            if (!isNaN(parsedId)) {
              await homeSecurityHubConnection.invoke("JoinChat", parsedId);
              console.log(`[SignalR] Auto-joined chat room: ${parsedId}`);
            }
          } catch (err: any) {
            console.warn(`[SignalR] Failed to auto-join chat room ${chat.id}:`, err.message);
          }
        }
      }
    };
    joinAllActiveChats();
  }, [localChatList, homeSecurityHubConnection.state]);

  // Set recording timer
  useEffect(() => {
    if (isRecording && recordingState === 'recording') {
      recordingIntervalRef.current = window.setInterval(() => {
        setRecordingDuration(d => d + 1);
      }, 1000);
    } else {
      if (recordingIntervalRef.current) clearInterval(recordingIntervalRef.current);
    }
    return () => {
      if (recordingIntervalRef.current) clearInterval(recordingIntervalRef.current);
    };
  }, [isRecording, recordingState]);

  // Handle active chat messages hook
  const loadActiveChatMessages = async (roomId: string) => {
    let hasCache = false;
    
    // Attempt to load from cache first
    try {
      const cached = await getData(STORES.MESSAGES, roomId);
      if (cached && (cached as any).list && (cached as any).list.length > 0) {
        setMessages((cached as any).list);
        hasCache = true;
        setTimeout(() => scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight), 50);
      }
    } catch (err) {
      console.warn("Cache load failed:", err);
    }

    if (!hasCache) {
      setIsMessagesLoading(true);
    }

    try {
      const parsedId = parseInt(roomId);
      console.log(`Loading messages for room: ${roomId}, parsedId: ${parsedId}`);
      if (!isNaN(parsedId)) {
        const r = await getChatMessages(parsedId, 1, 100);
        if (Array.isArray(r)) {
          const mappedMessages = r.map((msg: any) => ({
            id: msg.id.toString(),
            text: msg.content || '',
            time: new Date(msg.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            sentAt: msg.sentAt,
            isMe: msg.senderPersonId === currentUserId,
            senderName: msg.senderName || 'Anonymous',
            type: msg.type === MessageType.Image ? 'image' : msg.type === MessageType.Audio ? 'audio' : 'text',
            mediaUrl: msg.attachments && msg.attachments.length > 0 ? (msg.attachments[0].fileUrl || msg.attachments[0].filePath) : undefined,
            attachments: msg.attachments || [],
            replyToMessageId: msg.replyToMessageId || msg.ReplyToMessageId || msg.replyTo?.id || msg.ReplyTo?.Id,
            replyTo: msg.replyTo || msg.ReplyTo
          }));
          setMessages(mappedMessages);
          
          // Save to IndexedDB cache
          await saveData(STORES.MESSAGES, { chatId: roomId, list: mappedMessages });

          setTimeout(() => scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight), 100);
        } else {
          // Empty or invalid list
          setMessages([]);
        }
      }
    } catch (err) {
      console.warn("Failed to fetch messages from chat API, initializing with fallbacks", err);
    } finally {
      setIsMessagesLoading(false);
    }
  };

  useEffect(() => {
    if (activeChat?.id) {
      loadActiveChatMessages(activeChat.id);
    }
  }, [activeChat?.id, currentUserId]);

  // Handle notification to parent wrapper to disable layout frame tabs
  useEffect(() => {
    onChatActive(!!activeChat);
    return () => onChatActive(false);
  }, [activeChat, onChatActive]);

  // Update activeChatId in localStorage for notifications
  useEffect(() => {
    if (activeChat) {
      localStorage.setItem('activeChatId', activeChat.id);
    } else {
      localStorage.removeItem('activeChatId');
    }
  }, [activeChat]);

  // Send message implementation (Text)
  const handleSendMessage = async () => {
    triggerHaptic('light');
    if (!messageText.trim() || !activeChat) return;
    const txt = messageText;
    const currentReplyTo = replyTo;
    
    // Optimistic update
    const tempId = Date.now().toString();
    const localMessage = {
      id: tempId,
      text: txt,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      sentAt: new Date().toISOString(),
      isMe: true,
      senderName: 'You',
      type: 'text',
      attachments: [],
      replyToMessageId: currentReplyTo ? parseInt(currentReplyTo.id) : 0,
      pending: true
    };
    
    setMessages(prev => [...prev, localMessage]);
    setMessageText('');
    setReplyTo(null);
    setTimeout(() => scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight), 100);

    try {
      const payload = {
        chatId: parseInt(activeChat.id),
        content: txt,
        type: MessageType.Text,
        attachments: [],
        replyToMessageId: currentReplyTo ? parseInt(currentReplyTo.id) : 0
      };
      
      const res = await sendMessage(payload);
      
      if (res) {
        playNotificationSound('messageSent');
        
        // Replace localMessage with server response
        setMessages(prev => {
          const next = prev.map(m => m.id === tempId ? {
            ...m,
            id: (res.id || res.Id)?.toString(),
            text: res.content || res.Content || txt,
            time: new Date(res.sentAt || res.SentAt || new Date()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            replyToMessageId: res.replyToMessageId || res.ReplyToMessageId || (currentReplyTo ? parseInt(currentReplyTo.id) : 0),
            replyTo: res.replyTo || res.ReplyTo || currentReplyTo,
            pending: false
          } : m);
          saveData(STORES.MESSAGES, { chatId: activeChat.id, list: next }).catch(() => {});
          return next;
        });
      } else {
        // Fallback: Remove temporary message if sending failed
        setMessages(prev => prev.filter(m => m.id !== tempId));
      }
    } catch (err: any) {
      console.error("Failed to send message via API:", err);
      // Remove temporary message if sending failed
      setMessages(prev => prev.filter(m => m.id !== tempId));
    }
  };

  const deletePreviewItem = (e: React.MouseEvent, idxToDelete: number) => {
    e.stopPropagation();
    const updated = mediaPreviews.filter((_, idx) => idx !== idxToDelete);
    if (updated.length === 0) {
      handleCancelAttachment();
    } else {
      setMediaPreviews(updated);
      let nextActive = mediaActiveIndex;
      if (mediaActiveIndex >= updated.length) {
        nextActive = updated.length - 1;
      }
      setMediaActiveIndex(nextActive);
      const activeItem = updated[nextActive];
      if (activeItem) {
        setAttachmentFileName(activeItem.fileName);
        setAttachmentContentType(activeItem.contentType);
        setAttachmentFileSize(activeItem.fileSize);
        setAttachmentPathBase64(activeItem.pathBase64);
        setAttachmentType(activeItem.type);
      }
    }
  };

  // Convert File object to Base64 String and Auto-Populate Form Fields
  const handleAttachmentUpload = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const filesList = Array.from(e.target.files);
      const isMediaSelector = e.target.accept?.includes('image') || e.target.accept?.includes('video');

      if (isMediaSelector) {
        // Media Selector: Images and Videos (Can select multiple)
        const promises = filesList.map((file: any) => {
          return new Promise<MediaPreviewItem>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => {
              let determinedType = MessageType.File;
              if (file.type.startsWith('image/')) {
                determinedType = MessageType.Image;
              } else if (file.type.startsWith('video/')) {
                determinedType = MessageType.Video;
              }
              resolve({
                fileName: file.name,
                contentType: file.type || 'application/octet-stream',
                fileSize: file.size,
                pathBase64: reader.result as string,
                type: determinedType
              });
            };
            reader.readAsDataURL(file);
          });
        });

        Promise.all(promises).then((results) => {
          setMediaPreviews(results);
          setMediaActiveIndex(0);
          setAttachmentCaption('');
          
          // Compat fallbacks for modal compatibility
          setAttachmentFileName(results[0].fileName);
          setAttachmentContentType(results[0].contentType);
          setAttachmentFileSize(results[0].fileSize);
          setAttachmentPathBase64(results[0].pathBase64);
          setAttachmentType(results[0].type);
          
          setShowAttachmentModal(true);
        });
      } else {
        // General Attachment Input
        if (filesList.length > 1) {
          // If multiple files are selected, send each file selected as a message immediately
          filesList.forEach((file: any) => {
            let determinedType = MessageType.File;
            if (file.type.startsWith('image/')) {
              determinedType = MessageType.Image;
            } else if (file.type.startsWith('audio/')) {
              determinedType = MessageType.Audio;
            } else if (file.type.startsWith('video/')) {
              determinedType = MessageType.Video;
            }

            const reader = new FileReader();
            reader.onloadend = async () => {
              const base64Content = reader.result as string;
              const body = {
                chatId: parseInt(activeChat!.id),
                content: "",
                type: determinedType,
                attachments: [
                  {
                    fileName: file.name,
                    filePath: base64Content,
                    contentType: file.type || 'application/octet-stream',
                    fileSize: file.size,
                    thumbnailPath: "",
                    type: determinedType
                  }
                ]
              };

              try {
                const res = await sendMessage(body);
                if (res) {
                  setMessages(prev => {
                    const msgId = (res.id || res.Id)?.toString();
                    if (!msgId || prev.some(m => m.id === msgId)) return prev;
                    const mapped = {
                      id: msgId,
                      text: res.content || res.Content || file.name,
                      time: new Date(res.sentAt || res.SentAt || new Date()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                      sentAt: res.sentAt || res.SentAt || new Date().toISOString(),
                      isMe: true,
                      senderName: res.senderName || res.SenderName || 'You',
                      type: res.type === MessageType.Image ? 'image' : res.type === MessageType.Audio ? 'audio' : 'text',
                      mediaUrl: res.attachments && res.attachments.length > 0 ? (res.attachments[0].fileUrl || res.attachments[0].filePath || res.attachments[0].FilePath) : undefined,
                      attachments: res.attachments || []
                    };
                    const next = [...prev, mapped];
                    saveData(STORES.MESSAGES, { chatId: activeChat!.id, list: next }).catch(() => {});
                    return next;
                  });
                  setTimeout(() => scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight), 100);
                }
              } catch (err) {
                console.error("Failed sending file immediately:", err);
              }
            };
            reader.readAsDataURL(file);
          });
        } else {
          // Single file selected, show in preview modal
          const file: any = filesList[0];
          let determinedType = MessageType.File;
          if (file.type.startsWith('image/')) {
            determinedType = MessageType.Image;
          } else if (file.type.startsWith('audio/')) {
            determinedType = MessageType.Audio;
          } else if (file.type.startsWith('video/')) {
            determinedType = MessageType.Video;
          }

          const reader = new FileReader();
          reader.onloadend = () => {
            const base64Content = reader.result as string;
            
            setMediaPreviews([{
              fileName: file.name,
              contentType: file.type || 'application/octet-stream',
              fileSize: file.size,
              pathBase64: base64Content,
              type: determinedType
            }]);
            setMediaActiveIndex(0);

            setAttachmentFileName(file.name);
            setAttachmentContentType(file.type || 'application/octet-stream');
            setAttachmentFileSize(file.size);
            setAttachmentPathBase64(base64Content);
            setAttachmentThumbnailPath('');
            setAttachmentType(determinedType);
            setAttachmentCaption('');
            
            setShowAttachmentModal(true);
          };
          reader.readAsDataURL(file);
        }
      }
    }
  };

  // Cancel and clean up attachment modal state
  const handleCancelAttachment = () => {
    setShowAttachmentModal(false);
    setMediaPreviews([]);
    setMediaActiveIndex(0);
    setAttachmentFileName('');
    setAttachmentContentType('');
    setAttachmentFileSize(0);
    setAttachmentPathBase64('');
    setAttachmentThumbnailPath('');
    setAttachmentCaption('');
  };

  // Submit and send custom filled attachment
  const handleSendAttachment = async () => {
    if (!activeChat) return;

    // Construct attachments array from mediaPreviews
    const attachmentsToSend = mediaPreviews.map(p => ({
      fileName: p.fileName,
      filePath: p.pathBase64,
      contentType: p.contentType,
      fileSize: p.fileSize,
      thumbnailPath: "",
      type: p.type
    }));

    // If no mediaPreviews (fallback safety)
    if (attachmentsToSend.length === 0 && attachmentPathBase64) {
      attachmentsToSend.push({
        fileName: attachmentFileName,
        filePath: attachmentPathBase64,
        contentType: attachmentContentType,
        fileSize: attachmentFileSize,
        thumbnailPath: attachmentThumbnailPath,
        type: attachmentType
      });
    }

    const currentReplyTo = replyTo;

    const body = {
      chatId: parseInt(activeChat.id),
      content: attachmentCaption || "",
      type: attachmentsToSend.length === 1 ? attachmentsToSend[0].type : MessageType.File,
      attachments: attachmentsToSend,
      replyToMessageId: currentReplyTo ? parseInt(currentReplyTo.id) : 0
    };

    const tempId = "attach-temp-" + Date.now().toString();

    // Create a local optimistic message displaying base64 previews
    const optimisticMessage = {
      id: tempId,
      text: attachmentCaption || "",
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      sentAt: new Date().toISOString(),
      isMe: true,
      senderName: 'You',
      type: body.type === MessageType.Image ? 'image' : body.type === MessageType.Audio ? 'audio' : body.type === MessageType.Video ? 'video' : 'text',
      attachments: attachmentsToSend.map((att, idx) => ({
        id: idx.toString(),
        fileName: att.fileName,
        filePath: att.filePath, // Base64 content for local preview
        contentType: att.contentType,
        fileSize: att.fileSize,
        type: att.type
      })),
      replyToMessageId: currentReplyTo ? parseInt(currentReplyTo.id) : 0,
      pending: true
    };

    // Update UI list immediately with optimistic message
    setMessages(prev => [...prev, optimisticMessage]);
    setTimeout(() => scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight), 100);

    // Reset modals and form inputs immediately so user doesn't wait on upload
    setShowAttachmentModal(false);
    setMediaPreviews([]);
    setMediaActiveIndex(0);
    setAttachmentFileName('');
    setAttachmentContentType('');
    setAttachmentFileSize(0);
    setAttachmentPathBase64('');
    setAttachmentThumbnailPath('');
    setAttachmentCaption('');
    setReplyTo(null);

    setIsSendingMessage(true);

    try {
      const res = await sendMessage(body);
      console.log('SendAttachment Dto Success:', res);
      if (res) {
        setMessages(prev => {
          // Replace tempId with server response
          const next = prev.map(m => m.id === tempId ? {
            ...m,
            id: (res.id || res.Id)?.toString(),
            text: res.content || res.Content || m.text,
            time: new Date(res.sentAt || res.SentAt || new Date()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            sentAt: res.sentAt || res.SentAt || m.sentAt,
            replyToMessageId: res.replyToMessageId || res.ReplyToMessageId || (currentReplyTo ? parseInt(currentReplyTo.id) : 0),
            pending: false,
            mediaUrl: res.attachments && res.attachments.length > 0 ? (res.attachments[0].fileUrl || res.attachments[0].filePath || res.attachments[0].FilePath) : undefined,
            attachments: res.attachments || []
          } : m);
          saveData(STORES.MESSAGES, { chatId: activeChat!.id, list: next }).catch(() => {});
          return next;
        });
      } else {
        // Mark failed or remove
        setMessages(prev => prev.filter(m => m.id !== tempId));
      }
    } catch (err) {
      console.error("API error sending attachment, keeping optimistic with failed state:", err);
      setMessages(prev => prev.map(m => m.id === tempId ? { ...m, error: true, pending: false } : m));
    } finally {
      setIsSendingMessage(false);
    }
  };

  // Recording audio voice message
  const handleSendVoiceMessage = async (durationSecs: number, audioBlob?: Blob, base64Audio?: string) => {
    if (!activeChat) return;
    
    // Improved mock string that is valid base64 with audio/mpeg (MP3) prefix
    const audioPath = base64Audio || ("data:audio/mpeg;base64,GkXfo69Chu1" + "A".repeat(Math.max(0, 100 - durationSecs)) + "==");
      
    const tempId = "voice-temp-" + Date.now().toString();
    const currentReplyTo = replyTo;

    // Create a local optimistic voice message
    const optimisticMessage = {
      id: tempId,
      text: '',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      sentAt: new Date().toISOString(),
      isMe: true,
      senderName: 'You',
      type: 'audio',
      duration: durationSecs,
      mediaUrl: base64Audio || audioPath,
      attachments: [
        {
          id: "0",
          fileName: 'audio_voice_note.mp3',
          filePath: base64Audio || audioPath,
          contentType: 'audio/mpeg',
          fileSize: audioBlob ? audioBlob.size : durationSecs * 1024,
          type: MessageType.Audio
        }
      ],
      replyToMessageId: currentReplyTo ? parseInt(currentReplyTo.id) : 0,
      pending: true
    };

    setMessages(prev => [...prev, optimisticMessage]);
    setReplyTo(null);
    setTimeout(() => scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight), 100);

    try {
      const body = {
        chatId: parseInt(activeChat.id),
        content: '',
        type: MessageType.Audio,
        attachments: [
          {
            fileName: 'audio_voice_note.mp3',
            filePath: audioBlob || base64Audio || audioPath,
            contentType: 'audio/mpeg',
            fileSize: audioBlob ? audioBlob.size : durationSecs * 1024,
            thumbnailPath: '',
            type: MessageType.Audio
          }
        ],
        replyToMessageId: currentReplyTo ? parseInt(currentReplyTo.id) : 0
      };
      
      const res = await sendMessage(body);
      console.log('Send Voice Message Success', res);
      if (res) {
        setMessages(prev => {
          const next = prev.map(m => m.id === tempId ? {
            ...m,
            id: (res.id || res.Id)?.toString(),
            time: new Date(res.sentAt || res.SentAt || new Date()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            sentAt: res.sentAt || res.SentAt || m.sentAt,
            replyToMessageId: res.replyToMessageId || res.ReplyToMessageId || (currentReplyTo ? parseInt(currentReplyTo.id) : 0),
            pending: false,
            mediaUrl: res.attachments && res.attachments.length > 0 ? (res.attachments[0].fileUrl || res.attachments[0].filePath || res.attachments[0].FilePath) : m.mediaUrl,
            attachments: res.attachments || []
          } : m);
          saveData(STORES.MESSAGES, { chatId: activeChat!.id, list: next }).catch(() => {});
          return next;
        });
      } else {
        // Mark failed or remove
        setMessages(prev => prev.filter(m => m.id !== tempId));
      }
    } catch (err) {
      console.error("API voice note err, local mock failed state:", err);
      setMessages(prev => prev.map(m => m.id === tempId ? { ...m, error: true, pending: false } : m));
    }
  };

  const startRecordingAudio = async () => {
    triggerHaptic('medium');
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Recording not supported in this browser");
      }
      playNotificationSound('recording');

      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'paused') {
        mediaRecorderRef.current.resume();
        setIsRecording(true);
        setRecordingState('recording');
        handleLocalUserTyping('recording voice message');
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setRecordingStream(stream);
      audioChunksRef.current = [];
      
      let mimeType = 'audio/webm';
      if (MediaRecorder.isTypeSupported('audio/webm')) {
        mimeType = 'audio/webm';
      } else if (MediaRecorder.isTypeSupported('audio/ogg')) {
        mimeType = 'audio/ogg';
      } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
        mimeType = 'audio/mp4';
      } else if (MediaRecorder.isTypeSupported('audio/wav')) {
        mimeType = 'audio/wav';
      }
      
      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const segmentBlob = new Blob(audioChunksRef.current, { type: mimeType });
        setRecordedBlobs(prev => [...prev, segmentBlob]);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingState('recording');
      handleLocalUserTyping('recording voice message');
    } catch (err: any) {
      console.warn("Could not start physical mic recording:", err);
      setIsRecording(true);
      setRecordingState('recording');
      handleLocalUserTyping('recording voice message');
    }
  };

  const pauseRecordingAudio = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.pause();
      setRecordingState('paused');
    }
  };

  const deleteRecordingAudio = () => {
    triggerHaptic('medium');
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch (e) {}
    }
    if (recordingStream) {
      try {
        recordingStream.getTracks().forEach(track => track.stop());
      } catch (e) {}
      setRecordingStream(null);
    }
    if (previewAudioRef.current) {
      previewAudioRef.current.pause();
      previewAudioRef.current = null;
    }
    if (previewIntervalRef.current) {
      clearInterval(previewIntervalRef.current);
      previewIntervalRef.current = null;
    }
    
    setIsRecording(false);
    setRecordingState('idle');
    setRecordedBlobs([]);
    setRecordingDuration(0);
    setIsPreviewPlaying(false);
    setPreviewCurrentTime(0);
  };

  const handleTogglePreviewPlay = () => {
    triggerHaptic('light');
    if (isPreviewPlaying) {
      if (previewAudioRef.current) {
        previewAudioRef.current.pause();
      }
      setIsPreviewPlaying(false);
      if (previewIntervalRef.current) {
        clearInterval(previewIntervalRef.current);
        previewIntervalRef.current = null;
      }
    } else {
      const combinedBlob = new Blob(recordedBlobs, { type: 'audio/mpeg' });
      const url = URL.createObjectURL(combinedBlob);
      const audio = new Audio(url);
      previewAudioRef.current = audio;

      audio.currentTime = previewCurrentTime >= recordingDuration ? 0 : previewCurrentTime;
      audio.play().catch(e => console.warn("Failed to play preview audio:", e));
      setIsPreviewPlaying(true);

      if (previewIntervalRef.current) clearInterval(previewIntervalRef.current);
      previewIntervalRef.current = window.setInterval(() => {
        if (audio.ended) {
          setIsPreviewPlaying(false);
          setPreviewCurrentTime(0);
          if (previewIntervalRef.current) {
            clearInterval(previewIntervalRef.current);
            previewIntervalRef.current = null;
          }
        } else {
          setPreviewCurrentTime(audio.currentTime);
        }
      }, 100);
    }
  };

  const sendRecordedVoiceMessage = async () => {
    triggerHaptic('light');
    if (recordingState === 'recording') {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.onstop = async () => {
          let mimeType = mediaRecorderRef.current?.mimeType || 'audio/webm';
          const finalSegmentBlob = new Blob(audioChunksRef.current, { type: mimeType });
          const allBlobs = [...recordedBlobs, finalSegmentBlob];
          await processAndSendVoiceBlobs(allBlobs);
        };
        mediaRecorderRef.current.stop();
      } else {
        await processAndSendVoiceBlobs(recordedBlobs);
      }
    } else {
      await processAndSendVoiceBlobs(recordedBlobs);
    }
  };

  const processAndSendVoiceBlobs = async (blobsToCombine: Blob[]) => {
    if (previewAudioRef.current) {
      previewAudioRef.current.pause();
      previewAudioRef.current = null;
    }
    if (previewIntervalRef.current) {
      clearInterval(previewIntervalRef.current);
      previewIntervalRef.current = null;
    }

    if (blobsToCombine.length === 0) {
      if (recordingStream) {
        try {
          recordingStream.getTracks().forEach(track => track.stop());
        } catch (e) {}
        setRecordingStream(null);
      }
      setIsRecording(false);
      setRecordingState('idle');
      setRecordingDuration(0);
      return;
    }

    const finalBlob = new Blob(blobsToCombine, { type: 'audio/mpeg' });
    
    const reader = new FileReader();
    reader.readAsDataURL(finalBlob);
    reader.onloadend = async () => {
      let base64Audio = reader.result as string;
      if (base64Audio.startsWith('data:audio/webm')) {
        base64Audio = base64Audio.replace('data:audio/webm', 'data:audio/mpeg');
      } else if (base64Audio.startsWith('data:video/webm')) {
        base64Audio = base64Audio.replace('data:video/webm', 'data:audio/mpeg');
      } else if (base64Audio.startsWith('data:audio/ogg')) {
        base64Audio = base64Audio.replace('data:audio/ogg', 'data:audio/mpeg');
      }

      await handleSendVoiceMessage(recordingDuration, finalBlob, base64Audio);
      
      if (recordingStream) {
        try {
          recordingStream.getTracks().forEach(track => track.stop());
        } catch (e) {}
        setRecordingStream(null);
      }
      setIsRecording(false);
      setRecordingState('idle');
      setRecordedBlobs([]);
      setRecordingDuration(0);
      setIsPreviewPlaying(false);
      setPreviewCurrentTime(0);
    };
  };

  const stopRecordingAudio = () => {
    sendRecordedVoiceMessage();
  };

  // Edit Message
  const handleTriggerEdit = (msg: any) => {
    setEditingMessageId(msg.id);
    setEditingText(msg.text);
  };

  const handleSaveEdit = async () => {
    if (!editingMessageId || !activeChat) return;
    const msgId = parseInt(editingMessageId);
    if (isNaN(msgId)) return;

    try {
      await editMessage({
        messageId: msgId,
        content: editingText
      });
      // Locally update state text
      setMessages(prev => prev.map(m => m.id === editingMessageId ? { ...m, text: editingText, isEdited: true } : m));
    } catch (err) {
      console.error("Failed to edit message via API, doing local overwrite only:", err);
      setMessages(prev => prev.map(m => m.id === editingMessageId ? { ...m, text: editingText } : m));
    } finally {
      setEditingMessageId(null);
      setEditingText('');
    }
  };

  // Delete Message Hook
  const handleDeleteMessageCheck = async (msgIdStr: string) => {
    if (!activeChat) return;
    const msgId = parseInt(msgIdStr);
    if (isNaN(msgId)) {
      // Local removal only if it is a random generated mock ID
      setMessages(prev => prev.filter(m => m.id !== msgIdStr));
      return;
    }

    try {
      await deleteMessage(msgId);
      // Remove it or update its display
      setMessages(prev => prev.map(m => m.id === msgIdStr ? { ...m, text: "[Message deleted]", isDeleted: true } : m));
    } catch (err) {
      console.error("Failed to delete from server, applying local deletion:", err);
      setMessages(prev => prev.filter(m => m.id !== msgIdStr));
    }
  };

  // Click handler to scroll to and highlight a referenced reply message for 3 seconds
  const handleReplyClick = (referencedId: string) => {
    const el = document.getElementById(`msg-${referencedId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setHighlightedMessageId(referencedId);
      setTimeout(() => {
        setHighlightedMessageId(null);
      }, 3000);
    } else {
      triggerToast("Referenced message could not be loaded on active screen");
    }
  };

  // Initiate reply function
  const handleInitiateReply = (msg: any) => {
    setReplyTo({ 
      id: String(msg.id), 
      text: msg.text || (msg.type === 'image' ? 'Image File' : msg.type === 'audio' ? 'Voice Message' : 'Message') 
    });
  };

  const lastTypingSentRef = useRef<number>(0);

  // Send typing status throttled at once per 10 seconds while typing
  const handleLocalUserTyping = (action: string = 'typing') => {
    if (!activeChat) return;
    const now = Date.now();
    if (now - lastTypingSentRef.current > 10000 || action !== 'typing') {
      lastTypingSentRef.current = now;
      sendTypingStatus(parseInt(activeChat.id), action).catch(err => {
        console.warn("Typing API endpoint returned error:", err.message);
      });
    }
  };

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  const handleMessagesScroll = () => {
    const container = scrollRef.current;
    if (!container) return;

    const isAtBottom = container.scrollHeight - container.scrollTop <= container.clientHeight + 100;
    setShowScrollButton(!isAtBottom);

    // Find all message items in view
    const messageElements = container.querySelectorAll("[id^='msg-']");
    let currentInViewMessageId: string | null = null;
    const containerRect = container.getBoundingClientRect();

    for (let el of Array.from(messageElements) as HTMLElement[]) {
      const rect = el.getBoundingClientRect();
      // If the message is visible in the container viewport
      if (rect.top >= containerRect.top - 20 && rect.bottom <= containerRect.bottom + 100) {
        currentInViewMessageId = el.id.replace("msg-", "");
        break;
      }
    }

    if (!currentInViewMessageId && messageElements.length > 0) {
      currentInViewMessageId = (messageElements[0] as HTMLElement).id.replace("msg-", "");
    }

    if (currentInViewMessageId) {
      const msg = messages.find(m => String(m.id) === String(currentInViewMessageId));
      if (msg) {
        const msgDateStr = msg.sentAt ? new Date(msg.sentAt).toDateString() : new Date().toDateString();
        setActiveScrollDate(msgDateStr);
        setShowDateBadge(true);

        if (dateBadgeTimeoutRef.current) {
          clearTimeout(dateBadgeTimeoutRef.current);
        }
        dateBadgeTimeoutRef.current = setTimeout(() => {
          setShowDateBadge(false);
        }, 1500);
      }
    }
  };

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }
  };

  const handleMessagePressStart = (e: any, msgId: string) => {
    if (longPressTimersRef.current[msgId]) {
      clearTimeout(longPressTimersRef.current[msgId]);
      delete longPressTimersRef.current[msgId];
    }
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    
    // Hold reference to the target element
    const currentTarget = e.currentTarget;
    
    touchStartPosRef.current = { clientX, clientY };
    swipeTriggeredRef.current = false;
    setSwipingMessageId(msgId);
    
    longPressTimersRef.current[msgId] = setTimeout(() => {
      if (currentTarget) {
        const rect = currentTarget.getBoundingClientRect();
        setPressedMessageRect(rect);
      }
      setOverlayMessageId(msgId);
    }, 1000);
  };

  const handleMessageMove = (e: any, msgId: string) => {
    if (!touchStartPosRef.current) return;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    
    const diffX = clientX - touchStartPosRef.current.clientX;
    const diffY = clientY - touchStartPosRef.current.clientY;
    const deltaX = Math.abs(diffX);
    const deltaY = Math.abs(diffY);
    
    if (deltaX > 10 || deltaY > 10) {
      if (longPressTimersRef.current[msgId]) {
        clearTimeout(longPressTimersRef.current[msgId]);
        delete longPressTimersRef.current[msgId];
      }
    }

    const msg = messages.find(m => m.id === msgId);
    if (!msg) return;

    // Check direction constraint:
    // Left swipe for isMe (diffX < 0)
    // Right swipe for !isMe (diffX > 0)
    const isMe = msg.isMe;
    const allowedSwipe = (isMe && diffX < 0) || (!isMe && diffX > 0);

    if (allowedSwipe && deltaX > 15) {
      // Limit/cap translation
      const cappedOffset = isMe ? Math.max(-80, diffX) : Math.min(80, diffX);
      setSwipeOffset(cappedOffset);

      if (deltaX > 55 && !swipeTriggeredRef.current) {
        swipeTriggeredRef.current = true;
        setReplyTo({ 
          id: msg.id, 
          text: msg.text || (msg.type === 'image' ? 'Image File' : 'Voice Message') 
        });
        setTimeout(() => {
          messageInputRef.current?.focus();
        }, 100);
        
        // Auto pull-back after triggering reply animation
        setTimeout(() => {
          setSwipeOffset(0);
          setSwipingMessageId(null);
        }, 150);
      }
    } else {
      setSwipeOffset(0);
    }
  };

  const handleMessagePressEnd = (msgId: string) => {
    touchStartPosRef.current = null;
    setSwipingMessageId(null);
    setSwipeOffset(0);
    if (longPressTimersRef.current[msgId]) {
      clearTimeout(longPressTimersRef.current[msgId]);
      delete longPressTimersRef.current[msgId];
    }
  };

  const handleOverlayDelete = async (msgId: string) => {
    try {
      await handleDeleteMessageCheck(msgId);
    } catch (err) {
      console.error("Error deleting from overlay select", err);
    }
    setOverlayMessageId(null);
  };

  const handleResendMessage = async (msg: any) => {
    setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, status: 'sending' } : m));
    setOverlayMessageId(null);
    try {
      await sendMessage({
          chatId: Number(activeChat.id),
          content: msg.text,
          type: msg.type === 'image' ? MessageType.Image : (msg.type === 'audio' ? MessageType.Audio : MessageType.Text),
          attachments: msg.attachments || []
      });
      setMessages(prev => prev.filter(m => m.id !== msg.id));
    } catch (e) {
      setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, status: 'failed' } : m));
    }
  };

  const handleForwardMessage = async (targetChatId: string) => {
    if (!messageToForward) return;
    
    const parsedChatId = parseInt(targetChatId);
    const targetChatInfo = localChatList.find(c => c.id === targetChatId);
    const targetChatName = targetChatInfo ? targetChatInfo.name : `Chat #${targetChatId}`;

    try {
      let msgTypeNum = MessageType.Text;
      if (messageToForward.type === 'image') msgTypeNum = MessageType.Image;
      else if (messageToForward.type === 'audio') msgTypeNum = MessageType.Audio;

      const apiAttachments = [];
      if (messageToForward.attachments && messageToForward.attachments.length > 0) {
        apiAttachments.push({
          fileName: messageToForward.attachments[0].fileName || 'file',
          filePath: messageToForward.attachments[0].filePath || messageToForward.mediaUrl || '',
          contentType: messageToForward.attachments[0].contentType || 'image/jpeg',
          fileSize: messageToForward.attachments[0].fileSize || 0,
          thumbnailPath: messageToForward.attachments[0].thumbnailPath || ''
        });
      }

      await sendMessage({
        chatId: parsedChatId,
        content: messageToForward.text || '',
        type: msgTypeNum,
        attachments: apiAttachments
      });

      triggerToast(`Forwarded to ${targetChatName}!`);
    } catch (err) {
      console.error("Failed to forward, showing offline simulation:", err);
      triggerToast(`Forwarded to ${targetChatName} (Offline Mode)!`);
    } finally {
      setShowForwardDialog(false);
      setMessageToForward(null);
    }
  };

  const handleRedirectToUserDirectChat = async (pId: number, pName: string) => {
    if (pId === currentUserId) return; // Don't chat with oneself
    setShowChatInfo(false); // Close the chat info modal
    
    // Check if there is already an existing direct chat with this user
    const existingDirectChat = localChatList.find(c => !c.isGroup && c.participants.some(p => (p.personId || p.PersonId) === pId));
    if (existingDirectChat) {
      setActiveChat(existingDirectChat);
      return;
    }

    // Otherwise, create a new direct chat
    try {
      const res = await createDirectChat(pId);
      console.log('CreateDirectChatDto Success via Redirect:', res);
      
      const chats = await fetchChats();
      const newChat = chats?.find((c: any) => c.id === res.id?.toString() || c.id === res.Id?.toString()) 
         || {
           id: res.id?.toString() ?? res.Id?.toString(),
           name: res.name || res.Name || pName,
           lastMessage: '',
           time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
           unread: 0,
           isGroup: false,
           participants: res.participants || res.Participants || []
         };
      setActiveChat(newChat);
    } catch (err) {
      console.error("Failed to redirect or create direct chat:", err);
    }
  };

  // Group Participant - Remove
  const handleRemoveParticipant = async (recipientId: number) => {
    if (!activeChat) return;
    setIsManagingParticipants(true);
    try {
      await removeParticipant(parseInt(activeChat.id), recipientId);
      // Remove from state participants lists
      const updatedParticipants = activeChat.participants.filter(p => (p.personId || p.PersonId) !== recipientId);
      setActiveChat({
        ...activeChat,
        participants: updatedParticipants
      });
    } catch (err) {
      console.error("Could not remove participant", err);
      alert("Error removing participant. Verify if you have sufficient permissions.");
    } finally {
      setIsManagingParticipants(false);
    }
  };

  // Group Participant - Add
  const handleAddParticipant = async (recipientIdNum: number) => {
    if (!activeChat) return;

    setIsManagingParticipants(true);
    try {
      await addParticipants(parseInt(activeChat.id), [recipientIdNum]);
      // Update state
      const personInfo = availablePersons.find(p => (p.id || p.Id) === recipientIdNum);
      const updatedParticipants = [...activeChat.participants, {
        personId: recipientIdNum,
        fullName: personInfo?.name || personInfo?.Name || `User #${recipientIdNum}`,
        isAdmin: false,
        isOnline: false
      }];
      setActiveChat({
        ...activeChat,
        participants: updatedParticipants
      });
    } catch (err) {
      console.error("Could not add participant", err);
      alert("Error adding participant. Make sure user exists.");
    } finally {
      setIsManagingParticipants(false);
    }
  };

  // Group Participants - Add List
  const handleAddParticipantsList = async (recipientIds: number[]) => {
    if (!activeChat || recipientIds.length === 0) return;

    setIsManagingParticipants(true);
    try {
      await addParticipants(parseInt(activeChat.id), recipientIds);
      // Map all added participants:
      const newParticipants = recipientIds.map(id => {
        const personInfo = availablePersons.find(p => (p.id || p.Id) === id);
        return {
          personId: id,
          fullName: personInfo?.name || personInfo?.Name || `User #${id}`,
          isAdmin: false,
          isOnline: false
        };
      });
      const updatedParticipants = [...activeChat.participants, ...newParticipants];
      setActiveChat({
        ...activeChat,
        participants: updatedParticipants
      });
      // Clear selection
      setSelectedToAdd([]);
    } catch (err) {
      console.error("Could not add participants list", err);
      alert("Error adding participants. Make sure selected users exist.");
    } finally {
      setIsManagingParticipants(false);
    }
  };

  const handleUpdateGroupChat = async () => {
    if (!editGroupName.trim()) {
      alert("Group name is required");
      return;
    }
    setIsUpdatingGroup(true);
    try {
      const parsedId = parseInt(activeChat.id);
      await updateGroupChat(
        parsedId,
        editGroupName,
        editGroupDescription || '',
        editGroupImage
      );

      // Successfully updated! Update activeChat state
      const updatedChat = {
        ...activeChat,
        name: editGroupName,
        description: editGroupDescription || '',
      };
      
      try {
        const freshDetails = await getChatById(parsedId);
        if (freshDetails) {
          updatedChat.name = freshDetails.name || editGroupName;
          updatedChat.description = freshDetails.description || editGroupDescription;
        }
      } catch (e) {
        console.warn("Could not refetch details for active room", e);
      }

      setActiveChat(updatedChat);
      setIsEditingGroupChat(false);
      await fetchChats(); // Refetch list to synchronize chat cards name and icons
    } catch (err: any) {
      alert(err?.response?.data?.message || err?.message || "Failed to update group chat");
    } finally {
      setIsUpdatingGroup(false);
    }
  };

  const handleDeleteChat = async () => {
    setIsDeletingChat(true);
    try {
      const parsedId = parseInt(activeChat.id);
      await deleteChat(parsedId);
      
      setActiveChat(null);
      setShowChatInfo(false);
      setShowDeleteConfirm(false);
      await fetchChats();
      if (onRefreshPage) {
        onRefreshPage();
      }
    } catch (err: any) {
      alert(err?.response?.data?.message || err?.message || "Failed to delete chat room");
    } finally {
      setIsDeletingChat(false);
    }
  };

  const rawOverlayMsg = overlayMessageId ? messages.find(m => String(m.id) === String(overlayMessageId)) : null;
  const overlayMsg = useMemo(() => {
    if (!rawOverlayMsg) return null;
    const replyId = rawOverlayMsg.replyToMessageId || rawOverlayMsg.ReplyToMessageId || rawOverlayMsg.replyTo?.id || rawOverlayMsg.ReplyTo?.Id;
    if (replyId && replyId !== 0 && replyId !== '0') {
      const refMsg = messages.find(m => String(m.id) === String(replyId));
      if (refMsg) {
        return {
          ...rawOverlayMsg,
          replyTo: {
            id: String(replyId),
            text: refMsg.text || (refMsg.type === 'image' ? 'Image File 📷' : refMsg.type === 'audio' ? 'Voice Message 🎵' : 'Attachment 📄')
          }
        };
      } else {
        const fallbackText = rawOverlayMsg.replyTo?.text || rawOverlayMsg.ReplyTo?.Text || rawOverlayMsg.replyTo?.content || rawOverlayMsg.ReplyTo?.Content || 'Referenced Message 📄';
        return {
          ...rawOverlayMsg,
          replyTo: {
            id: String(replyId),
            text: fallbackText
          }
        };
      }
    }
    return rawOverlayMsg;
  }, [rawOverlayMsg, messages]);

  const exportChatHistory = () => {
    if (!activeChat) return;
    const history = messages.map(msg => {
      const time = new Date(msg.sentAt).toLocaleString();
      const sender = msg.isMe ? 'Me' : msg.senderName;
      return `[${time}] ${sender}: ${msg.text || (msg.type === 'image' ? '[Image]' : msg.type === 'audio' ? '[Voice Message]' : '[Attachment]')}`;
    }).join('\n');

    const blob = new Blob([history], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chat_export_${activeChat.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="h-full flex flex-col bg-[#F0F2F5] dark:bg-[#0c0c0e] text-zinc-800 dark:text-zinc-200 relative">
      <AnimatePresence initial={false} mode="wait">
        {!activeChat ? (
          <motion.div 
            key="chatList"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            className="flex flex-col h-full w-full relative pb-0"
          >
            <div className="p-5 pb-2">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-3xl font-black text-zinc-800 flex items-center gap-2"><MessageCircle size={28} /> Chats</h3>
                <div className="flex items-center gap-2">
                  <button onClick={() => setShowDirectMessage(true)} className="p-2 border border-zinc-200 rounded-md hover:bg-zinc-50 text-zinc-600 transition-colors bg-white shadow-sm" title="Message User">
                    <UserPlus size={16} />
                  </button>
                  <button onClick={() => { setNewGroupParticipants([currentUserId]); setShowCreateGroup(true); }} className="p-2 border border-zinc-200 rounded-md hover:bg-zinc-50 text-zinc-600 transition-colors bg-white shadow-sm" title="Create Group Chat">
                    <Users size={16} />
                  </button>
                </div>
              </div>
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
                <input 
                  type="text" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search chats" 
                  className="w-full bg-transparent border border-zinc-200 py-2 pl-10 pr-4 text-xs text-zinc-800 outline-none focus:border-black transition-colors rounded-md placeholder-zinc-400 text-black dark:text-white"
                />
              </div>
            </div>

            {/* Snapchat-style Pull to Refresh Indicator with 50:50 Sliding Bar */}
            {isRefreshing && (
              <div className="h-1 w-full bg-zinc-200 dark:bg-zinc-850 relative overflow-hidden shrink-0 z-[120]">
                <div 
                  className="h-full w-full absolute animate-snap-loading" 
                  style={{ background: 'linear-gradient(to right, #000000 0%, #000000 50%, #949499 50%, #949499 100%)' }}
                />
              </div>
            )}

            <div 
              className="overflow-hidden transition-all duration-150 flex items-center justify-center bg-zinc-50 border-b border-zinc-100 select-none text-zinc-400 font-bold shrink-0"
              style={{ height: pullDistance > 0 ? `${pullDistance}px` : '0px' }}
            >
              <div className="flex items-center gap-2 text-xs">
                {isRefreshing ? (
                  <div className="h-0" />
                ) : pullDistance >= 50 ? (
                  <>
                    <span className="text-indigo-600 font-black animate-bounce text-sm">👻</span>
                    <span className="text-zinc-800 uppercase tracking-widest text-[9px] font-black">Release to Refresh</span>
                  </>
                ) : (
                  <div className="flex gap-2 justify-center items-center py-2">
                    <div className="w-2 bg-zinc-400 h-2 rounded-full animate-bounce [animation-duration:0.6s]"></div>
                    <div className="w-2 bg-zinc-500 h-2 rounded-full animate-bounce [animation-duration:0.6s] [animation-delay:0.15s]"></div>
                    <div className="w-2 bg-zinc-700 h-2 rounded-full animate-bounce [animation-duration:0.6s] [animation-delay:0.3s]"></div>
                  </div>
                )}
              </div>
            </div>

            {/* Chat List Wrapper with Loading state */}
            <div 
              ref={listScrollRef}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={() => { pullStartRef.current = null; setPullDistance(0); }}
              className="flex-1 overflow-y-auto w-full border-t border-zinc-100 touch-pan-y"
            >
              {isChatsLoading && !isRefreshing ? (
                <div className="flex flex-col items-center justify-center py-20 gap-3 text-zinc-400">
                  <LoaderCircle className="animate-spin text-black" size={32} />
                  <p className="text-xs font-bold uppercase tracking-wider">Syncing Secure Chats...</p>
                </div>
              ) : localChatList.length === 0 ? (
                <div className="text-center py-20 px-6 text-zinc-500 text-sm font-medium leading-relaxed max-w-sm mx-auto">
                  No chats initiated yet. Create a group chat or message another user to start a chat
                </div>
              ) : localChatList.filter(chat => chat.name.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 ? (
                <div className="text-center py-20 text-zinc-400 text-sm font-medium">
                  No matching chat rooms found.
                </div>
              ) : (
                [...localChatList]
                  .filter(chat => chat.name.toLowerCase().includes(searchQuery.toLowerCase()))
                  .sort((a, b) => new Date(b.lastMessageSentAt || 0).getTime() - new Date(a.lastMessageSentAt || 0).getTime())
                  .map(chat => (
                  <div 
                    key={chat.id} 
                    onClick={async () => {
                       setActiveChat(chat);
                       try {
                         const chatIdNum = parseInt(chat.id);
                         if (!isNaN(chatIdNum)) {
                           const res = await getChatById(chatIdNum);
                           if (res) {
                              // Sync up-to-date details in activeChat
                              setActiveChat({
                                id: res.id.toString(),
                                name: res.name || chat.name,
                                lastMessage: res.lastMessage ? getDescriptiveLastMessage(res.lastMessage) : chat.lastMessage,
                                time: res.lastMessage?.sentAt ? new Date(res.lastMessage.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : chat.time,
                                unread: res.unreadCount || 0,
                                isGroup: !!res.isGroup,
                                description: res.description || chat.description,
                                participants: res.participants || chat.participants,
                                imageUrl: res.imageUrl || res.ImageUrl || res.imgUrl || res.ImgUrl || chat.imageUrl || chat.imgUrl || '',
                                lastMessageSenderId: res.lastMessage ? (res.lastMessage.senderPersonId || res.lastMessage.SenderPersonId || 0) : chat.lastMessageSenderId
                              });
                           }
                         }
                       } catch (e) {
                         console.log("Using cached/local chat data for", chat.id);
                       }
                    }}
                    className="flex items-start gap-4 p-4 border-b border-zinc-100 hover:bg-zinc-50 cursor-pointer transition-colors active:bg-zinc-100"
                  >
                    <div className="w-10 h-10 bg-zinc-100 flex-shrink-0 flex items-center justify-center border border-black rounded-full text-black overflow-hidden">
                      {(() => {
                        if (chat.isGroup) {
                          return chat.imageUrl ? (
                            <img src={getImageUrl(chat.imageUrl)} alt={chat.name} className="w-full h-full object-cover" />
                          ) : (
                            <Users size={20} />
                          );
                        } else {
                          const partner = chat.participants?.find((p: any) => {
                            const pId = p.personId || p.PersonId || p.id || p.Id;
                            return Number(pId) !== Number(currentUserId);
                          });
                          const partnerId = partner?.personId || partner?.PersonId || partner?.id || partner?.Id;
                          const personDetails = availablePersons.find(ap => Number(ap.id || ap.Id) === Number(partnerId));
                          const partnerImg = chat.imageUrl || chat.ImageUrl || partner?.profileImageUrl || partner?.ProfileImageUrl || personDetails?.imageUrl || personDetails?.ImageUrl;
                          const partnerName = personDetails?.name || personDetails?.Name || chat.name;
                          return partnerImg ? (
                            <img src={getImageUrl(partnerImg)} alt={partnerName} className="w-full h-full object-cover" />
                          ) : (
                            <span className="font-extrabold text-sm">{partnerName.charAt(0).toUpperCase()}</span>
                          );
                        }
                      })()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start mb-1">
                        <h3 className="font-bold text-zinc-800 text-sm truncate pr-2">
                          {(() => {
                            if (chat.isGroup) {
                              return chat.name;
                            } else {
                              const partner = chat.participants?.find((p: any) => {
                                const pId = p.personId || p.PersonId || p.id || p.Id;
                                return Number(pId) !== Number(currentUserId);
                              });
                              const partnerId = partner?.personId || partner?.PersonId || partner?.id || partner?.Id;
                              const personDetails = availablePersons.find(ap => Number(ap.id || ap.Id) === Number(partnerId));
                              return personDetails?.name || personDetails?.Name || chat.name;
                            }
                          })()}
                        </h3>
                        <span className={`text-[10px] shrink-0 ${(chat.unread > 0 && chat.lastMessageSenderId !== currentUserId) ? 'text-green-600 font-bold' : 'text-zinc-400'}`}>
                          {chat.time}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        {typingUsers[chat.id] && typingUsers[chat.id].length > 0 ? (
                          <p className="text-xs text-green-600 font-bold truncate pr-2 animate-pulse">
                            {(() => {
                               const recording = typingUsers[chat.id].filter(t => t.action?.includes('recording'));
                               const typing = typingUsers[chat.id].filter(t => !t.action?.includes('recording'));
                               if (recording.length > 0) {
                                  return !chat.isGroup ? <span className="italic">Recording voice note...</span> : `${recording.map(t=>t.name).join(', ')} recording...`;
                               }
                               return !chat.isGroup ? <span className="italic">Typing...</span> : `${typing.map(t=>t.name).join(', ')} typing...`;
                            })()}
                          </p>
                        ) : (
                          <p className="text-xs text-zinc-600 truncate pr-2 dark:text-zinc-400">
                            {chat.isGroup && chat.lastMessageSenderId && chat.lastMessage !== 'No messages yet' ? (
                              <span className="font-semibold text-zinc-500">{(() => {
                                if (chat.lastMessageSenderId === currentUserId) return "You";
                                const sender = availablePersons.find(p => (p.id || p.Id) === chat.lastMessageSenderId);
                                return sender?.name || sender?.Name || `User #${chat.lastMessageSenderId}`;
                              })().split(' ')[0]}: </span>
                            ) : null}
                            {chat.lastMessage}
                          </p>
                        )}
                        {chat.unread > 0 && chat.lastMessageSenderId !== currentUserId && (
                          <div className="w-5 h-5 bg-green-500 text-white text-[10px] font-bold flex items-center justify-center shrink-0 rounded-full animate-pulse">
                            {chat.unread}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        ) : (
          <motion.div 
            key="chatView"
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            className="flex flex-col h-full bg-[#E5DDD5] dark:bg-[#0c0c0e] absolute inset-0 z-20"
          >
            {/* Elegant Chat Background Pattern */}
            <div 
              className="absolute inset-0 z-0 opacity-[0.4] dark:opacity-[0.14] dark:invert"
              style={{
                backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'100\' height=\'100\' viewBox=\'0 0 100 100\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M20,10 Q30,20 20,30 T20,50 Q10,60 20,70 T20,90\' fill=\'none\' stroke=\'%23000000\' stroke-width=\'1\' opacity=\'0.2\'/%3E%3Ccircle cx=\'50\' cy=\'50\' r=\'2\' fill=\'%23000000\' opacity=\'0.2\'/%3E%3Cpath d=\'M80,20 L90,10 M80,80 L90,90\' stroke=\'%23000000\' stroke-width=\'1\' opacity=\'0.2\'/%3E%3C/svg%3E")',
                backgroundSize: '100px 100px'
              }}
            ></div>

            {/* Chat Header */}
            <header className="bg-white border-b border-zinc-200 flex items-center p-3 shrink-0 h-16 shadow-sm z-10 justify-between">
              <div className="flex items-center">
                <button 
                  onClick={() => setActiveChat(null)}
                  className="flex items-center p-2 text-zinc-500 hover:text-black hover:bg-zinc-50 rounded-full transition-all mr-2"
                >
                  <ChevronLeft size={20} />
                </button>
                <div className="w-10 h-10 bg-zinc-100 border border-black flex items-center justify-center shrink-0 mr-3 rounded-full text-black overflow-hidden relative">
                   {(() => {
                     if (activeChat.isGroup) {
                       return activeChat.imageUrl ? (
                         <img src={getImageUrl(activeChat.imageUrl)} alt={activeChat.name} className="w-full h-full object-cover" />
                       ) : (
                         <Users size={20} />
                       );
                     } else {
                       const partner = activeChat.participants?.find((p: any) => {
                         const pId = p.personId || p.PersonId || p.id || p.Id;
                         return Number(pId) !== Number(currentUserId);
                       });
                       const partnerId = partner?.personId || partner?.PersonId || partner?.id || partner?.Id;
                       const personDetails = availablePersons.find(ap => Number(ap.id || ap.Id) === Number(partnerId));
                       const partnerImg = activeChat.imageUrl || activeChat.ImageUrl || partner?.profileImageUrl || partner?.ProfileImageUrl || personDetails?.imageUrl || personDetails?.ImageUrl;
                       const partnerName = personDetails?.name || personDetails?.Name || activeChat.name;
                       return partnerImg ? (
                         <img src={getImageUrl(partnerImg)} alt={partnerName} className="w-full h-full object-cover" />
                       ) : (
                         <span className="font-extrabold text-sm">{partnerName.charAt(0).toUpperCase()}</span>
                       );
                     }
                   })()}
                </div>
                <div>
                  <h3 className="font-bold text-zinc-800 text-sm tracking-wide">
                    {(() => {
                      if (activeChat.isGroup) {
                        return activeChat.name;
                      } else {
                        const partner = activeChat.participants?.find((p: any) => {
                          const pId = p.personId || p.PersonId || p.id || p.Id;
                          return Number(pId) !== Number(currentUserId);
                        });
                        const partnerId = partner?.personId || partner?.PersonId || partner?.id || partner?.Id;
                        const personDetails = availablePersons.find(ap => Number(ap.id || ap.Id) === Number(partnerId));
                        return personDetails?.name || personDetails?.Name || activeChat.name;
                      }
                    })()}
                  </h3>
                  {!activeChat.isGroup ? (
                    <p className="text-[10px] text-green-600 font-bold uppercase tracking-wider flex items-center gap-1"><span className="w-1.5 h-1.5 bg-green-500 rounded-full inline-block"></span> Online</p>
                  ) : (
                    <p className="text-[10px] text-green-600 font-medium tracking-tight truncate max-w-[180px] sm:max-w-[280px]">
                      {activeChat.participants && activeChat.participants.length > 0
                        ? activeChat.participants.map((p: any) => {
                            const pid = p.personId || p.PersonId || p.id || p.Id;
                            const cachedPerson = availablePersons.find(ap => (ap.id || ap.Id) === pid);
                            const nameStr = cachedPerson?.name || cachedPerson?.Name || p.fullName || p.FullName || p.Name || `User #${pid}`;
                            return nameStr.split(' ')[0];
                          }).filter(Boolean).join(', ')
                        : 'online encryption active'}
                    </p>
                  )}
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                {/* Info Button to Open Group Details */}
                <button 
                  onClick={() => setShowChatInfo(true)}
                  className="p-2 text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-all"
                  title={activeChat.isGroup ? "View Group Details" : "View Chat Info"}
                >
                  <Info size={20} />
                </button>

                {/* Search Button */}
                <button 
                  onClick={() => setIsSearchingMessages(prev => !prev)}
                  className={`p-2 rounded-full transition-all ${isSearchingMessages ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40' : 'text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}
                  title="Search Messages"
                >
                  <Search size={20} />
                </button>
              </div>
            </header>

            {/* Slide-down Message Search Bar */}
            {isSearchingMessages && (
              <div className="bg-white dark:bg-[#1c1c1e] border-b border-zinc-200 dark:border-zinc-800 px-4 py-2.5 flex items-center gap-2 animate-fade-in z-20">
                <Search size={16} className="text-zinc-400 shrink-0" />
                <input 
                  type="text"
                  placeholder="Search messages..."
                  value={messageSearchQuery}
                  onChange={(e) => setMessageSearchQuery(e.target.value)}
                  className="w-full text-xs bg-transparent focus:outline-none text-zinc-800 dark:text-zinc-200 placeholder-zinc-400"
                  autoFocus
                />
                {messageSearchQuery && (
                  <button 
                    onClick={() => setMessageSearchQuery('')}
                    className="p-1 text-zinc-400 hover:text-zinc-605 rounded-full"
                  >
                    <X size={14} />
                  </button>
                )}
                <button 
                  onClick={() => {
                    setIsSearchingMessages(false);
                    setMessageSearchQuery('');
                  }}
                  className="text-xs text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 font-semibold"
                >
                  Cancel
                </button>
              </div>
            )}

             {/* Sticky/Floating scroll date indicator showing the day of the message being scrolled through */}
            {showDateBadge && activeScrollDate && (
              <div className="absolute top-[68px] left-0 right-0 flex justify-center z-30 pointer-events-none animate-fade-in">
                <span className="bg-white/95 dark:bg-zinc-800/95 text-zinc-900 dark:text-zinc-100 px-3 py-1 rounded-full shadow-sm font-bold text-[10px] uppercase tracking-widest flex items-center gap-1.5 border border-zinc-200 dark:border-zinc-700 backdrop-blur-md">
                  <Calendar size={11} className="text-zinc-500 dark:text-zinc-400" />
                  <span>{getPartitionLabel(activeScrollDate)}</span>
                </span>
              </div>
            )}

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 flex flex-col relative z-10" ref={scrollRef} onScroll={handleMessagesScroll}>
              <div className="mt-auto flex flex-col gap-3 w-full">
              <div className="flex justify-center mb-4 mt-2 select-none w-full">
                <span className="bg-[#FFEBA5] dark:bg-zinc-800/95 border border-[#F5E095] dark:border-zinc-700 px-3 py-2 rounded-lg shadow-sm font-bold text-[10px] text-zinc-750 dark:text-zinc-300 uppercase tracking-wider flex items-center gap-1.5 bg-opacity-95 dark:bg-opacity-95">
                  <Lock size={11} className="text-amber-600 dark:text-amber-500 shrink-0" />
                  <span>Messages are end-end encrypted</span>
                </span>
              </div>
              
              {isMessagesLoading ? (
                <div className="flex items-center justify-center py-20">
                  <LoaderCircle className="animate-spin text-zinc-500" size={24} />
                </div>
              ) : (
                (() => {
                  // Resolve replyTo references from messages array
                  const resolved = messages.map(msg => {
                    const replyObj = msg.replyTo || msg.ReplyTo;
                    const replyId = msg.replyToMessageId || msg.ReplyToMessageId || replyObj?.id || replyObj?.Id;
                    const hasReply = (replyId && replyId !== 0 && replyId !== '0' && replyId !== 'null' && replyId !== 'undefined') || replyObj;
                    
                    if (hasReply) {
                      const finalReplyId = replyId ? String(replyId) : '0';
                      // Try to find referenced message in the loaded list
                      const refMsg = messages.find(m => String(m.id) === finalReplyId);
                      
                      let displayText = 'Referenced Message 📄';
                      if (refMsg) {
                        displayText = refMsg.text || (refMsg.type === 'image' ? 'Image File 📷' : refMsg.type === 'audio' ? 'Voice Message 🎵' : 'Attachment 📄');
                      } else if (replyObj) {
                        displayText = replyObj.text || replyObj.Text || replyObj.content || replyObj.Content || 'Referenced Message 📄';
                      }
                      
                      return {
                        ...msg,
                        replyTo: {
                          id: finalReplyId,
                          text: displayText
                        }
                      };
                    }
                    return msg;
                  });

                  const sorted = [...resolved].sort((a, b) => {
                    const dateA = new Date(a.sentAt || a.SentAt || 0).getTime();
                    const dateB = new Date(b.sentAt || b.SentAt || 0).getTime();
                    if (dateA !== dateB) return dateA - dateB;
                    const senderIdA = Number(a.senderPersonId || a.SenderPersonId || (a.isMe ? currentUserId : 0));
                    const senderIdB = Number(b.senderPersonId || b.SenderPersonId || (b.isMe ? currentUserId : 0));
                    return senderIdA - senderIdB;
                  });

                  const filtered = messageSearchQuery.trim()
                    ? sorted.filter(m => m.text?.toLowerCase().includes(messageSearchQuery.toLowerCase()))
                    : sorted;

                  if (messageSearchQuery.trim() && filtered.length === 0) {
                    return (
                      <div className="flex flex-col items-center justify-center py-20 text-zinc-400">
                        <Search size={32} className="text-zinc-300 dark:text-zinc-700 mb-2 animate-bounce" />
                        <p className="text-xs font-semibold">No messages found matching "{messageSearchQuery}"</p>
                      </div>
                    );
                  }

                  const myParticipant = activeChat ? (activeChat.participants || []).find(
                    (p: any) => Number(p.personId || p.PersonId || p.id || p.Id) === Number(currentUserId)
                  ) : null;
                  const myReadAt = myParticipant ? (myParticipant.lastReadAt || myParticipant.LastReadAt) : null;
                  
                  let firstUnreadId: string | null = null;
                  if (myReadAt && !messageSearchQuery.trim()) {
                    const myReadTime = new Date(myReadAt).getTime();
                    const firstUnread = sorted.find(m => {
                      if (m.isMe) return false;
                      const sentTime = new Date(m.sentAt || m.SentAt || 0).getTime();
                      return sentTime > myReadTime;
                    });
                    if (firstUnread) {
                      firstUnreadId = String(firstUnread.id);
                    }
                  }

                  let lastDateStr = '';
                  return filtered.map((msg) => {
                    const msgDate = msg.sentAt ? new Date(msg.sentAt) : new Date();
                    const msgDateStr = msgDate.toDateString();
                    const showDivider = msgDateStr !== lastDateStr;
                    lastDateStr = msgDateStr;

                    const showUnreadBanner = firstUnreadId && String(msg.id) === firstUnreadId;

                    return (
                      <React.Fragment key={msg.id}>
                        {showDivider && (
                          <div className="flex justify-center my-3 select-none animate-fade-in w-full">
                            <span className="bg-white/95 dark:bg-zinc-800/95 border border-zinc-200 dark:border-zinc-700 px-3 py-1 text-zinc-600 dark:text-zinc-300 text-[10px] font-bold rounded-full shadow-sm uppercase tracking-wider flex items-center gap-1.5">
                              <Calendar size={11} className="text-zinc-500 dark:text-zinc-400" />
                              {getPartitionLabel(msgDateStr)}
                            </span>
                          </div>
                        )}

                        {showUnreadBanner && (
                          <div className="flex justify-center my-4 select-none animate-fade-in w-full">
                            <span className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 px-4 py-1.5 text-red-600 dark:text-red-400 text-[10px] font-bold rounded shadow-sm uppercase tracking-wider flex items-center gap-1.5">
                              Unread Messages
                            </span>
                          </div>
                        )}

                        <div className={`flex w-full ${msg.isMe ? 'justify-end' : 'justify-start'}`}>
                          <div 
                            id={`msg-${msg.id}`}
                            onMouseDown={(e) => handleMessagePressStart(e, msg.id)}
                            onMouseUp={() => handleMessagePressEnd(msg.id)}
                            onMouseLeave={() => handleMessagePressEnd(msg.id)}
                            onMouseMove={(e) => handleMessageMove(e, msg.id)}
                            onTouchStart={(e) => handleMessagePressStart(e, msg.id)}
                            onTouchEnd={() => handleMessagePressEnd(msg.id)}
                            onTouchMove={(e) => handleMessageMove(e, msg.id)}
                            onTouchCancel={() => handleMessagePressEnd(msg.id)}
                            onContextMenu={(e) => e.preventDefault()}
                            style={{
                              transform: swipingMessageId === String(msg.id) ? `translateX(${swipeOffset}px)` : 'none',
                              transition: swipingMessageId === String(msg.id) ? 'none' : 'transform 150ms cubic-bezier(0.16, 1, 0.3, 1)',
                              ...(highlightedMessageId === String(msg.id) ? {} : (msg.isMe ? { backgroundColor: chatThemeColor, borderColor: chatThemeColor } : {}))
                            }}
                            className={`p-2.5 rounded-md shadow-sm max-w-[90%] inline-block relative border cursor-pointer select-none transition-all duration-300 active:scale-[0.99] ${
                              highlightedMessageId === String(msg.id)
                                ? 'bg-yellow-105 border-yellow-405 ring-4 ring-yellow-400/50 scale-[1.02] shadow-md animate-pulse'
                                : (msg.isMe ? 'text-white' : 'bg-white border-zinc-200 dark:bg-[#1c1c1e] dark:border-zinc-800 dark:text-zinc-200 shadow-sm')
                            } ${msg.isMe ? 'rounded-tr-none' : 'rounded-tl-none'}`}
                          >
                            
                            {!msg.isMe && (
                              <p className="text-[10px] font-bold text-indigo-600 mb-1">{msg.senderName}</p>
                            )}

                            {msg.replyTo && (
                              <div 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleReplyClick(String(msg.replyTo!.id));
                                }}
                                className="mb-2 p-2 bg-black/5 hover:bg-black/10 border-l-4 border-emerald-500 rounded text-xs text-zinc-650 dark:text-zinc-300 truncate cursor-pointer transition-colors select-none"
                                title="Click to view referenced message"
                              >
                                {msg.replyTo.text}
                              </div>
                            )}

                            {editingMessageId === msg.id ? (
                              <div className="flex flex-col gap-2 min-w-[200px]">
                                <input 
                                  type="text" 
                                  value={editingText} 
                                  onChange={(e) => setEditingText(e.target.value)} 
                                  className="w-full text-xs p-1 border border-zinc-300 rounded focus:outline-none focus:border-emerald-500 text-black font-semibold"
                                  autoFocus
                                />
                                <div className="flex gap-1.5 justify-end">
                                  <button onClick={() => setEditingMessageId(null)} className="text-[10px] text-zinc-500 hover:underline">Cancel</button>
                                  <button onClick={handleSaveEdit} className="text-[10px] text-emerald-600 font-bold hover:underline">Save</button>
                                </div>
                              </div>
                            ) : (
                              <>
                                {msg.attachments && msg.attachments.length > 0 ? (
                                  <div className="flex flex-col gap-2 max-w-sm">
                                    {renderMsgAttachments(msg)}
                                    {msg.text && <p className={`text-xs pt-1 break-words font-medium ${msg.isMe ? 'text-white' : 'text-zinc-800 dark:text-zinc-200'}`}>{msg.text}</p>}
                                  </div>
                                ) : (
                                  msg.type === 'text' && (
                                    <p className={`text-xs break-words font-medium ${msg.isMe ? 'text-white' : 'text-zinc-800 dark:text-zinc-200'}`}>{msg.text}</p>
                                  )
                                )}
                                
                                {msg.type === 'audio' && !msg.attachments?.length && (
                                  <VoicePlayer mediaUrl={msg.mediaUrl} duration={msg.duration} />
                                )}
                              </>
                            )}

                            <div className={`flex justify-between items-center gap-4 mt-1.5 w-full ${msg.isMe ? 'text-white/80' : 'text-zinc-500'}`}>
                              
                              <div className="flex items-center gap-1 ml-auto shrink-0 whitespace-nowrap">
                                <p className="text-[9px] font-semibold uppercase shrink-0 whitespace-nowrap">{msg.time}</p>
                                {msg.isMe && (
                                  msg.pending ? (
                                    <Clock size={11} className="text-white/60 animate-pulse shrink-0" />
                                  ) : msg.status === 'failed' ? (
                                    <AlertCircle size={12} className="text-red-500 shrink-0" />
                                  ) : (
                                    <CheckCheck size={12} className={`${getMessageTickColor(msg)} shrink-0`} />
                                  )
                                )}
                              </div>
                            </div>
                            {/* Small tail */}
                            <div className={`absolute top-0 w-2.5 h-2.5 ${msg.isMe ? '-right-2.5' : '-left-2.5 bg-white dark:bg-[#1c1c1e]'}`} style={{ clipPath: msg.isMe ? 'polygon(0 0, 100% 0, 0 100%)' : 'polygon(100% 0, 0 0, 100% 100%)', backgroundColor: msg.isMe ? chatThemeColor : undefined }}></div>
                          </div>
                        </div>
                      </React.Fragment>
                    );
                  });
        })()
      )}
              
              {/* Typing Indicator Animation */}
              {activeChat && typingUsers[activeChat.id] && typingUsers[activeChat.id].length > 0 && (
                <div className="flex justify-start mb-6 animate-fade-in">
                  <div className="relative ml-2">
                    <div className="bg-white dark:bg-[#1c1c1e] p-3 rounded-2xl rounded-tl-none border border-zinc-200 dark:border-zinc-800 shadow-sm flex items-center gap-1.5 min-w-[60px] justify-center">
                      <div className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                      <div className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                      <div className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce"></div>
                    </div>
                    {/* Small tail for typing indicator */}
                    <div className="absolute top-0 -left-2 w-2 h-2 bg-white dark:bg-[#1c1c1e]" style={{ clipPath: 'polygon(100% 0, 0 0, 100% 100%)' }}></div>
                  </div>
                </div>
              )}
              </div>
            </div>

            {showScrollButton && (
              <button 
                onClick={scrollToBottom}
                className="absolute bottom-24 right-6 w-11 h-11 flex flex-col items-center justify-center bg-white dark:bg-zinc-800 rounded-full shadow-lg z-30 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-all border border-zinc-200 dark:border-zinc-700 animate-bounce cursor-pointer hover:scale-105 active:scale-95"
              >
                <ChevronDown size={14} className="-mb-2.5 text-emerald-500 shrink-0" />
                <ChevronDown size={14} className="-mb-2.5 text-emerald-500 opacity-75 shrink-0" />
                <ChevronDown size={14} className="text-emerald-500 opacity-50 shrink-0" />
              </button>
            )}

            {/* Interactive File Attachment Fields Auto-Fill Modal */}
            <AnimatePresence>
              {showAttachmentModal && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 bg-zinc-950/45 backdrop-blur-md z-50 flex flex-col justify-between shadow-2xl"
                >
                  <header className="flex justify-between items-center p-3 h-16 bg-black/20 border-b border-white/10 text-white select-none backdrop-blur-sm">
                    <button onClick={handleCancelAttachment} className="p-2 text-white/75 hover:text-white transition-colors" title="Cancel upload"><X size={24} /></button>
                    <span className="text-sm font-black uppercase tracking-widest text-[#53bdeb]">Secure File Attachment</span>
                    <div className="w-10"></div>
                  </header>

                  <div className="flex-1 overflow-y-auto p-8 flex flex-col items-center justify-center gap-6 select-none bg-transparent text-white animate-fade-in">
                    {mediaPreviews.length > 1 ? (
                      <div className="flex flex-col items-center gap-4 w-full max-w-lg">
                        {/* 1. Large Center Preview of active index */}
                        {(() => {
                          const activeItem = mediaPreviews[mediaActiveIndex];
                          if (!activeItem) return null;
                          return (
                            <div className="flex flex-col items-center gap-2 animate-scale-up w-full">
                              {activeItem.type === MessageType.Image ? (
                                <img src={activeItem.pathBase64 || undefined} alt="active-preview" className="rounded-2xl max-h-56 object-contain shadow-2xl border border-white/15" />
                              ) : (
                                <video src={activeItem.pathBase64 || undefined} controls className="rounded-2xl max-h-56 w-full object-contain shadow-2xl border border-white/15" />
                              )}
                              <span className="text-xs text-white/80 font-black tracking-widest uppercase bg-black/40 px-3 py-1.5 rounded-full border border-white/10 truncate max-w-xs">{activeItem.fileName}</span>
                            </div>
                          );
                        })()}

                        {/* 2. Thumbnail carousel */}
                        <div className="flex gap-2 items-center overflow-x-auto py-2 px-4 w-full justify-center bg-black/25 rounded-2xl border border-white/5 max-w-sm">
                          {mediaPreviews.map((p, idx) => {
                            const isActive = idx === mediaActiveIndex;
                            return (
                              <button 
                                key={idx}
                                onClick={() => {
                                  setMediaActiveIndex(idx);
                                  // Update fallback state variables for safety
                                  setAttachmentFileName(p.fileName);
                                  setAttachmentContentType(p.contentType);
                                  setAttachmentFileSize(p.fileSize);
                                  setAttachmentPathBase64(p.pathBase64);
                                  setAttachmentType(p.type);
                                }}
                                className={`w-12 h-12 rounded-xl overflow-hidden border-2 shrink-0 relative transition-all ${
                                  isActive ? 'border-[#53bdeb] scale-105 shadow-md' : 'border-white/20 hover:border-white/50 opacity-70 hover:opacity-100'
                                }`}
                              >
                                {p.type === MessageType.Image ? (
                                  <img src={p.pathBase64 || undefined} alt="thumb" className="w-full h-full object-cover" />
                                ) : (
                                  <div className="w-full h-full relative">
                                    <video src={p.pathBase64 || undefined} className="w-full h-full object-cover" />
                                    <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                                      <Play size={14} className="text-white" fill="currentColor" />
                                    </div>
                                  </div>
                                )}
                                <div 
                                  onClick={(e) => deletePreviewItem(e, idx)}
                                  className="absolute top-0.5 right-0.5 w-4 h-4 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center text-white cursor-pointer z-10 transition-all hover:scale-110 shadow-md"
                                  title="Delete preview"
                                >
                                  <X size={10} className="stroke-[3]" />
                                </div>
                              </button>
                            );
                          })}
                        </div>
                        
                        <div className="text-[10px] text-zinc-300 uppercase tracking-widest font-bold">
                          Selected {mediaPreviews.length} Media Files
                        </div>
                      </div>
                    ) : (
                      attachmentType === MessageType.Image && attachmentPathBase64 ? (
                        <div className="flex flex-col items-center gap-3 animate-scale-up">
                          <img src={attachmentPathBase64 || undefined} alt="attachment-preview" className="rounded-2xl max-h-64 object-contain shadow-2xl border border-white/15" />
                          <span className="text-xs text-white/80 font-black tracking-widest uppercase bg-black/40 px-4 py-2 rounded-full border border-white/10">{attachmentFileName || "Attached Image"}</span>
                        </div>
                      ) : attachmentType === MessageType.Video && attachmentPathBase64 ? (
                        <div className="flex flex-col items-center gap-3 animate-scale-up w-full max-w-sm">
                          <video src={attachmentPathBase64 || undefined} controls className="rounded-2xl max-h-64 w-full object-contain shadow-2xl border border-white/15" />
                          <span className="text-xs text-white/80 font-black tracking-widest uppercase bg-black/40 px-4 py-2 rounded-full border border-white/10">{attachmentFileName || "Attached Video"}</span>
                        </div>
                      ) : attachmentType === MessageType.Audio && attachmentPathBase64 ? (
                        <div className="flex flex-col items-center gap-4 animate-scale-up w-full max-w-xs text-zinc-100">
                          <AudioAttachmentPlayer mediaUrl={attachmentPathBase64} fileName={attachmentFileName} fileSize={attachmentFileSize} />
                          <span className="text-xs text-white/80 font-black tracking-widest uppercase bg-black/40 px-4 py-2 rounded-full border border-white/10">Audio Preview</span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-4 animate-scale-up">
                          <div className="w-24 h-24 bg-white/10 backdrop-blur-md rounded-3xl flex items-center justify-center border border-white/15 text-[#53bdeb] shadow-xl">
                            <Paperclip size={40} />
                          </div>
                          <span className="text-sm text-white font-heavy bg-black/50 px-4 py-2 rounded-full border border-white/10 tracking-wider">{attachmentFileName || "Attached File"}</span>
                          {attachmentFileSize > 0 && (
                            <span className="text-[10px] text-zinc-300 font-mono font-bold tracking-wider bg-black/35 px-2.5 py-1 rounded-md">{(attachmentFileSize / 1024).toFixed(1)} KB</span>
                          )}
                        </div>
                      )
                    )}
                  </div>

                  {/* Send interface for attachment */}
                  <div className="bg-black/30 backdrop-blur-sm p-4 border-t border-white/10 flex items-center gap-3 pb-safe">
                    <input 
                      type="text" 
                      placeholder="Add an optional caption message..." 
                      className="flex-1 bg-black/40 border border-white/10 text-white rounded-full px-5 py-3 outline-none text-xs placeholder-zinc-400 focus:border-[#53bdeb] transition-colors"
                      value={attachmentCaption}
                      onChange={e => setAttachmentCaption(e.target.value)}
                    />
                    <button 
                      onClick={handleSendAttachment}
                      style={{ backgroundColor: chatThemeColor }}
                      className="w-12 h-12 text-white rounded-full flex items-center justify-center shrink-0 shadow-lg transition-transform active:scale-95 cursor-pointer"
                      title="Commit and Send"
                    >
                      <Send size={20} className="ml-0.5 text-white" />
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Input Area */}
            <div className="bg-[#F0F0F0] dark:bg-[#121214] p-2 shrink-0 pb-safe flex flex-col relative z-10 shadow-md">
              {replyTo && (
                <div className="bg-zinc-100 dark:bg-[#1a1a1c] px-3 py-1.5 mb-2 rounded-lg border-l-4 border-emerald-500 flex justify-between items-center mr-12 shadow-sm text-xs">
                  <div className="truncate text-zinc-700 dark:text-zinc-300">
                    <span className="font-bold text-emerald-600 block text-[10px] uppercase">Reply</span> 
                    {replyTo.text}
                  </div>
                  <button onClick={() => setReplyTo(null)} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-white p-1">
                    <X size={14} />
                  </button>
                </div>
              )}
              <div className="flex items-end gap-2 w-full">
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  onChange={handleAttachmentUpload}
                  multiple
                />
                <input 
                  type="file" 
                  ref={mediaInputRef} 
                  className="hidden" 
                  accept="image/*,video/*"
                  onChange={handleAttachmentUpload}
                  multiple
                />
                
                <div className="flex-1 bg-[#F0F0F0] dark:bg-[#1c1c1e] border border-transparent shadow-none overflow-hidden flex items-center relative rounded-xl min-h-[48px]">
                {!isRecording && (
                  <button onClick={() => fileInputRef.current?.click()} className="p-3 text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200" title="Auto-fill File Payload">
                    <Paperclip size={20} />
                  </button>
                )}
                {!isRecording && (
                  <button onClick={() => mediaInputRef.current?.click()} className="p-3 text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200" title="Select Image or Video">
                    <Image size={20} />
                  </button>
                )}
                
                {isRecording ? (
                  <div className="flex-1 flex items-center justify-between gap-3 px-4 py-2 bg-red-50 dark:bg-red-950/20 rounded-md">
                    <div className="flex items-center gap-3">
                      <button 
                        onClick={deleteRecordingAudio} 
                        className="p-1.5 text-zinc-400 hover:text-red-500 hover:bg-red-100 dark:hover:bg-red-900/40 rounded-full transition-colors cursor-pointer"
                        title="Delete Recording"
                      >
                        <Trash2 size={18} />
                      </button>

                      {recordingState === 'recording' ? (
                        <div className="flex items-center gap-2">
                          <AudioRecordingVisualizer stream={recordingStream} isRecording={isRecording} />
                          <span className="text-xs font-bold font-mono text-red-500 tabular-nums">
                            {Math.floor(recordingDuration / 60)}:{(recordingDuration % 60).toString().padStart(2, '0')}
                          </span>
                          <motion.div 
                            className="flex items-center gap-1 text-zinc-400 dark:text-zinc-500 text-[10px] ml-2 select-none pointer-events-none"
                            animate={{ x: [0, -4, 0] }}
                            transition={{ repeat: Infinity, duration: 1.5 }}
                          >
                            <ChevronLeft size={12} className="animate-pulse text-red-500/80" />
                            <span className="font-semibold hidden sm:inline">Slide button left to cancel</span>
                          </motion.div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold font-mono text-zinc-500 dark:text-zinc-400 tabular-nums">
                            {Math.floor(recordingDuration / 60)}:{(recordingDuration % 60).toString().padStart(2, '0')}
                          </span>
                          {recordedBlobs.length > 0 && (
                            <div className="flex items-center gap-1.5 bg-zinc-200/60 dark:bg-zinc-800 px-2 py-1 rounded-full">
                              <button 
                                onClick={handleTogglePreviewPlay} 
                                className="w-6 h-6 rounded-full bg-white dark:bg-zinc-700 hover:bg-zinc-100 flex items-center justify-center text-zinc-700 dark:text-zinc-200 shadow-sm cursor-pointer"
                                title="Play Preview"
                              >
                                {isPreviewPlaying ? <Pause size={10} fill="currentColor" /> : <Play size={10} className="ml-0.5" fill="currentColor" />}
                              </button>
                              {isPreviewPlaying && (
                                <span className="text-[9px] font-mono font-bold text-indigo-600 dark:text-indigo-400">
                                  {Math.floor(previewCurrentTime / 60)}:{(Math.floor(previewCurrentTime) % 60).toString().padStart(2, '0')}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center">
                      {recordingState === 'recording' ? (
                        <button 
                          onClick={pauseRecordingAudio} 
                          className="p-1.5 text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors cursor-pointer"
                          title="Pause Recording"
                        >
                          <Pause size={18} />
                        </button>
                      ) : (
                        <button 
                          onClick={startRecordingAudio} 
                          className="p-1.5 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-full transition-all animate-pulse cursor-pointer"
                          title="Resume Recording"
                        >
                          <Mic size={18} />
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  <textarea 
                    ref={messageInputRef}
                    value={messageText}
                    onChange={(e) => {
                      setMessageText(e.target.value);
                      handleLocalUserTyping();
                    }}
                    placeholder="Type message..."
                    className="flex-1 bg-transparent resize-none max-h-24 min-h-[40px] px-3 py-3 text-xs text-zinc-800 dark:text-zinc-200 focus:outline-none placeholder-zinc-400 font-semibold"
                    rows={1}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                  />
                )}
              </div>
              
              {messageText.trim().length > 0 ? (
                <button 
                  onClick={handleSendMessage}
                  style={{ backgroundColor: chatThemeColor }}
                  className="w-10 h-10 flex items-center justify-center shrink-0 transition-opacity rounded-full shadow-sm text-white hover:opacity-90 active:scale-95 cursor-pointer"
                  title="Send Message"
                >
                  <Send size={18} className="ml-0.5" />
                </button>
              ) : (
                <motion.div 
                  drag={isRecording && recordingState === 'recording' ? "x" : false}
                  dragConstraints={{ left: -140, right: 0 }}
                  dragElastic={0.05}
                  onDragEnd={(event, info) => {
                    if (info.offset.x < -100) {
                      deleteRecordingAudio();
                    }
                  }}
                  onClick={() => {
                    if (isRecording) {
                      stopRecordingAudio();
                    } else {
                      startRecordingAudio();
                    }
                  }}
                  style={isRecording ? undefined : { backgroundColor: chatThemeColor }}
                  className={`w-10 h-10 flex items-center justify-center shrink-0 transition-all rounded-full shadow-sm cursor-pointer select-none touch-none ${
                    isRecording ? 'bg-red-500 text-white animate-pulse' : 'text-white hover:opacity-90 active:scale-95'
                  }`}
                  title={isRecording ? "Send / Slide left to cancel" : "Record Voice Note"}
                >
                  {isRecording ? <Send size={18} className="ml-0.5" /> : <Mic size={18} />}
                </motion.div>
              )}
              </div>
            </div>

            {/* Chat/Group Information details modal */}
            <AnimatePresence>
              {showChatInfo && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex flex-col items-center justify-start p-4 pt-[74px] pb-4"
                >
                  <motion.div 
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.95, opacity: 0 }}
                    className="bg-white rounded-3xl p-6 w-full max-w-sm flex flex-col shadow-2xl relative border-2 border-zinc-200 overflow-hidden max-h-full"
                  >
                    {/* Header */}
                    <div className="flex items-center justify-between border-b border-zinc-100 pb-4 mb-4 select-none w-full">
                      <h2 className="text-xl font-black text-zinc-900 tracking-tight flex items-center gap-2">
                        <Users size={20} className="text-indigo-600" /> Chat Information
                      </h2>
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={exportChatHistory} 
                          className="flex items-center gap-1.5 text-zinc-600 hover:text-zinc-900 bg-zinc-100 hover:bg-zinc-200 py-1.5 px-2 rounded-lg transition-all shadow-sm"
                          title="Export Chat History"
                        >
                          <Download size={16} />
                        </button>
                        <button 
                          onClick={() => setShowChatInfo(false)} 
                          className="flex items-center gap-1.5 text-white bg-zinc-950 hover:bg-zinc-800 py-1.5 px-3 rounded-lg transition-all border border-zinc-950 shadow-sm"
                          title="Back to Chat"
                        >
                          <span className="text-xs font-bold uppercase">Back</span>
                          <ChevronLeft size={16} className="rotate-180" />
                        </button>
                      </div>
                    </div>

                    {/* Metadata summary with editable state */}
                    <div className="flex flex-col items-center py-4 text-center border-b pb-6 mb-6 w-full">
                      {isEditingGroupChat ? (
                        <div className="w-full flex flex-col items-center gap-3">
                          <label className="text-[10px] text-zinc-400 font-extrabold uppercase tracking-widest leading-none">Group Image</label>
                          <div 
                            onClick={() => {
                              const el = document.getElementById('edit_group_img_upload');
                              if (el) el.click();
                            }}
                            className="w-20 h-20 bg-zinc-50 border-2 border-dashed border-zinc-300 rounded-full flex items-center justify-center cursor-pointer hover:bg-zinc-100 transition-colors relative overflow-hidden group shadow-inner"
                          >
                            {editGroupImagePreview ? (
                              <img src={editGroupImagePreview || undefined} alt="Group Preview" className="w-full h-full object-cover animate-fade-in" />
                            ) : (
                              <div className="flex flex-col items-center justify-center text-zinc-400">
                                <Plus size={20} className="text-zinc-400 group-hover:text-black transition-colors" />
                                <span className="text-[8px] font-bold mt-1 uppercase tracking-wider text-center px-1">Upload</span>
                              </div>
                            )}
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white font-bold text-[9px] uppercase tracking-wider transition-opacity">
                              Change
                            </div>
                          </div>
                          <input 
                            id="edit_group_img_upload" 
                            type="file" 
                            accept="image/*" 
                            className="hidden"
                            onChange={(e) => {
                              if (e.target.files && e.target.files.length > 0) {
                                const file = e.target.files[0];
                                const reader = new FileReader();
                                reader.readAsDataURL(file);
                                reader.onload = () => {
                                  setCropImageSrc(reader.result as string);
                                  setCropperTarget('edit');
                                  setShowCropper(true);
                                };
                              }
                            }} 
                          />
                          {editGroupImagePreview && (
                            <button 
                              onClick={(e) => { e.stopPropagation(); setEditGroupImagePreview(null); setEditGroupImage(null); }} 
                              className="text-[9px] text-red-500 hover:text-red-700 font-extrabold uppercase tracking-wider transition-colors"
                            >
                              Remove Image
                            </button>
                          )}

                          <div className="w-full flex flex-col gap-1 text-left mt-2 animate-fade-in">
                            <label className="text-[9px] text-zinc-400 font-extrabold uppercase tracking-widest">Group Name</label>
                            <input 
                              type="text" 
                              value={editGroupName} 
                              onChange={e => setEditGroupName(e.target.value)} 
                              placeholder="Group Name"
                              className="w-full px-3 py-1.5 bg-zinc-50 border border-zinc-200 focus:border-black text-xs font-bold rounded-lg outline-none transition-colors text-black" 
                            />
                          </div>

                          <div className="w-full flex flex-col gap-1 text-left animate-fade-in">
                            <label className="text-[9px] text-zinc-400 font-extrabold uppercase tracking-widest">Description</label>
                            <textarea 
                              value={editGroupDescription} 
                              onChange={e => setEditGroupDescription(e.target.value)} 
                              placeholder="Describe this group chat room..."
                              rows={2}
                              className="w-full px-3 py-1.5 bg-zinc-50 border border-zinc-200 focus:border-black text-xs font-medium rounded-lg outline-none transition-colors text-black resize-none" 
                            />
                          </div>

                          <div className="flex gap-2 w-full mt-3 animate-fade-in">
                            <button 
                              onClick={() => { setIsEditingGroupChat(false); }}
                              disabled={isUpdatingGroup}
                              className="flex-1 py-1.5 border border-zinc-200 text-zinc-650 font-extrabold hover:bg-zinc-50 transition-colors rounded-lg text-xs flex items-center justify-center gap-1.5"
                            >
                              <X size={12} /> Cancel
                            </button>
                            <button 
                              onClick={handleUpdateGroupChat}
                              disabled={isUpdatingGroup}
                              className="flex-1 py-1.5 bg-indigo-600 text-white font-extrabold hover:bg-indigo-700 transition-colors rounded-lg text-xs flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-50"
                            >
                              {isUpdatingGroup ? <LoaderCircle className="animate-spin" size={12} /> : <Check size={12} />}
                              <span>Save</span>
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center">
                          <div className="w-20 h-20 bg-indigo-50 border-2 border-indigo-200 rounded-full flex items-center justify-center text-indigo-600 mb-3 text-4xl font-extrabold shadow-sm select-none overflow-hidden relative">
                            {(() => {
                              if (activeChat.isGroup) {
                                return activeChat.imageUrl ? (
                                  <img src={getImageUrl(activeChat.imageUrl)} alt={activeChat.name} className="w-full h-full object-cover" />
                                ) : (
                                  activeChat.name.charAt(0).toUpperCase()
                                );
                              } else {
                                const partner = activeChat.participants?.find((p: any) => {
                                  const pId = p.personId || p.PersonId || p.id || p.Id;
                                  return Number(pId) !== Number(currentUserId);
                                });
                                const partnerId = partner?.personId || partner?.PersonId || partner?.id || partner?.Id;
                                const personDetails = availablePersons.find(ap => Number(ap.id || ap.Id) === Number(partnerId));
                                const partnerImg = activeChat.imageUrl || activeChat.ImageUrl || partner?.profileImageUrl || partner?.ProfileImageUrl || personDetails?.imageUrl || personDetails?.ImageUrl;
                                const partnerName = personDetails?.name || personDetails?.Name || activeChat.name;
                                return partnerImg ? (
                                  <img src={getImageUrl(partnerImg)} alt={partnerName} className="w-full h-full object-cover" />
                                ) : (
                                  partnerName.charAt(0).toUpperCase()
                                );
                              }
                            })()}
                          </div>
                          <h3 className="font-bold text-lg text-zinc-800 tracking-tight">
                            {(() => {
                              if (activeChat.isGroup) {
                                return activeChat.name;
                              } else {
                                const partner = activeChat.participants?.find((p: any) => {
                                  const pId = p.personId || p.PersonId || p.id || p.Id;
                                  return Number(pId) !== Number(currentUserId);
                                });
                                const partnerId = partner?.personId || partner?.PersonId || partner?.id || partner?.Id;
                                const personDetails = availablePersons.find(ap => Number(ap.id || ap.Id) === Number(partnerId));
                                return personDetails?.name || personDetails?.Name || activeChat.name;
                              }
                            })()}
                          </h3>
                          {activeChat.isGroup && (
                            <p className="text-xs text-zinc-500 mt-1 max-w-[240px] italic text-center">{activeChat.description || "No description set for this group chat"}</p>
                          )}
                          
                          <div className="flex gap-2.5 mt-4">
                            {activeChat.isGroup ? (
                              <>
                                <button 
                                  onClick={() => {
                                    setEditGroupName(activeChat.name);
                                    setEditGroupDescription(activeChat.description || '');
                                    setEditGroupImagePreview(null);
                                    setEditGroupImage(null);
                                    setIsEditingGroupChat(true);
                                  }}
                                  className="px-3 py-1 bg-zinc-100 hover:bg-zinc-200/80 transition-colors text-zinc-700 rounded-lg text-[10px] uppercase tracking-widest font-black flex items-center gap-1.5 border border-zinc-200 shadow-sm"
                                >
                                  <Edit2 size={10} /> Edit Info
                                </button>
                                <button 
                                  onClick={() => setShowDeleteConfirm(true)}
                                  className="px-3 py-1 bg-red-50 hover:bg-red-100 text-red-600 transition-all rounded-lg text-[10px] uppercase tracking-widest font-black flex items-center gap-1.5 border border-red-100 shadow-sm"
                                >
                                  <Trash2 size={10} /> Delete Chat
                                </button>
                              </>
                            ) : (
                              <button 
                                onClick={() => {
                                  setShowChatInfo(false);
                                  setShowDeleteConfirm(true);
                                }}
                                className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 transition-all rounded-lg text-xs uppercase tracking-widest font-extrabold flex items-center gap-1.5 border border-red-100 shadow-sm cursor-pointer select-none"
                              >
                                <Trash2 size={14} /> Delete Chat
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                                       {/* Members List */}
                    {activeChat.isGroup && (
                      <div className="flex-1 overflow-y-auto flex flex-col">
                        <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-3 flex items-center justify-between">
                          <span>Members ({activeChat.participants.length})</span>
                        </h4>

                        {isEditingGroupChat && (
                          <div className="flex flex-col gap-2 mb-6">
                              <h5 className="text-[10px] font-black uppercase text-zinc-400 border-b pb-1 mb-1">Available to Add</h5>
                              <div className="max-h-40 overflow-y-auto flex flex-col gap-2 p-1">
                                  {availablePersons.filter(person => !activeChat.participants.some(p => (p.personId || p.PersonId) === (person.id || person.Id))).map(person => {
                                    const pId = person.id || person.Id;
                                    const pName = person.name || person.Name || `User #${pId}`;
                                    const isSelected = selectedToAdd.includes(pId);
                                    return (
                                      <div 
                                        key={pId} 
                                        onClick={() => setSelectedToAdd(prev => prev.includes(pId) ? prev.filter(x => x !== pId) : [...prev, pId])}
                                        className="flex items-center justify-between p-2 rounded-xl bg-zinc-50 border border-zinc-100 hover:border-zinc-350 transition-colors cursor-pointer select-none"
                                      >
                                          <div className="flex items-center gap-2">
                                              <div className="w-8 h-8 rounded-full bg-zinc-200 flex items-center justify-center font-bold text-xs text-zinc-700">
                                                  {pName.charAt(0).toUpperCase()}
                                              </div>
                                              <span className="text-xs font-bold text-zinc-800">{pName}</span>
                                          </div>
                                          <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${isSelected ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-zinc-300 bg-white'}`}>
                                            {isSelected && <Check size={12} strokeWidth={3} />}
                                          </div>
                                      </div>
                                    );
                                  })}
                                  {availablePersons.filter(person => !activeChat.participants.some(p => (p.personId || p.PersonId) === (person.id || person.Id))).length === 0 && (
                                    <p className="text-xs text-zinc-400 text-center py-2">All available users are already in this group.</p>
                                  )}
                              </div>
                              {selectedToAdd.length > 0 && (
                                 <button
                                   onClick={() => handleAddParticipantsList(selectedToAdd)}
                                   disabled={isManagingParticipants}
                                   className="w-full mt-2 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold uppercase tracking-wider rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                                 >
                                   {isManagingParticipants ? <LoaderCircle className="animate-spin" size={12} /> : <Plus size={14} />}
                                   Add {selectedToAdd.length} Selected Participant{selectedToAdd.length > 1 ? 's' : ''}
                                 </button>
                              )}
                          </div>
                        )}

                        <div className="flex flex-col gap-2">
                          {activeChat.participants && activeChat.participants.length > 0 ? (
                            [...activeChat.participants]
                              .sort((a, b) => {
                                const aAdmin = !!(a.isAdmin ?? a.IsAdmin);
                                const bAdmin = !!(b.isAdmin ?? b.IsAdmin);
                                if (aAdmin && !bAdmin) return -1;
                                if (!aAdmin && bAdmin) return 1;
                                return 0;
                              })
                              .map((p, index) => {
                                const pId = p.personId ?? p.PersonId ?? index;
                                const personInfo = availablePersons.find(ap => (ap.id || ap.Id) === pId);
                                const fName = personInfo?.name || personInfo?.Name || p.fullName || p.FullName || `User #${pId}`;
                                const pImg = personInfo?.imageUrl || personInfo?.ImageUrl;
                                const isPAdmin = !!(p.isAdmin ?? p.IsAdmin);
                                const onlineStatus = (Number(pId) === Number(currentUserId)) || onlineUsers.has(Number(pId)) || !!(p.isOnline ?? p.IsOnline);

                                return (
                                  <div 
                                    key={pId} 
                                    onClick={() => {
                                      if (!isEditingGroupChat && pId !== currentUserId) {
                                        handleRedirectToUserDirectChat(Number(pId), fName);
                                      }
                                    }}
                                    className={`flex items-center justify-between p-2 rounded-lg transition-colors border border-transparent ${
                                      (!isEditingGroupChat && pId !== currentUserId) ? 'cursor-pointer hover:bg-zinc-50 hover:border-zinc-100' : ''
                                    }`}
                                  >
                                    <div className="flex items-center gap-2">
                                      <div className="w-8 h-8 rounded-full bg-zinc-100 border border-zinc-200 flex items-center justify-center text-zinc-700 font-bold text-xs overflow-hidden">
                                        {pImg ? (
                                          <img src={getImageUrl(pImg)} alt={fName} className="w-full h-full object-cover" />
                                        ) : (
                                          fName.charAt(0)
                                        )}
                                      </div>
                                      <div>
                                        <div className="flex items-center gap-1">
                                          <p className="text-xs font-bold text-zinc-800">{fName}</p>
                                          {isPAdmin && (
                                            <span className="bg-amber-100 text-amber-800 text-[8px] font-extrabold px-1 rounded uppercase tracking-wider scale-95 origin-left">Admin</span>
                                          )}
                                        </div>
                                        <p className={`text-[9px] font-medium font-mono ${onlineStatus ? 'text-green-600' : 'text-zinc-400'}`}>{onlineStatus ? "Online" : "Offline"}</p>
                                      </div>
                                    </div>

                                  {isEditingGroupChat && (
                                    <button 
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleRemoveParticipant(pId);
                                      }}
                                      disabled={isManagingParticipants}
                                      className="p-1 hover:bg-red-50 text-zinc-400 hover:text-red-500 rounded transition-all"
                                      title="Remove Participant"
                                    >
                                      <UserMinus size={14} />
                                    </button>
                                  )}
                                </div>
                              );
                            })
                          ) : (
                            <div className="text-center py-4 text-xs text-zinc-400">
                              No external participants joined.
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Create Group Modal */}
      <AnimatePresence>
        {showCreateGroup && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl p-6 w-full max-w-sm flex flex-col shadow-2xl relative border-2 border-zinc-200"
            >
              <button onClick={() => setShowCreateGroup(false)} className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-800"><X size={20}/></button>
              <h2 className="text-xl font-black text-zinc-900 mb-4 tracking-tight flex items-center gap-2"><Users size={20}/> New Group</h2>
              
              <div className="flex flex-col gap-3 mb-6 overflow-y-auto max-h-[60vh] pr-1">
                <div className="flex flex-col items-center gap-2 mb-4">
                  <div 
                    onClick={() => {
                      const el = document.getElementById('group_img_upload');
                      if (el) el.click();
                    }}
                    className="w-24 h-24 bg-zinc-100 border-2 border-dashed border-zinc-300 rounded-full flex items-center justify-center cursor-pointer hover:bg-zinc-200 transition-colors relative overflow-hidden"
                  >
                     {groupImagePreview ? (
                       <img src={groupImagePreview || undefined} alt="Group Preview" className="w-full h-full object-cover" />
                     ) : (
                       <div className="flex flex-col items-center justify-center text-zinc-400">
                         <CirclePlus size={24} />
                         <span className="text-[10px] font-bold mt-1 uppercase tracking-wider text-center px-2">Group Image</span>
                       </div>
                     )}
                  </div>
                  <input 
                    id="group_img_upload" 
                    type="file" 
                    accept="image/*" 
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files.length > 0) {
                        const file = e.target.files[0];
                        const reader = new FileReader();
                        reader.readAsDataURL(file);
                        reader.onload = () => {
                          setCropImageSrc(reader.result as string);
                          setCropperTarget('create');
                          setShowCropper(true);
                        };
                      }
                    }} 
                  />
                  {groupImagePreview && (
                      <button onClick={(e) => { e.stopPropagation(); setGroupImagePreview(null); setNewGroupImage(null); }} className="text-[10px] text-red-500 font-bold uppercase tracking-wider">Remove Image</button>
                  )}
                </div>

                <input type="text" placeholder="Group Name (Required)" value={newGroupName} onChange={e => setNewGroupName(e.target.value)} className="w-full py-2 bg-transparent border-b-2 border-zinc-200 focus:border-black rounded-none text-sm focus:outline-none transition-colors text-black font-semibold" />
                <input type="text" placeholder="Description (Optional)" value={newGroupDescription} onChange={e => setNewGroupDescription(e.target.value)} className="w-full py-2 bg-transparent border-b-2 border-zinc-200 focus:border-black rounded-none text-sm focus:outline-none transition-colors text-black font-semibold" />
                <div className="flex flex-col gap-2 w-full pt-1">
                  <label className="text-xs text-zinc-400 font-extrabold uppercase tracking-widest">Select Group Members</label>
                  <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto p-2 bg-zinc-50 border border-zinc-200 rounded-2xl">
                    {availablePersons.map(person => {
                      const personId = person.id || person.Id;
                      const isSelected = newGroupParticipants.includes(personId);
                      const pName = person.name || person.Name || "Unknown Person";
                      const pImg = person.imageUrl || person.ImageUrl;
                      
                      return (
                        <div 
                          key={personId}
                          onClick={() => {
                            if (personId === currentUserId) return;
                            if (isSelected) {
                              setNewGroupParticipants(prev => prev.filter(pId => pId !== personId));
                            } else {
                              setNewGroupParticipants(prev => [...prev, personId]);
                            }
                          }}
                          className={`flex items-center justify-between p-2 rounded-xl border cursor-pointer select-none transition-all ${
                            isSelected 
                              ? 'bg-indigo-50/70 border-indigo-500 shadow-sm text-indigo-950 font-semibold' 
                              : 'bg-white border-zinc-200 text-zinc-700 hover:bg-zinc-50'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-7 h-7 rounded-full border border-zinc-200 overflow-hidden relative shrink-0 flex items-center justify-center bg-zinc-100 text-[9px] font-bold text-zinc-500 uppercase">
                              {pImg ? (
                                <img src={getImageUrl(pImg)} alt={pName} className="w-full h-full object-cover" />
                              ) : (
                                pName.split(' ').map((n: string) => n[0]).join('').slice(0, 2)
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs truncate font-bold leading-none">{pName}</p>
                            </div>
                          </div>
                          <div className={`w-4 h-4 rounded-full flex items-center justify-center border transition-all shrink-0 ${
                            isSelected ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-zinc-300 bg-white'
                          }`}>
                            {isSelected && <span className="text-[9px] font-black">✓</span>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
              
              {chatGroupError && (
                <p className="text-xs font-bold text-red-500 mb-2 truncate">{chatGroupError}</p>
              )}
              
              <button 
                disabled={isCreatingGroup}
                onClick={async () => {
                   if (!newGroupName.trim()) {
                     setChatGroupError('Group name is required');
                     return;
                   }
                   setChatGroupError('');
                   setIsCreatingGroup(true);
                   try {
                     const res = await createGroupChat(
                       newGroupName,
                       newGroupDescription,
                       newGroupParticipants,
                       newGroupImage
                     );
                     
                     console.log('CreateGroupChatDto Success:', res);
                     // Refetch chats to keep view completely accurate to database state
                     await fetchChats();
                     
                     setNewGroupName('');
                     setNewGroupDescription('');
                     setNewGroupParticipants([]);
                     setNewGroupImage(null);
                     setGroupImagePreview(null);
                     setShowCreateGroup(false);
                   } catch (err: any) {
                     setChatGroupError(err?.response?.data?.message || err?.message || 'Failed to create group');
                   } finally {
                     setIsCreatingGroup(false);
                   }
                }} 
                className="w-full py-3 bg-black text-white font-bold rounded-xl active:scale-95 transition-transform flex items-center justify-center gap-2 disabled:opacity-75"
              >
                {isCreatingGroup ? (
                  <LoaderCircle className="animate-spin" size={18} />
                ) : (
                  <>
                    <CirclePlus size={18}/> Create
                  </>
                )}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Image Cropper Modal */}
      <AnimatePresence>
        {showCropper && cropImageSrc && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[110] flex flex-col"
          >
            <div className="flex-1 relative">
              <Cropper
                image={cropImageSrc}
                crop={crop}
                zoom={zoom}
                aspect={1}
                cropShape="round"
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={(_, croppedAreaPixels) => {
                  setCroppedAreaPixels(croppedAreaPixels as any);
                }}
              />
            </div>
            <div className="bg-white p-6 pb-8 flex justify-between items-center z-10 shrink-0 shadow-[0_-10px_20px_rgba(0,0,0,0.2)]">
               <button 
                 onClick={() => { setShowCropper(false); setCropImageSrc(null); setCrop({x:0,y:0}); setZoom(1); }}
                 className="px-6 py-3 font-bold text-zinc-500 rounded-xl hover:bg-zinc-100 transition-colors"
               >
                 Cancel
               </button>
               <button 
                 onClick={async () => {
                   if (cropImageSrc && croppedAreaPixels) {
                     try {
                        const croppedFile = await getCroppedImg(cropImageSrc, croppedAreaPixels);
                        if (cropperTarget === 'edit') {
                          setEditGroupImage(croppedFile);
                          setEditGroupImagePreview(URL.createObjectURL(croppedFile));
                        } else {
                          setNewGroupImage(croppedFile);
                          setGroupImagePreview(URL.createObjectURL(croppedFile));
                        }
                        setShowCropper(false);
                     } catch(e) { console.error("Cropping failed", e); }
                   }
                 }}
                 className="px-8 py-3 font-bold text-white bg-black rounded-xl hover:bg-zinc-800 transition-colors"
               >
                 Confirm Crop
               </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Direct Message Modal */}
      <AnimatePresence>
        {showDirectMessage && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl p-6 w-full max-w-sm flex flex-col shadow-2xl relative border-2 border-zinc-200"
            >
              <button onClick={() => setShowDirectMessage(false)} className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-800"><X size={20}/></button>
              <h2 className="text-xl font-black text-zinc-900 mb-4 tracking-tight flex items-center gap-2"><UserPlus size={20}/> Message User</h2>
              
              <div className="flex-1 overflow-y-auto max-h-[50vh] flex flex-col gap-2 mb-6 p-1">
                {availablePersons.filter(p => (p.id || p.Id) !== currentUserId).map(person => {
                  const pId = person.id || person.Id;
                  const pName = person.name || person.Name || `User #${pId}`;
                  const isSelected = newDirectUserId === pId;
                  return (
                    <div 
                      key={pId}
                      onClick={async () => {
                        if (isCreatingDirect) return;
                        setNewDirectUserId(pId);
                        setChatDirectError('');
                        setIsCreatingDirect(true);
                        try {
                          const res = await createDirectChat(pId);
                          console.log('CreateDirectChatDto Success:', res);
                          
                          // Refetch the chat list and select the newest room
                          const chats = await fetchChats();
                          // Find the matching chat from list or use the response dto
                          const newChat = chats?.find((c: any) => c.id === res.id?.toString() || c.id === res.Id?.toString()) 
                             || {
                               id: res.id?.toString() ?? res.Id?.toString(),
                               name: res.name || res.Name || pName,
                               lastMessage: '',
                               time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                               unread: 0,
                               isGroup: false,
                               participants: res.participants || res.Participants || []
                             };
                          setActiveChat(newChat);

                          setNewDirectUserId(null);
                          setShowDirectMessage(false);
                        } catch (err: any) {
                          setChatDirectError(err?.response?.data?.message || err?.message || 'Failed to create direct chat');
                        } finally {
                          setIsCreatingDirect(false);
                        }
                      }}
                      className={`flex items-center gap-3 p-3 rounded-2xl border-2 cursor-pointer transition-all active:scale-[0.98] ${
                        isSelected ? 'border-black bg-black text-white' : 'border-zinc-100 hover:border-zinc-300 bg-white text-zinc-800'
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-full overflow-hidden flex items-center justify-center font-black ${
                        isSelected ? 'bg-white/20' : 'bg-zinc-100 text-zinc-600'
                      }`}>
                        {person.imageUrl || person.ImageUrl || person.profileImageUrl || person.ProfileImageUrl ? (
                          <img 
                            src={getImageUrl(person.imageUrl || person.ImageUrl || person.profileImageUrl || person.ProfileImageUrl)} 
                            alt={pName} 
                            className="w-full h-full object-cover" 
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          pName.charAt(0).toUpperCase()
                        )}
                      </div>
                      <span className="font-bold text-sm tracking-tight flex-1">{pName}</span>
                      {isSelected && isCreatingDirect ? (
                         <LoaderCircle className="animate-spin text-white" size={18} />
                      ) : (
                         isSelected && <span className="ml-auto font-black">✓</span>
                      )}
                    </div>
                  );
                })}
              </div>

              {chatDirectError && (
                <p className="text-xs font-bold text-red-500 mb-2 truncate">{chatDirectError}</p>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Chat Confirmation Modal */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[150] flex items-center justify-center p-4 select-none"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl p-6 w-full max-w-sm flex flex-col shadow-2xl relative border-2 border-red-100"
            >
              <button 
                onClick={() => setShowDeleteConfirm(false)} 
                disabled={isDeletingChat}
                className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-800 disabled:opacity-50"
              >
                <X size={20}/>
              </button>
              
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-red-50 border border-red-200 flex items-center justify-center text-red-500 shadow-sm shrink-0">
                  <Trash2 size={22} className="animate-pulse" />
                </div>
                <h2 className="text-lg font-black text-zinc-900 tracking-tight">Delete Chat Room</h2>
              </div>
              <p className="text-xs text-zinc-500 mb-6 leading-relaxed">
                Are you absolutely sure you want to delete <span className="font-bold text-zinc-800">"{activeChat ? activeChat.name : 'this chat'}"</span>? This action is permanent and completely irreversible.
              </p>
              
              <div className="flex gap-3 w-full">
                <button 
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={isDeletingChat}
                  className="flex-1 py-1.5 border border-zinc-200 text-zinc-600 font-extrabold hover:bg-zinc-50 transition-colors rounded-xl text-xs disabled:opacity-50"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleDeleteChat}
                  disabled={isDeletingChat}
                  className="flex-1 py-1.5 bg-red-600 hover:bg-red-700 text-white font-extrabold transition-colors rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-50"
                >
                  {isDeletingChat ? <LoaderCircle className="animate-spin" size={12} /> : "Delete Chat"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>



      {/* Selected Message Action Menu Floating Overlay */}
      <AnimatePresence>
        {overlayMsg && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOverlayMessageId(null)}
            className="fixed inset-0 bg-zinc-955/45 backdrop-blur-md z-[150] select-none cursor-default"
          >
            {/* Highlighted Message Display in exactly same screen position */}
            {pressedMessageRect && (
              <div 
                style={{
                  position: 'absolute',
                  top: pressedMessageRect.top,
                  left: pressedMessageRect.left,
                  width: pressedMessageRect.width,
                  minHeight: pressedMessageRect.height,
                  margin: 0,
                  pointerEvents: 'none',
                  ...(overlayMsg.isMe ? { backgroundColor: chatThemeColor, borderColor: chatThemeColor, color: 'white' } : {})
                }}
                className={`p-2.5 rounded-md shadow-lg border ${
                  overlayMsg.isMe 
                    ? 'text-white' 
                    : 'bg-white border-zinc-200 dark:bg-[#1c1c1e] dark:border-[#1c1c1e] dark:text-zinc-200 shadow-md'
                } ${overlayMsg.isMe ? 'rounded-tr-none' : 'rounded-tl-none'} scale-100 z-[160] overflow-visible`}
              >
                {!overlayMsg.isMe && (
                  <p className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 mb-1">{overlayMsg.senderName}</p>
                )}

                {overlayMsg.replyTo && (
                  <div className="mb-2 p-2 bg-black/5 dark:bg-white/5 border-l-4 border-emerald-500 rounded text-xs text-zinc-655 dark:text-zinc-300 truncate max-w-full">
                    {overlayMsg.replyTo.text}
                  </div>
                )}

                {overlayMsg.text && (
                  <p className={`text-xs break-words font-medium whitespace-pre-wrap ${overlayMsg.isMe ? 'text-white' : 'text-zinc-800 dark:text-zinc-200'}`}>{overlayMsg.text}</p>
                )}
                
                {renderMsgAttachments(overlayMsg)}
                
                {overlayMsg.type === 'audio' && !overlayMsg.attachments?.length && (
                  <VoicePlayer mediaUrl={overlayMsg.mediaUrl} duration={overlayMsg.duration} />
                )}

                <div className={`flex justify-between items-center gap-4 mt-1.5 w-full ${overlayMsg.isMe ? 'text-white/80' : 'text-zinc-500'}`}>
                  <div className="flex items-center gap-1 ml-auto shrink-0 whitespace-nowrap">
                    <p className="text-[9px] font-semibold uppercase shrink-0 whitespace-nowrap">{overlayMsg.time}</p>
                    {overlayMsg.isMe && (
                      <CheckCheck size={12} className={`${getMessageTickColor(overlayMsg)} shrink-0`} />
                    )}
                  </div>
                </div>
                
                {/* Small tail */}
                <div className={`absolute top-0 w-2.5 h-2.5 ${overlayMsg.isMe ? '-right-2.5' : '-left-2.5 bg-white dark:bg-[#1c1c1e]'}`} style={{ clipPath: overlayMsg.isMe ? 'polygon(0 0, 100% 0, 0 100%)' : 'polygon(100% 0, 0 0, 100% 100%)', backgroundColor: overlayMsg.isMe ? chatThemeColor : undefined }}></div>
              </div>
            )}

            {/* Dynamic Alignment Options Menu */}
            <div 
              onClick={(e) => e.stopPropagation()}
              style={{
                position: 'absolute',
                width: '14rem',
                bottom: pressedMessageRect && (pressedMessageRect.top > window.innerHeight - pressedMessageRect.bottom) 
                  ? window.innerHeight - pressedMessageRect.top + 8 
                  : undefined,
                top: pressedMessageRect && !(pressedMessageRect.top > window.innerHeight - pressedMessageRect.bottom)
                  ? pressedMessageRect.bottom + 8
                  : undefined,
                right: pressedMessageRect && overlayMsg.isMe
                  ? window.innerWidth - pressedMessageRect.right
                  : undefined,
                left: pressedMessageRect && !overlayMsg.isMe
                  ? pressedMessageRect.left
                  : undefined,
              }}
              className="bg-white/95 dark:bg-[#1c1c1e]/95 backdrop-blur-md border border-zinc-200/50 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col py-1 z-[170]"
            >
              {/* Reply */}
              <button 
                onClick={() => {
                  setReplyTo({ id: overlayMsg.id, text: overlayMsg.text || (overlayMsg.type === 'image' ? 'Image File' : 'Voice Message') });
                  setOverlayMessageId(null);
                  setTimeout(() => {
                    messageInputRef.current?.focus();
                  }, 100);
                }}
                className="w-full px-4 py-3 bg-transparent hover:bg-zinc-100 dark:hover:bg-zinc-850/80 transition-colors cursor-pointer text-xs font-bold text-zinc-800 dark:text-zinc-200 flex justify-between items-center text-left"
              >
                <span>Reply</span>
                <Reply size={16} className="text-zinc-500 dark:text-zinc-400" />
              </button>

              {/* Edit */}
              {overlayMsg.isMe && (new Date().getTime() - new Date(overlayMsg.sentAt).getTime() <= 20 * 60 * 1000) && (
                <button 
                  onClick={() => {
                    handleTriggerEdit(overlayMsg);
                    setOverlayMessageId(null);
                  }}
                  className="w-full px-4 py-3 bg-transparent border-t border-zinc-100 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-850/80 transition-colors cursor-pointer text-xs font-bold text-zinc-800 dark:text-zinc-200 flex justify-between items-center text-left"
                >
                  <span>Edit</span>
                  <Edit2 size={16} className="text-zinc-500 dark:text-zinc-400" />
                </button>
              )}

              {/* Forward */}
              <button 
                onClick={() => {
                  setMessageToForward(overlayMsg);
                  setOverlayMessageId(null);
                  setShowForwardDialog(true);
                }}
                className="w-full px-4 py-3 bg-transparent border-t border-zinc-100 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-850/80 transition-colors cursor-pointer text-xs font-bold text-zinc-800 dark:text-zinc-200 flex justify-between items-center text-left"
              >
                <span>Forward</span>
                <Forward size={16} className="text-zinc-500 dark:text-zinc-400" />
              </button>

              {/* Copy */}
              <button 
                onClick={() => {
                  if (overlayMsg.text) {
                    navigator.clipboard.writeText(overlayMsg.text);
                    triggerToast("Copied content to clipboard");
                  } else {
                    triggerToast("No text content to copy");
                  }
                  setOverlayMessageId(null);
                }}
                className="w-full px-4 py-3 bg-transparent border-t border-zinc-100 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-850/80 transition-colors cursor-pointer text-xs font-bold text-zinc-800 dark:text-zinc-200 flex justify-between items-center text-left"
              >
                <span>Copy</span>
                <Copy size={16} className="text-zinc-500 dark:text-zinc-400" />
              </button>

              {/* Resend */}
              {overlayMsg.status === 'failed' && (
                <button 
                  onClick={() => {
                    handleResendMessage(overlayMsg);
                  }}
                  className="w-full px-4 py-3 bg-transparent border-t border-zinc-100 dark:border-zinc-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors cursor-pointer text-xs font-bold text-zinc-800 dark:text-zinc-200 flex justify-between items-center text-left"
                >
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold">Resend</span>
                  <Repeat size={16} className="text-emerald-500 dark:text-emerald-400" />
                </button>
              )}

              {/* Delete in a delete color */}
              <button 
                onClick={() => {
                  if (!overlayMsg.isMe) {
                    alert("You cannot delete a message that was not sent by you.");
                    setOverlayMessageId(null);
                    return;
                  }
                  handleOverlayDelete(overlayMsg.id);
                }}
                className="w-full px-4 py-3 bg-transparent border-t border-zinc-100 dark:border-zinc-800 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer text-xs font-heavy text-red-650 flex justify-between items-center text-left"
              >
                <span className="text-red-600 dark:text-red-400 font-extrabold">Delete</span>
                <Trash2 size={16} className="text-red-500 dark:text-red-400" />
              </button>
            </div>

          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showForwardDialog && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-zinc-950/45 backdrop-blur-md z-[160] flex items-center justify-center p-4 select-none cursor-default"
            onClick={() => { setShowForwardDialog(false); setMessageToForward(null); }}
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl p-6 w-full max-w-sm flex flex-col shadow-2xl relative border border-zinc-150 max-h-[80vh]"
              onClick={(e) => e.stopPropagation()}
            >
              <button 
                onClick={() => { setShowForwardDialog(false); setMessageToForward(null); }} 
                className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-800"
              >
                <X size={18}/>
              </button>
              
              <div className="w-11 h-11 rounded-full bg-indigo-50 border border-indigo-105 flex items-center justify-center text-indigo-500 mb-4 shadow-sm shrink-0">
                <Forward size={20} />
              </div>

              <h2 className="text-md font-black text-zinc-900 mb-1 tracking-tight">Forward Secure Message</h2>
              <p className="text-xs text-zinc-500 mb-4 leading-relaxed">
                Choose a conversation to forward this packet to:
              </p>

              <div className="flex-1 overflow-y-auto max-h-[40vh] border border-zinc-100 rounded-2xl p-2 flex flex-col gap-1 bg-zinc-50/50">
                {localChatList.filter((chat) => !activeChat || String(chat.id) !== String(activeChat.id)).length === 0 ? (
                  <p className="text-xs text-zinc-400 p-4 text-center">No other rooms available</p>
                ) : localChatList.filter((chat) => !activeChat || String(chat.id) !== String(activeChat.id)).map((chat) => (
                  <button
                    key={chat.id}
                    onClick={() => handleForwardMessage(chat.id)}
                    className="w-full flex items-center gap-3 p-2.5 hover:bg-white hover:shadow-sm rounded-xl text-left border border-transparent hover:border-zinc-100/60 transition-all group lg:min-h-[48px]"
                  >
                    <div className="w-9 h-9 rounded-full bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-500 text-xs font-bold leading-none shrink-0 group-hover:bg-indigo-100 transition-colors">
                      {chat.name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-zinc-800 truncate">{chat.name}</p>
                      <p className="text-[10px] text-zinc-400 truncate">{chat.isGroup ? "Group Chat" : "Direct Message"}</p>
                    </div>
                    <ChevronLeft size={14} className="text-zinc-300 group-hover:text-indigo-500 rotate-180 transition-all" />
                  </button>
                ))}
              </div>
              
              <button 
                onClick={() => { setShowForwardDialog(false); setMessageToForward(null); }}
                className="mt-4 w-full py-2.5 border border-zinc-200 hover:bg-zinc-50 text-zinc-650 font-extrabold transition-colors rounded-xl text-xs"
              >
                Cancel
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Action Notification Toasts */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div 
            initial={{ opacity: 0, y: 15, x: "-50%" }}
            animate={{ opacity: 1, y: 0, x: "-50%" }}
            exit={{ opacity: 0, y: 15, x: "-50%" }}
            className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-zinc-900 border border-zinc-800 text-white text-[11px] uppercase tracking-widest font-black px-4 py-2 rounded-full shadow-2xl z-[200]"
          >
            {toastMessage}
          </motion.div>
        )}
      </AnimatePresence>

      {overlayMessage && (
        <div className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center">
          {/* Header */}
          <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center z-[102] bg-gradient-to-b from-black/60 to-transparent">
             <div className="text-white text-sm font-semibold drop-shadow-md">
               {previewItems.length > 1 ? `${previewIndex + 1} of ${previewItems.length}` : ''}
             </div>
             <button onClick={() => setOverlayMessage(null)} className="text-white p-2">
                <X size={32} />
             </button>
          </div>
          
          {/* Previous Button */}
          {previewItems.length > 1 && previewIndex > 0 && (
             <button 
                onClick={() => {
                   const prevIdx = previewIndex - 1;
                   setPreviewIndex(prevIdx);
                   setOverlayMessage(previewItems[prevIdx]);
                }}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-white p-3 z-[101] bg-black/40 hover:bg-black/60 rounded-full"
             >
                <ChevronLeft size={32} />
             </button>
          )}

          {/* Next Button */}
          {previewItems.length > 1 && previewIndex < previewItems.length - 1 && (
             <button 
                onClick={() => {
                   const nextIdx = previewIndex + 1;
                   setPreviewIndex(nextIdx);
                   setOverlayMessage(previewItems[nextIdx]);
                }}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-white p-3 z-[101] bg-black/40 hover:bg-black/60 rounded-full"
             >
                <ChevronLeft size={32} className="rotate-180" />
             </button>
          )}

          {/* Content */}
          <div className="w-full h-full flex items-center justify-center p-4">
            {overlayMessage.type === 'image' && overlayMessage.mediaUrl ? (
              <img src={overlayMessage.mediaUrl || undefined} className="max-w-full max-h-full object-contain" />
            ) : overlayMessage.type === 'video' && overlayMessage.mediaUrl ? (
              <video src={overlayMessage.mediaUrl || undefined} controls autoPlay className="max-w-full max-h-full object-contain outline-none" />
            ) : null}
          </div>
        </div>
      )}

    </div>
  );
}
