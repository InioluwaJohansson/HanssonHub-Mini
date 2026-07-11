import React, { useEffect, useRef } from 'react';
import Hls from 'hls.js';

interface HLSPlayerProps {
  url: string;
  className?: string;
  autoPlay?: boolean;
  muted?: boolean;
}

export default function HLSPlayer({ url, className = '', autoPlay = true, muted = true }: HLSPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    let hls: Hls | null = null;
    const video = videoRef.current;

    if (!video) return;

    if (Hls.isSupported() && url.includes('.m3u8')) {
      hls = new Hls({
        startLevel: -1,
        capLevelToPlayerSize: true,
      });
      hls.loadSource(url);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        if (autoPlay) {
          video.play().catch(e => console.warn('HLS autoplay failed:', e));
        }
      });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // Native HLS support (Safari)
      video.src = url;
      video.addEventListener('loadedmetadata', () => {
        if (autoPlay) {
          video.play().catch(e => console.warn('Native HLS autoplay failed:', e));
        }
      });
    } else {
      // Fallback for direct mp4 or other supported types, or just an image if not video?
      video.src = url;
    }

    return () => {
      if (hls) {
        hls.destroy();
      }
    };
  }, [url, autoPlay]);

  // If the url is just an image URL (e.g. .jpg, .png, fallback Unsplash URL), we shouldn't use video tag.
  // We can do a quick check to see if it's an image.
  const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(url) || url.includes('unsplash');

  if (isImage) {
    return <img src={url} alt="Camera Stream" className={`object-cover ${className}`} />;
  }

  return (
    <video
      ref={videoRef}
      className={`object-cover ${className}`}
      autoPlay={autoPlay}
      muted={muted}
      playsInline
    />
  );
}
