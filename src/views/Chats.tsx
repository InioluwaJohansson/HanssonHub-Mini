import React, { useState, useEffect, useRef, useMemo, ChangeEvent } from 'react';
import { 
  Search, ChevronLeft, Send, User, MessageCircle, Mic, Paperclip, X, 
  Play, Pause, Square, Users, MessageSquarePlus, CheckCheck, UserPlus, 
  CirclePlus, LoaderCircle, Trash2, Edit2, Info, Plus, UserMinus,
  Reply, Forward, Copy, Check, Lock, Calendar, AlertCircle, Repeat,
  FileText, Download, Image, ChevronDown, Clock,
  Phone, Video, PhoneOff, MicOff, VideoOff, Camera, ArrowDownLeft, ArrowUpRight, Volume2, VolumeX, PhoneCall, Monitor
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  createDirectChat, createGroupChat, getChatById, getMyChats, 
  removeParticipant, addParticipants, sendMessage, editMessage, 
  getChatMessages, deleteMessage, getUnreadCount, getUserDetails,
  getStoredAppNamesList, updateGroupChat, deleteChat,
  sendTypingStatus, joinChatRoom, getBaseUrl, getImageUrl,
  startCall, endCall, getCallLogs, acceptCall, rejectCall
} from '../utils/api';
import { MessageType } from '../types/chat';
import { saveData, getData, getAllData, STORES, clearStore } from '../utils/db';
import { homeSecurityHubConnection, startHomeSecurityHub } from '../utils/signalr';
import { 
  playNotificationSound, pauseAllAudio, setCurrentlyPlaying,
  startRinging, stopRinging, playCallConnectSound, playCallDisconnectSound
} from '../utils/audio';
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
    const image = new window.Image();
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

