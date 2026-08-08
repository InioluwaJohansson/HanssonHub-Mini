import { useEffect } from 'react';
import { motion } from 'motion/react';
import { Shield } from 'lucide-react';

export default function Splash({ onComplete }: { onComplete: () => void }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onComplete();
    }, 3000);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div className="flex h-full w-full flex-col items-center justify-center bg-white relative overflow-hidden select-none">
      <div className="relative flex items-center justify-center">
        {/* Soft radial glow behind the shield */}
        <motion.div
          className="absolute w-40 h-40 rounded-full bg-zinc-900/15 blur-2xl pointer-events-none"
          animate={{
            scale: [0.8, 1.4, 0.95, 1.3, 0.75],
            opacity: [0.2, 0.95, 0.35, 0.85, 0.1]
          }}
          transition={{
            duration: 3,
            ease: "easeInOut"
          }}
        />

        {/* Shield icon glowing from light to dark */}
        <motion.div
          animate={{
            scale: [0.85, 1.15, 0.92, 1.08, 0.88],
            opacity: [0.3, 1, 0.4, 0.9, 0.2],
            filter: [
              "drop-shadow(0 0 4px rgba(24, 24, 27, 0.2))",
              "drop-shadow(0 0 28px rgba(24, 24, 27, 0.85))",
              "drop-shadow(0 0 8px rgba(24, 24, 27, 0.3))",
              "drop-shadow(0 0 32px rgba(24, 24, 27, 0.9))",
              "drop-shadow(0 0 2px rgba(24, 24, 27, 0.1))"
            ]
          }}
          transition={{
            duration: 3,
            ease: "easeInOut"
          }}
        >
          <Shield size={84} className="text-zinc-900" strokeWidth={2.2} fill="currentColor" />
        </motion.div>
      </div>
    </div>
  );
}

