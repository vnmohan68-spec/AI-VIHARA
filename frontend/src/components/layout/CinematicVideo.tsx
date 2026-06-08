import { useEffect, useRef, useState, useCallback } from 'react';

type Theme = 'gold' | 'ocean' | 'forest' | 'sky' | 'dusk';

const BG: Record<Theme, string> = {
  gold:   '#0a0800',
  ocean:  '#020810',
  forest: '#020a04',
  sky:    '#04060e',
  dusk:   '#0a0408',
};

// Fallback order if a video fails
const FALLBACK_VIDEOS = ['/videos/temple.mp4', '/videos/beach.mp4', '/videos/forest.mp4'];

interface Props {
  src: string;
  theme?: Theme;
  opacity?: number;
  zoom?: boolean;
}

export default function CinematicVideo({ src, theme = 'gold', opacity = 0.7, zoom = true }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [activeSrc, setActiveSrc] = useState(src);
  const [failedSrcs, setFailedSrcs] = useState<Set<string>>(new Set());
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reset activeSrc when prop changes
  useEffect(() => {
    setActiveSrc(src);
  }, [src]);

  const tryPlay = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    v.play().catch((err) => {
      // Autoplay blocked — retry once after 300ms (e.g. after user interaction)
      console.warn('Autoplay deferred, retrying…', err);
      retryTimerRef.current = setTimeout(() => {
        v.play().catch(() => {});
      }, 300);
    });
  }, []);

  const handleError = useCallback(() => {
    console.error('Video failed to load:', activeSrc);
    setFailedSrcs(prev => {
      const next = new Set(prev);
      next.add(activeSrc);
      return next;
    });
    // Pick next available fallback
    const next = FALLBACK_VIDEOS.find(v => v !== activeSrc && !failedSrcs.has(v));
    if (next) {
      console.info('Switching to fallback video:', next);
      setActiveSrc(next);
    }
  }, [activeSrc, failedSrcs]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;

    // Reload when src changes
    v.load();
    tryPlay();

    return () => {
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
    };
  }, [activeSrc, tryPlay]);

  return (
    <div
      style={{
        position: 'absolute',
        top: 0, left: 0, right: 0, bottom: 0,
        background: BG[theme],
        overflow: 'hidden',
      }}
    >
      <video
        ref={videoRef}
        key={activeSrc}
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        onLoadedData={tryPlay}
        onCanPlay={tryPlay}
        onError={handleError}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          opacity,
          animation: zoom ? 'cinematicZoom 30s ease-in-out infinite alternate' : 'none',
        }}
      >
        <source src={activeSrc} type="video/mp4" />
      </video>
    </div>
  );
}
