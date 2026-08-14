import { useState, useEffect } from 'react';
import { Maximize2, X, Video, Search, LoaderCircle, Calendar, PlayCircle, Settings, Film } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import HLSPlayer from '../components/HLSPlayer';
import { useData, CameraData } from '../context/DataContext';

export default function Cameras() {
  const { cameras, loading } = useData();
  const [expandedCam, setExpandedCam] = useState<CameraData | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Extra states for details viewing
  const [playingRecordingUrl, setPlayingRecordingUrl] = useState<string | null>(null);
  const [playingRecordingName, setPlayingRecordingName] = useState<string>('');

  // Auto close expanded camera if it gets deleted
  useEffect(() => {
    if (expandedCam && !cameras.some(c => String(c.id) === String(expandedCam.id))) {
      handleCloseExpanded();
    }
  }, [cameras, expandedCam]);

  const handleCloseExpanded = () => {
    setExpandedCam(null);
    setPlayingRecordingUrl(null);
    setPlayingRecordingName('');
  };

  const getRecordingUrl = (rec: any) => {
    const rawPath = rec.recordingPath ?? rec.RecordingPath ?? rec.filePath ?? rec.FilePath ?? rec.streamUrl ?? rec.StreamUrl ?? rec.url ?? rec.Url ?? '';
    if (!rawPath) return '';
    const trimmed = rawPath.trim();
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      return trimmed;
    }
    const baseUrl = "https://kv5zhpcr-7190.uks1.devtunnels.ms/storage/";
    if (trimmed.startsWith('/')) {
      return `${baseUrl}${trimmed.substring(1)}`;
    }
    return `${baseUrl}${trimmed}`;
  };

  if (loading) {
    return (
      <div className="p-5 flex flex-col gap-3 min-h-[400px] justify-center items-center">
        <LoaderCircle size={36} className="animate-spin text-purple-500" />
        <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest mt-2">Loading Cameras...</p>
      </div>
    );
  }

  const filteredCameras = cameras.filter(cam => cam.name?.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <>
      <div className="p-5 flex flex-col gap-4">
        <div className="flex flex-col gap-1 mb-2">
          <h3 className="text-3xl font-black text-zinc-900 flex items-center gap-2">
            <Video size={32} className="text-purple-600" /> Cameras
          </h3>
          <p className="text-xs text-zinc-500 font-medium tracking-wide">Surveillance and recording control terminal</p>
        </div>
        
        <div className="relative mb-2">
          <Search size={16} className="absolute left-0 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input 
            type="text" 
            autoComplete="off"
            placeholder="Search cameras by name..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-transparent border-b-2 border-zinc-200 focus:border-black rounded-none py-2 pl-6 pr-0 text-sm focus:outline-none transition-colors"
          />
        </div>

        <div className="flex flex-col gap-5">
          {filteredCameras.length > 0 ? (
            filteredCameras.map(cam => (
              <div 
                key={cam.id} 
                className="group cursor-pointer bg-white rounded-3xl overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.02)] hover:shadow-[0_15px_35px_rgb(124,58,237,0.08)] transition-all border border-zinc-100 hover:border-purple-200/80 flex flex-col"
                onClick={() => setExpandedCam(cam)}
              >
                <div className="w-full h-52 bg-zinc-900 flex justify-center items-center relative overflow-hidden">
                  <HLSPlayer url={cam.streamUrl} className="w-full h-full opacity-85 group-hover:opacity-100 group-hover:scale-102 transition-all duration-700 pointer-events-none" />
                  
                  {/* Top Overlay details */}
                  <div className="absolute top-0 left-0 w-full p-5 bg-gradient-to-b from-black/80 to-transparent flex justify-between items-start z-10 h-24">
                    <div className="flex flex-col gap-0.5">
                      <span className="font-black text-white drop-shadow-md tracking-tight text-base">{cam.name}</span>
                      {cam.cameraId && <span className="text-[10px] text-zinc-300 font-mono font-bold tracking-wider uppercase opacity-80">{cam.cameraId}</span>}
                    </div>
                    <div className="flex items-center gap-1.5 bg-red-500/90 backdrop-blur-sm px-2.5 py-1 rounded-full shadow-lg border border-red-400">
                      <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                      <span className="text-[9px] text-white font-bold tracking-widest uppercase">LIVE</span>
                    </div>
                  </div>

                  {/* Bottom Right Network Pill overlay on video */}
                  <div className="absolute bottom-4 right-4 z-10 bg-zinc-900/80 backdrop-blur-md px-3 py-1.5 rounded-xl border border-zinc-700/50 text-[10px] font-mono text-zinc-300 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                    {cam.ipAddress || '127.0.0.1'}:{cam.port || '80'}
                  </div>

                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-black/20 transition-opacity">
                    <Maximize2 className="text-white drop-shadow-md" size={32} />
                  </div>
                </div>

                {/* Surveillance Card Footer specs */}
                <div className="p-4 px-5 bg-zinc-50 border-t border-zinc-100 flex items-center justify-between text-xs text-zinc-500 font-medium">
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                    <span className="text-[10px] font-black uppercase tracking-wider text-green-600">ONLINE</span>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    {cam.recordings && cam.recordings.length > 0 && (
                      <span className="bg-purple-500/10 text-purple-700 border border-purple-100 px-2.5 py-0.5 rounded-full font-bold text-[10px]">
                        {cam.recordings.length} recordings
                      </span>
                    )}
                  </div>
                </div>

              </div>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center py-20 bg-zinc-50 rounded-3xl border border-dashed border-zinc-200 gap-4">
              <div className="p-4 bg-white rounded-full shadow-sm border border-zinc-100">
                <Video size={48} className="text-zinc-300" />
              </div>
              <div className="text-center">
                <p className="text-zinc-900 font-bold">No cameras found</p>
                <p className="text-zinc-500 text-xs mt-1">There are no camera feeds matching your search.</p>
              </div>
            </div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {expandedCam && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-zinc-950 flex flex-col md:flex-row font-sans"
          >
            {/* Header for mobile since it can span the top */}
            <div className="md:hidden p-4 flex justify-between items-center bg-zinc-900 border-b border-zinc-800 z-10">
               <div className="flex items-center gap-2">
                 <div className="w-2.5 h-2.5 bg-red-500 animate-pulse rounded-full"></div>
                 <h3 className="text-sm font-black uppercase tracking-wider text-white truncate max-w-[200px]">{expandedCam.name}</h3>
               </div>
               <button 
                 onClick={handleCloseExpanded}
                 className="p-1.5 border border-zinc-700 bg-zinc-800 text-zinc-300 hover:bg-zinc-700 hover:text-white transition-colors rounded-lg"
               >
                 <X size={18} />
               </button>
            </div>

            {/* Main Video Area */}
            <div className="flex-1 flex flex-col relative justify-center items-center bg-zinc-950 p-4 min-h-[30vh]">
              {/* Desktop Absolute Header overlay */}
              <div className="hidden md:flex absolute top-4 left-4 right-4 justify-between items-center z-10 pointer-events-none">
                <div className="flex items-center gap-2.5 bg-zinc-900/90 backdrop-blur-md border border-zinc-800 px-4 py-2 rounded-2xl shadow-xl pointer-events-auto">
                  <div className="w-2.5 h-2.5 bg-red-500 animate-pulse rounded-full"></div>
                  <span className="text-sm font-black text-white tracking-wide">
                    {playingRecordingUrl ? `PLAYING CLIP: ${playingRecordingName}` : `${expandedCam.name} (LIVE SURVEILLANCE)`}
                  </span>
                  {playingRecordingUrl && (
                    <button 
                      onClick={() => { setPlayingRecordingUrl(null); setPlayingRecordingName(''); }}
                      className="ml-2 text-xs bg-purple-600 hover:bg-purple-700 text-white font-extrabold px-2.5 py-1 rounded-lg pointer-events-auto transition-colors shadow-sm"
                    >
                      Back to Live Stream
                    </button>
                  )}
                </div>
                
                <button 
                  onClick={handleCloseExpanded}
                  className="p-3 border border-zinc-800 bg-zinc-900/90 backdrop-blur-md text-zinc-300 hover:bg-zinc-800 hover:text-white transition-all rounded-2xl pointer-events-auto shadow-xl"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Video Player */}
              <div className="w-full max-w-5xl aspect-video rounded-3xl overflow-hidden border border-zinc-800 shadow-[0_20px_50px_rgba(0,0,0,0.5)] bg-black">
                <HLSPlayer 
                  url={playingRecordingUrl || expandedCam.streamUrl} 
                  className="w-full h-full object-contain" 
                  autoPlay={true}
                  muted={true}
                />
              </div>

              {/* Mobile Back to Live button */}
              {playingRecordingUrl && (
                <button 
                  onClick={() => { setPlayingRecordingUrl(null); setPlayingRecordingName(''); }}
                  className="md:hidden mt-4 w-full max-w-sm bg-purple-600 hover:bg-purple-700 text-white font-black text-xs uppercase tracking-widest py-3 rounded-xl transition-colors shadow-lg flex items-center justify-center gap-2"
                >
                  <Video size={14} /> Back to Live Stream
                </button>
              )}
            </div>

            {/* Sidebar Details Panel */}
            <div className="w-full md:w-96 bg-zinc-900/90 backdrop-blur-lg border-t md:border-t-0 md:border-l border-zinc-800 flex flex-col h-[50vh] md:h-screen overflow-y-auto">
              {/* Sidebar Header */}
              <div className="p-5 border-b border-zinc-800 flex flex-col gap-1.5 shrink-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Settings size={20} className="text-purple-400" />
                    <h4 className="font-black text-white text-sm tracking-wide uppercase">Camera Control Hub</h4>
                  </div>
                  <div className="text-[10px] bg-purple-500/15 border border-purple-500/30 text-purple-400 px-2 py-0.5 rounded-full font-black uppercase tracking-wider">
                    Configured
                  </div>
                </div>
                <div className="text-zinc-400 text-xs font-bold mt-2 truncate">
                  Camera Name: <span className="text-white text-sm font-black">{expandedCam.name}</span>
                </div>
              </div>

              {/* Meta information lists */}
              <div className="p-5 flex flex-col gap-6 flex-1">
                {/* Recordings History Panel */}
                <div className="flex flex-col gap-3">
                  <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500 flex items-center gap-1.5">
                    <Film size={12} /> Recorded Clips ({expandedCam.recordings?.length || 0})
                  </span>
                  
                  {expandedCam.recordings && expandedCam.recordings.length > 0 ? (
                    <div className="flex flex-col gap-2 max-h-60 overflow-y-auto pr-1">
                      {expandedCam.recordings.map((rec: any, idx: number) => {
                        const recUrl = getRecordingUrl(rec);
                        const isCurrentlyPlaying = playingRecordingUrl === recUrl;
                        return (
                          <button
                            key={rec.id ?? idx}
                            onClick={() => {
                              setPlayingRecordingUrl(recUrl);
                              setPlayingRecordingName(rec.fileName ?? rec.FileName ?? `Clip #${idx + 1}`);
                            }}
                            className={`w-full flex items-center gap-3 p-3 rounded-2xl text-left border transition-all ${
                              isCurrentlyPlaying 
                                ? 'bg-purple-500/10 border-purple-500 text-white shadow-md' 
                                : 'bg-zinc-950/40 border-zinc-800 hover:border-zinc-700 text-zinc-300 hover:text-white'
                            }`}
                          >
                            <PlayCircle size={20} className={isCurrentlyPlaying ? 'text-purple-400' : 'text-zinc-500'} />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-bold truncate">{rec.fileName ?? rec.FileName ?? `Recorded Footage #${idx + 1}`}</p>
                              <div className="flex gap-2 text-[10px] text-zinc-500 font-medium mt-1">
                                <span className="flex items-center gap-0.5">
                                  <Calendar size={10} /> {rec.startTime ? new Date(rec.startTime).toLocaleDateString() : 'N/A'}
                                </span>
                                {rec.duration && <span>{rec.duration}s</span>}
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-6 bg-zinc-950/30 rounded-2xl border border-dashed border-zinc-800 gap-2">
                      <Film size={24} className="text-zinc-600" />
                      <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">No local recordings found</p>
                    </div>
                  )}
                </div>

              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