const formatLastMessageTime = (dateInput?: string | Date | number, fallbackTime?: string): string => {
  if (!dateInput) return fallbackTime || "Just now";
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return fallbackTime || "Just now";

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const hours24 = 24 * 60 * 60 * 1000;

  if (diffMs > hours24) {
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  } else {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
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

export default function Chats({ 
  onChatActive, 
  onRefreshPage, 
  isViewActive = true, 
  onNavigateToChats 
}: { 
  onChatActive: (isActive: boolean) => void; 
  onRefreshPage?: () => void; 
  isViewActive?: boolean; 
  onNavigateToChats?: () => void; 
}) {
  const [localChatList, setLocalChatList] = useState<ChatRoom[]>([]);
  useEffect(() => {
    if (localChatList.length > 0) {
      (window as any).__cachedChats = localChatList;
    }
  }, [localChatList]);
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

  // Call States
  const [activeCall, _setActiveCall] = useState<any | null>(null);
  const [incomingCall, _setIncomingCall] = useState<any | null>(null);

  const enrichCallDto = (dto: any) => {
    if (!dto) return dto;
    const cid = dto.chatId || dto.ChatId;
    let isGroup = dto.isGroup || dto.IsGroup || false;
    let groupName = dto.chatName || dto.ChatName || dto.groupName || dto.GroupName;
    let imageUrl = dto.imageUrl || dto.ImageUrl;

    const foundChat = cid ? localChatList.find(c => String(c.id) === String(cid)) : null;
    if (foundChat) {
      isGroup = isGroup || foundChat.isGroup || foundChat.IsGroup || false;
      if (!groupName) {
        groupName = foundChat.name || foundChat.Name;
      }
      if (!imageUrl) {
        imageUrl = foundChat.imageUrl || foundChat.ImageUrl;
      }
    }

    // Also infer group call if participants count (excluding ourselves or total) > 2
    let incomingParticipants = dto.participants || dto.Participants || [];
    if (incomingParticipants.length > 2) {
      isGroup = true;
    }

    // If it's a group call, ensure ALL group chat participants are present in the call participants list
    let finalParticipants = [...incomingParticipants];
    
    if (isGroup && foundChat) {
      const chatParticipants = foundChat.participants || foundChat.Participants || [];
      chatParticipants.forEach((cp: any) => {
        const cpId = Number(cp.personId || cp.PersonId || cp.id || cp.Id);
        // Check if this chat participant is already in finalParticipants
        const exists = finalParticipants.some((p: any) => {
          const pId = Number(p.personId || p.PersonId || p.id || p.Id);
          return pId === cpId;
        });
        
        if (!exists) {
          // Add them as a ringing participant
          finalParticipants.push({
            personId: cpId,
            PersonId: cpId,
            status: 0, // Ringing
            Status: 0,
            isMuted: false,
            IsMuted: false,
            isCameraEnabled: true,
            IsCameraEnabled: true
          });
        }
      });
    }

    // Normalize each participant's properties for robust rendering
    finalParticipants = finalParticipants.map((p: any) => {
      const pId = p.personId || p.PersonId || p.id || p.Id;
      const status = p.status !== undefined ? p.status : (p.Status !== undefined ? p.Status : 0);
      return {
        ...p,
        personId: pId,
        PersonId: pId,
        id: pId,
        Id: pId,
        status,
        Status: status,
      };
    });

    return {
      ...dto,
      isGroup,
      IsGroup: isGroup,
      chatName: groupName,
      ChatName: groupName,
      groupName,
      GroupName: groupName,
      imageUrl,
      ImageUrl: imageUrl,
      participants: finalParticipants,
      Participants: finalParticipants
    };
  };

  const setActiveCall = (val: any) => {
    if (typeof val === 'function') {
      _setActiveCall((prev: any) => {
        const res = val(prev);
        return enrichCallDto(res);
      });
    } else {
      _setActiveCall(enrichCallDto(val));
    }
  };

  const setIncomingCall = (val: any) => {
    if (typeof val === 'function') {
      _setIncomingCall((prev: any) => {
        const res = val(prev);
        return enrichCallDto(res);
      });
    } else {
      _setIncomingCall(enrichCallDto(val));
    }
  };
  const [callState, setCallState] = useState<'idle' | 'ringing_outgoing' | 'ringing_incoming' | 'connected' | 'disconnected'>('idle');
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerMuted, setIsSpeakerMuted] = useState(false);
  const [isCameraEnabled, setIsCameraEnabled] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<{ [personId: number]: MediaStream }>({});
  const [callDuration, setCallDuration] = useState(0);
  const [activeSidebarTab, setActiveSidebarTab] = useState<'chats' | 'calls'>('chats');
  const [callLogs, setCallLogs] = useState<any[]>([]);
  const [isCallLogsLoading, setIsCallLogsLoading] = useState(false);
  const [callLogsPage, setCallLogsPage] = useState<number>(1);
  const [hasMoreCallLogs, setHasMoreCallLogs] = useState<boolean>(true);
  const [isCallLogsFetchingMore, setIsCallLogsFetchingMore] = useState<boolean>(false);
  const [audioAnalyserData, setAudioAnalyserData] = useState<number[]>(new Array(10).fill(20));
  const [remoteAudioLevels, setRemoteAudioLevels] = useState<{[personId: number]: number[]}>({});
  const [isCallMinimized, setIsCallMinimized] = useState(false);
  const [showCameraPermissionModal, setShowCameraPermissionModal] = useState(false);
  const [pendingCallType, setPendingCallType] = useState<number | null>(null);

  const peerConnectionsRef = useRef<{ [personId: number]: RTCPeerConnection }>({});
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRefs = useRef<{ [personId: number]: HTMLVideoElement | null }>({});
  const callTimerRef = useRef<any>(null);
  const analyserIntervalRef = useRef<any>(null);

  const formatCallDuration = (sec: number | string | any) => {
    if (sec === undefined || sec === null) return '00:00';
    let totalSecs = 0;

    if (typeof sec === 'number') {
      totalSecs = Math.floor(sec);
    } else if (typeof sec === 'string') {
      const trimmed = sec.trim();
      if (trimmed.includes(':')) {
        const parts = trimmed.split(':').map(val => parseInt(val, 10) || 0);
        if (parts.length === 3) {
          totalSecs = parts[0] * 3600 + parts[1] * 60 + parts[2];
        } else if (parts.length === 2) {
          totalSecs = parts[0] * 60 + parts[1];
        }
      } else if (/[hmshms]/.test(trimmed)) {
        const matches = trimmed.match(/(\d+(?:\.\d+)?)\s*([hms])/g);
        if (matches) {
          matches.forEach(m => {
            const numPart = m.match(/(\d+(?:\.\d+)?)/);
            const unitPart = m.match(/([hms])/);
            if (numPart && unitPart) {
              const val = Math.floor(Number(numPart[0]));
              const unit = unitPart[0];
              if (unit === 'h') totalSecs += val * 3600;
              if (unit === 'm') totalSecs += val * 60;
              if (unit === 's') totalSecs += val;
            }
          });
        }
      } else {
        totalSecs = Math.floor(Number(trimmed)) || 0;
      }
    }

    if (isNaN(totalSecs) || totalSecs < 0) totalSecs = 0;
    const hrs = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;

    const pad = (num: number) => String(num).padStart(2, '0');

    if (hrs > 0) {
      return `${pad(hrs)}:${pad(mins)}:${pad(secs)}`;
    }
    return `${pad(mins)}:${pad(secs)}`;
  };

  const parseDate = (val: any): Date | null => {
    if (!val) return null;
    if (val instanceof Date) return isNaN(val.getTime()) ? null : val;
    if (typeof val === 'number') {
      const ms = val < 10000000000 ? val * 1000 : val;
      const d = new Date(ms);
      return isNaN(d.getTime()) ? null : d;
    }
    if (typeof val === 'string') {
      const trimmed = val.trim();
      if (!trimmed || trimmed === 'Invalid Date' || trimmed === 'null' || trimmed === 'undefined') return null;
      const aspNetMatch = trimmed.match(/\/Date\((\d+)\)\//);
      if (aspNetMatch) {
        const ms = parseInt(aspNetMatch[1], 10);
        const d = new Date(ms);
        return isNaN(d.getTime()) ? null : d;
      }
      if (/^\d+$/.test(trimmed)) {
        const num = parseInt(trimmed, 10);
        const ms = num < 10000000000 ? num * 1000 : num;
        const d = new Date(ms);
        return isNaN(d.getTime()) ? null : d;
      }
      const d = new Date(trimmed);
      return isNaN(d.getTime()) ? null : d;
    }
    return null;
  };

  const formatLogDate = (dateVal: any): string => {
    const d = parseDate(dateVal);
    if (!d) return '';
    return d.toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const normalizeCallLogItem = (callDto: any, fallbackActiveCall?: any) => {
    if (!callDto && !fallbackActiveCall) return null;

    const callId = callDto?.id || callDto?.Id || callDto?.callId || callDto?.CallId || fallbackActiveCall?.id || fallbackActiveCall?.Id || fallbackActiveCall?.callId || fallbackActiveCall?.CallId;
    if (!callId) return null;
    const numericCallId = Number(callId);

    const activeObj = (activeCallRef.current && Number(activeCallRef.current.id || activeCallRef.current.Id || activeCallRef.current.callId || activeCallRef.current.CallId) === numericCallId)
      ? activeCallRef.current
      : fallbackActiveCall;

    const currentUserId = Number(currentUserIdRef.current);
    const chatId = callDto?.chatId || callDto?.ChatId || activeObj?.chatId || activeObj?.ChatId;
    const callerId = callDto?.callerPersonId || callDto?.CallerPersonId || activeObj?.callerPersonId || activeObj?.CallerPersonId;

    let matchingChat = chatId ? localChatListRef.current.find(c => String(c.id) === String(chatId)) : null;
    if (!matchingChat && callerId) {
      matchingChat = localChatListRef.current.find(c => Number(c.personId || c.PartnerId || c.partnerId) === Number(callerId));
    }

    const incomingParticipants = (callDto?.participants && callDto.participants.length > 0)
      ? callDto.participants
      : ((callDto?.Participants && callDto.Participants.length > 0)
        ? callDto.Participants
        : (activeObj?.participants || activeObj?.Participants || []));

    let partnerId = (callerId && Number(callerId) !== currentUserId) ? Number(callerId) : null;
    if (!partnerId && incomingParticipants.length > 0) {
      const otherP = incomingParticipants.find((p: any) => Number(p.personId || p.PersonId || p.id || p.Id) !== currentUserId);
      if (otherP) {
        partnerId = Number(otherP.personId || otherP.PersonId || otherP.id || otherP.Id);
      }
    }
    if (!partnerId && matchingChat) {
      const otherPart = matchingChat.participants?.find((p: any) => Number(p.personId || p.PersonId || p.id || p.Id) !== currentUserId);
      if (otherPart) {
        partnerId = Number(otherPart.personId || otherPart.PersonId || otherPart.id || otherPart.Id);
      }
    }

    const partnerPerson = partnerId ? availablePersonsRef.current.find(p => Number(p.id || p.Id) === partnerId) : null;

    let chatName = callDto?.chatName || callDto?.ChatName || callDto?.groupName || callDto?.GroupName || callDto?.name || callDto?.Name || activeObj?.chatName || activeObj?.ChatName || activeObj?.groupName || activeObj?.GroupName || matchingChat?.name || matchingChat?.Name;
    if (!chatName || chatName === 'Secure Call') {
      if (partnerPerson?.name || partnerPerson?.Name) {
        chatName = partnerPerson.name || partnerPerson.Name;
      } else if (matchingChat?.name || matchingChat?.Name) {
        chatName = matchingChat.name || matchingChat.Name;
      } else {
        chatName = partnerId ? `User ${partnerId}` : 'Secure Call';
      }
    }

    let imageUrl = callDto?.imageUrl || callDto?.ImageUrl || callDto?.chatImage || callDto?.ChatImage || callDto?.image || callDto?.Image || activeObj?.imageUrl || activeObj?.ImageUrl || matchingChat?.imageUrl || matchingChat?.ImageUrl || partnerPerson?.imageUrl || partnerPerson?.ImageUrl || partnerPerson?.picture || partnerPerson?.Picture || '';

    const rawStatus = callDto?.status !== undefined ? callDto.status : (callDto?.Status !== undefined ? callDto.Status : (callDto?.callStatus !== undefined ? callDto.callStatus : (callDto?.CallStatus !== undefined ? callDto.CallStatus : activeObj?.status)));
    let mappedStatus = rawStatus;
    if (mappedStatus === 'Initiated' || mappedStatus === 'Ringing') mappedStatus = 0;
    else if (mappedStatus === 'Connected' || mappedStatus === 'Active') mappedStatus = 2;
    else if (mappedStatus === 'Ended') mappedStatus = 3;
    else if (mappedStatus === 'Missed') mappedStatus = 4;
    else if (mappedStatus === 'Rejected') mappedStatus = 5;

    let isMissed = callDto?.isMissed !== undefined ? callDto.isMissed : (callDto?.IsMissed !== undefined ? callDto.IsMissed : activeObj?.isMissed);
    if (isMissed === undefined) {
      isMissed = (mappedStatus === 4 || mappedStatus === 5);
    }

    let isIncoming = callDto?.isIncoming !== undefined ? callDto.isIncoming : (callDto?.IsIncoming !== undefined ? callDto.IsIncoming : activeObj?.isIncoming);
    if (isIncoming === undefined && callerId) {
      isIncoming = Number(callerId) !== currentUserId;
    }

    const callType = callDto?.type !== undefined ? callDto.type : (callDto?.Type !== undefined ? callDto.Type : (activeObj?.type !== undefined ? activeObj.type : activeObj?.Type));

    const rawStartedAt = callDto?.startedAt || callDto?.StartedAt || callDto?.createdTime || callDto?.CreatedTime || callDto?.createdAt || callDto?.CreatedAt || callDto?.timestamp || callDto?.Timestamp || callDto?.date || callDto?.Date || activeObj?.startedAt || activeObj?.StartedAt;
    const parsedStartedDate = parseDate(rawStartedAt);
    const validStartedAt = parsedStartedDate ? parsedStartedDate.toISOString() : (activeObj?.startedAt || new Date().toISOString());

    const rawAnsweredAt = callDto?.answeredAt || callDto?.AnsweredAt || activeObj?.answeredAt || activeObj?.AnsweredAt;
    const parsedAnsweredDate = parseDate(rawAnsweredAt);

    const rawEndedAt = callDto?.endedAt || callDto?.EndedAt || activeObj?.endedAt || activeObj?.EndedAt;
    const parsedEndedDate = parseDate(rawEndedAt);

    const normalizedParticipants = incomingParticipants.map((p: any) => {
      const pId = p.personId || p.PersonId || p.id || p.Id;
      const pPerson = availablePersonsRef.current.find(ap => Number(ap.id || ap.Id) === Number(pId));
      return {
        ...p,
        personId: Number(pId),
        name: p.name || p.Name || pPerson?.name || pPerson?.Name || (Number(pId) === currentUserId ? 'You' : `User ${pId}`),
        imageUrl: p.imageUrl || p.ImageUrl || pPerson?.imageUrl || pPerson?.ImageUrl || pPerson?.picture || '',
        status: p.status !== undefined ? p.status : p.Status
      };
    });

    const duration = (callDto?.duration !== undefined && callDto?.duration !== null) ? callDto.duration : (activeObj?.duration || 0);

    const result: any = {
      ...(activeObj || {}),
      ...(callDto || {}),
      id: numericCallId,
      callId: numericCallId,
      chatId: chatId ? Number(chatId) : undefined,
      callerPersonId: callerId ? Number(callerId) : undefined,
      chatName: chatName,
      imageUrl: imageUrl,
      type: callType !== undefined ? callType : 1,
      isGroup: callDto?.isGroup !== undefined ? callDto.isGroup : (callDto?.IsGroup !== undefined ? callDto.IsGroup : (activeObj?.isGroup || matchingChat?.isGroup || false)),
      status: mappedStatus !== undefined ? mappedStatus : 0,
      startedAt: validStartedAt,
      answeredAt: parsedAnsweredDate ? parsedAnsweredDate.toISOString() : activeObj?.answeredAt,
      endedAt: parsedEndedDate ? parsedEndedDate.toISOString() : activeObj?.endedAt,
      isIncoming: isIncoming !== undefined ? isIncoming : true,
      isMissed: isMissed !== undefined ? isMissed : false,
      duration: duration,
      participants: normalizedParticipants,
    };

    if (result.status === 3) {
      if (!result.endedAt) result.endedAt = new Date().toISOString();
    } else if (result.status === 4 || result.status === 5) {
      result.isMissed = true;
      if (!result.endedAt) result.endedAt = new Date().toISOString();
    }

    if (result.answeredAt && result.endedAt && (!result.duration || result.duration === 0)) {
      const start = parseDate(result.answeredAt)?.getTime();
      const end = parseDate(result.endedAt)?.getTime();
      if (start && end && end > start) {
        result.duration = Math.floor((end - start) / 1000);
      }
    } else if (result.startedAt && result.endedAt && (!result.duration || result.duration === 0)) {
      const start = parseDate(result.startedAt)?.getTime();
      const end = parseDate(result.endedAt)?.getTime();
      if (start && end && end > start) {
        result.duration = Math.floor((end - start) / 1000);
      }
    }

    return result;
  };

  const updateCallInLogs = async (callDto: any, fallbackActiveCall?: any) => {
    const normCall = normalizeCallLogItem(callDto, fallbackActiveCall);
    if (!normCall) return;

    setCallLogs(prev => {
      const idx = prev.findIndex(item => Number(item.id || item.Id || item.callId || item.CallId) === Number(normCall.id));
      if (idx !== -1) {
        const next = [...prev];
        const existing = next[idx];
        const merged = {
          ...existing,
          ...normCall,
          chatName: (normCall.chatName && normCall.chatName !== 'Secure Call') ? normCall.chatName : (existing.chatName || 'Secure Call'),
          imageUrl: normCall.imageUrl || existing.imageUrl || '',
          participants: normCall.participants?.length ? normCall.participants : (existing.participants || [])
        };
        saveData(STORES.LOGS, merged).catch(err => console.warn("Failed to persist merged call log in IDB:", err));
        next[idx] = merged;
        return next;
      } else {
        saveData(STORES.LOGS, normCall).catch(err => console.warn("Failed to persist call log in IDB:", err));
        return [normCall, ...prev];
      }
    });
  };

  const joinCallFromLog = async (log: any) => {
    if (!log) return;
    const isMissed = log.isMissed || log.IsMissed || log.status === 4 || log.status === 'Missed' || log.status === 5 || log.status === 'Rejected';
    if (isMissed) return;
    try {
      triggerHaptic('medium');
      const token = localStorage.getItem('auth_token') || '';
      const callId = log.id || log.Id;
      
      await acceptCall(Number(callId))
        .catch((err) => console.warn("HTTP AcceptCall failed, proceeding locally:", err));

      if (onNavigateToChats) {
        onNavigateToChats();
      }

      const callChatId = log.chatId || log.ChatId;
      if (callChatId) {
        const matchingChat = localChatList.find(c => Number(c.id) === Number(callChatId));
        if (matchingChat) {
          setActiveChat(matchingChat);
        }
      }

      const connectedCall = {
        ...log,
        status: 2,
        Status: 2,
        answeredAt: log.answeredAt || new Date().toISOString()
      };
      setActiveCall(connectedCall);
      setCallState('connected');
      stopRinging();
      playCallConnectSound();
      
      setCallDuration(0);
      if (callTimerRef.current) clearInterval(callTimerRef.current);
      callTimerRef.current = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);

      await startLocalStream(log.type === 2 || log.Type === 2);

      updateCallInLogs(connectedCall);

      const toggleDto = {
        callId: Number(callId),
        CallId: Number(callId),
        chatId: parseInt(log.chatId || log.ChatId),
        ChatId: parseInt(log.chatId || log.ChatId),
        personId: Number(currentUserIdRef.current),
        PersonId: Number(currentUserIdRef.current),
        isMuted: isMuted,
        IsMuted: isMuted,
        isCameraEnabled: isCameraEnabled,
        IsCameraEnabled: isCameraEnabled,
        isSharing: isScreenSharing,
        IsSharing: isScreenSharing
      };
      if (String(homeSecurityHubConnection.state) === 'Connected') {
        await homeSecurityHubConnection.invoke("ToggleCallItems", toggleDto, token).catch(e => console.warn("ToggleCallItems error on join:", e));
      }

      setTimeout(() => {
        initiateWebRTCOffer();
      }, 300);
    } catch (err) {
      console.error("Failed to join call from log", err);
    }
  };

  const checkAndSetOngoingCall = (logsList: any[]) => {
    if (!logsList || logsList.length === 0) return;
    const currentUid = Number(currentUserIdRef.current);

    const ongoingCall = logsList.find((log: any) => {
      const rawStatus = log.status !== undefined ? log.status : log.Status;
      const isEnded = rawStatus === 3 || rawStatus === 'Ended' || rawStatus === 5 || rawStatus === 'Rejected' || Boolean(log.endedAt || log.EndedAt);
      const isMissed = log.isMissed || log.IsMissed || rawStatus === 4 || rawStatus === 'Missed';
      if (isEnded || isMissed) return false;

      const isStatusOngoing = rawStatus === 0 || rawStatus === 1 || rawStatus === 2 ||
        rawStatus === 'Initiated' || rawStatus === 'Ringing' || rawStatus === 'Connected' ||
        rawStatus === 'Active' || rawStatus === 'Ongoing';

      return isStatusOngoing;
    });

    if (ongoingCall && (callStateRef.current === 'idle' || !activeCallRef.current)) {
      const enriched = enrichCallDto(ongoingCall);
      const callerId = enriched.callerPersonId || enriched.CallerPersonId;
      const isCaller = Number(callerId) === currentUid;
      const rawStatus = enriched.status !== undefined ? enriched.status : enriched.Status;

      if (!isCaller) {
        setIncomingCall(enriched);
        setActiveCall(enriched);
        setCallState('ringing_incoming');
        startRinging();
        triggerHaptic('incoming');
      } else {
        setActiveCall(enriched);
        if (rawStatus === 2 || rawStatus === 'Connected' || rawStatus === 'Active') {
          setCallState('connected');
        } else {
          setCallState('ringing_outgoing');
        }
      }
    }
  };

  const fetchCallLogs = async (page = 1, append = false) => {
    if (page === 1 && !append) {
      setIsCallLogsLoading(true);
      setCallLogsPage(1);
      setHasMoreCallLogs(true);
      try {
        const cached = await getAllData(STORES.LOGS);
        if (Array.isArray(cached) && cached.length > 0) {
          const sortedCached = [...cached].sort((a: any, b: any) => {
            const tA = parseDate(a.startedAt || a.StartedAt)?.getTime() || 0;
            const tB = parseDate(b.startedAt || b.StartedAt)?.getTime() || 0;
            return tB - tA;
          });
          const normalizedCached = sortedCached.map(c => normalizeCallLogItem(c)).filter(Boolean);
          setCallLogs(normalizedCached);
          checkAndSetOngoingCall(normalizedCached);
        }
      } catch (err) {
        console.warn("Failed to load cached call logs", err);
      }
    } else {
      setIsCallLogsFetchingMore(true);
    }

    try {
      const response = await getCallLogs(page, 50);
      const data = response?.data ?? response?.Data ?? response ?? [];
      const dataArr = Array.isArray(data) ? data : [];
      
      if (dataArr.length < 50) {
        setHasMoreCallLogs(false);
      } else {
        setHasMoreCallLogs(true);
      }

      const normalizedLogs = dataArr.map((log: any) => normalizeCallLogItem(log)).filter(Boolean);

      if (normalizedLogs.length > 0) {
        for (const log of normalizedLogs) {
          await saveData(STORES.LOGS, log).catch((e) => console.warn("Failed to save log item to IDB:", e));
        }

        setCallLogs(prev => {
          if (!append) {
            const serverIds = new Set(normalizedLogs.map((l: any) => Number(l.id || l.Id)));
            const extraLive = prev.filter((p: any) => !serverIds.has(Number(p.id || p.Id)));
            return [...extraLive, ...normalizedLogs];
          } else {
            const existingIds = new Set(prev.map((p: any) => Number(p.id || p.Id)));
            const uniqueNew = normalizedLogs.filter((l: any) => !existingIds.has(Number(l.id || l.Id)));
            return [...prev, ...uniqueNew];
          }
        });

        setCallLogsPage(page);
        if (!append) {
          checkAndSetOngoingCall(normalizedLogs);
        }
      } else if (!append) {
        setCallLogs([]);
      }
    } catch (err) {
      console.error("Failed to fetch call logs", err);
    } finally {
      setIsCallLogsLoading(false);
      setIsCallLogsFetchingMore(false);
    }
  };

  const fetchMoreCallLogs = () => {
    if (hasMoreCallLogs && !isCallLogsLoading && !isCallLogsFetchingMore) {
      fetchCallLogs(callLogsPage + 1, true);
    }
  };

  const cleanupActiveCall = () => {
    stopRinging();
    playCallDisconnectSound();
    
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
      setLocalStream(null);
    }
    
    Object.values(peerConnectionsRef.current).forEach(pc => {
      try {
        (pc as any).close();
      } catch (e) {}
    });
    peerConnectionsRef.current = {};
    
    if (callTimerRef.current) {
      clearInterval(callTimerRef.current);
      callTimerRef.current = null;
    }
    if (analyserIntervalRef.current) {
      clearInterval(analyserIntervalRef.current);
      analyserIntervalRef.current = null;
    }
    
    setActiveCall(null);
    setIncomingCall(null);
    setCallDuration(0);
    setRemoteStreams({});
    setIsMuted(false);
    setIsCameraEnabled(true);
    setIsScreenSharing(false);
    setIsCallMinimized(false);
    setCallState('disconnected');
    setTimeout(() => {
      setCallState(prev => prev === 'disconnected' ? 'idle' : prev);
    }, 1500);
  };

  const setupSimulatedAnalyser = () => {
    if (analyserIntervalRef.current) clearInterval(analyserIntervalRef.current);
    analyserIntervalRef.current = setInterval(() => {
      const heights = Array.from({ length: 10 }, () => Math.floor(Math.random() * 40) + 10);
      setAudioAnalyserData(heights);
    }, 120);
  };

  const startLocalStream = async (video: boolean) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: video ? { width: 640, height: 480, facingMode: 'user' } : false
      });
      setLocalStream(stream);
      if (isMuted) {
        stream.getAudioTracks().forEach(track => {
          track.enabled = false;
        });
      }
      if (!isCameraEnabled && video) {
        stream.getVideoTracks().forEach(track => {
          track.enabled = false;
        });
      }
      if (localVideoRef.current && video) {
        localVideoRef.current.srcObject = stream;
      }
      
      try {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const source = audioCtx.createMediaStreamSource(stream);
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 32;
        source.connect(analyser);
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        
        analyserIntervalRef.current = setInterval(() => {
          analyser.getByteFrequencyData(dataArray);
          const heights = Array.from(dataArray).slice(0, 10).map(val => Math.max(10, Math.floor(val / 3)));
          setAudioAnalyserData(heights);
        }, 100);
      } catch (ae) {
        setupSimulatedAnalyser();
      }
      return stream;
    } catch (err) {
      console.warn("getUserMedia blocked or failed, using simulated stream tracks", err);
      setupSimulatedAnalyser();
      return null;
    }
  };

  const initiateWebRTCOffer = async () => {
    console.log("[WebRTC] Initiating WebRTC Offer...");
    try {
      const token = localStorage.getItem('auth_token') || '';
      const pc = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
      });
      
      const partner = (activeCall?.participants || activeCall?.Participants || []).find((p: any) => Number(p.personId || p.PersonId) !== Number(currentUserId));
      const partnerId = partner?.personId || partner?.PersonId || 0;
      peerConnectionsRef.current[partnerId] = pc;
      
      if (localStream) {
        localStream.getTracks().forEach(track => pc.addTrack(track, localStream));
      }
      
      pc.onicecandidate = (event) => {
        if (event.candidate && activeCall) {
          const candidateDto = {
            callId: Number(activeCall.id || activeCall.Id),
            CallId: Number(activeCall.id || activeCall.Id),
            chatId: parseInt(activeCall.chatId || activeCall.ChatId),
            ChatId: parseInt(activeCall.chatId || activeCall.ChatId),
            personId: Number(currentUserIdRef.current),
            PersonId: Number(currentUserIdRef.current),
            candidate: JSON.stringify(event.candidate),
            sdpMid: event.candidate.sdpMid,
            sdpMLineIndex: event.candidate.sdpMLineIndex
          };
          homeSecurityHubConnection.invoke("IceCandidate", candidateDto, token)
            .catch(err => console.warn("Failed to send ICE Candidate", err));
        }
      };
      
      pc.ontrack = (event) => {
        console.log("[WebRTC] Remote track received:", event.streams[0]);
        setRemoteStreams(prev => ({
          ...prev,
          [partnerId]: event.streams[0]
        }));
      };
      
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      
      if (activeCall) {
        const offerDto = {
          callId: Number(activeCall.id || activeCall.Id),
          CallId: Number(activeCall.id || activeCall.Id),
          chatId: parseInt(activeCall.chatId || activeCall.ChatId),
          ChatId: parseInt(activeCall.chatId || activeCall.ChatId),
          personId: Number(currentUserIdRef.current),
          PersonId: Number(currentUserIdRef.current),
          sdp: JSON.stringify(offer),
          Sdp: JSON.stringify(offer)
        };
        
        await homeSecurityHubConnection.invoke("Offer", offerDto, token);
        console.log("[WebRTC] Offer sent successfully!");
      }
    } catch (err) {
      console.warn("Failed to initiate WebRTC Offer", err);
    }
  };

  const handleOffer = async (dto: any) => {
    console.log("[WebRTC] SDP Offer received:", dto);
    if (!dto) return;
    
    const dtoPersonId = Number(dto.PersonId !== undefined ? dto.PersonId : (dto.personId !== undefined ? dto.personId : 0));
    const currentUid = Number(currentUserIdRef.current);
    if (dtoPersonId !== 0 && dtoPersonId === currentUid) {
      console.log("[WebRTC] Ignored SDP Offer from self.");
      return;
    }

    try {
      const token = localStorage.getItem('auth_token') || '';
      const pc = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
      });
      
      const partnerId = dtoPersonId || dto.callerPersonId || dto.CallerPersonId || activeCall?.callerPersonId || activeCall?.CallerPersonId || 0;
      peerConnectionsRef.current[partnerId] = pc;
      
      if (localStream) {
        localStream.getTracks().forEach(track => pc.addTrack(track, localStream));
      }
      
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          const candidateDto = {
            callId: Number(dto.callId || dto.CallId || activeCall?.id || activeCall?.Id),
            CallId: Number(dto.callId || dto.CallId || activeCall?.id || activeCall?.Id),
            chatId: parseInt(dto.chatId || dto.ChatId || activeCall?.chatId || activeCall?.ChatId),
            ChatId: parseInt(dto.chatId || dto.ChatId || activeCall?.chatId || activeCall?.ChatId),
            personId: Number(currentUserIdRef.current),
            PersonId: Number(currentUserIdRef.current),
            candidate: JSON.stringify(event.candidate),
            sdpMid: event.candidate.sdpMid,
            sdpMLineIndex: event.candidate.sdpMLineIndex
          };
          homeSecurityHubConnection.invoke("IceCandidate", candidateDto, token)
            .catch(err => console.warn("Failed to send ICE Candidate", err));
        }
      };
      
      pc.ontrack = (event) => {
        console.log("[WebRTC] Remote track received (callee):", event.streams[0]);
        setRemoteStreams(prev => ({
          ...prev,
          [partnerId]: event.streams[0]
        }));
      };
      
      const sdpVal = dto.sdp || dto.Sdp;
      const offerSdp = typeof sdpVal === 'string' ? JSON.parse(sdpVal) : sdpVal;
      await pc.setRemoteDescription(new RTCSessionDescription(offerSdp));
      
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      
      const answerDto = {
        callId: Number(dto.callId || dto.CallId || activeCall?.id || activeCall?.Id),
        CallId: Number(dto.callId || dto.CallId || activeCall?.id || activeCall?.Id),
        chatId: parseInt(dto.chatId || dto.ChatId || activeCall?.chatId || activeCall?.ChatId),
        ChatId: parseInt(dto.chatId || dto.ChatId || activeCall?.chatId || activeCall?.ChatId),
        personId: Number(currentUserIdRef.current),
        PersonId: Number(currentUserIdRef.current),
        sdp: JSON.stringify(answer),
        Sdp: JSON.stringify(answer)
      };
      
      await homeSecurityHubConnection.invoke("Answer", answerDto, token);
      console.log("[WebRTC] Answer sent successfully!");
    } catch (err) {
      console.warn("Failed to handle offer", err);
    }
  };

  const handleAnswer = async (dto: any) => {
    console.log("[WebRTC] SDP Answer received:", dto);
    if (!dto) return;

    const dtoPersonId = Number(dto.PersonId !== undefined ? dto.PersonId : (dto.personId !== undefined ? dto.personId : 0));
    const currentUid = Number(currentUserIdRef.current);
    if (dtoPersonId !== 0 && dtoPersonId === currentUid) {
      console.log("[WebRTC] Ignored SDP Answer from self.");
      return;
    }

    try {
      const partnerId = dtoPersonId || dto.personId || dto.PersonId || activeCall?.callerPersonId || activeCall?.CallerPersonId || 0;
      const pc = peerConnectionsRef.current[partnerId];
      if (pc) {
        const answerSdp = JSON.parse(dto.sdp);
        await pc.setRemoteDescription(new RTCSessionDescription(answerSdp));
        console.log("[WebRTC] Remote description set for answer successfully!");
      }
    } catch (err) {
      console.warn("Failed to handle answer", err);
    }
  };

  const handleIceCandidate = async (dto: any) => {
    console.log("[WebRTC] ICE Candidate received:", dto);
    if (!dto) return;

    const dtoPersonId = Number(dto.PersonId !== undefined ? dto.PersonId : (dto.personId !== undefined ? dto.personId : 0));
    const currentUid = Number(currentUserIdRef.current);
    if (dtoPersonId !== 0 && dtoPersonId === currentUid) {
      console.log("[WebRTC] Ignored ICE Candidate from self.");
      return;
    }

    try {
      const partnerId = dtoPersonId || dto.personId || dto.PersonId || activeCall?.callerPersonId || activeCall?.CallerPersonId || 0;
      const pc = peerConnectionsRef.current[partnerId];
      if (pc && dto.candidate) {
        const candObj = JSON.parse(dto.candidate);
        await pc.addIceCandidate(new RTCIceCandidate(candObj));
        console.log("[WebRTC] ICE Candidate added successfully!");
      }
    } catch (err) {
      console.warn("Failed to handle ICE candidate", err);
    }
  };

  const proceedWithStartCall = async (type: number) => {
    if (!activeChat) return;
    try {
      triggerHaptic('light');
      const response = await startCall(parseInt(activeChat.id), type);
      const callData = response?.data ?? response?.Data ?? response;
      if (callData) {
        setActiveCall(callData);
        setCallState('ringing_outgoing');
        startLocalStream(type === 2);
      }
    } catch (err) {
      console.error("Failed to start call", err);
      alert("Could not start call. Please try again.");
    }
  };

  const handleTriggerStartCall = async (type: number) => {
    if (!activeChat) return;
    proceedWithStartCall(type);
  };

  const proceedWithAcceptCall = async () => {
    if (!activeCall) return;
    try {
      triggerHaptic('medium');
      const token = localStorage.getItem('auth_token') || '';
      const callId = activeCall.id || activeCall.Id;
      
      await acceptCall(Number(callId))
        .catch((err) => console.warn("HTTP AcceptCall failed, proceeding locally:", err));

      // Automatically transition to chats view on call acceptance
      if (onNavigateToChats) {
        onNavigateToChats();
      }

      // Automatically open the matching chat room on call acceptance
      const callChatId = activeCall.chatId || activeCall.ChatId;
      if (callChatId) {
        const matchingChat = localChatList.find(c => Number(c.id) === Number(callChatId));
        if (matchingChat) {
          setActiveChat(matchingChat);
        }
      }

      const connectedCall = {
        ...activeCall,
        status: 2,
        Status: 2,
        answeredAt: activeCall.answeredAt || new Date().toISOString()
      };
      setActiveCall(connectedCall);
      setCallState('connected');
      stopRinging();
      playCallConnectSound();
      
      setCallDuration(0);
      if (callTimerRef.current) clearInterval(callTimerRef.current);
      callTimerRef.current = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);

      await startLocalStream(activeCall.type === 2 || activeCall.Type === 2);

      updateCallInLogs(connectedCall);

      // Invoke SignalR ToggleCallItems, Offer, and IceCandidate as requested
      const toggleDto = {
        callId: Number(callId),
        CallId: Number(callId),
        chatId: parseInt(activeCall.chatId || activeCall.ChatId),
        ChatId: parseInt(activeCall.chatId || activeCall.ChatId),
        personId: Number(currentUserIdRef.current),
        PersonId: Number(currentUserIdRef.current),
        isMuted: isMuted,
        IsMuted: isMuted,
        isCameraEnabled: isCameraEnabled,
        IsCameraEnabled: isCameraEnabled,
        isSharing: isScreenSharing,
        IsSharing: isScreenSharing
      };
      if (String(homeSecurityHubConnection.state) === 'Connected') {
        await homeSecurityHubConnection.invoke("ToggleCallItems", toggleDto, token).catch(e => console.warn("ToggleCallItems error on accept:", e));
      }

      setTimeout(() => {
        initiateWebRTCOffer();
      }, 300);
    } catch (err) {
      console.error("Failed to accept call", err);
    }
  };

  const handleAcceptCall = async () => {
    if (!activeCall) return;
    proceedWithAcceptCall();
  };

  const handleRejectCall = async () => {
    if (!activeCall) return;
    const savedCall = activeCall;
    try {
      triggerHaptic('heavy');
      const callId = activeCall.id || activeCall.Id;
      const currentStatus = activeCall.status !== undefined ? activeCall.status : activeCall.Status;
      const isConnected = callState === 'connected' || Number(currentStatus) === 2 || currentStatus === 'Connected';
      
      if (!isConnected) {
        await rejectCall(Number(callId))
          .catch(() => console.warn("HTTP RejectCall failed"));
      } else {
        console.warn("Attempted to call RejectCall on a connected call. Calling EndCall instead.");
        await endCall(Number(callId))
          .catch(() => console.warn("HTTP EndCall failed"));
      }
    } catch (err) {
      console.warn("Error rejecting call", err);
    } finally {
      cleanupActiveCall();
      updateCallInLogs({ ...savedCall, status: 5, isMissed: true }, savedCall);
    }
  };

  const handleEndCall = async () => {
    if (!activeCall) return;
    const savedCall = activeCall;
    try {
      triggerHaptic('heavy');
      const callId = activeCall.id || activeCall.Id;
      const currentStatus = activeCall.status !== undefined ? activeCall.status : activeCall.Status;
      const isConnected = callState === 'connected' || Number(currentStatus) === 2 || currentStatus === 'Connected';
      
      if (isConnected) {
        await endCall(Number(callId))
          .catch(() => console.warn("Backend EndCall failed, doing local cleanup"));
      } else {
        await rejectCall(Number(callId))
          .catch(() => console.warn("HTTP RejectCall failed"));
      }
    } catch (err) {
      console.error("Failed to end call", err);
    } finally {
      cleanupActiveCall();
      updateCallInLogs({ ...savedCall, status: 3 }, savedCall);
    }
  };

  const handleToggleMic = async () => {
    if (!activeCall) return;
    try {
      const nextMuted = !isMuted;
      setIsMuted(nextMuted);
      
      if (localStream) {
        localStream.getAudioTracks().forEach(track => {
          track.enabled = !nextMuted;
        });
      }
      
      const token = localStorage.getItem('auth_token') || '';
      await homeSecurityHubConnection.invoke("ToggleCallItems", { 
        callId: Number(activeCall.id || activeCall.Id), 
        chatId: parseInt(activeCall.chatId || activeCall.ChatId),
        personId: Number(currentUserIdRef.current),
        isMuted: nextMuted,
        isCameraEnabled: isCameraEnabled,
        isSharing: isScreenSharing,
        CallId: Number(activeCall.id || activeCall.Id), 
        ChatId: parseInt(activeCall.chatId || activeCall.ChatId),
        PersonId: Number(currentUserIdRef.current),
        IsMuted: nextMuted,
        IsCameraEnabled: isCameraEnabled,
        IsSharing: isScreenSharing
      }, token).catch(() => console.warn("Failed to invoke ToggleCallItems"));
    } catch (err) {
      console.warn("Failed to toggle microphone", err);
    }
  };

  const handleToggleCamera = async () => {
    if (!activeCall) return;
    try {
      const nextCam = !isCameraEnabled;
      setIsCameraEnabled(nextCam);
      
      let streamToUse = localStream;
      if (nextCam && (!localStream || localStream.getVideoTracks().length === 0)) {
        const newStream = await startLocalStream(true);
        if (newStream) {
          streamToUse = newStream;
        }
      } else if (localStream) {
        localStream.getVideoTracks().forEach(track => {
          track.enabled = nextCam;
        });
      }
      
      if (streamToUse) {
        const videoTrack = streamToUse.getVideoTracks()[0];
        if (videoTrack) {
          Object.values(peerConnectionsRef.current).forEach((pc: RTCPeerConnection) => {
            const senders = pc.getSenders();
            const videoSender = senders.find(s => s.track && s.track.kind === 'video');
            if (videoSender) {
              videoSender.replaceTrack(videoTrack).catch(err => console.warn("replaceTrack failed", err));
            } else {
              try {
                pc.addTrack(videoTrack, streamToUse!);
              } catch (e) {
                console.warn("addTrack failed", e);
              }
            }
          });
        }
      }
      
      const token = localStorage.getItem('auth_token') || '';
      await homeSecurityHubConnection.invoke("ToggleCallItems", { 
        callId: Number(activeCall.id || activeCall.Id), 
        chatId: parseInt(activeCall.chatId || activeCall.ChatId),
        personId: Number(currentUserIdRef.current),
        isMuted: isMuted,
        isCameraEnabled: nextCam,
        isSharing: isScreenSharing,
        CallId: Number(activeCall.id || activeCall.Id), 
        ChatId: parseInt(activeCall.chatId || activeCall.ChatId),
        PersonId: Number(currentUserIdRef.current),
        IsMuted: isMuted,
        IsCameraEnabled: nextCam,
        IsSharing: isScreenSharing
      }, token).catch(() => console.warn("Failed to invoke ToggleCallItems"));
    } catch (err) {
      console.warn("Failed to toggle camera", err);
    }
  };

  const handleToggleScreenShare = async () => {
    if (!activeCall) return;
    try {
      const nextSharing = !isScreenSharing;
      setIsScreenSharing(nextSharing);
      
      triggerToast(nextSharing ? "Screen Sharing Active" : "Screen Sharing Inactive");
      
      const token = localStorage.getItem('auth_token') || '';
      await homeSecurityHubConnection.invoke("ToggleCallItems", { 
        callId: Number(activeCall.id || activeCall.Id), 
        chatId: parseInt(activeCall.chatId || activeCall.ChatId),
        personId: Number(currentUserIdRef.current),
        isMuted: isMuted,
        isCameraEnabled: isCameraEnabled,
        isSharing: nextSharing,
        CallId: Number(activeCall.id || activeCall.Id), 
        ChatId: parseInt(activeCall.chatId || activeCall.ChatId),
        PersonId: Number(currentUserIdRef.current),
        IsMuted: isMuted,
        IsCameraEnabled: isCameraEnabled,
        IsSharing: nextSharing
      }, token).catch(() => console.warn("Failed to invoke ToggleCallItems"));
    } catch (err) {
      console.warn("Failed to toggle screen sharing", err);
    }
  };

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

  const activeCallRef = useRef<any | null>(null);
  useEffect(() => {
    activeCallRef.current = activeCall;
  }, [activeCall]);

  const localChatListRef = useRef<ChatRoom[]>([]);
  useEffect(() => {
    localChatListRef.current = localChatList;
  }, [localChatList]);

  const availablePersonsRef = useRef<any[]>([]);
  useEffect(() => {
    availablePersonsRef.current = availablePersons;
  }, [availablePersons]);

  const callStateRef = useRef<'idle' | 'ringing_outgoing' | 'ringing_incoming' | 'connected' | 'disconnected'>('idle');
  useEffect(() => {
    callStateRef.current = callState;
  }, [callState]);

  useEffect(() => {
    if (callState !== 'connected' || !activeCall) {
      setRemoteAudioLevels({});
      return;
    }

    const interval = setInterval(() => {
      const participants = activeCall.participants || activeCall.Participants || [];
      const newLevels: {[personId: number]: number[]} = {};
      
      participants.forEach((p: any) => {
        const pId = Number(p.personId || p.PersonId || p.id || p.Id);
        if (pId === Number(currentUserId)) return;
        
        const isParticipantMuted = p.isMuted !== undefined ? p.isMuted : p.IsMuted;
        if (isParticipantMuted) {
          newLevels[pId] = new Array(5).fill(4);
        } else {
          const speakingSeed = Math.random() > 0.15;
          const heights = Array.from({ length: 5 }, () => 
            speakingSeed ? Math.floor(Math.random() * 12) + 4 : 4
          );
          newLevels[pId] = heights;
        }
      });
      
      setRemoteAudioLevels(newLevels);
    }, 120);

    return () => clearInterval(interval);
  }, [callState, activeCall, currentUserId]);

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
              time: formatLastMessageTime(msg.sentAt || msg.SentAt || new Date()),
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
          time: formatLastMessageTime(chat.lastMessage?.sentAt || chat.LastMessage?.SentAt || chat.createdAt || chat.CreatedAt),
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
      if (!args || args.length === 0) return;

      let eventName = "";
      let payload: any = null;

      if (typeof args[0] === 'string') {
        eventName = args[0];
        if (args.length >= 3) {
          payload = extractPayload(args[2]) || extractPayload(args[1]);
        } else if (args.length === 2) {
          payload = extractPayload(args[1]);
        }
      } else if (typeof args[0] === 'object' && args[0] !== null) {
        payload = extractPayload(args[0]);
        eventName = payload?.eventName || payload?.EventName || payload?.type || payload?.Type || "";
      }

      if (eventName === "GroupChatCreated" || eventName === "ChatCreated") {
        if (payload) {
          handleChatCreated(payload);
          const chatId = payload.id ?? payload.Id;
          const parsedId = Number(chatId);
          if (!isNaN(parsedId)) {
            homeSecurityHubConnection.invoke("JoinChat", parsedId)
              .then(() => console.log(`[SignalR] Joined newly created chat: ${parsedId}`))
              .catch(err => console.warn(`[SignalR] Failed to join newly created chat ${parsedId}:`, err));
          }
        }
      } else if (eventName === "MessagesRead") {
        handleMessagesRead(payload);
      } else if (eventName === "MessageDeleted") {
        handleMessageDeleted(payload);
      } else if (eventName === "IncomingCall") {
        const callDto = payload;
        console.log("[SignalR Event: UpdateChat] IncomingCall received:", callDto);
        if (callDto) {
          const isCaller = Number(callDto.callerPersonId || callDto.CallerPersonId) === Number(currentUserIdRef.current);
          if (!isCaller) {
            setIncomingCall(callDto);
            setActiveCall(callDto);
            setCallState('ringing_incoming');
            startRinging();
            triggerHaptic('incoming');
          } else {
            if (callStateRef.current === 'idle' || callStateRef.current === 'disconnected') {
              setActiveCall(callDto);
              setCallState('ringing_outgoing');
            }
          }
          updateCallInLogs(callDto);
        }
      } else if (eventName === "CallAccepted") {
        const callDto = payload;
        console.log("[SignalR Event: UpdateChat] CallAccepted received:", callDto);
        if (callDto) {
          setActiveCall(callDto);
          setCallState('connected');
          stopRinging();
          playCallConnectSound();
          
          setCallDuration(0);
          if (callTimerRef.current) clearInterval(callTimerRef.current);
          callTimerRef.current = setInterval(() => {
            setCallDuration(prev => prev + 1);
          }, 1000);
          
          const isCaller = Number(callDto.callerPersonId || callDto.CallerPersonId) === Number(currentUserIdRef.current);
          if (isCaller) {
            setTimeout(() => {
              initiateWebRTCOffer();
            }, 500);
          }
          updateCallInLogs(callDto);
        }
      } else if (eventName === "CallParticipantJoined" || eventName === "CallParticipantConnected") {
        const callDto = payload;
        console.log("[SignalR Event: UpdateChat] CallParticipantJoined received:", callDto);
        if (callDto) {
          setActiveCall(callDto);
          updateCallInLogs(callDto);
        }
      } else if (eventName === "CallParticipantLeft" || eventName === "ParticipantLeft") {
        console.log(`[SignalR Event: UpdateChat] Participant Left received (${eventName}):`, payload);
        if (payload) {
          handleParticipantLeftDirect(payload);
        }
      } else if (eventName === "CallRejected") {
        const rejectDto = payload;
        console.log("[SignalR Event: UpdateChat] CallRejected received:", rejectDto);
        if (rejectDto) {
          const personId = rejectDto.personId || rejectDto.PersonId;
          const callStatus = rejectDto.callStatus || rejectDto.CallStatus || rejectDto.status || rejectDto.Status;
          const savedCall = activeCallRef.current;
          if (Number(personId) === Number(currentUserIdRef.current) || callStatus === 3 || callStatus === 5 || callStatus === 'Ended' || callStatus === 'Rejected') {
            cleanupActiveCall();
          } else {
            const actCall = activeCallRef.current;
            if (actCall && !actCall.isGroup && !actCall.IsGroup) {
              cleanupActiveCall();
            } else {
              setActiveCall((prev: any) => {
                if (!prev) return null;
                const participants = (prev.participants || []).map((p: any) => {
                  const pId = p.personId || p.PersonId;
                  if (Number(pId) === Number(personId)) {
                    return { ...p, status: 2 }; 
                  }
                  return p;
                });
                return { ...prev, participants: participants, Participants: participants };
              });
            }
          }
          updateCallInLogs(rejectDto, savedCall);
        }
      } else if (eventName === "CallEnded") {
        console.log("[SignalR Event: UpdateChat] CallEnded received");
        const savedCall = activeCallRef.current;
        cleanupActiveCall();
        const callDto = payload;
        updateCallInLogs(callDto || savedCall, savedCall);
      } else if (eventName === "CallTimedOut") {
        console.log("[SignalR Event: UpdateChat] CallTimedOut received");
        const savedCall = activeCallRef.current;
        cleanupActiveCall();
        const callDto = payload;
        updateCallInLogs(callDto || savedCall, savedCall);
      } else if (eventName === "ToggleCallItems" || eventName === "CallItemsToggled") {
        handleToggleCallItemsWrapped(payload);
      } else if (payload && (payload.eventName === "MessagesRead" || payload.EventName === "MessagesRead" || payload.chatId)) {
        handleMessagesRead(payload);
      } else if (payload && (payload.eventName === "MessageDeleted" || payload.EventName === "MessageDeleted" || payload.isDeleted || payload.IsDeleted)) {
        handleMessageDeleted(payload);
      }
    };
    const handleIncomingCallDirect = (payload: any) => {
      console.log("[HOME_SIGNALR_EVENT: IncomingCall Direct]", payload);
      const callDto = extractPayload(payload);
      if (!callDto) return;
      const isCaller = Number(callDto.callerPersonId || callDto.CallerPersonId) === Number(currentUserIdRef.current);
      if (!isCaller) {
        setIncomingCall(callDto);
        setActiveCall(callDto);
        setCallState('ringing_incoming');
        startRinging();
        triggerHaptic('incoming');
      } else {
        if (callStateRef.current === 'idle' || callStateRef.current === 'disconnected') {
          setActiveCall(callDto);
          setCallState('ringing_outgoing');
        }
      }
      updateCallInLogs(callDto);
    };

    const handleCallAcceptedDirect = (payload: any) => {
      console.log("[HOME_SIGNALR_EVENT: CallAccepted Direct]", payload);
      const callDto = extractPayload(payload);
      if (!callDto) return;
      setActiveCall(callDto);
      setCallState('connected');
      stopRinging();
      playCallConnectSound();
      
      setCallDuration(0);
      if (callTimerRef.current) clearInterval(callTimerRef.current);
      callTimerRef.current = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
      
      const isCaller = Number(callDto.callerPersonId || callDto.CallerPersonId) === Number(currentUserIdRef.current);
      if (isCaller) {
        setTimeout(() => {
          initiateWebRTCOffer();
        }, 500);
      }
      updateCallInLogs(callDto);
    };

    const handleParticipantLeftDirect = (payload: any) => {
      console.log("[HOME_SIGNALR_EVENT: ParticipantLeft Direct]", payload);
      const callDto = extractPayload(payload);
      if (!callDto) return;

      const currentUserId = Number(currentUserIdRef.current);
      const leftPersonId = callDto.personId || callDto.PersonId || callDto.participantPersonId || callDto.ParticipantPersonId || callDto.leftPersonId || callDto.LeftPersonId;
      const currentStatus = callDto.status !== undefined ? callDto.status : callDto.Status;
      const savedCall = activeCallRef.current;

      // If current user is the one who left, or if call ended globally
      if ((leftPersonId && Number(leftPersonId) === currentUserId) || currentStatus === 3 || currentStatus === 'Ended') {
        cleanupActiveCall();
        updateCallInLogs(callDto, savedCall);
        return;
      }

      // Update activeCall state by filtering out the left participant from ongoing call
      setActiveCall((prev: any) => {
        if (!prev) return null;

        const isGroup = prev.isGroup || prev.IsGroup || callDto.isGroup || callDto.IsGroup;
        const incomingList = callDto.participants || callDto.Participants || [];
        const existingList = prev.participants || prev.Participants || [];
        const baseList = incomingList.length > 0 ? incomingList : existingList;

        const updatedParticipants = baseList.filter((p: any) => {
          const pId = p.personId || p.PersonId || p.id || p.Id;
          const pStatus = p.status !== undefined ? p.status : p.Status;
          if (leftPersonId && Number(pId) === Number(leftPersonId)) return false;
          if (pStatus === 2 || pStatus === 'Left' || pStatus === 'Rejected' || pStatus === 'Disconnected') return false;
          return true;
        });

        const activeOthers = updatedParticipants.filter((p: any) => {
          const pId = p.personId || p.PersonId || p.id || p.Id;
          return Number(pId) !== currentUserId;
        });

        if (activeOthers.length === 0) {
          cleanupActiveCall();
          return null;
        }

        return {
          ...prev,
          ...callDto,
          participants: updatedParticipants,
          Participants: updatedParticipants
        };
      });

      updateCallInLogs(callDto, savedCall);
    };

    const handleCallRejectedDirect = (payload: any) => {
      console.log("[HOME_SIGNALR_EVENT: CallRejected Direct]", payload);
      const rejectDto = extractPayload(payload);
      if (!rejectDto) return;
      const personId = rejectDto.personId || rejectDto.PersonId;
      const callStatus = rejectDto.callStatus || rejectDto.CallStatus || rejectDto.status || rejectDto.Status;
      const savedCall = activeCallRef.current;
      if (Number(personId) === Number(currentUserIdRef.current) || callStatus === 3 || callStatus === 5 || callStatus === 'Ended' || callStatus === 'Rejected') {
        cleanupActiveCall();
      } else {
        const actCall = activeCallRef.current;
        if (actCall && !actCall.isGroup && !actCall.IsGroup) {
          cleanupActiveCall();
        } else {
          setActiveCall((prev: any) => {
            if (!prev) return null;
            const participants = (prev.participants || []).map((p: any) => {
              const pId = p.personId || p.PersonId;
              if (Number(pId) === Number(personId)) {
                return { ...p, status: 2 }; 
              }
              return p;
            });
            return { ...prev, participants: participants, Participants: participants };
          });
        }
      }
      updateCallInLogs(rejectDto, savedCall);
    };

    const handleCallEndedDirect = (payload: any) => {
      console.log("[HOME_SIGNALR_EVENT: CallEnded Direct]", payload);
      const savedCall = activeCallRef.current;
      cleanupActiveCall();
      const callDto = extractPayload(payload);
      updateCallInLogs(callDto || savedCall, savedCall);
    };

    const handleCallTimedOutDirect = (payload: any) => {
      console.log("[HOME_SIGNALR_EVENT: CallTimedOut Direct]", payload);
      const savedCall = activeCallRef.current;
      cleanupActiveCall();
      const callDto = extractPayload(payload);
      updateCallInLogs(callDto || savedCall, savedCall);
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

    const handleOfferWrapped = (dto: any) => {
      handleOffer(extractPayload(dto));
    };
    const handleAnswerWrapped = (dto: any) => {
      handleAnswer(extractPayload(dto));
    };
    const handleIceCandidateWrapped = (dto: any) => {
      handleIceCandidate(extractPayload(dto));
    };
    const handleToggleCallItemsWrapped = (dto: any) => {
      const payload = extractPayload(dto);
      const personId = payload.personId || payload.PersonId || payload.personIdToggled || 0;
      const isMuted = payload.isMuted !== undefined ? payload.isMuted : payload.IsMuted;
      const isCameraEnabled = payload.isCameraEnabled !== undefined ? payload.isCameraEnabled : payload.IsCameraEnabled;
      const isSharing = payload.isSharing !== undefined ? payload.isSharing : payload.IsSharing;
      console.log(`[SignalR Event] Call items toggled by ${personId}: Muted=${isMuted}, Camera=${isCameraEnabled}, Sharing=${isSharing}`);
      
      if (Number(personId) === Number(currentUserIdRef.current)) {
        setIsMuted(isMuted);
        setIsCameraEnabled(isCameraEnabled);
        setIsScreenSharing(isSharing);
      }

      setActiveCall((prev: any) => {
        if (!prev) return null;
        const participants = (prev.participants || []).map((p: any) => {
          if (Number(p.personId || p.PersonId) === Number(personId)) {
            return { 
              ...p, 
              isMuted, 
              isCameraEnabled, 
              isSharing,
              IsMuted: isMuted,
              IsCameraEnabled: isCameraEnabled,
              IsSharing: isSharing
            };
          }
          return p;
        });
        const updatedCall = { ...prev, participants, Participants: participants };
        updateCallInLogs(updatedCall);
        return updatedCall;
      });
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
    homeSecurityHubConnection.on("IncomingCall", handleIncomingCallDirect);
    homeSecurityHubConnection.on("CallAccepted", handleCallAcceptedDirect);
    homeSecurityHubConnection.on("CallParticipantJoined", handleCallAcceptedDirect);
    homeSecurityHubConnection.on("CallParticipantConnected", handleCallAcceptedDirect);
    homeSecurityHubConnection.on("CallParticipantLeft", handleParticipantLeftDirect);
    homeSecurityHubConnection.on("ParticipantLeft", handleParticipantLeftDirect);
    homeSecurityHubConnection.on("CallRejected", handleCallRejectedDirect);
    homeSecurityHubConnection.on("CallEnded", handleCallEndedDirect);
    homeSecurityHubConnection.on("CallTimedOut", handleCallTimedOutDirect);
    homeSecurityHubConnection.on("UserOnline", handleUserOnlineWrapped);
    homeSecurityHubConnection.on("Offer", handleOfferWrapped);
    homeSecurityHubConnection.on("ReceiveOffer", handleOfferWrapped);
    homeSecurityHubConnection.on("Answer", handleAnswerWrapped);
    homeSecurityHubConnection.on("ReceiveAnswer", handleAnswerWrapped);
    homeSecurityHubConnection.on("IceCandidate", handleIceCandidateWrapped);
    homeSecurityHubConnection.on("ReceiveIceCandidate", handleIceCandidateWrapped);
    homeSecurityHubConnection.on("ToggleCallItems", handleToggleCallItemsWrapped);
    homeSecurityHubConnection.on("CallItemsToggled", handleToggleCallItemsWrapped);

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
      homeSecurityHubConnection.off("IncomingCall", handleIncomingCallDirect);
      homeSecurityHubConnection.off("CallAccepted", handleCallAcceptedDirect);
      homeSecurityHubConnection.off("CallParticipantJoined", handleCallAcceptedDirect);
      homeSecurityHubConnection.off("CallParticipantConnected", handleCallAcceptedDirect);
      homeSecurityHubConnection.off("CallParticipantLeft", handleParticipantLeftDirect);
      homeSecurityHubConnection.off("ParticipantLeft", handleParticipantLeftDirect);
      homeSecurityHubConnection.off("CallRejected", handleCallRejectedDirect);
      homeSecurityHubConnection.off("CallEnded", handleCallEndedDirect);
      homeSecurityHubConnection.off("CallTimedOut", handleCallTimedOutDirect);
      homeSecurityHubConnection.off("UserOnline", handleUserOnlineWrapped);
      homeSecurityHubConnection.off("Offer", handleOfferWrapped);
      homeSecurityHubConnection.off("ReceiveOffer", handleOfferWrapped);
      homeSecurityHubConnection.off("Answer", handleAnswerWrapped);
      homeSecurityHubConnection.off("ReceiveAnswer", handleAnswerWrapped);
      homeSecurityHubConnection.off("IceCandidate", handleIceCandidateWrapped);
      homeSecurityHubConnection.off("ReceiveIceCandidate", handleIceCandidateWrapped);
      homeSecurityHubConnection.off("ToggleCallItems", handleToggleCallItemsWrapped);
      homeSecurityHubConnection.off("CallItemsToggled", handleToggleCallItemsWrapped);
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
            lastMsgTime = formatLastMessageTime(chat.lastMessage.sentAt || chat.lastMessage.SentAt);
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
        const cachedLogs = await getAllData(STORES.LOGS);
        if (Array.isArray(cachedLogs) && cachedLogs.length > 0) {
          setCallLogs(cachedLogs);
        }
      } catch (err) {
        console.warn("Failed to load initial cached call logs:", err);
      }

      // Fetch fresh call logs exactly once at startup/load
      fetchCallLogs();

      if (Array.isArray((window as any).__cachedChats) && (window as any).__cachedChats.length > 0) {
        setLocalChatList((window as any).__cachedChats);
        setIsChatsLoading(false);
        return;
      }
      try {
        const cached = await getAllData(STORES.CHATS);
        if (Array.isArray(cached) && cached.length > 0) {
          setLocalChatList(cached as ChatRoom[]);
          (window as any).__cachedChats = cached;
          setIsChatsLoading(false);
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
    if (isViewActive) {
      onChatActive(!!activeChat);
      return () => onChatActive(false);
    }
  }, [activeChat, onChatActive, isViewActive]);

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

  if (!isViewActive && callState === 'idle') {
    return null;
  }

  return (
    <div className={isViewActive ? "absolute inset-0 flex flex-col bg-[#F0F2F5] dark:bg-[#0c0c0e] text-zinc-800 dark:text-zinc-200" : ""}>
      {isViewActive && (
        <>
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
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
                <input 
                  type="text" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={activeSidebarTab === 'chats' ? "Search chats" : "Search call logs"} 
                  className="w-full bg-transparent border border-zinc-200 py-2 pl-10 pr-4 text-xs text-zinc-800 outline-none focus:border-black transition-colors rounded-md placeholder-zinc-400 text-black dark:text-white"
                />
              </div>

              {/* WhatsApp Segmented Tab Toggle */}
              <div className="flex bg-zinc-100 dark:bg-zinc-900 p-1 rounded-lg mb-1">
                <button
                  onClick={() => setActiveSidebarTab('chats')}
                  className={`flex-1 py-1.5 rounded-md text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
                    activeSidebarTab === 'chats'
                      ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm border border-zinc-200/50 dark:border-zinc-700/50'
                      : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300'
                  }`}
                >
                  <MessageCircle size={14} /> Chats
                </button>
                <button
                  onClick={() => {
                    setActiveSidebarTab('calls');
                    fetchCallLogs();
                  }}
                  className={`flex-1 py-1.5 rounded-md text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
                    activeSidebarTab === 'calls'
                      ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm border border-zinc-200/50 dark:border-zinc-700/50'
                      : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300'
                  }`}
                >
                  <Phone size={14} /> Call Logs
                </button>
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
              onScroll={(e) => {
                if (activeSidebarTab === 'calls') {
                  const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
                  if (scrollHeight - scrollTop - clientHeight < 120) {
                    if (hasMoreCallLogs && !isCallLogsLoading && !isCallLogsFetchingMore) {
                      fetchMoreCallLogs();
                    }
                  }
                }
              }}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={() => { pullStartRef.current = null; setPullDistance(0); }}
              className="flex-1 overflow-y-auto w-full border-t border-zinc-100 touch-pan-y"
            >
              {activeSidebarTab === 'calls' ? (
                isCallLogsLoading ? (
                  <div className="flex flex-col items-center justify-center py-20 gap-3 text-zinc-400">
                    <LoaderCircle className="animate-spin text-emerald-500" size={32} />
                    <p className="text-xs font-bold uppercase tracking-wider">Loading Call Logs...</p>
                  </div>
                ) : callLogs.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 px-6 text-center text-zinc-400">
                    <Phone className="w-12 h-12 text-zinc-300 mb-3 animate-pulse" />
                    <h4 className="text-sm font-black text-zinc-700 uppercase tracking-wider">No Recent Calls</h4>
                    <p className="text-xs text-zinc-500 max-w-xs mt-1">Select any chat partner and tap the phone or video icon to start a high-fidelity call.</p>
                  </div>
                ) : (
                  <>
                    {[...callLogs]
                      .filter(log => {
                        if (!searchQuery.trim()) return true;
                        const foundChat = localChatList.find(c => String(c.id) === String(log.chatId || log.ChatId));
                        const callerId = log.callerPersonId || log.CallerPersonId;
                        const isCaller = Number(callerId) === currentUserId;
                        let partnerId = !isCaller && callerId ? Number(callerId) : null;
                        if (!partnerId && log.participants?.length > 0) {
                          const otherP = log.participants.find((p: any) => Number(p.personId || p.PersonId || p.id || p.Id) !== currentUserId);
                          if (otherP) partnerId = Number(otherP.personId || otherP.PersonId || otherP.id || otherP.Id);
                        }
                        const partnerPerson = partnerId ? availablePersons.find(p => Number(p.id || p.Id) === partnerId) : null;
                        const displayName = foundChat?.name || log.chatName || log.ChatName || log.groupName || log.GroupName || partnerPerson?.name || partnerPerson?.Name || (partnerId ? `User ${partnerId}` : 'Secure Call');
                        return displayName.toLowerCase().includes(searchQuery.toLowerCase());
                      })
                      .map((log: any) => {
                        const isIncoming = log.isIncoming || log.IsIncoming;
                        const isEnded = log.status === 3 || log.status === 'Ended' || Boolean(log.endedAt || log.EndedAt);
                        const isMissed = log.isMissed || log.IsMissed || log.status === 4 || log.status === 'Missed' || log.status === 5 || log.status === 'Rejected';
                        const isVideo = log.type === 2 || log.Type === 2;
                        const dateStr = log.startedAt || log.StartedAt;
                        
                        const foundChat = localChatList.find(c => String(c.id) === String(log.chatId || log.ChatId));
                        const callerId = log.callerPersonId || log.CallerPersonId;
                        const isCaller = Number(callerId) === currentUserId;
                        let partnerId = !isCaller && callerId ? Number(callerId) : null;
                        if (!partnerId && log.participants?.length > 0) {
                          const otherP = log.participants.find((p: any) => Number(p.personId || p.PersonId || p.id || p.Id) !== currentUserId);
                          if (otherP) partnerId = Number(otherP.personId || otherP.PersonId || otherP.id || otherP.Id);
                        }
                        if (!partnerId && foundChat?.participants?.length > 0) {
                          const otherPart = foundChat.participants.find((p: any) => Number(p.personId || p.PersonId || p.id || p.Id) !== currentUserId);
                          if (otherPart) partnerId = Number(otherPart.personId || otherPart.PersonId || otherPart.id || otherPart.Id);
                        }
                        const partnerPerson = partnerId ? availablePersons.find(p => Number(p.id || p.Id) === partnerId) : null;

                        const displayName = foundChat?.name || log.chatName || log.ChatName || log.groupName || log.GroupName || partnerPerson?.name || partnerPerson?.Name || (partnerId ? `User ${partnerId}` : 'Secure Call');
                        const chatImg = foundChat?.imageUrl || foundChat?.ImageUrl || log.imageUrl || log.ImageUrl || log.chatImage || log.ChatImage || partnerPerson?.imageUrl || partnerPerson?.ImageUrl || partnerPerson?.picture;
                        const formattedDate = formatLogDate(dateStr);
                        
                        const isOngoing = !isEnded && !isMissed && (log.status === 1 || log.status === 2 || log.status === 'Ringing' || log.status === 'Connected');
                        
                        let statusText = '';
                        let statusColor = 'text-zinc-500';
                        if (log.status === 1 || log.status === 'Ringing') {
                          statusText = 'Ringing';
                          statusColor = 'text-amber-600 font-bold animate-pulse';
                        } else if (log.status === 2 || log.status === 'Connected') {
                          statusText = 'Connected';
                          statusColor = 'text-emerald-600 font-bold';
                        } else if (log.status === 3 || log.status === 'Ended') {
                          statusText = 'Ended';
                          statusColor = 'text-zinc-500';
                        } else if (log.status === 4 || log.status === 'Missed') {
                          statusText = 'Missed';
                          statusColor = 'text-rose-500 font-bold';
                        } else if (log.status === 5 || log.status === 'Rejected') {
                          statusText = 'Rejected';
                          statusColor = 'text-rose-600 font-semibold';
                        } else {
                          statusText = isIncoming ? (isMissed ? 'Missed' : 'Answered') : 'Completed';
                          statusColor = isMissed ? 'text-rose-500 font-bold' : 'text-zinc-500';
                        }

                        return (
                          <div 
                            key={log.id || log.Id}
                            className="flex items-start justify-between p-4 border-b border-zinc-100 hover:bg-zinc-50 transition-colors gap-3"
                          >
                            <div className="flex items-start gap-3 flex-1 min-w-0">
                              <div className="w-10 h-10 rounded-full bg-zinc-100 flex items-center justify-center border border-zinc-200 text-zinc-700 font-extrabold relative overflow-hidden shrink-0 mt-0.5">
                                {chatImg ? (
                                  <img src={getImageUrl(chatImg)} alt={displayName} className="w-full h-full object-cover" />
                                ) : (
                                  displayName ? displayName.charAt(0).toUpperCase() : '?'
                                )}
                              </div>
                              <div className="min-w-0 flex-1">
                                <h4 className="font-bold text-sm text-zinc-800 truncate leading-snug">{displayName}</h4>
                                <div className="flex items-center gap-1 mt-0.5">
                                  {isIncoming ? (
                                    isMissed ? (
                                      <ArrowDownLeft size={14} className="text-rose-500 shrink-0" />
                                    ) : (
                                      <ArrowDownLeft size={14} className="text-emerald-500 shrink-0" />
                                    )
                                  ) : (
                                    <ArrowUpRight size={14} className="text-zinc-400 shrink-0" />
                                  )}
                                  <span className={`text-[10px] truncate ${statusColor}`}>
                                    {isIncoming ? 'Incoming' : 'Outgoing'} • {statusText}
                                    {` • ${formatCallDuration(log.duration || 0)}`}
                                    {formattedDate && ` • ${formattedDate}`}
                                  </span>
                                </div>

                                {/* Participant lists for Group calls or multi-participant logs */}
                                {log.participants && log.participants.length > 0 && (
                                  <div className="flex flex-wrap gap-1.5 mt-2">
                                    {log.participants.map((p: any, idx: number) => {
                                      const pId = p.personId || p.PersonId || p.id || p.Id;
                                      const personDetails = availablePersons.find(ap => Number(ap.id || ap.Id) === Number(pId));
                                      const pName = Number(pId) === Number(currentUserId) ? "You" : (personDetails?.name || personDetails?.Name || `User ${pId}`);
                                      const pStatus = p.status !== undefined ? p.status : p.Status;
                                      
                                      let badgeColor = "bg-zinc-50 text-zinc-500 border-zinc-100";
                                      let statusLabel = "Ringing";
                                      
                                      if (pStatus === 1 || pStatus === "Ringing") {
                                        statusLabel = "Ringing";
                                        badgeColor = "bg-amber-50/80 text-amber-600 border-amber-100/50";
                                      } else if (pStatus === 2 || pStatus === "Connected") {
                                        statusLabel = "Joined";
                                        badgeColor = "bg-emerald-50/80 text-emerald-600 border-emerald-100/50";
                                      } else if (pStatus === 3 || pStatus === "Ended") {
                                        statusLabel = "Ended";
                                        badgeColor = "bg-zinc-50 text-zinc-500 border-zinc-200/50";
                                      } else if (pStatus === 4 || pStatus === "Missed") {
                                        statusLabel = "Missed";
                                        badgeColor = "bg-orange-50/80 text-orange-600 border-orange-100/50";
                                      } else if (pStatus === 5 || pStatus === "Rejected") {
                                        statusLabel = "Declined";
                                        badgeColor = "bg-rose-50/80 text-rose-600 border-rose-100/50";
                                      }
                                      
                                      return (
                                        <span 
                                          key={pId || idx}
                                          className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded border ${badgeColor} flex items-center gap-1`}
                                        >
                                          <span className="max-w-[70px] truncate">{pName}</span>
                                          <span className="opacity-40">•</span>
                                          <span>{statusLabel}</span>
                                        </span>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            </div>
                            
                            {isOngoing && !isEnded && !isMissed ? (
                              <button
                                onClick={() => joinCallFromLog(log)}
                                className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white text-xs font-black uppercase tracking-wider rounded-full transition-all flex items-center gap-1 shadow-sm shrink-0 border border-emerald-600 animate-pulse"
                                title="Join active call"
                              >
                                <PhoneCall size={12} className="animate-bounce" />
                                <span>Join</span>
                              </button>
                            ) : (
                              <button
                                onClick={async () => {
                                  const foundChat = localChatList.find(c => String(c.id) === String(log.chatId || log.ChatId));
                                  if (foundChat) {
                                    setActiveChat(foundChat);
                                    handleTriggerStartCall(isVideo ? 2 : 1);
                                  } else {
                                    alert("Open the chat to call this user.");
                                  }
                                }}
                                className="p-2 bg-zinc-50 hover:bg-emerald-50 text-zinc-500 hover:text-emerald-600 rounded-full transition-all border border-zinc-200"
                                title="Call back"
                              >
                                {isVideo ? <Video size={16} /> : <Phone size={16} />}
                              </button>
                            )}
                          </div>
                        );
                      })}
                    {isCallLogsFetchingMore && (
                      <div className="flex items-center justify-center py-4 gap-2 text-zinc-400 border-b border-zinc-100">
                        <LoaderCircle className="animate-spin text-emerald-500" size={18} />
                        <span className="text-xs font-semibold">Loading more calls...</span>
                      </div>
                    )}
                  </>
                )
              ) : (
                isChatsLoading && !isRefreshing ? (
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
                                time: formatLastMessageTime(res.lastMessage?.sentAt || res.lastMessage?.SentAt, chat.time),
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
                          {formatLastMessageTime(chat.lastMessageSentAt, chat.time)}
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
              )
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
              <div className="flex items-center min-w-0 flex-1">
                <button 
                  onClick={() => setActiveChat(null)}
                  className="flex items-center p-2 text-zinc-500 hover:text-black hover:bg-zinc-50 rounded-full transition-all mr-2 shrink-0"
                >
                  <ChevronLeft size={20} />
                </button>
                
                {/* Clickable Header Name and Info container */}
                <div 
                  onClick={() => {
                    if (activeChat.isGroup) {
                      triggerHaptic('light');
                      setShowChatInfo(true);
                    }
                  }}
                  className={`flex items-center min-w-0 rounded-xl p-1 -ml-1 pr-3 transition-all ${
                    activeChat.isGroup ? 'cursor-pointer hover:opacity-80 active:scale-[0.98]' : ''
                  }`}
                  title={activeChat.isGroup ? "View Group Details" : undefined}
                >
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
                  <div className="min-w-0">
                    <h3 className="font-bold text-zinc-800 text-sm tracking-wide truncate">
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
                    {(() => {
                      if (!activeChat.isGroup) {
                        const partner = activeChat.participants?.find((p: any) => {
                          const pId = p.personId || p.PersonId || p.id || p.Id;
                          return Number(pId) !== Number(currentUserId);
                        });
                        const partnerId = partner?.personId || partner?.PersonId || partner?.id || partner?.Id;
                        const isOnline = partnerId && (onlineUsers.has(Number(partnerId)) || !!(partner?.isOnline ?? partner?.IsOnline));
                        return (
                          <p className={`text-[10px] ${isOnline ? 'text-green-600' : 'text-zinc-500'} font-bold uppercase tracking-wider flex items-center gap-1`}>
                            {isOnline && <span className="w-1.5 h-1.5 bg-green-500 rounded-full inline-block"></span>}
                            {isOnline ? "Online" : "Offline"}
                          </p>
                        );
                      } else {
                        return (
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
                        );
                      }
                    })()}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-2 shrink-0">
                {/* Call buttons */}
                <button
                  onClick={() => handleTriggerStartCall(1)}
                  className="p-2 text-zinc-500 hover:text-emerald-600 hover:bg-zinc-50 rounded-full transition-all flex items-center justify-center"
                  title="Voice Call"
                >
                  <Phone size={18} />
                </button>
                <button
                  onClick={() => handleTriggerStartCall(2)}
                  className="p-2 text-zinc-500 hover:text-emerald-600 hover:bg-zinc-50 rounded-full transition-all flex items-center justify-center"
                  title="Video Call"
                >
                  <Video size={18} />
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
                            
                            {!msg.isMe && activeChat.isGroup && (
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
                                    {msg.text && <p className={`text-xs pt-1 break-words font-medium whitespace-pre-wrap ${msg.isMe ? 'text-white' : 'text-zinc-800 dark:text-zinc-200'}`}>{msg.text}</p>}
                                  </div>
                                ) : (
                                  msg.type === 'text' && (
                                    <p className={`text-xs break-words font-medium whitespace-pre-wrap ${msg.isMe ? 'text-white' : 'text-zinc-800 dark:text-zinc-200'}`}>{msg.text}</p>
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
              {showChatInfo && activeChat && activeChat.isGroup && (
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

                    {/* Scrollable body content */}
                    <div className="flex-1 overflow-y-auto pr-1 flex flex-col min-h-0">
                      {/* Metadata summary with editable state */}
                      <div className="flex flex-col items-center py-4 text-center border-b pb-6 mb-4 w-full">
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
                      <div className="flex flex-col mt-4">
                        <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-3 flex items-center justify-between">
                          <span>Members ({activeChat.participants.length})</span>
                        </h4>

                        {isEditingGroupChat && (
                          <div className="flex flex-col gap-2 mb-6">
                              <h5 className="text-[10px] font-black uppercase text-zinc-400 border-b pb-1 mb-1">Available to Add</h5>
                              <div className="flex flex-col gap-2 p-1">
                                  {availablePersons.filter(person => !activeChat.participants.some(p => Number(p.personId || p.PersonId) === Number(person.id || person.Id))).map(person => {
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
                                              <div className="w-8 h-8 rounded-full bg-zinc-200 flex items-center justify-center font-bold text-xs text-zinc-700 overflow-hidden border border-zinc-300">
                                                  {person.imageUrl || person.ImageUrl || person.profileImageUrl || person.ProfileImageUrl ? (
                                                    <img src={getImageUrl(person.imageUrl || person.ImageUrl || person.profileImageUrl || person.ProfileImageUrl)} alt={pName} className="w-full h-full object-cover" />
                                                  ) : (
                                                    pName.charAt(0).toUpperCase()
                                                  )}
                                              </div>
                                              <span className="text-xs font-bold text-zinc-800">{pName}</span>
                                          </div>
                                          <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${isSelected ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-zinc-300 bg-white'}`}>
                                            {isSelected && <Check size={12} strokeWidth={3} />}
                                          </div>
                                      </div>
                                    );
                                  })}
                                  {availablePersons.filter(person => !activeChat.participants.some(p => Number(p.personId || p.PersonId) === Number(person.id || person.Id))).length === 0 && (
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
                                const personInfo = availablePersons.find(ap => Number(ap.id || ap.Id) === Number(pId));
                                const fName = personInfo?.name || personInfo?.Name || p.fullName || p.FullName || `User #${pId}`;
                                const pImg = personInfo?.imageUrl || personInfo?.ImageUrl || personInfo?.profileImageUrl || personInfo?.ProfileImageUrl || p.profileImageUrl || p.ProfileImageUrl || p.imageUrl || p.ImageUrl;
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
                    </div> {/* End of scrollable body content wrapper */}
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
                  <div className="grid grid-cols-1 gap-2 p-2 bg-zinc-50 border border-zinc-200 rounded-2xl">
                    {availablePersons.map(person => {
                      const personId = person.id || person.Id;
                      const isSelected = newGroupParticipants.includes(personId);
                      const pName = person.name || person.Name || "Unknown Person";
                      const pImg = person.imageUrl || person.ImageUrl || person.profileImageUrl || person.ProfileImageUrl;
                      
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
                  ...(overlayMsg.isMe ? { right: window.innerWidth - pressedMessageRect.right } : { left: pressedMessageRect.left }),
                  width: pressedMessageRect.width,
                  minHeight: pressedMessageRect.height,
                  margin: 0,
                  pointerEvents: 'none',
                  ...(overlayMsg.isMe ? { backgroundColor: chatThemeColor, borderColor: chatThemeColor, color: 'white' } : {})
                }}
                className={`p-2.5 rounded-md shadow-lg border max-w-[90%] inline-block ${
                  overlayMsg.isMe 
                    ? 'text-white' 
                    : 'bg-white border-zinc-200 dark:bg-[#1c1c1e] dark:border-[#1c1c1e] dark:text-zinc-200 shadow-md'
                } ${overlayMsg.isMe ? 'rounded-tr-none' : 'rounded-tl-none'} scale-100 z-[160] overflow-visible`}
              >
                {!overlayMsg.isMe && activeChat?.isGroup && (
                  <p className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 mb-1">{overlayMsg.senderName}</p>
                )}

                {overlayMsg.replyTo && (
                  <div className="mb-2 p-2 bg-black/5 dark:bg-white/5 border-l-4 border-emerald-500 rounded text-xs text-zinc-655 dark:text-zinc-300 truncate max-w-full">
                    {overlayMsg.replyTo.text}
                  </div>
                )}

                {overlayMsg.attachments && overlayMsg.attachments.length > 0 ? (
                  <div className="flex flex-col gap-2 max-w-sm">
                    {renderMsgAttachments(overlayMsg)}
                    {overlayMsg.text && <p className={`text-xs pt-1 break-words font-medium whitespace-pre-wrap ${overlayMsg.isMe ? 'text-white' : 'text-zinc-800 dark:text-zinc-200'}`}>{overlayMsg.text}</p>}
                  </div>
                ) : (
                  overlayMsg.type === 'text' && overlayMsg.text && (
                    <p className={`text-xs break-words font-medium whitespace-pre-wrap ${overlayMsg.isMe ? 'text-white' : 'text-zinc-800 dark:text-zinc-200'}`}>{overlayMsg.text}</p>
                  )
                )}
                                
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
        </>
      )}

      {/* Premium Full-Screen WhatsApp-style Calling Overlay */}
      <AnimatePresence>
        {callState !== 'idle' && activeCall && !isCallMinimized && (
          <motion.div
            initial={{ opacity: 0, scale: 1.05 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-0 z-[250] bg-zinc-950 text-white flex flex-col justify-between overflow-hidden select-none"
          >
            {/* Minimize button */}
            <button
              onClick={() => {
                triggerHaptic('light');
                setIsCallMinimized(true);
              }}
              className="absolute top-6 left-6 z-[260] p-2.5 bg-white/10 hover:bg-white/20 active:scale-95 text-white rounded-xl backdrop-blur-md transition-all border border-white/10 flex items-center justify-center cursor-pointer"
              title="Minimize Call"
            >
              <ChevronDown size={18} />
            </button>

            {/* Elegant dark calling backdrop gradient */}
            <div className="absolute inset-0 z-0 bg-gradient-to-b from-zinc-900/60 via-zinc-950 to-black pointer-events-none" />
            
            {/* Secure end-to-end encryption tag */}
            <div className="absolute top-6 left-0 right-0 flex justify-center z-10 pointer-events-none">
              <span className="bg-white/10 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest text-emerald-400 flex items-center gap-1.5 border border-white/5">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping"></span>
                End-To-End Encrypted
              </span>
            </div>

            {/* MAIN RINGING / CONNECTED CONTENT AREA */}
            <div className="flex-1 flex flex-col items-center justify-center pt-24 px-6 z-10">
              
              {/* Outgoing Call Ringing View */}
              {callState === 'ringing_outgoing' && (
                <div className="flex flex-col items-center text-center w-full">
                  {/* WhatsApp-style live video background if video call */}
                  {(activeCall.type === 2 || activeCall.Type === 2) && localStream && (
                    <div className="absolute inset-0 z-0 bg-black overflow-hidden rounded-3xl">
                      <video
                        ref={(el) => {
                          if (el && el.srcObject !== localStream) {
                            el.srcObject = localStream;
                          }
                        }}
                        autoPlay
                        playsInline
                        muted
                        className="w-full h-full object-cover scale-x-[-1] opacity-60"
                      />
                      <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/80" />
                    </div>
                  )}

                  <div className="relative mb-8 z-10">
                    <motion.div
                      animate={{ scale: [1, 1.3, 1] }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className="absolute inset-0 bg-emerald-500/20 rounded-full blur-xl"
                    />
                    <div className="w-32 h-32 bg-zinc-800 border-2 border-emerald-500 rounded-full flex items-center justify-center text-5xl font-black shadow-2xl overflow-hidden">
                      {(() => {
                        if (activeCall.isGroup || activeCall.IsGroup) {
                          const foundChat = localChatList.find(c => String(c.id) === String(activeCall.chatId || activeCall.ChatId));
                          const chatImg = foundChat?.imageUrl || foundChat?.ImageUrl || activeCall.imageUrl || activeCall.ImageUrl;
                          const displayName = foundChat?.name || activeCall.chatName || activeCall.ChatName || 'Secure Group';
                          return chatImg ? (
                            <img src={getImageUrl(chatImg)} alt={displayName} className="w-full h-full object-cover" />
                          ) : (
                            <Users size={48} className="text-emerald-400" />
                          );
                        } else {
                          const partner = activeCall.participants?.find((p: any) => {
                            const pId = p.personId || p.PersonId || p.id || p.Id;
                            return Number(pId) !== Number(currentUserId);
                          });
                          const partnerId = partner?.personId || partner?.PersonId || partner?.id || partner?.Id;
                          const personDetails = availablePersons.find(ap => Number(ap.id || ap.Id) === Number(partnerId));
                          const partnerImg = activeCall.imageUrl || activeCall.ImageUrl || partner?.profileImageUrl || partner?.ProfileImageUrl || personDetails?.imageUrl || personDetails?.ImageUrl;
                          const partnerName = personDetails?.name || personDetails?.Name || activeChat?.name || "Secure Contact";
                          return partnerImg ? (
                            <img src={getImageUrl(partnerImg)} alt={partnerName} className="w-full h-full object-cover" />
                          ) : (
                            partnerName.charAt(0).toUpperCase()
                          );
                        }
                      })()}
                    </div>
                  </div>
                  <h2 className="text-2xl font-black tracking-wide text-white drop-shadow-md">
                    {(() => {
                      if (activeCall.isGroup || activeCall.IsGroup) {
                        const foundChat = localChatList.find(c => String(c.id) === String(activeCall.chatId || activeCall.ChatId));
                        return foundChat?.name || activeCall.chatName || activeCall.ChatName || 'Secure Group';
                      } else {
                        const partner = activeCall.participants?.find((p: any) => {
                          const pId = p.personId || p.PersonId || p.id || p.Id;
                          return Number(pId) !== Number(currentUserId);
                        });
                        const partnerId = partner?.personId || partner?.PersonId || partner?.id || partner?.Id;
                        const personDetails = availablePersons.find(ap => Number(ap.id || ap.Id) === Number(partnerId));
                        return personDetails?.name || personDetails?.Name || activeChat?.name || "Secure Contact";
                      }
                    })()}
                  </h2>
                  <p className="text-zinc-400 font-bold uppercase tracking-wider text-xs mt-2 animate-pulse">Ringing secure line...</p>
                  
                  {/* WhatsApp-style Group Participants avatars layout on calling */}
                  {(activeCall.isGroup || activeCall.IsGroup) && (
                    <div className="mt-8 flex flex-col items-center gap-3">
                      <p className="text-xs text-zinc-400 font-bold uppercase tracking-wider">Group Call Participants</p>
                      <div className="flex -space-x-3 overflow-hidden p-1">
                        {(activeCall.participants || []).map((p: any) => {
                          const pId = p.personId || p.PersonId || p.id || p.Id;
                          if (Number(pId) === Number(currentUserId)) return null;
                          const personDetails = availablePersons.find(ap => Number(ap.id || ap.Id) === Number(pId));
                          const pName = personDetails?.name || personDetails?.Name || `User ${pId}`;
                          const pImg = personDetails?.imageUrl || personDetails?.ImageUrl || p.profileImageUrl || p.ProfileImageUrl;
                          return (
                            <div key={pId} className="w-10 h-10 rounded-full border-2 border-zinc-950 bg-zinc-800 flex items-center justify-center overflow-hidden font-bold text-xs" title={pName}>
                              {pImg ? (
                                <img src={getImageUrl(pImg)} alt={pName} className="w-full h-full object-cover" />
                              ) : (
                                pName.charAt(0).toUpperCase()
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Incoming Call Ringing View */}
              {callState === 'ringing_incoming' && (
                <div className="flex flex-col items-center text-center">
                  <div className="relative mb-8">
                    <motion.div
                      animate={{ scale: [1, 1.4, 1] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                      className="absolute inset-0 bg-indigo-500/30 rounded-full blur-2xl"
                    />
                    <div className="w-32 h-32 bg-zinc-800 border-2 border-indigo-500 rounded-full flex items-center justify-center text-5xl font-black shadow-2xl overflow-hidden">
                      {(() => {
                        if (activeCall.isGroup || activeCall.IsGroup) {
                          // Group call avatar
                          const foundChat = localChatList.find(c => String(c.id) === String(activeCall.chatId || activeCall.ChatId));
                          const chatImg = foundChat?.imageUrl || foundChat?.ImageUrl || activeCall.imageUrl || activeCall.ImageUrl;
                          const displayName = foundChat?.name || activeCall.chatName || activeCall.ChatName || 'Secure Group';
                          return chatImg ? (
                            <img src={getImageUrl(chatImg)} alt={displayName} className="w-full h-full object-cover" />
                          ) : (
                            <Users size={48} className="text-indigo-400" />
                          );
                        } else {
                          // Direct call avatar
                          const partner = activeCall.participants?.find((p: any) => {
                            const pId = p.personId || p.PersonId || p.id || p.Id;
                            return Number(pId) !== Number(currentUserId);
                          });
                          const partnerId = partner?.personId || partner?.PersonId || partner?.id || partner?.Id;
                          const personDetails = availablePersons.find(ap => Number(ap.id || ap.Id) === Number(partnerId));
                          const partnerImg = activeCall.imageUrl || activeCall.ImageUrl || partner?.profileImageUrl || partner?.ProfileImageUrl || personDetails?.imageUrl || personDetails?.ImageUrl;
                          const partnerName = personDetails?.name || personDetails?.Name || activeChat?.name || "Secure Contact";
                          return partnerImg ? (
                            <img src={getImageUrl(partnerImg)} alt={partnerName} className="w-full h-full object-cover" />
                          ) : (
                            partnerName.charAt(0).toUpperCase()
                          );
                        }
                      })()}
                    </div>
                  </div>
                  <h2 className="text-2xl font-black tracking-wide text-white drop-shadow-md">
                    {(() => {
                      if (activeCall.isGroup || activeCall.IsGroup) {
                        const foundChat = localChatList.find(c => String(c.id) === String(activeCall.chatId || activeCall.ChatId));
                        return foundChat?.name || activeCall.chatName || activeCall.ChatName || 'Secure Group';
                      } else {
                        const partner = activeCall.participants?.find((p: any) => {
                          const pId = p.personId || p.PersonId || p.id || p.Id;
                          return Number(pId) !== Number(currentUserId);
                        });
                        const partnerId = partner?.personId || partner?.PersonId || partner?.id || partner?.Id;
                        const personDetails = availablePersons.find(ap => Number(ap.id || ap.Id) === Number(partnerId));
                        return personDetails?.name || personDetails?.Name || activeChat?.name || "Secure Contact";
                      }
                    })()}
                  </h2>
                  
                  {/* Subtitle with caller name for group calls */}
                  {(activeCall.isGroup || activeCall.IsGroup) && (
                    <p className="text-zinc-400 text-sm mt-1 font-semibold">
                      Started by {(() => {
                        const callerId = activeCall.callerPersonId || activeCall.CallerPersonId;
                        const callerDetails = availablePersons.find(ap => Number(ap.id || ap.Id) === Number(callerId));
                        return callerDetails?.name || callerDetails?.Name || activeCall.callerName || activeCall.CallerName || "a participant";
                      })()}
                    </p>
                  )}
                  <p className="text-indigo-400 font-black uppercase tracking-widest text-[10px] mt-2.5 flex items-center gap-2 justify-center">
                    <Phone className="animate-bounce animate-duration-1000" size={12} />
                    Incoming {activeCall.type === 2 || activeCall.Type === 2 ? 'Secure Video' : 'Secure Voice'} Call
                  </p>
                  
                  {/* WhatsApp-style Group Participants avatars layout on incoming */}
                  {(activeCall.isGroup || activeCall.IsGroup) && (
                    <div className="mt-8 flex flex-col items-center gap-3">
                      <p className="text-xs text-zinc-400 font-bold uppercase tracking-wider">Group Call Participants</p>
                      <div className="flex -space-x-3 overflow-hidden p-1">
                        {(activeCall.participants || []).map((p: any) => {
                          const pId = p.personId || p.PersonId || p.id || p.Id;
                          if (Number(pId) === Number(currentUserId)) return null;
                          const personDetails = availablePersons.find(ap => Number(ap.id || ap.Id) === Number(pId));
                          const pName = personDetails?.name || personDetails?.Name || `User ${pId}`;
                          const pImg = personDetails?.imageUrl || personDetails?.ImageUrl || p.profileImageUrl || p.ProfileImageUrl;
                          return (
                            <div key={pId} className="w-10 h-10 rounded-full border-2 border-zinc-950 bg-zinc-800 flex items-center justify-center overflow-hidden font-bold text-xs" title={pName}>
                              {pImg ? (
                                <img src={getImageUrl(pImg)} alt={pName} className="w-full h-full object-cover" />
                              ) : (
                                pName.charAt(0).toUpperCase()
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Connected Call View */}
              {callState === 'connected' && (
                <div className="w-full h-full flex flex-col items-center justify-between relative">
                  
                  {/* Video Streams Container */}
                  {(activeCall.type === 2 || activeCall.Type === 2) ? (
                    <div className="w-full h-full absolute inset-0 z-0 bg-black flex items-center justify-center overflow-hidden rounded-3xl">
                      {/* Direct Video Call Header - Fully transparent, caller image, bolder name, timer right below */}
                      {!activeCall.isGroup && !activeCall.IsGroup && (() => {
                        const partner = activeCall.participants?.find((p: any) => {
                          const pId = p.personId || p.PersonId || p.id || p.Id;
                          return Number(pId) !== Number(currentUserId);
                        });
                        const partnerId = partner?.personId || partner?.PersonId || partner?.id || partner?.Id;
                        const personDetails = availablePersons.find(ap => Number(ap.id || ap.Id) === Number(partnerId));
                        const partnerImg = activeCall.imageUrl || activeCall.ImageUrl || partner?.profileImageUrl || partner?.ProfileImageUrl || personDetails?.imageUrl || personDetails?.ImageUrl;
                        const partnerName = personDetails?.name || personDetails?.Name || activeChat?.name || "Secure Contact";
                        const partnerSharing = partner ? (partner.isSharing !== undefined ? partner.isSharing : (partner.IsSharing !== undefined ? partner.IsSharing : false)) : false;
                        
                        return (
                          <div className="absolute top-16 left-6 right-6 z-20 flex items-center justify-between pointer-events-none select-none">
                            <div className="flex items-center gap-3 bg-transparent border-none pointer-events-auto">
                              {partnerImg ? (
                                <img src={getImageUrl(partnerImg)} alt={partnerName} className="w-11 h-11 rounded-full object-cover border border-zinc-700/50 shadow-lg" />
                              ) : (
                                <div className="w-11 h-11 rounded-full bg-zinc-800 border border-zinc-700/50 flex items-center justify-center font-black text-white text-base shadow-lg">
                                  {partnerName.charAt(0).toUpperCase()}
                                </div>
                              )}
                              <div className="flex flex-col items-start bg-transparent text-left">
                                <h2 className="text-sm font-black text-white leading-tight drop-shadow-md tracking-tight">
                                  {partnerName}
                                </h2>
                                <span className="text-zinc-300 font-mono text-[10px] mt-0.5 leading-none drop-shadow-sm font-bold">
                                  {formatCallDuration(callDuration)}
                                </span>
                              </div>
                            </div>

                            {partnerSharing && (
                              <div className="bg-emerald-500/85 backdrop-blur-md text-white px-2.5 py-1 rounded-md border border-emerald-400/50 flex items-center gap-1.5 shadow-[0_0_15px_rgba(16,185,129,0.4)] pointer-events-auto">
                                <Monitor size={10} className="animate-pulse text-white" />
                                <span className="text-[9px] font-black uppercase tracking-wider">Sharing Screen</span>
                              </div>
                            )}
                          </div>
                        );
                      })()}
                      {activeCall.isGroup || activeCall.IsGroup ? (
                        <div className="w-full h-full flex flex-col pt-16 pb-20">
                          {/* Group Name Header - Fully transparent, group image, bolder name, timer right below */}
                          <div className="text-center py-4 px-4 bg-transparent border-none flex flex-col items-center shrink-0 z-10">
                            <div className="w-14 h-14 bg-zinc-800 border border-zinc-700/50 rounded-full flex items-center justify-center shadow-lg overflow-hidden mb-1.5">
                              {(() => {
                                const chatRoom = localChatList.find(c => Number(c.id) === Number(activeCall.chatId || activeCall.ChatId));
                                const chatImg = chatRoom?.imageUrl || chatRoom?.ImageUrl || activeCall.imageUrl || activeCall.ImageUrl;
                                const displayName = chatRoom?.name || chatRoom?.Name || activeCall.groupName || activeCall.GroupName || "Secure Group Call";
                                return chatImg ? (
                                  <img src={getImageUrl(chatImg)} alt={displayName} className="w-full h-full object-cover" />
                                ) : (
                                  <Users size={24} className="text-indigo-400" />
                                );
                              })()}
                            </div>
                            <h2 className="text-sm font-black text-white truncate max-w-xs mt-0.5">
                              {(() => {
                                const chatRoom = localChatList.find(c => Number(c.id) === Number(activeCall.chatId || activeCall.ChatId));
                                return chatRoom?.name || chatRoom?.Name || activeCall.groupName || activeCall.GroupName || "Secure Group Call";
                              })()}
                            </h2>
                            <span className="text-zinc-300 font-mono text-xs mt-1 font-bold">
                              {formatCallDuration(callDuration)}
                            </span>
                          </div>
                          
                          <div className="flex-1 grid grid-cols-2 gap-2 p-2 overflow-y-auto">
                            {(activeCall.participants || []).filter((p: any) => {
                              const pId = Number(p.personId || p.PersonId || p.id || p.Id);
                              const pStatus = p.status !== undefined ? p.status : p.Status;
                              return Number(pId) === Number(currentUserId) || pStatus === 1 || pStatus === "Connected";
                            }).map((p: any) => {
                              const pId = Number(p.personId || p.PersonId || p.id || p.Id);
                              if (pId === Number(currentUserId)) return null; // We are in Picture-in-Picture
                              const personDetails = availablePersons.find(ap => Number(ap.id || ap.Id) === pId);
                              const pName = personDetails?.name || personDetails?.Name || `User ${pId}`;
                              const rStream = remoteStreams[pId];
                              const pImg = personDetails?.imageUrl || personDetails?.ImageUrl || p.profileImageUrl || p.ProfileImageUrl;
                              const pStatus = p.status !== undefined ? p.status : p.Status;
                              const isParticipantMuted = p.isMuted !== undefined ? p.isMuted : p.IsMuted;
                              const isParticipantCameraEnabled = p.isCameraEnabled !== undefined ? p.isCameraEnabled : (p.IsCameraEnabled !== undefined ? p.IsCameraEnabled : true);
                              const isParticipantSharing = p.isSharing !== undefined ? p.isSharing : (p.IsSharing !== undefined ? p.IsSharing : false);
                              const showVideo = rStream && isParticipantCameraEnabled;

                              return (
                                <div key={pId} className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden relative flex items-center justify-center min-h-[140px]">
                                  {/* Screen Share Indicator Overlay */}
                                  {isParticipantSharing && (
                                    <div className="absolute top-2 left-2 z-10 bg-emerald-500/80 backdrop-blur-md text-white px-1.5 py-1 rounded-md border border-emerald-400/50 flex items-center gap-1">
                                      <Monitor size={10} className="animate-pulse text-white" />
                                      <span className="text-[8px] font-black uppercase tracking-wider">Sharing</span>
                                    </div>
                                  )}
                                  {showVideo ? (
                                    <video
                                      ref={(el) => {
                                        if (el && el.srcObject !== rStream) {
                                          el.srcObject = rStream;
                                        }
                                      }}
                                      autoPlay
                                      playsInline
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    <div className="flex flex-col items-center text-center text-zinc-500 gap-2 p-4">
                                      <div className="w-12 h-12 bg-zinc-800 border border-zinc-700 rounded-full flex items-center justify-center text-lg font-black overflow-hidden mb-1">
                                        {pImg ? (
                                          <img src={getImageUrl(pImg)} alt={pName} className="w-full h-full object-cover" />
                                        ) : (
                                          pName.charAt(0).toUpperCase()
                                        )}
                                      </div>
                                      <p className="text-[10px] font-bold text-white truncate max-w-[120px]">{pName}</p>
                                      <span className="text-[8px] uppercase tracking-widest text-zinc-400 font-bold">
                                        {!isParticipantCameraEnabled ? "Camera Off" : (pStatus === 0 || pStatus === "Ringing" ? "Calling..." : pStatus === 1 || pStatus === "Connected" ? "Connecting video..." : "Offline")}
                                      </span>
                                    </div>
                                  )}
                                  
                                  {/* Mic Status Indicator Overlay */}
                                  <div className="absolute top-2 right-2 z-10 bg-black/60 px-1.5 py-1 rounded-md border border-white/10 flex items-center gap-1.5">
                                    {isParticipantMuted ? (
                                      <>
                                        <MicOff size={10} className="text-rose-400" />
                                        <span className="text-[8px] font-black uppercase text-rose-400 tracking-wider">Mute</span>
                                      </>
                                    ) : (
                                      <>
                                        <Mic size={10} className="text-emerald-400" />
                                        {/* Mini wave animation */}
                                        <div className="flex gap-0.5 items-end h-2.5">
                                          {[1, 2, 3].map((idx) => {
                                            let hVal = 2;
                                            if (Number(pId) === Number(currentUserId)) {
                                              const val = audioAnalyserData[idx % audioAnalyserData.length] || 15;
                                              hVal = Math.max(2, Math.min(10, val / 6));
                                            } else {
                                              const levels = remoteAudioLevels[pId];
                                              hVal = levels ? (levels[(idx - 1) % levels.length] / 1.6 || 2) : 2;
                                            }
                                            return (
                                              <motion.div
                                                key={idx}
                                                className="w-0.5 bg-emerald-400 rounded-full"
                                                animate={{
                                                  height: [2, hVal, 2],
                                                }}
                                                transition={{
                                                  duration: 0.15,
                                                  ease: "easeInOut"
                                                }}
                                                style={{ height: 2 }}
                                              />
                                            );
                                          })}
                                        </div>
                                      </>
                                    )}
                                  </div>

                                  <span className="absolute bottom-2 left-2 bg-black/60 px-2 py-0.5 rounded text-[8px] font-bold text-white tracking-wide">
                                    {pName}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ) : (
                        /* Remote Video Feed */
                        (() => {
                          const partner = activeCall.participants?.find((p: any) => {
                            const pId = p.personId || p.PersonId || p.id || p.Id;
                            return Number(pId) !== Number(currentUserId);
                          });
                          const partnerId = partner?.personId || partner?.PersonId || partner?.id || partner?.Id || 0;
                          const personDetails = availablePersons.find(ap => Number(ap.id || ap.Id) === Number(partnerId));
                          const pName = personDetails?.name || personDetails?.Name || "Secure Contact";
                          const pImg = personDetails?.imageUrl || personDetails?.ImageUrl || partner?.profileImageUrl || partner?.ProfileImageUrl;
                          const rStream = remoteStreams[Number(partnerId)];
                          const isParticipantCameraEnabled = partner ? (partner.isCameraEnabled !== undefined ? partner.isCameraEnabled : (partner.IsCameraEnabled !== undefined ? partner.IsCameraEnabled : true)) : true;
                          const showVideo = rStream && isParticipantCameraEnabled;
                          const pStatus = partner ? (partner.status !== undefined ? partner.status : partner.Status) : 1;
                          
                          return showVideo ? (
                            <video
                              ref={(el) => {
                                if (el && el.srcObject !== rStream) {
                                  el.srcObject = rStream;
                                }
                              }}
                              autoPlay
                              playsInline
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="flex flex-col items-center text-center text-zinc-500 gap-4">
                              <div className="w-20 h-20 bg-zinc-800 border-2 border-emerald-500/30 rounded-full flex items-center justify-center text-4xl font-black overflow-hidden shadow-2xl">
                                {pImg ? (
                                  <img src={getImageUrl(pImg)} alt={pName} className="w-full h-full object-cover" />
                                ) : (
                                  pName.charAt(0).toUpperCase()
                                )}
                              </div>
                              <div className="flex flex-col gap-1">
                                <p className="text-sm font-black text-white">{pName}</p>
                                <span className="text-[10px] uppercase tracking-widest text-zinc-400 font-bold flex items-center justify-center gap-2">
                                  {!isParticipantCameraEnabled ? (
                                    "Camera Disabled"
                                  ) : (
                                    <>
                                      <LoaderCircle className="animate-spin text-emerald-500" size={12} />
                                      {pStatus === 0 || pStatus === "Ringing" ? "Calling..." : "Connecting stream..."}
                                    </>
                                  )}
                                </span>
                              </div>
                            </div>
                          );
                        })()
                      )}

                    </div>
                  ) : (
                    /* Voice Call Layout: Multiple Users Card Grid */
                    <div className="w-full max-w-md flex flex-col items-center justify-center gap-8 py-10 my-auto">
                      {activeCall.isGroup || activeCall.IsGroup ? (
                        <div className="w-full px-4 flex flex-col items-center gap-6">
                          <div className="text-center flex flex-col items-center gap-2 bg-transparent border-none">
                            <div className="w-16 h-16 bg-zinc-800 border border-zinc-700/50 rounded-full flex items-center justify-center shadow-lg overflow-hidden relative mb-1">
                              {(() => {
                                const chatRoom = localChatList.find(c => Number(c.id) === Number(activeCall.chatId || activeCall.ChatId));
                                const chatImg = chatRoom?.imageUrl || chatRoom?.ImageUrl || activeCall.imageUrl || activeCall.ImageUrl;
                                const displayName = chatRoom?.name || chatRoom?.Name || activeCall.groupName || activeCall.GroupName || "Secure Group Call";
                                return chatImg ? (
                                  <img src={getImageUrl(chatImg)} alt={displayName} className="w-full h-full object-cover" />
                                ) : (
                                  <Users size={28} className="text-indigo-400" />
                                );
                              })()}
                            </div>
                            <h2 className="text-xl font-black text-white tracking-tight">
                              {(() => {
                                const chatRoom = localChatList.find(c => Number(c.id) === Number(activeCall.chatId || activeCall.ChatId));
                                return chatRoom?.name || chatRoom?.Name || activeCall.groupName || activeCall.GroupName || "Secure Group Call";
                              })()}
                            </h2>
                            <span className="text-zinc-300 font-mono text-xs font-bold mt-0.5">
                              {formatCallDuration(callDuration)}
                            </span>
                          </div>

                          <div className="w-full grid grid-cols-2 gap-3.5 max-h-[360px] overflow-y-auto pr-1">
                            {(activeCall.participants || []).filter((p: any) => {
                              const pId = Number(p.personId || p.PersonId || p.id || p.Id);
                              const pStatus = p.status !== undefined ? p.status : p.Status;
                              return pId === Number(currentUserId) || pStatus === 1 || pStatus === "Connected";
                            }).map((p: any) => {
                              const pId = p.personId || p.PersonId || p.id || p.Id;
                              const personDetails = availablePersons.find(ap => Number(ap.id || ap.Id) === Number(pId));
                              const pName = Number(pId) === Number(currentUserId) ? "You" : (personDetails?.name || personDetails?.Name || `User ${pId}`);
                              const pImg = personDetails?.imageUrl || personDetails?.ImageUrl || p.profileImageUrl || p.ProfileImageUrl;
                              const pStatus = p.status !== undefined ? p.status : p.Status;
                              
                              let statusText = "Ringing";
                              let statusColor = "bg-amber-500/10 text-amber-400 border-amber-500/20";
                              
                              if (pStatus === 0 || pStatus === "Ringing") {
                                statusText = "Calling";
                                statusColor = "bg-amber-500/10 text-amber-400 border-amber-500/20";
                              } else if (pStatus === 1 || pStatus === "Connected") {
                                statusText = "Joined";
                                statusColor = "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
                              } else if (pStatus === 2 || pStatus === "Declined" || pStatus === "Rejected") {
                                statusText = "Declined";
                                statusColor = "bg-rose-500/10 text-rose-400 border-rose-500/20";
                              } else if (pStatus === 3 || pStatus === "Left") {
                                statusText = "Left";
                                statusColor = "bg-zinc-500/10 text-zinc-400 border-zinc-500/20";
                              } else if (pStatus === 4 || pStatus === "Missed") {
                                statusText = "Missed";
                                statusColor = "bg-orange-500/10 text-orange-400 border-orange-500/20";
                              }

                              const isParticipantMuted = Number(pId) === Number(currentUserId) 
                                ? isMuted 
                                : (p.isMuted !== undefined ? p.isMuted : p.IsMuted);

                              const isParticipantSharing = Number(pId) === Number(currentUserId)
                                ? isScreenSharing
                                : (p.isSharing !== undefined ? p.isSharing : (p.IsSharing !== undefined ? p.IsSharing : false));

                              return (
                                <motion.div 
                                  key={pId}
                                  className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-3.5 flex flex-col items-center text-center gap-2.5 relative overflow-hidden backdrop-blur-md"
                                  whileHover={{ scale: 1.02 }}
                                >
                                  {/* Screen Share Status Overlay */}
                                  {isParticipantSharing && (
                                    <div className="absolute top-2 left-2 z-10">
                                      <span className="p-1 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 flex items-center justify-center animate-bounce" title="Sharing Screen">
                                        <Monitor size={10} />
                                      </span>
                                    </div>
                                  )}

                                  {/* Microphone Status Icon Overlay */}
                                  <div className="absolute top-2 right-2 z-10">
                                    {isParticipantMuted ? (
                                      <span className="p-1 rounded-full bg-rose-500/20 border border-rose-500/30 text-rose-400 flex items-center justify-center" title="Muted">
                                        <MicOff size={10} />
                                      </span>
                                    ) : (
                                      <span className="p-1 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 flex items-center justify-center animate-pulse" title="Active">
                                        <Mic size={10} />
                                      </span>
                                    )}
                                  </div>

                                  <div className="w-14 h-14 bg-zinc-800 border border-zinc-700 rounded-full flex items-center justify-center text-lg font-black overflow-hidden relative">
                                    {pImg ? (
                                      <img src={getImageUrl(pImg)} alt={pName} className="w-full h-full object-cover" />
                                    ) : (
                                      pName.charAt(0).toUpperCase()
                                    )}
                                    {(pStatus === 1 || pStatus === "Connected") && (
                                      <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-zinc-900 rounded-full animate-pulse" />
                                    )}
                                  </div>
                                  
                                  <div className="min-w-0 w-full">
                                    <p className="text-xs font-bold text-white truncate leading-tight">{pName}</p>
                                    <span className={`inline-block text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border ${statusColor} mt-1`}>
                                      {statusText}
                                    </span>
                                  </div>

                                  {/* Audio Wave Animation */}
                                  {isParticipantMuted ? (
                                    <div className="flex gap-0.5 items-center justify-center h-4 mt-1 opacity-40">
                                      <span className="text-[9px] uppercase tracking-wider font-extrabold text-rose-400">Muted</span>
                                    </div>
                                  ) : (
                                    <div className="flex gap-0.5 items-end justify-center h-4 mt-1">
                                      {[1, 2, 3, 4, 5].map((idx) => {
                                        let hVal = 4;
                                        if (Number(pId) === Number(currentUserId)) {
                                          const val = audioAnalyserData[idx % audioAnalyserData.length] || 15;
                                          hVal = Math.max(4, Math.min(16, val / 4));
                                        } else {
                                          const levels = remoteAudioLevels[pId];
                                          hVal = levels ? (levels[(idx - 1) % levels.length] || 4) : 4;
                                        }
                                        return (
                                          <motion.div
                                            key={idx}
                                            className="w-0.75 bg-emerald-400 rounded-full"
                                            animate={{
                                              height: [4, hVal, 4],
                                            }}
                                            transition={{
                                              duration: 0.15,
                                              ease: "easeInOut"
                                            }}
                                            style={{ height: 4 }}
                                          />
                                        );
                                      })}
                                    </div>
                                  )}
                                </motion.div>
                              );
                            })}
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center">
                          <div className="relative mb-6">
                            {/* Animated rings reflecting talking activity */}
                            <motion.div
                              animate={{ scale: [1, 1.25, 1], opacity: [0.4, 0.1, 0.4] }}
                              transition={{ duration: 2, repeat: Infinity }}
                              className="absolute inset-0 bg-emerald-500/20 rounded-full"
                            />
                            <motion.div
                              animate={{ scale: [1, 1.45, 1], opacity: [0.3, 0.05, 0.3] }}
                              transition={{ duration: 2, delay: 0.5, repeat: Infinity }}
                              className="absolute inset-0 bg-emerald-500/10 rounded-full"
                            />
                            <div className="w-28 h-28 bg-zinc-800 border border-emerald-500 rounded-full flex items-center justify-center text-4xl font-black shadow-2xl overflow-hidden">
                              {(() => {
                                const partner = activeCall.participants?.find((p: any) => {
                                  const pId = p.personId || p.PersonId || p.id || p.Id;
                                  return Number(pId) !== Number(currentUserId);
                                });
                                const partnerId = partner?.personId || partner?.PersonId || partner?.id || partner?.Id;
                                const personDetails = availablePersons.find(ap => Number(ap.id || ap.Id) === Number(partnerId));
                                const partnerImg = activeCall.imageUrl || activeCall.ImageUrl || partner?.profileImageUrl || partner?.ProfileImageUrl || personDetails?.imageUrl || personDetails?.ImageUrl;
                                const partnerName = personDetails?.name || personDetails?.Name || activeChat?.name || "Secure Contact";
                                return partnerImg ? (
                                  <img src={getImageUrl(partnerImg)} alt={partnerName} className="w-full h-full object-cover" />
                                ) : (
                                  partnerName.charAt(0).toUpperCase()
                                );
                              })()}
                            </div>
                          </div>
                          <h2 className="text-xl font-extrabold tracking-wide text-white">
                            {(() => {
                              const partner = activeCall.participants?.find((p: any) => {
                                const pId = p.personId || p.PersonId || p.id || p.Id;
                                return Number(pId) !== Number(currentUserId);
                              });
                              const partnerId = partner?.personId || partner?.PersonId || partner?.id || partner?.Id;
                              const personDetails = availablePersons.find(ap => Number(ap.id || ap.Id) === Number(partnerId));
                              return personDetails?.name || personDetails?.Name || activeChat?.name || "Secure Contact";
                            })()}
                          </h2>

                          {/* Screen share badge for direct voice call */}
                          {(() => {
                            const partner = activeCall.participants?.find((p: any) => {
                              const pId = p.personId || p.PersonId || p.id || p.Id;
                              return Number(pId) !== Number(currentUserId);
                            });
                            const isPartnerSharing = partner ? (partner.isSharing !== undefined ? partner.isSharing : (partner.IsSharing !== undefined ? partner.IsSharing : false)) : false;
                            if (isPartnerSharing) {
                              return (
                                <span className="mt-2.5 inline-flex items-center gap-1.5 bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.2)]">
                                  <Monitor size={11} />
                                  Sharing Screen
                                </span>
                              );
                            }
                            return null;
                          })()}
                          
                          {/* Elegant duration timer */}
                          <span className="text-zinc-400 font-mono text-sm mt-1">
                            {formatCallDuration(callDuration)}
                          </span>

                          {/* Animated Audio Flex Bar Waves */}
                          <div className="flex items-end gap-1.5 h-10 justify-center mt-6">
                            {[1, 2, 3, 4, 5, 6, 7, 8].map((bar) => (
                              <motion.div
                                key={bar}
                                className="w-1 bg-emerald-500 rounded-full"
                                animate={{
                                  height: [10, 36, 14, 42, 10][bar % 5],
                                }}
                                transition={{
                                  duration: 0.6 + (bar * 0.1) % 0.4,
                                  repeat: Infinity,
                                  repeatType: "reverse",
                                  ease: "easeInOut",
                                }}
                              />
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Hidden audio players for all remote streams to ensure voice audio plays during voice calls */}
                  {Object.entries(remoteStreams).map(([pIdStr, stream]) => {
                    const pId = Number(pIdStr);
                    if (pId === Number(currentUserId)) return null;
                    return (
                      <audio
                        key={pId}
                        ref={(el) => {
                          if (el) {
                            if (el.srcObject !== stream) {
                              el.srcObject = stream;
                            }
                            el.muted = isSpeakerMuted;
                          }
                        }}
                        autoPlay
                        playsInline
                      />
                    );
                  })}

                  {/* Local Video Picture-in-Picture */}
                  {isCameraEnabled && localStream && (activeCall.type === 2 || activeCall.Type === 2) && (
                    <motion.div
                      drag
                      dragConstraints={{ left: -150, right: 150, top: -250, bottom: 250 }}
                      className="absolute top-20 right-4 w-32 h-44 bg-zinc-900 border-2 border-white/20 rounded-xl shadow-2xl overflow-hidden z-[200] cursor-grab active:cursor-grabbing"
                    >
                      <video
                        ref={(el) => {
                          localVideoRef.current = el;
                          if (el && el.srcObject !== localStream) {
                            el.srcObject = localStream;
                          }
                        }}
                        autoPlay
                        playsInline
                        muted
                        className="w-full h-full object-cover scale-x-[-1]"
                      />
                      <span className="absolute bottom-1.5 left-1.5 bg-black/60 px-1.5 py-0.5 rounded text-[8px] font-bold text-white tracking-wide">
                        You
                      </span>
                    </motion.div>
                  )}

                </div>
              )}

            </div>

            {/* CONTROLS OVERLAY AREA */}
            <div className="p-10 pb-16 flex flex-col items-center gap-6 z-10 bg-gradient-to-t from-black/90 via-black/40 to-transparent">
              
              <div className="flex items-center gap-6 justify-center">
                
                {/* Outgoing Ringing controls */}
                {callState === 'ringing_outgoing' && (
                  <>
                    {/* Speaker simulation */}
                    <button
                      onClick={() => {
                        const nextVal = !isSpeakerMuted;
                        setIsSpeakerMuted(nextVal);
                        triggerToast(nextVal ? "Call Volume Muted" : "Speaker Volume Unmuted");
                      }}
                      className={`p-4 rounded-full transition-all border border-zinc-700/50 ${isSpeakerMuted ? 'bg-zinc-600 text-white' : 'bg-zinc-800 hover:bg-zinc-700 text-white'}`}
                      title={isSpeakerMuted ? "Unmute Speaker" : "Mute Speaker"}
                    >
                      {isSpeakerMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
                    </button>
                    {/* End Call / Cancel */}
                    <button
                      onClick={handleEndCall}
                      className="p-5 bg-rose-600 hover:bg-rose-700 text-white rounded-full shadow-2xl transition-all border border-rose-500 transform hover:scale-105 active:scale-95"
                    >
                      <Phone size={24} className="rotate-[135deg]" />
                    </button>
                    {/* Mic mute */}
                    <button
                      onClick={handleToggleMic}
                      className={`p-4 rounded-full transition-all border border-zinc-700/50 ${isMuted ? 'bg-zinc-600 text-white' : 'bg-zinc-800 hover:bg-zinc-700 text-white'}`}
                    >
                      {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
                    </button>
                  </>
                )}

                {/* Incoming Ringing controls */}
                {callState === 'ringing_incoming' && (
                  <div className="flex gap-12">
                    {/* Reject button */}
                    <button
                      onClick={handleRejectCall}
                      className="flex flex-col items-center gap-2"
                    >
                      <div className="p-5 bg-rose-600 hover:bg-rose-700 text-white rounded-full shadow-2xl transition-all border border-rose-500 transform hover:scale-105 active:scale-95">
                        <Phone size={24} className="rotate-[135deg]" />
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-widest text-rose-500">Decline</span>
                    </button>

                    {/* Accept button */}
                    {Number(activeCall?.callerPersonId || activeCall?.CallerPersonId) !== Number(currentUserId) && (
                      <button
                        onClick={handleAcceptCall}
                        className="flex flex-col items-center gap-2"
                      >
                        <div className="p-5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full shadow-2xl transition-all border border-emerald-400 transform hover:scale-110 active:scale-95 animate-bounce">
                          <Phone size={24} />
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Accept</span>
                      </button>
                    )}
                  </div>
                )}

                {/* Connected active controls */}
                {callState === 'connected' && (
                  <>
                    {/* Toggle Camera */}
                    {(activeCall.type === 2 || activeCall.Type === 2) && (
                      <button
                        onClick={handleToggleCamera}
                        className={`p-4 rounded-full transition-all border border-zinc-700/50 ${isCameraEnabled ? 'bg-zinc-800 hover:bg-zinc-700 text-white' : 'bg-zinc-600 text-white'}`}
                        title={isCameraEnabled ? 'Disable Camera' : 'Enable Camera'}
                      >
                        {isCameraEnabled ? <Video size={20} /> : <VideoOff size={20} />}
                      </button>
                    )}

                    {/* Toggle Microphone */}
                    <button
                      onClick={handleToggleMic}
                      className={`p-4 rounded-full transition-all border border-zinc-700/50 ${isMuted ? 'bg-rose-600 text-white border-rose-500 shadow-[0_0_15px_rgba(225,29,72,0.3)]' : 'bg-zinc-800 hover:bg-zinc-700 text-white'}`}
                      title={isMuted ? 'Unmute Mic' : 'Mute Mic'}
                    >
                      {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
                    </button>

                    {/* Toggle Screen Share */}
                    <button
                      onClick={handleToggleScreenShare}
                      className={`p-4 rounded-full transition-all border border-zinc-700/50 ${isScreenSharing ? 'bg-emerald-600 border-emerald-500 text-white shadow-[0_0_15px_rgba(16,185,129,0.3)]' : 'bg-zinc-800 hover:bg-zinc-700 text-white'}`}
                      title={isScreenSharing ? 'Stop Presenting' : 'Present Screen'}
                    >
                      <Monitor size={20} className={isScreenSharing ? "animate-pulse" : ""} />
                    </button>

                    {/* End Call / Leave Call */}
                    {(() => {
                      const initiatorId = Number(activeCall.callerPersonId || activeCall.CallerPersonId);
                      const isInitiator = initiatorId === Number(currentUserId);
                      
                      return (
                        <button
                          onClick={handleEndCall}
                          className="p-5 bg-rose-600 hover:bg-rose-700 text-white rounded-full shadow-2xl transition-all border border-rose-500 transform hover:scale-105 active:scale-95"
                          title={isInitiator ? "End Call (For All)" : "Leave Call"}
                        >
                          <Phone size={24} className="rotate-[135deg]" />
                        </button>
                      );
                    })()}

                    {/* Loudspeaker */}
                    <button
                      onClick={() => {
                        const nextVal = !isSpeakerMuted;
                        setIsSpeakerMuted(nextVal);
                        triggerToast(nextVal ? "Loudspeaker Off (Muted)" : "Loudspeaker On");
                      }}
                      className={`p-4 rounded-full transition-all border border-zinc-700/50 ${!isSpeakerMuted ? 'bg-emerald-600 border-emerald-500 text-white shadow-[0_0_15px_rgba(16,185,129,0.3)]' : 'bg-zinc-800 hover:bg-zinc-700 text-white'}`}
                      title={!isSpeakerMuted ? "Disable Loudspeaker" : "Enable Loudspeaker"}
                    >
                      {!isSpeakerMuted ? <Volume2 size={20} /> : <VolumeX size={20} />}
                    </button>
                  </>
                )}

              </div>
            </div>

          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Minimized Call Button */}
      <AnimatePresence>
        {callState !== 'idle' && activeCall && isCallMinimized && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 50 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 50 }}
            onClick={() => {
              triggerHaptic('light');
              setIsCallMinimized(false);
            }}
            className="fixed bottom-6 right-6 z-[270] bg-zinc-950/95 backdrop-blur-md text-white p-3.5 rounded-2xl shadow-2xl border-2 border-emerald-500 cursor-pointer flex items-center gap-3.5 hover:bg-zinc-900 transition-all select-none group"
            style={{ touchAction: 'none' }}
          >
            {/* Pulsing indicator */}
            <div className="relative shrink-0">
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-500 rounded-full animate-ping"></span>
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-500 rounded-full"></span>
              <div className="w-10 h-10 rounded-xl bg-zinc-850 flex items-center justify-center font-bold text-sm overflow-hidden border border-zinc-800">
                {(() => {
                  if (activeCall.isGroup || activeCall.IsGroup) {
                    const foundChat = localChatList.find(c => String(c.id) === String(activeCall.chatId || activeCall.ChatId));
                    const chatImg = foundChat?.imageUrl || foundChat?.ImageUrl || activeCall.imageUrl || activeCall.ImageUrl;
                    const displayName = foundChat?.name || activeCall.chatName || activeCall.ChatName || 'Secure Group';
                    return chatImg ? (
                      <img src={getImageUrl(chatImg)} alt={displayName} className="w-full h-full object-cover" />
                    ) : (
                      <Users size={16} className="text-emerald-400" />
                    );
                  } else {
                    const partner = activeCall.participants?.find((p: any) => {
                      const pId = p.personId || p.PersonId || p.id || p.Id;
                      return Number(pId) !== Number(currentUserId);
                    });
                    const partnerId = partner?.personId || partner?.PersonId || partner?.id || partner?.Id;
                    const personDetails = availablePersons.find(ap => Number(ap.id || ap.Id) === Number(partnerId));
                    const partnerImg = activeCall.imageUrl || activeCall.ImageUrl || partner?.profileImageUrl || partner?.ProfileImageUrl || personDetails?.imageUrl || personDetails?.ImageUrl;
                    const partnerName = personDetails?.name || personDetails?.Name || activeChat?.name || "Secure Contact";
                    return partnerImg ? (
                      <img src={getImageUrl(partnerImg)} alt={partnerName} className="w-full h-full object-cover" />
                    ) : (
                      partnerName.charAt(0).toUpperCase()
                    );
                  }
                })()}
              </div>
            </div>
            
            <div className="flex flex-col pr-1 min-w-[100px]">
              <span className="text-[9px] font-black uppercase tracking-wider text-emerald-400">
                {callState === 'connected' ? 'Active Call' : 'Ringing...'}
              </span>
              <span className="text-xs font-bold text-zinc-100 max-w-[120px] truncate leading-tight">
                {(() => {
                  if (activeCall.isGroup || activeCall.IsGroup) {
                    const foundChat = localChatList.find(c => String(c.id) === String(activeCall.chatId || activeCall.ChatId));
                    return foundChat?.name || activeCall.chatName || activeCall.ChatName || 'Secure Group';
                  } else {
                    const partner = activeCall.participants?.find((p: any) => {
                      const pId = p.personId || p.PersonId || p.id || p.Id;
                      return Number(pId) !== Number(currentUserId);
                    });
                    const partnerId = partner?.personId || partner?.PersonId || partner?.id || partner?.Id;
                    const personDetails = availablePersons.find(ap => Number(ap.id || ap.Id) === Number(partnerId));
                    return personDetails?.name || personDetails?.Name || activeChat?.name || "Secure Contact";
                  }
                })()}
              </span>
              {callState === 'connected' && (
                <span className="text-[10px] font-mono text-zinc-400 mt-0.5 leading-none">
                  {formatCallDuration(callDuration)}
                </span>
              )}
            </div>
            
            <div className="w-8 h-8 rounded-full bg-emerald-500/15 text-emerald-400 flex items-center justify-center group-hover:bg-emerald-500 group-hover:text-white transition-all shrink-0">
              {activeCall.type === 2 || activeCall.Type === 2 ? <Video size={14} /> : <Phone size={14} />}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Camera and Microphone Permission Modal */}
      <AnimatePresence>
        {showCameraPermissionModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[280] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="bg-zinc-900 border border-zinc-800 text-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl p-6 relative flex flex-col items-center text-center"
            >
              {/* WhatsApp-style Camera Badge Icon */}
              <div className="relative mb-6">
                <div className="absolute inset-0 bg-emerald-500/20 rounded-full blur-xl animate-pulse" />
                <div className="w-16 h-16 bg-zinc-800 border-2 border-emerald-500 rounded-full flex items-center justify-center text-emerald-400 shadow-lg relative">
                  <Camera size={28} className="animate-pulse" />
                </div>
              </div>

              <h3 className="text-lg font-black tracking-wide uppercase text-zinc-100 mb-2">
                Camera Access Required
              </h3>
              
              <p className="text-zinc-400 text-xs leading-relaxed max-w-xs mb-6 font-medium">
                HanssonHub requires access to your camera and microphone to start high-fidelity, end-to-end encrypted video calls just like in WhatsApp.
              </p>

              {/* Secure tag */}
              <div className="flex items-center gap-1.5 bg-zinc-800 px-3 py-1.5 rounded-full border border-zinc-700/50 mb-6">
                <Lock size={12} className="text-emerald-500" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-300">Privacy Secured</span>
              </div>

              <div className="flex w-full gap-3">
                <button
                  onClick={() => {
                    triggerHaptic('light');
                    setShowCameraPermissionModal(false);
                    setPendingCallType(null);
                  }}
                  className="flex-1 py-3 bg-zinc-800 hover:bg-zinc-750 active:scale-95 text-zinc-400 hover:text-zinc-200 text-xs font-black uppercase tracking-wider rounded-xl transition-all border border-zinc-700 cursor-pointer"
                >
                  Deny
                </button>
                <button
                  onClick={async () => {
                    triggerHaptic('medium');
                    setShowCameraPermissionModal(false);
                    
                    // Request actual browser permissions
                    try {
                      const stream = await navigator.mediaDevices.getUserMedia({
                        audio: true,
                        video: { width: 640, height: 480, facingMode: 'user' }
                      });
                      
                      // Stop the tracks immediately because startLocalStream will request and bind them
                      stream.getTracks().forEach(t => t.stop());
                      
                      // Proceed with the call
                      if (pendingCallType) {
                        proceedWithStartCall(pendingCallType);
                        setPendingCallType(null);
                      } else {
                        proceedWithAcceptCall();
                      }
                    } catch (err) {
                      console.warn("User denied camera access inside browser prompt", err);
                      triggerToast("Camera access was denied");
                      setPendingCallType(null);
                    }
                  }}
                  className="flex-1 py-3 bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-lg shadow-emerald-500/20 transition-all border border-emerald-400 cursor-pointer"
                >
                  Allow Access
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
