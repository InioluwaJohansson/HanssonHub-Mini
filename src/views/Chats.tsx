import { useState, useEffect, useRef } from 'react';
import { Search, ChevronLeft, Send, User, MessageCircle, Mic, Paperclip, X, Play, Square, Pause, Users, MessageSquarePlus, CheckCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

type ChatRoom = {
  id: string;
  name: string;
  lastMessage: string;
  time: string;
  unread: number;
};

const chatList: ChatRoom[] = [
  { id: '1', name: 'Security Team', lastMessage: 'All parameters are secure.', time: '10:42 AM', unread: 2 },
  { id: '2', name: 'Jane Hansson', lastMessage: 'Did you lock the backdoor?', time: 'Yesterday', unread: 0 },
  { id: '3', name: 'System Alerts', lastMessage: 'Update installed successfully.', time: 'Mar 10', unread: 0 },
];

export default function Chats({ onChatActive }: { onChatActive: (isActive: boolean) => void }) {
  const [activeChat, setActiveChat] = useState<ChatRoom | null>(null);
  const [messageText, setMessageText] = useState('');
  const [replyTo, setReplyTo] = useState<{ id: string, text: string } | null>(null);
  
  // Attachments & Audio state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const recordingIntervalRef = useRef<number | null>(null);
  
  const [previewImages, setPreviewImages] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  
  // Custom mock messages for current chat
  const [messages, setMessages] = useState<{ id: string, text: string, time: string, isMe: boolean, type: 'text' | 'image' | 'audio', mediaUrl?: string, duration?: number, replyTo?: { text: string } }[]>([
    { id: 'msg1', text: 'All parameters are secure.', time: '10:42 AM', isMe: false, type: 'text' }
  ]);

  // Hook for recording duration
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

  useEffect(() => {
    if (activeChat) {
      setMessages([
        { id: Math.random().toString(), text: activeChat.lastMessage, time: activeChat.time, isMe: false, type: 'text' }
      ]);
    }
  }, [activeChat]);

  // Notify parent to hide the bottom nav when an active chat is open
  useEffect(() => {
    onChatActive(!!activeChat);
    return () => onChatActive(false);
  }, [activeChat, onChatActive]);

  return (
    <div className="h-full flex flex-col bg-white relative">
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
                  <button className="p-2 border border-zinc-200 rounded-md hover:bg-zinc-50 text-zinc-600 transition-colors bg-white shadow-sm" title="Create Group Chat">
                    <Users size={16} />
                  </button>
                  <button className="p-2 border border-zinc-200 rounded-md hover:bg-zinc-50 text-zinc-600 transition-colors bg-white shadow-sm" title="New Chat">
                    <MessageSquarePlus size={16} />
                  </button>
                </div>
              </div>
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
                <input 
                  type="text" 
                  placeholder="Search activity..." 
                  className="w-full bg-transparent border border-zinc-200 py-2 pl-10 pr-4 text-xs text-zinc-800 outline-none focus:border-black transition-colors rounded-md placeholder-zinc-400"
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto w-full border-t border-zinc-100">
              {chatList.map(chat => (
                <div 
                  key={chat.id} 
                  onClick={() => setActiveChat(chat)}
                  className="flex items-start gap-4 p-4 border-b border-zinc-100 hover:bg-zinc-50 cursor-pointer transition-colors active:bg-zinc-100"
                >
                  <div className="w-10 h-10 bg-zinc-100 flex-shrink-0 flex items-center justify-center border border-black rounded-full text-black">
                    <User size={20} className="currentColor" />
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-start mb-1">
                      <h3 className="font-bold text-zinc-800 text-sm truncate pr-2">{chat.name}</h3>
                      <span className={`text-[10px] shrink-0 ${chat.unread > 0 ? 'text-green-600 font-bold' : 'text-zinc-400'}`}>
                        {chat.time}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <p className="text-xs text-zinc-600 truncate pr-2">{chat.lastMessage}</p>
                      {chat.unread > 0 && (
                        <div className="w-5 h-5 bg-green-500 text-white text-[10px] font-bold flex items-center justify-center shrink-0 rounded-full">
                          {chat.unread}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        ) : (
          <motion.div 
            key="chatView"
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            className="flex flex-col h-full bg-[#efeae2] absolute inset-0 z-20"
          >
            {/* WhatsApp-style Chat Background Pattern */}
            <div 
              className="absolute inset-0 z-0 opacity-[0.4]"
              style={{
                backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'100\' height=\'100\' viewBox=\'0 0 100 100\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M20,10 Q30,20 20,30 T20,50 Q10,60 20,70 T20,90\' fill=\'none\' stroke=\'%23000000\' stroke-width=\'1\' opacity=\'0.2\'/%3E%3Ccircle cx=\'50\' cy=\'50\' r=\'2\' fill=\'%23000000\' opacity=\'0.2\'/%3E%3Cpath d=\'M80,20 L90,10 M80,80 L90,90\' stroke=\'%23000000\' stroke-width=\'1\' opacity=\'0.2\'/%3E%3C/svg%3E")',
                backgroundSize: '100px 100px'
              }}
            ></div>

            {/* WhatsApp-style Chat Header */}
            <header className="bg-white border-b border-zinc-200 flex items-center p-3 shrink-0 h-16 shadow-sm z-10">
              <button 
                onClick={() => setActiveChat(null)}
                className="flex items-center p-2 text-zinc-500 hover:text-black hover:bg-zinc-50 rounded-full transition-all mr-2"
              >
                <ChevronLeft size={20} />
              </button>
              <div className="w-10 h-10 bg-zinc-100 border border-black flex items-center justify-center shrink-0 mr-3 rounded-full text-black">
                 <User size={20} className="currentColor" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-zinc-800 text-sm tracking-wide">{activeChat.name}</h3>
                <p className="text-[10px] text-green-600 font-medium">online</p>
              </div>
            </header>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 relative z-10" ref={scrollRef}>
              <div className="flex justify-center mb-4 mt-2">
                <span className="bg-[#fff] px-3 py-1.5 rounded-lg shadow-sm font-medium text-[11px] text-zinc-500 uppercase tracking-widest bg-opacity-90">Today</span>
              </div>
              
              {messages.map((msg) => (
                <div key={msg.id} className={`flex w-full ${msg.isMe ? 'justify-end' : 'justify-start'}`}>
                  <div className={`p-2 rounded-md shadow-sm max-w-[80%] inline-block relative border ${msg.isMe ? 'bg-[#DCF8C6] border-[#DCF8C6]' : 'bg-white border-white'} ${msg.isMe ? 'rounded-tr-none' : 'rounded-tl-none'}`}>
                    
                    {msg.type === 'text' && (
                      <p className="text-xs text-zinc-800 break-words">{msg.text}</p>
                    )}
                    
                    {msg.type === 'image' && msg.mediaUrl && (
                      <div className="flex flex-col gap-1">
                        <img src={msg.mediaUrl} alt="attachment" className="rounded-sm max-h-48 object-cover" />
                        {msg.text && <p className="text-xs text-zinc-800 pt-1">{msg.text}</p>}
                      </div>
                    )}
                    
                    {msg.type === 'audio' && (
                      <div className="flex items-center gap-3 w-48 bg-black/5 rounded-full p-1 pr-3">
                        <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white shrink-0">
                          <Play size={14} fill="currentColor" />
                        </div>
                        <div className="flex-1 h-1 bg-black/20 rounded-full overflow-hidden">
                           <div className="w-1/3 h-full bg-blue-500"></div>
                        </div>
                        <span className="text-[10px] text-zinc-500 font-medium">0:{msg.duration?.toString().padStart(2, '0')}</span>
                      </div>
                    )}

                    <div className={`flex justify-end items-center gap-1 mt-1 ${msg.isMe ? 'text-emerald-700/80' : 'text-zinc-500'}`}>
                      <p className="text-[9px] font-medium uppercase">{msg.time}</p>
                      <CheckCheck size={12} className={msg.isMe ? "text-[#53bdeb]" : "text-zinc-400"} />
                    </div>
                    {/* Small tail */}
                    <div className={`absolute top-0 w-2 h-2 ${msg.isMe ? '-right-2 bg-[#DCF8C6]' : '-left-2 bg-white'}`} style={{ clipPath: msg.isMe ? 'polygon(0 0, 100% 0, 0 100%)' : 'polygon(100% 0, 0 0, 100% 100%)' }}></div>
                  </div>
                </div>
              ))}
            </div>

            {/* Attachments Preview Modal */}
            <AnimatePresence>
              {previewImages.length > 0 && (
                <motion.div 
                  initial={{ y: '100%' }}
                  animate={{ y: 0 }}
                  exit={{ y: '100%' }}
                  className="absolute inset-0 bg-white z-50 flex flex-col"
                >
                  <header className="flex justify-between items-center p-3 h-16 bg-black text-white shrink-0">
                    <button onClick={() => setPreviewImages([])}><X size={24} /></button>
                    <span className="text-sm font-bold">Preview</span>
                    <div className="w-6"></div>
                  </header>
                  <div className="flex-1 bg-zinc-900 flex items-center justify-center p-4">
                    <img src={previewImages[0]} alt="preview" className="max-w-full max-h-full object-contain" />
                  </div>
                  <div className="bg-black p-2 flex items-center gap-2 pb-safe">
                    <input 
                      type="text" 
                      placeholder="Add a caption..." 
                      className="flex-1 bg-zinc-800 text-white rounded-full px-4 py-3 outline-none text-sm placeholder-zinc-400"
                      value={messageText}
                      onChange={e => setMessageText(e.target.value)}
                    />
                    <button 
                      onClick={() => {
                        setMessages(prev => [...prev, { id: Math.random().toString(), text: messageText, time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}), isMe: true, type: 'image', mediaUrl: previewImages[0] }]);
                        setMessageText('');
                        setPreviewImages([]);
                        setTimeout(() => scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight), 100);
                      }}
                      className="w-12 h-12 bg-[#00A884] text-white rounded-full flex items-center justify-center shrink-0 shadow-md"
                    >
                      <Send size={20} className="ml-1" />
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Input Area */}
            <div className="bg-[#F0F0F0] p-2 shrink-0 pb-safe flex items-end gap-2 relative z-10 shadow-md">
              <input 
                type="file" 
                multiple 
                accept="image/*" 
                ref={fileInputRef} 
                className="hidden" 
                onChange={(e) => {
                  if (e.target.files && e.target.files.length > 0) {
                     const url = URL.createObjectURL(e.target.files[0]);
                     setPreviewImages([url]);
                  }
                }} 
              />
              <div className="flex-1 bg-white rounded-md border border-zinc-200 shadow-sm overflow-hidden flex items-end relative">
                {!isRecording && (
                  <button onClick={() => fileInputRef.current?.click()} className="p-3 text-zinc-500 hover:text-black">
                    <Paperclip size={20} />
                  </button>
                )}
                
                {isRecording ? (
                  <div className="flex-1 flex items-center gap-3 px-4 py-3 bg-red-50 text-red-500">
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
                    onChange={(e) => setMessageText(e.target.value)}
                    placeholder="Message"
                    className="flex-1 bg-transparent resize-none max-h-24 min-h-[40px] px-3 py-3 text-xs text-zinc-800 focus:outline-none placeholder-zinc-400"
                    rows={1}
                  />
                )}
              </div>
              
              {messageText.trim().length > 0 ? (
                <button 
                  onClick={() => {
                    setMessages(prev => [...prev, { id: Math.random().toString(), text: messageText, time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}), isMe: true, type: 'text' }]);
                    setMessageText('');
                    setTimeout(() => scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight), 100);
                  }}
                  className="w-10 h-10 flex items-center justify-center shrink-0 transition-colors rounded-full shadow-sm bg-[#00A884] text-white hover:bg-[#008f6f]"
                >
                  <Send size={18} className="ml-0.5" />
                </button>
              ) : (
                <button 
                  onClick={() => {
                    if (isRecording) {
                      setIsRecording(false);
                      setMessages(prev => [...prev, { id: Math.random().toString(), text: '', time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}), isMe: true, type: 'audio', duration: recordingDuration }]);
                      setRecordingDuration(0);
                      setTimeout(() => scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight), 100);
                    } else {
                      setIsRecording(true);
                    }
                  }}
                  className={`w-10 h-10 flex items-center justify-center shrink-0 transition-colors rounded-full shadow-sm ${
                    isRecording ? 'bg-red-500 text-white' : 'bg-[#00A884] text-white hover:bg-[#008f6f]'
                  }`}
                >
                  {isRecording ? <Square size={16} fill="currentColor" /> : <Mic size={18} />}
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
