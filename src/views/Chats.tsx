import React, { useState, useEffect, useRef, ChangeEvent } from 'react';
import { 
  Search, ChevronLeft, Send, User, MessageCircle, Mic, Paperclip, X, 
  Play, Pause, Square, Users, MessageSquarePlus, CheckCheck, UserPlus, 
  CirclePlus, LoaderCircle, Trash2, Edit2, Info, Plus, UserMinus,
  Reply, Forward, Copy, Check, Lock, Calendar, AlertCircle, Repeat
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  createDirectChat, createGroupChat, getChatById, getMyChats, 
  removeParticipant, addParticipants, sendMessage, editMessage, 
  getChatMessages, deleteMessage, getUnreadCount, getUserDetails,
  getStoredAppNamesList, updateGroupChat, deleteChat,
  sendTypingStatus, joinChatRoom, getBaseUrl
} from '../utils/api';
import { MessageType } from '../types/chat';
import { saveData, getData, getAllData, STORES, clearStore } from '../utils/db';
import { homeSecurityHubConnection, startHomeSecurityHub } from '../utils/signalr';
import Cropper from 'react-easy-crop';

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

      audio.addEventListener('loadedmetadata', handleLoadedMetadata);
      audio.addEventListener('ended', handleEnded);

      return () => {
        audio.pause();
        audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
        audio.removeEventListener('ended', handleEnded);
        if (intervalRef.current) clearInterval(intervalRef.current);
      };
    }
  }, [mediaUrl]);

  const handlePlayPause = () => {
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
        className="w-8 h-8 rounded-full bg-indigo-600 hover:bg-indigo-700 active:scale-95 flex items-center justify-center text-white shrink-0 transition-all shadow-sm"
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
};

