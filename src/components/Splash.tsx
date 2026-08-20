import { useEffect } from 'react';
import { motion } from 'motion/react';
import ShieldHLogo from './ShieldHLogo';

export default function Splash({ onComplete }: { onComplete: () => void }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onComplete();
    }, 3000);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div className="flex h-full w-full flex-col items-center justify-center bg-black relative overflow-hidden select-none">
      <div className="relative flex items-center justify-center">
        {/* Soft radial glow behind the shield */}
        <motion.div
          className="absolute w-48 h-48 rounded-full bg-white/10 blur-3xl pointer-events-none"
          animate={{
            scale: [0.8, 1.4, 0.95, 1.3, 0.75],
            opacity: [0.2, 0.95, 0.35, 0.85, 0.1]
          }}
          transition={{
            duration: 3,
            ease: "easeInOut"
          }}
        />

        {/* Shield icon with white border and H text on black background */}
        <motion.div
          animate={{
            scale: [0.85, 1.15, 0.92, 1.08, 0.88],
            opacity: [0.3, 1, 0.4, 0.9, 0.2],
            filter: [
              "drop-shadow(0 0 4px rgba(255, 255, 255, 0.2))",
              "drop-shadow(0 0 28px rgba(255, 255, 255, 0.6))",
              "drop-shadow(0 0 8px rgba(255, 255, 255, 0.3))",
              "drop-shadow(0 0 32px rgba(255, 255, 255, 0.7))",
              "drop-shadow(0 0 2px rgba(255, 255, 255, 0.1))"
            ]
          }}
          transition={{
            duration: 3,
            ease: "easeInOut"
          }}
        >
          <ShieldHLogo size={96} />
        </motion.div>
      </div>
    </div>
  );
}

