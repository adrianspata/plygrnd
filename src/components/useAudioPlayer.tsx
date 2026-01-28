import { useState, useRef, useCallback, useEffect } from "react";

export interface AudioPlayerControls {
  isMuted: boolean;
  volume: number;
  isPlaying: boolean;
  toggleMute: () => void;
  setMuted: (muted: boolean) => void;
  setVolume: (volume: number) => void;
  play: () => void;
  pause: () => void;
  togglePlay: () => void;
  audioRef: React.MutableRefObject<HTMLAudioElement | null>;
}

/**
 * A hook to manage audio playback state.
 * Designed to be compatible with future Spotify Web Playback SDK integration.
 *
 * Currently manages local state and an HTMLAudioElement ref.
 */
export function useAudioPlayer(initialVolume = 0.5): AudioPlayerControls {
  const [isMuted, setIsMutedState] = useState(true); // Default to muted for autoplay policies usually
  const [volume, setVolumeState] = useState(initialVolume);
  const [isPlaying, setIsPlaying] = useState(false);

  // Ref to hold the actual audio element or future Spotify player instance
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // --- Internal helpers to sync state with ref ---

  const syncVolume = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
      audioRef.current.muted = isMuted;
    }
  }, [volume, isMuted]);

  // Sync on mount/updates
  useEffect(() => {
    syncVolume();
  }, [syncVolume]);

  // --- Public API ---

  const setVolume = useCallback((newVolume: number) => {
    const clamped = Math.max(0, Math.min(1, newVolume));
    setVolumeState(clamped);
    if (audioRef.current) {
      audioRef.current.volume = clamped;
    }
  }, []);

  const setMuted = useCallback(
    (muted: boolean) => {
      setIsMutedState(muted);
      if (audioRef.current) {
        audioRef.current.muted = muted;
      }
    },
    [],
  );

  const toggleMute = useCallback(() => {
    setMuted(!isMuted);
  }, [isMuted, setMuted]);

  const play = useCallback(async () => {
    setIsPlaying(true);
    if (audioRef.current) {
      try {
        await audioRef.current.play();
      } catch (err) {
        console.warn("Audio playback failed (likely due to autoplay policy):", err);
        setIsPlaying(false);
      }
    }
  }, []);

  const pause = useCallback(() => {
    setIsPlaying(false);
    if (audioRef.current) {
      audioRef.current.pause();
    }
  }, []);

  const togglePlay = useCallback(() => {
    if (isPlaying) {
      pause();
    } else {
      play();
    }
  }, [isPlaying, pause, play]);

  return {
    isMuted,
    volume,
    isPlaying,
    toggleMute,
    setMuted,
    setVolume,
    play,
    pause,
    togglePlay,
    audioRef,
  };
}

export const SpotifyEmbed = ({ shouldPlay }: { shouldPlay: boolean }) => {
  const elementRef = useRef<HTMLDivElement>(null);
  const [embedController, setEmbedController] = useState<any>(null);

  useEffect(() => {
    // 1. Define the callback FIRST
    (window as any).onSpotifyIframeApiReady = (IFrameAPI: any) => {
      const element = elementRef.current;
      if (!element) return;

      const options = {
        width: "100%",
        height: "352",
        uri: "spotify:playlist:3xD9gxk89o4VeFz6TnMFJl",
      };

      const callback = (EmbedController: any) => {
        setEmbedController(EmbedController);
      };

      IFrameAPI.createController(element, options, callback);
    };

    // 2. Load the script if needed
    if (!document.getElementById("spotify-iframe-api")) {
      const script = document.createElement("script");
      script.id = "spotify-iframe-api";
      script.src = "https://open.spotify.com/embed/iframe-api/v1";
      script.async = true;
      document.body.appendChild(script);
    }
  }, []);

  // 3. Control playback
  useEffect(() => {
    if (!embedController) return;

    if (shouldPlay) {
      embedController.play();
    } else {
      embedController.pause();
    }
  }, [shouldPlay, embedController]);

  return <div ref={elementRef} />;
};