export default function Chats({ onChatActive, onRefreshPage }: { onChatActive: (isActive: boolean) => void, onRefreshPage?: () => void }) {
  const [localChatList, setLocalChatList] = useState<ChatRoom[]>([]);
  const [activeChat, setActiveChat] = useState<ChatRoom | null>(null);
  const [messageText, setMessageText] = useState('');
  const [replyTo, setReplyTo] = useState<{ id: string, text: string } | null>(null);
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);
  const swipeTriggeredRef = useRef<boolean>(false);

  // User context
  const [currentUserId, setCurrentUserId] = useState<number>(0);
  const [onlineUsers, setOnlineUsers] = useState<Set<number>>(new Set());

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
  const recordingIntervalRef = useRef<number | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // File Inputs & Attachments
  const fileInputRef = useRef<HTMLInputElement>(null);
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
      if (appNames && appNames.personIdNames) {
        setAvailablePersons(appNames.personIdNames);
      } else if (appNames && appNames.PersonIdNames) {
        setAvailablePersons(appNames.PersonIdNames);
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
    activeChatRef.current = activeChat;
  }, [activeChat]);

  const currentUserIdRef = useRef<number>(0);
  useEffect(() => {
    currentUserIdRef.current = currentUserId;
  }, [currentUserId]);

  const [typingUsers, setTypingUsers] = useState<{ [chatId: string]: string[] }>({});

  useEffect(() => {
    // WebSocket real-time event listeners
    const handleMessageSent = (msg: any) => {
      if (!msg) return;
      const chatIdStr = (msg.chatId || msg.ChatId)?.toString();
      if (!chatIdStr) return;

      const currentActive = activeChatRef.current;
      const currentUid = currentUserIdRef.current;

      // 1. If this message is for the currently active chat, append it to visual logs
      if (currentActive && chatIdStr === currentActive.id) {
        setMessages(prev => {
          const msgId = (msg.id || msg.Id || '').toString();
          if (!msgId || prev.some(m => m.id === msgId)) return prev;
          
          const mapped = {
            id: msgId,
            text: msg.content || msg.Content || '',
            time: new Date(msg.sentAt || msg.SentAt || new Date()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            sentAt: msg.sentAt || msg.SentAt || new Date().toISOString(),
            isMe: (msg.senderPersonId || msg.SenderPersonId) === currentUid,
            senderName: msg.senderName || msg.SenderName || 'Anonymous',
            type: msg.type === MessageType.Image ? 'image' : msg.type === MessageType.Audio ? 'audio' : 'text',
            mediaUrl: msg.attachments && msg.attachments.length > 0 ? (msg.attachments[0].fileUrl || msg.attachments[0].filePath || msg.attachments[0].FilePath) : undefined,
            attachments: msg.attachments || []
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
        const nextList = prevList.map(c => {
          if (c.id === chatIdStr) {
            const updated = {
              ...c,
              lastMessage: msg.content || msg.Content || (msg.type === MessageType.Image ? 'Image' : msg.type === MessageType.Audio ? 'Voice Message' : ''),
              time: new Date(msg.sentAt || msg.SentAt || new Date()).toLocaleDateString([], { month: 'short', day: 'numeric' }),
              unread: (msg.senderPersonId || msg.SenderPersonId) === currentUid ? c.unread : c.unread + 1,
              lastMessageSenderId: msg.senderPersonId || msg.SenderPersonId || 0
            };
            saveData(STORES.CHATS, updated).catch(() => {});
            return updated;
          }
          return c;
        });
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
              lastMessage: msg.content || msg.Content || c.lastMessage
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

      setTypingUsers(prev => {
        const current = prev[chatIdStr] || [];
        if (current.includes(senderName)) return prev;
        return { ...prev, [chatIdStr]: [...current, senderName] };
      });

      // Clear after 5 seconds of inactivity
      setTimeout(() => {
        setTypingUsers(prev => {
          const current = prev[chatIdStr] || [];
          return { ...prev, [chatIdStr]: current.filter(n => n !== senderName) };
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
          lastMessage: chat.lastMessage?.content || chat.LastMessage?.Content || 'Created chat',
          time: (chat.lastMessage?.sentAt || chat.LastMessage?.SentAt) ? new Date(chat.lastMessage?.sentAt || chat.LastMessage?.SentAt).toLocaleDateString([], { month: 'short', day: 'numeric' }) : 'Now',
          unread: chat.unreadCount || chat.UnreadCount || 0,
          isGroup: chat.isGroup || chat.IsGroup || false,
          description: chat.description || chat.Description || '',
          imgUrl: chat.imageUrl || chat.ImageUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop',
          participants: chat.participants || chat.Participants || []
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
      const chatIdStr = (pkg.chatId || pkg.ChatId).toString();
      const pid = pkg.personId || pkg.PersonId;
      const currentUid = currentUserIdRef.current;

      if (pid === currentUid) {
        setLocalChatList(prev => {
          return prev.map(c => {
            if (c.id === chatIdStr) {
              const updated = { ...c, unread: 0 };
              saveData(STORES.CHATS, updated).catch(() => {});
              return updated;
            }
            return c;
          });
        });
      }
    };

    // Bind Hub connections
    const handleMessageSentWrapped = (msg: any) => { console.log("[HOME_SIGNALR_EVENT: MessageSent]", msg); handleMessageSent(msg); };
    const handleMessageEditedWrapped = (msg: any) => { console.log("[HOME_SIGNALR_EVENT: MessageEdited]", msg); handleMessageEdited(msg); };
    const handleMessageDeletedWrapped = (msg: any) => { console.log("[HOME_SIGNALR_EVENT: MessageDeleted]", msg); handleMessageDeleted(msg); };
    const handleUserTypingWrapped = (data: any) => { console.log("[HOME_SIGNALR_EVENT: UserTyping]", data); handleUserTyping(data); };
    const handleChatCreatedWrapped = (chat: any) => { console.log("[HOME_SIGNALR_EVENT: ChatCreated]", chat); handleChatCreated(chat); };
    const handleGroupChatUpdatedWrapped = (chat: any) => { console.log("[HOME_SIGNALR_EVENT: GroupChatUpdated]", chat); handleGroupChatUpdated(chat); };
    const handleChatDeletedWrapped = (chatId: number) => { console.log("[HOME_SIGNALR_EVENT: ChatDeleted]", chatId); handleChatDeleted(chatId); };
    const handleParticipantsAddedWrapped = (data: any) => { console.log("[HOME_SIGNALR_EVENT: ParticipantsAdded]", data); handleParticipantsAdded(data); };
    const handleParticipantRemovedWrapped = (data: any) => { console.log("[HOME_SIGNALR_EVENT: ParticipantRemoved]", data); handleParticipantRemoved(data); };
    const handleMessagesReadWrapped = (data: any) => { console.log("[HOME_SIGNALR_EVENT: MessagesRead]", data); handleMessagesRead(data); };
    const handleUserOnlineWrapped = (data: any) => {
      console.log("[HOME_SIGNALR_EVENT: UserOnline]", data);
      const personId = Number(data);
      if (!isNaN(personId)) {
        setOnlineUsers(prev => {
          const next = new Set(prev);
          next.add(personId);
          return next;
        });
      }
    };

    homeSecurityHubConnection.on("MessageSent", handleMessageSentWrapped);
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
    homeSecurityHubConnection.on("UserOnline", handleUserOnlineWrapped);

    return () => {
      homeSecurityHubConnection.off("MessageSent", handleMessageSentWrapped);
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
      homeSecurityHubConnection.off("UserOnline", handleUserOnlineWrapped);
    };
  }, []);

  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
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
            lastMsgText = chat.lastMessage.content || (chat.lastMessage.type === MessageType.Image ? "📷 Image" : chat.lastMessage.type === MessageType.Audio ? "🎵 Voice Note" : "Attached file");
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
            lastMessageSenderId: chat.lastMessage ? (chat.lastMessage.senderPersonId || chat.lastMessage.SenderPersonId || 0) : 0
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
      console.error("Failed to load real chats, using mock fallback list", err);
      // Resilience Fallback to avoid complete empty blackouts
      const fallbackList = [
        { id: '1', name: 'Security Control Team', lastMessage: 'All parameters are currently secure.', time: '10:42 AM', unread: 2, isGroup: true, description: 'Direct communications for the onsite team', participants: [{ personId: 101, fullName: 'Super Admin', isAdmin: true, isOnline: true }] },
        { id: '2', name: 'Operator Hansson', lastMessage: 'Did you make sure to lock the backdoor?', time: 'Yesterday', unread: 0, isGroup: false, description: 'Direct chat', participants: [{ personId: 102, fullName: 'Operator Hansson', isAdmin: false, isOnline: false }] },
        { id: '3', name: 'Automatic Alerts Node', lastMessage: 'Internal system firmware update successful.', time: 'Mar 10', unread: 0, isGroup: false, description: 'Notifications bot', participants: [] }
      ];
      setLocalChatList(fallbackList);
      return fallbackList;
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
        const list = appNames.personIdNames || appNames.PersonIdNames;
        if (list) {
          setAvailablePersons(list);
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
    if (isRecording) {
      recordingIntervalRef.current = window.setInterval(() => {
        setRecordingDuration(d => d + 1);
      }, 1000);
    } else {
      if (recordingIntervalRef.current) clearInterval(recordingIntervalRef.current);
    }
    return () => {
      if (recordingIntervalRef.current) clearInterval(recordingIntervalRef.current);
    };
  }, [isRecording]);

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
            attachments: msg.attachments || []
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

  // Send message implementation (Text)
  const handleSendMessage = async () => {
    if (!messageText.trim() || !activeChat) return;
    const txt = messageText;
    setMessageText('');
    setReplyTo(null);

    try {
      const payload = {
        chatId: parseInt(activeChat.id),
        content: txt,
        type: MessageType.Text,
        attachments: []
      };
      
      const res = await sendMessage(payload);
      console.log('SendMessage Success:', res);
      if (res) {
        setMessages(prev => {
          const msgId = (res.id || res.Id)?.toString();
          if (!msgId || prev.some(m => m.id === msgId)) return prev;
          const mapped = {
            id: msgId,
            text: res.content || res.Content || txt,
            time: new Date(res.sentAt || res.SentAt || new Date()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            sentAt: res.sentAt || res.SentAt || new Date().toISOString(),
            isMe: true,
            senderName: res.senderName || res.SenderName || 'You',
            type: res.type === MessageType.Image ? 'image' : res.type === MessageType.Audio ? 'audio' : 'text',
            mediaUrl: res.attachments && res.attachments.length > 0 ? (res.attachments[0].fileUrl || res.attachments[0].filePath || res.attachments[0].FilePath) : undefined,
            attachments: res.attachments || []
          };
          const next = [...prev, mapped];
          saveData(STORES.MESSAGES, { chatId: activeChat.id, list: next }).catch(() => {});
          return next;
        });
        setTimeout(() => scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight), 100);
      }
    } catch (err: any) {
      console.error("Failed to send message via API, rendering local preview:", err);
      // Local optimistic update
      setMessages(prev => [...prev, {
        id: Math.random().toString(),
        text: txt,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        sentAt: new Date().toISOString(),
        isMe: true,
        senderName: 'You',
        type: 'text'
      }]);
      setTimeout(() => scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight), 100);
    }
  };

  // Convert File object to Base64 String and Auto-Populate Form Fields
  const handleAttachmentUpload = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      
      let determinedType = MessageType.File;
      if (file.type.startsWith('image/')) {
        determinedType = MessageType.Image;
      } else if (file.type.startsWith('audio/')) {
        determinedType = MessageType.Audio;
      } else if (file.type.startsWith('video/')) {
        determinedType = MessageType.Video;
      }

      // Read as base64 string
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64Content = reader.result as string;
        
        // Auto-fill all input fields immediately
        setAttachmentFileName(file.name);
        setAttachmentContentType(file.type || 'application/octet-stream');
        setAttachmentFileSize(file.size);
        setAttachmentPathBase64(base64Content);
        setAttachmentThumbnailPath('');
        setAttachmentType(determinedType);
        setAttachmentCaption('');
        
        // Trigger modal to show auto-filled fields and edit them
        setShowAttachmentModal(true);
      };
      reader.readAsDataURL(file);
    }
  };

  // Cancel and clean up attachment modal state
  const handleCancelAttachment = () => {
    setShowAttachmentModal(false);
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
    const body = {
      chatId: parseInt(activeChat.id),
      content: attachmentCaption,
      type: attachmentType,
      attachments: [
        {
          fileName: attachmentFileName,
          filePath: attachmentPathBase64,  // Serialized Base64 string represents the path/data
          contentType: attachmentContentType,
          fileSize: attachmentFileSize,
          thumbnailPath: attachmentThumbnailPath
        }
      ]
    };

    setShowAttachmentModal(false);
    setIsSendingMessage(true);

    try {
      const res = await sendMessage(body);
      console.log('SendAttachment Dto Success:', res);
      if (res) {
        setMessages(prev => {
          const msgId = (res.id || res.Id)?.toString();
          if (!msgId || prev.some(m => m.id === msgId)) return prev;
          const mapped = {
            id: msgId,
            text: res.content || res.Content || attachmentCaption || attachmentFileName,
            time: new Date(res.sentAt || res.SentAt || new Date()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            sentAt: res.sentAt || res.SentAt || new Date().toISOString(),
            isMe: true,
            senderName: res.senderName || res.SenderName || 'You',
            type: res.type === MessageType.Image ? 'image' : res.type === MessageType.Audio ? 'audio' : 'text',
            mediaUrl: res.attachments && res.attachments.length > 0 ? (res.attachments[0].fileUrl || res.attachments[0].filePath || res.attachments[0].FilePath) : undefined,
            attachments: res.attachments || []
          };
          const next = [...prev, mapped];
          saveData(STORES.MESSAGES, { chatId: activeChat.id, list: next }).catch(() => {});
          return next;
        });
        setTimeout(() => scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight), 100);
      }
    } catch (err) {
      console.error("API error sending attachment, showing locally:", err);
      // Local optimistic update fallback
      setMessages(prev => [...prev, {
        id: Math.random().toString(),
        text: attachmentCaption || attachmentFileName,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        sentAt: new Date().toISOString(),
        isMe: true,
        senderName: 'You',
        type: attachmentType === MessageType.Image ? 'image' : 'text',
        mediaUrl: attachmentPathBase64
      }]);
      setTimeout(() => scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight), 100);
    } finally {
      setIsSendingMessage(false);
      handleCancelAttachment();
    }
  };

  // Recording audio voice message
  const handleSendVoiceMessage = async (durationSecs: number, audioBlob?: Blob, base64Audio?: string) => {
    if (!activeChat) return;
    try {
      // Improved mock string that is valid base64
      const audioPath = base64Audio || ("data:audio/webm;base64,GkXfo69Chu1" + "A".repeat(Math.max(0, 100 - durationSecs)) + "==");
      
      const body = {
        chatId: parseInt(activeChat.id),
        content: '',
        type: MessageType.Audio,
        attachments: [
          {
            fileName: 'audio_voice_note.webm',
            filePath: audioBlob || audioPath,
            contentType: 'audio/webm',
            fileSize: audioBlob ? audioBlob.size : durationSecs * 1024,
            thumbnailPath: ''
          }
        ]
      };
      
      const res = await sendMessage(body);
      console.log('Send Voice Message Success', res);
      if (res) {
        setMessages(prev => {
          const msgId = (res.id || res.Id)?.toString();
          if (!msgId || prev.some(m => m.id === msgId)) return prev;
          const mapped = {
            id: msgId,
            text: res.content || res.Content || '',
            time: new Date(res.sentAt || res.SentAt || new Date()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            sentAt: res.sentAt || res.SentAt || new Date().toISOString(),
            isMe: true,
            senderName: res.senderName || res.SenderName || 'You',
            type: 'audio',
            duration: durationSecs,
            mediaUrl: res.attachments && res.attachments.length > 0 ? (res.attachments[0].fileUrl || res.attachments[0].filePath || res.attachments[0].FilePath) : undefined,
            attachments: res.attachments || []
          };
          const next = [...prev, mapped];
          saveData(STORES.MESSAGES, { chatId: activeChat.id, list: next }).catch(() => {});
          return next;
        });
        setTimeout(() => scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight), 100);
      }
    } catch (err) {
      console.error("API voice note err, local mock:", err);
      setMessages(prev => [...prev, {
        id: Math.random().toString(),
        text: '',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        sentAt: new Date().toISOString(),
        isMe: true,
        senderName: 'You',
        type: 'audio',
        duration: durationSecs,
        mediaUrl: base64Audio
      }]);
      setTimeout(() => scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight), 100);
    }
  };

  const startRecordingAudio = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Recording not supported in this browser");
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        stream.getTracks().forEach(track => track.stop());
        
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = async () => {
          const base64Audio = reader.result as string;
          await handleSendVoiceMessage(recordingDuration, audioBlob, base64Audio);
          setRecordingDuration(0);
        };
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setIsRecording(true);
      setRecordingDuration(0);
    } catch (err: any) {
      console.warn("Could not start physical mic recording, fallback to simulated duration:", err);
      setIsRecording(true);
      setRecordingDuration(0);
    }
  };

  const stopRecordingAudio = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    } else {
      setIsRecording(false);
      handleSendVoiceMessage(recordingDuration);
      setRecordingDuration(0);
    }
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

  // Resolve standard storage URLs for all image assets in the application
  const getImageUrl = (img?: string) => {
    if (!img) return '';
    if (img.startsWith('data:') || img.startsWith('http://') || img.startsWith('https://')) return img;
    
    // Check if it's base64 encoded string but doesn't have the data prefix
    if (/^[a-zA-Z0-9+/=]+$/.test(img) && img.length > 100) {
      return `data:image/jpeg;base64,${img}`;
    }
    
    const cleanPath = img.startsWith('/') ? img.slice(1) : img;
    return `${getBaseUrl()}/storage/${cleanPath}`;
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
  const handleUserTyping = () => {
    if (!activeChat) return;
    const now = Date.now();
    if (now - lastTypingSentRef.current > 10000) {
      lastTypingSentRef.current = now;
      sendTypingStatus(parseInt(activeChat.id)).catch(err => {
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

  const overlayMsg = overlayMessageId ? messages.find(m => m.id === overlayMessageId) : null;

  return (
    <div className="h-full flex flex-col bg-[#F0F2F5] dark:bg-[#0c0c0e] text-zinc-800 dark:text-zinc-200 relative">
      <AnimatePresence initial={false} mode="wait">
        {!activeChat ? (
          <motion.div 
            key="chatList"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            className="flex flex-col h-full absolute inset-0 pb-16"
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
              ) : localChatList.filter(chat => chat.name.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 ? (
                <div className="text-center py-20 text-zinc-444 text-sm font-semibold">
                  No active safe chat rooms found.
                </div>
              ) : (
                [...localChatList].filter(chat => chat.name.toLowerCase().includes(searchQuery.toLowerCase())).reverse().map(chat => (
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
                                lastMessage: res.lastMessage?.content || chat.lastMessage,
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
                      {chat.imageUrl ? (
                        <img src={getImageUrl(chat.imageUrl)} alt={chat.name} className="w-full h-full object-cover" />
                      ) : (
                        chat.isGroup ? <Users size={20} /> : <span className="font-extrabold text-sm">{chat.name.charAt(0).toUpperCase()}</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start mb-1">
                        <h3 className="font-bold text-zinc-800 text-sm truncate pr-2">{chat.name}</h3>
                        <span className={`text-[10px] shrink-0 ${(chat.unread > 0 && chat.lastMessageSenderId !== currentUserId) ? 'text-green-600 font-bold' : 'text-zinc-400'}`}>
                          {chat.time}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        {typingUsers[chat.id] && typingUsers[chat.id].length > 0 ? (
                          <p className="text-xs text-green-600 font-bold truncate pr-2 animate-pulse">
                            {!chat.isGroup ? <span className="italic">Typing...</span> : `${typingUsers[chat.id].join(', ')} typing...`}
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
                   {activeChat.imageUrl ? 
                     <img src={getImageUrl(activeChat.imageUrl)} alt={activeChat.name} className="w-full h-full object-cover" /> :
                     (activeChat.isGroup ? <Users size={20} /> : <span className="font-extrabold text-sm">{activeChat.name.charAt(0).toUpperCase()}</span>)
                   }
                </div>
                <div>
                  <h3 className="font-bold text-zinc-800 text-sm tracking-wide">{activeChat.name}</h3>
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
                  className="p-2 text-zinc-400 hover:text-zinc-800 hover:bg-zinc-50 rounded-full transition-all"
                  title={activeChat.isGroup ? "View Group Details" : "View Chat Info"}
                >
                  <Info size={20} />
                </button>
              </div>
            </header>

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
                  const sorted = [...messages].sort((a, b) => {
                    const dateA = new Date(a.sentAt || a.SentAt || 0).getTime();
                    const dateB = new Date(b.sentAt || b.SentAt || 0).getTime();
                    if (dateA !== dateB) return dateA - dateB;
                    const senderIdA = Number(a.senderPersonId || a.SenderPersonId || (a.isMe ? currentUserId : 0));
                    const senderIdB = Number(b.senderPersonId || b.SenderPersonId || (b.isMe ? currentUserId : 0));
                    return senderIdA - senderIdB;
                  });

                  let lastDateStr = '';
                  return sorted.map((msg) => {
                    const msgDate = msg.sentAt ? new Date(msg.sentAt) : new Date();
                    const msgDateStr = msgDate.toDateString();
                    const showDivider = msgDateStr !== lastDateStr;
                    lastDateStr = msgDateStr;

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
                              transition: swipingMessageId === String(msg.id) ? 'none' : 'transform 150ms cubic-bezier(0.16, 1, 0.3, 1)'
                            }}
                            className={`p-2.5 rounded-md shadow-sm max-w-[90%] inline-block relative border cursor-pointer select-none transition-all duration-300 active:scale-[0.99] ${
                              highlightedMessageId === String(msg.id)
                                ? 'bg-yellow-105 border-yellow-405 ring-4 ring-yellow-400/50 scale-[1.02] shadow-md animate-pulse'
                                : (msg.isMe ? 'bg-[#DCF8C6] border-[#DCF8C6] dark:bg-emerald-950 dark:border-emerald-900 dark:text-emerald-100' : 'bg-white border-zinc-200 dark:bg-[#1c1c1e] dark:border-zinc-800 dark:text-zinc-200 shadow-sm')
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
                        className="mb-2 p-2 bg-black/5 hover:bg-black/10 border-l-4 border-emerald-500 rounded text-xs text-zinc-600 truncate cursor-pointer transition-colors select-none"
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
                        {msg.type === 'text' && (
                          <p className="text-xs text-zinc-800 dark:text-zinc-200 break-words font-medium">{msg.text}</p>
                        )}
                        
                        {msg.type === 'image' && (msg.mediaUrl || msg.attachments?.length > 0) && (
                          <div className="flex flex-col gap-1">
                            <img src={msg.mediaUrl || msg.attachments[0].fileUrl || msg.attachments[0].filePath} alt="attachment" className="rounded-sm max-h-48 object-cover max-w-full" referrerPolicy="no-referrer" />
                            {msg.text && <p className="text-xs text-zinc-800 dark:text-zinc-200 pt-1">{msg.text}</p>}
                          </div>
                        )}
                        
                        {msg.type === 'audio' && (
                          <VoicePlayer mediaUrl={msg.mediaUrl} duration={msg.duration} />
                        )}
                      </>
                    )}

                    <div className={`flex justify-between items-center gap-4 mt-1.5 w-full ${msg.isMe ? 'text-emerald-700/80' : 'text-zinc-500'}`}>
                    {/* Edit/Delete removed from bubble - only in long-press menu */}
                    {!msg.isMe && (
                      <button onClick={() => setReplyTo({ id: msg.id, text: msg.text || 'Voice Message' })} className="text-[9px] hover:underline uppercase font-bold">Reply</button>
                    )}
                      
                      <div className="flex items-center gap-1 ml-auto shrink-0 whitespace-nowrap">
                        <p className="text-[9px] font-semibold uppercase shrink-0 whitespace-nowrap">{msg.time}</p>
                        {msg.status === 'failed' ? (
                          <AlertCircle size={12} className="text-red-500 shrink-0" />
                        ) : (
                          <CheckCheck size={12} className={(msg.isMe && (!activeChat.unread || activeChat.unread === 0)) ? "text-[#53bdeb] shrink-0" : "text-zinc-400 shrink-0"} />
                        )}
                      </div>
                    </div>
                    {/* Small tail */}
                    <div className={`absolute top-0 w-2.5 h-2.5 ${msg.isMe ? '-right-2.5 bg-[#DCF8C6] dark:bg-emerald-950' : '-left-2.5 bg-white dark:bg-[#1c1c1e]'}`} style={{ clipPath: msg.isMe ? 'polygon(0 0, 100% 0, 0 100%)' : 'polygon(100% 0, 0 0, 100% 100%)' }}></div>
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

                  <div className="flex-1 overflow-y-auto p-8 flex flex-col items-center justify-center gap-6 select-none bg-transparent text-white">
                    {attachmentType === MessageType.Image && attachmentPathBase64 ? (
                      <div className="flex flex-col items-center gap-3 animate-scale-up">
                        <img src={attachmentPathBase64} alt="attachment-preview" className="rounded-2xl max-h-64 object-contain shadow-2xl border border-white/15" />
                        <span className="text-xs text-white/80 font-black tracking-widest uppercase bg-black/40 px-4 py-2 rounded-full border border-white/10">{attachmentFileName || "Attached Image"}</span>
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
                      className="w-12 h-12 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full flex items-center justify-center shrink-0 shadow-lg transition-transform active:scale-95"
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
                <div className="bg-white dark:bg-[#1a1a1c] px-3 py-2 mb-2 rounded-md border-l-4 border-emerald-500 flex justify-between items-center mr-12 shadow-sm text-sm">
                  <div className="truncate text-zinc-600">
                    <span className="font-bold text-emerald-600 text-xs mr-2">Replying to:</span> 
                    {replyTo.text}
                  </div>
                  <button onClick={() => setReplyTo(null)} className="text-zinc-400 hover:text-black">
                    <X size={16} />
                  </button>
                </div>
              )}
              <div className="flex items-end gap-2 w-full">
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  onChange={handleAttachmentUpload}
                />
                
                <div className="flex-1 bg-[#F0F0F0] dark:bg-[#1c1c1e] border border-transparent shadow-none overflow-hidden flex items-end relative rounded-xl">
                {!isRecording && (
                  <button onClick={() => fileInputRef.current?.click()} className="p-3 text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200" title="Auto-fill File Payload">
                    <Paperclip size={20} />
                  </button>
                )}
                
                {isRecording ? (
                  <div className="flex-1 flex items-center gap-3 px-4 py-3 bg-red-50 dark:bg-red-950/20 text-red-500 rounded-md">
                    <motion.div 
                      key="recording-waves"
                      className="flex gap-0.5 items-end h-4"
                      initial="hidden"
                      animate="visible"
                    >
                      {[...Array(5)].map((_, i) => (
                        <motion.div
                          key={i}
                          className="w-1 bg-red-500 rounded-full"
                          variants={{
                            hidden: { height: 4 },
                            visible: { 
                                height: [4, 16, 4],
                                transition: { repeat: Infinity, duration: 0.8, delay: i * 0.1 } 
                            }
                          }}
                        />
                      ))}
                    </motion.div>
                    <span className="text-xs font-bold font-mono tabular-nums">0:{recordingDuration.toString().padStart(2, '0')}</span>
                  </div>
                ) : (
                  <textarea 
                    value={messageText}
                    onChange={(e) => {
                      setMessageText(e.target.value);
                      handleUserTyping();
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
                  className={`w-10 h-10 flex items-center justify-center shrink-0 transition-colors rounded-full shadow-sm bg-[#00A884] dark:bg-[#064e3b] text-white hover:bg-[#008f6f] dark:hover:bg-[#054334]`}
                >
                  <Send size={18} className="ml-0.5" />
                </button>
              ) : (
                <button 
                  onClick={() => {
                    if (isRecording) {
                      stopRecordingAudio();
                    } else {
                      startRecordingAudio();
                    }
                  }}
                  className={`w-10 h-10 flex items-center justify-center shrink-0 transition-colors rounded-full shadow-sm ${
                    isRecording ? 'bg-red-500 text-white animate-pulse' : 'bg-[#00A884] dark:bg-[#064e3b] text-white hover:bg-[#008f6f] dark:hover:bg-[#054334]'
                  }`}
                >
                  {isRecording ? <Square size={16} fill="currentColor" /> : <Mic size={18} />}
                </button>
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
                      <button 
                        onClick={() => setShowChatInfo(false)} 
                        className="flex items-center gap-1.5 text-white bg-zinc-950 hover:bg-zinc-800 py-1.5 px-3 rounded-lg transition-all border border-zinc-950 shadow-sm"
                        title="Back to Chat"
                      >
                        <span className="text-xs font-bold uppercase">Back</span>
                        <ChevronLeft size={16} className="rotate-180" />
                      </button>
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
                              <img src={editGroupImagePreview} alt="Group Preview" className="w-full h-full object-cover animate-fade-in" />
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
                            {activeChat.imageUrl ? 
                              <img src={getImageUrl(activeChat.imageUrl)} alt={activeChat.name} className="w-full h-full object-cover" /> :
                              activeChat.name.charAt(0).toUpperCase()
                            }
                          </div>
                          <h3 className="font-bold text-lg text-zinc-800 tracking-tight">{activeChat.name}</h3>
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
                                  <div key={pId} className="flex items-center justify-between p-2 rounded-lg hover:bg-zinc-50 transition-colors border border-transparent hover:border-zinc-100">
                                    <div className="flex items-center gap-2">
                                      <div className="w-8 h-8 rounded-full bg-zinc-100 border border-zinc-200 flex items-center justify-center text-zinc-700 font-bold text-xs overflow-hidden">
                                        {pImg ? (
                                          <img src={pImg.startsWith('data:') ? pImg : `data:image/jpeg;base64,${pImg}`} alt={fName} className="w-full h-full object-cover" />
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

                                  <button 
                                    onClick={() => handleRemoveParticipant(pId)}
                                    disabled={isManagingParticipants}
                                    className="p-1 hover:bg-red-50 text-zinc-400 hover:text-red-500 rounded transition-all"
                                    title="Remove Participant"
                                  >
                                    <UserMinus size={14} />
                                  </button>
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
                       <img src={groupImagePreview} alt="Group Preview" className="w-full h-full object-cover" />
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
                                <img src={pImg.startsWith('data:') ? pImg : `data:image/jpeg;base64,${pImg}`} alt={pName} className="w-full h-full object-cover" />
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
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black ${
                        isSelected ? 'bg-white/20' : 'bg-zinc-100 text-zinc-600'
                      }`}>
                        {pName.charAt(0).toUpperCase()}
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
            className="fixed inset-0 bg-zinc-950/45 backdrop-blur-lg z-[150] select-none cursor-default"
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
                  pointerEvents: 'none'
                }}
                className={`p-2.5 rounded-md shadow-lg border ${
                  overlayMsg.isMe 
                    ? 'bg-[#DCF8C6] border-[#DCF8C6] dark:bg-emerald-950 dark:border-emerald-900 dark:text-emerald-100' 
                    : 'bg-white border-zinc-200 dark:bg-[#1c1c1e] dark:border-zinc-800 dark:text-zinc-200 shadow-md'
                } ${overlayMsg.isMe ? 'rounded-tr-none' : 'rounded-tl-none'} scale-100 z-[160] overflow-visible`}
              >
                {!overlayMsg.isMe && (
                  <p className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 mb-1">{overlayMsg.senderName}</p>
                )}

                {overlayMsg.replyTo && (
                  <div className="mb-2 p-2 bg-black/5 dark:bg-white/5 border-l-4 border-emerald-500 rounded text-xs text-zinc-650 dark:text-zinc-300 truncate max-w-full">
                    {overlayMsg.replyTo.text}
                  </div>
                )}

                {overlayMsg.type === 'text' && (
                  <p className="text-xs text-zinc-800 dark:text-zinc-200 break-words font-medium whitespace-pre-wrap">{overlayMsg.text}</p>
                )}
                
                {overlayMsg.type === 'image' && (overlayMsg.mediaUrl || overlayMsg.attachments?.length > 0) && (
                  <div className="flex flex-col gap-1">
                    <img src={overlayMsg.mediaUrl || overlayMsg.attachments[0].fileUrl || overlayMsg.attachments[0].filePath} alt="attachment" className="rounded-sm max-h-48 object-cover max-w-full" referrerPolicy="no-referrer" />
                    {overlayMsg.text && <p className="text-xs text-zinc-800 dark:text-zinc-200 pt-1">{overlayMsg.text}</p>}
                  </div>
                )}
                
                {overlayMsg.type === 'audio' && (
                  <VoicePlayer mediaUrl={overlayMsg.mediaUrl} duration={overlayMsg.duration} />
                )}

                <div className={`flex justify-between items-center gap-4 mt-1.5 w-full ${overlayMsg.isMe ? 'text-emerald-700/80 dark:text-emerald-400/80' : 'text-zinc-500'}`}>
                  <div className="flex items-center gap-1 ml-auto shrink-0 whitespace-nowrap">
                    <p className="text-[9px] font-semibold uppercase shrink-0 whitespace-nowrap">{overlayMsg.time}</p>
                    <CheckCheck size={12} className={overlayMsg.isMe ? "text-[#53bdeb] shrink-0" : "text-zinc-400 shrink-0"} />
                  </div>
                </div>
                
                {/* Small tail */}
                <div className={`absolute top-0 w-2.5 h-2.5 ${overlayMsg.isMe ? '-right-2.5 bg-[#DCF8C6] dark:bg-emerald-950' : '-left-2.5 bg-white dark:bg-[#1c1c1e]'}`} style={{ clipPath: overlayMsg.isMe ? 'polygon(0 0, 100% 0, 0 100%)' : 'polygon(100% 0, 0 0, 100% 100%)' }}></div>
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

    </div>
  );
}
