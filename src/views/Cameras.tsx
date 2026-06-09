import { useState, useEffect } from 'react';
import { Maximize2, X, AlertCircle, Video } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { getAllCameras } from '../utils/api';

type CameraData = {
  id: string;
  name: string;
  imgUrl: string;
};

export default function Cameras() {
  const [cameras, setCameras] = useState<CameraData[]>([]);
  const [expandedCam, setExpandedCam] = useState<CameraData | null>(null);

  useEffect(() => {
    const fetchCameras = async () => {
      try {
        const response = await getAllCameras();
        if (response.status && response.data) {
          const mappedCameras = response.data.map((c: any, index: number) => ({
            id: String(c.id ?? c.Id ?? index),
            name: c.name ?? c.Name ?? `Camera ${c.id ?? c.Id ?? index}`,
            // In case the API doesn't provide an image, fallback to a placeholder
            imgUrl: c.imgUrl ?? c.ImgUrl ?? c.imageUrl ?? c.ImageUrl ?? 'https://images.unsplash.com/photo-1558002038-1055907df827?q=80&w=1470&auto=format&fit=crop'
          }));
          setCameras(mappedCameras);
        }
      } catch (err) {
        console.error("Failed to fetch cameras", err);
      }
    };
    fetchCameras();
  }, []);

  return (
    <>
      <div className="p-5 flex flex-col gap-4">
        <div className="flex flex-col gap-1 mb-2">
          <h3 className="text-3xl font-black text-zinc-900 flex items-center gap-2"><Video size={32} className="text-purple-600" /> Cameras</h3>
          <p className="text-xs text-zinc-500 font-medium tracking-wide">Live surveillance feeds</p>
        </div>
        
        <div className="flex flex-col gap-5">
          {cameras.length > 0 ? (
            cameras.map(cam => (
              <div 
                key={cam.id} 
                className="group cursor-pointer bg-white rounded-2xl overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.12)] transition-all border border-purple-100"
                onClick={() => setExpandedCam(cam)}
              >
                <div className="w-full h-48 bg-zinc-900 flex justify-center items-center relative overflow-hidden">
                  <img src={cam.imgUrl} alt={cam.name} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-700" />
                  
                  <div className="absolute top-0 left-0 w-full p-4 bg-gradient-to-b from-black/80 to-transparent flex justify-between items-start z-10 h-24">
                    <span className="font-black text-white drop-shadow-md tracking-tight">{cam.name}</span>
                    <div className="flex items-center gap-1.5 bg-red-500/90 backdrop-blur-sm px-2.5 py-1 rounded-full shadow-lg border border-red-400">
                      <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                      <span className="text-[9px] text-white font-bold tracking-widest uppercase">LIVE</span>
                    </div>
                  </div>

                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-black/20 transition-opacity">
                    <Maximize2 className="text-white drop-shadow-md" size={32} />
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
                <p className="text-zinc-900 font-bold">No cameras to view yet</p>
                <p className="text-zinc-500 text-xs mt-1">There are no active camera feeds registered.</p>
              </div>
            </div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {expandedCam && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ type: "spring", damping: 30, stiffness: 400 }}
            className="fixed inset-0 z-50 bg-black flex flex-col"
          >
            <div className="p-3 flex justify-between items-center bg-black/80 absolute top-0 left-0 w-full z-10 border-b border-zinc-800">
               <div className="flex items-center gap-2 px-2">
                 <div className="w-2 h-2 bg-red-500 animate-pulse rounded-full"></div>
                 <h3 className="text-xs font-black uppercase tracking-widest text-white">{expandedCam.name}</h3>
               </div>
               <button 
                 onClick={() => setExpandedCam(null)}
                 className="p-2 border border-zinc-800 bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors"
               >
                 <X size={20} />
               </button>
            </div>
            <div className="flex-1 w-full h-full flex items-center justify-center p-4 pt-16">
              <img src={expandedCam.imgUrl} alt={expandedCam.name} className="w-full h-auto max-h-full object-contain border border-zinc-900 shadow-2xl rounded-md" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
