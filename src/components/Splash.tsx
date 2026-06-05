import { motion } from 'motion/react';
import { Shield } from 'lucide-react';

export default function Splash({ onComplete }: { onComplete: () => void }) {
  return (
    <div className="flex h-full w-full flex-col px-6 items-center justify-center bg-white relative">
      <div className="relative p-8 flex flex-col items-center justify-center bg-white h-[200px] w-full max-w-sm overflow-hidden gap-4">
        
        <h1 className="text-3xl tracking-tight z-10 flex items-center text-zinc-800 gap-1">
          <Shield size={28} className="text-black" strokeWidth={2.5} fill="transparent" />
          <div className="relative p-3 inline-flex items-center justify-center w-64 h-16">
            
            <svg 
              className="absolute inset-0 w-full h-full pointer-events-none" 
              viewBox="0 0 200 40" 
              style={{ overflow: 'visible' }}
            >
              <defs>
                <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="2" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
              </defs>
              <motion.text
                x="50%"
                y="55%"
                textAnchor="middle"
                dominantBaseline="middle"
                className="text-[28px] fill-transparent stroke-black drop-shadow-md"
                strokeWidth="1.2"
                filter="url(#glow)"
                initial={{ strokeDasharray: 300, strokeDashoffset: 300 }}
                animate={{ strokeDasharray: 300, strokeDashoffset: 0 }}
                transition={{ duration: 1.5, repeat: 4, ease: "linear" }}
                onAnimationComplete={onComplete}
              >
                <tspan className="font-black">H</tspan>
                <tspan className="font-medium tracking-tighter">ansson</tspan>
                <tspan className="font-black">H</tspan>
                <tspan className="font-medium tracking-tighter">ub</tspan>
              </motion.text>
            </svg>
            
            <span className="opacity-10 absolute inset-0 flex items-center justify-center">
              <span>
                <span className="font-black text-black">H</span><span className="font-medium tracking-tighter">ansson</span><span className="font-black text-black">H</span><span className="font-medium tracking-tighter">ub</span>
              </span>
            </span>
          </div>
        </h1>
      </div>
    </div>
  );
}
