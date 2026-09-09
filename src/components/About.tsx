import { useState } from "react";
import { useAudioPlayer, SpotifyEmbed } from "./useAudioPlayer";
import { CornerHUD } from "./CornerHUD";
import { CustomCursor } from "./CustomCursor";
import styles from "../styles/About.module.css";

export default function AboutPage() {
  const { isMuted, toggleMute } = useAudioPlayer();
  const [isActive, setIsActive] = useState(false);

  return (
    <main
      className={styles.container}
      onClick={() => setIsActive(false)}
    >
      {/* Central Interactive Content */}
      <div
        className={`${styles.aboutInteraction} ${isActive ? styles.active : ""}`}
        tabIndex={0}
        role="region"
        aria-label="About PLYGRND"
        onClick={(e) => {
          e.stopPropagation();
          setIsActive((prev) => !prev);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setIsActive((prev) => !prev);
          }
        }}
      >
        <p className={styles.aboutText}>
          Introducing plygrnd. - an independent creative studio, service, and
          platform built around crafting and designing experiences, shaping
          identities, and building meaningful collaborations.
        </p>

        <div className={styles.aboutLogoWrapper} aria-hidden="true">
          <div className={styles.logo3DContainer}>
            {Array.from({ length: 32 }).map((_, index) => {
              const totalLayers = 32;
              const maxDepth = 3.6; // -3.6px to +3.6px = ~7.2px sleek 3D depth
              const t = index / (totalLayers - 1); // 0 to 1
              const u = 2 * t - 1; // -1 to +1
              const z = u * maxDepth;

              // Smooth dome curve for rounded balloon contours
              const curve = Math.sqrt(Math.max(0, 1 - u * u));
              // Micro-balloon scale: curves seamlessly from 0.955 at caps to 1.00 at center
              const scale = 0.955 + 0.045 * Math.pow(curve, 0.7);

              const brightness = 0.94 + 0.08 * (u > 0 ? Math.pow(u, 0.7) : 0);
              const isFront = index === totalLayers - 1;
              const isBack = index === 0;

              return (
                <img
                  key={index}
                  src="/assets/png2.png"
                  alt={isFront ? "PLYGRND" : ""}
                  className={`${styles.logoLayer} ${
                    isFront
                      ? styles.frontLayer
                      : isBack
                        ? styles.backLayer
                        : styles.edgeLayer
                  }`}
                  style={{
                    transform: `translateZ(${z.toFixed(2)}px) scale(${scale.toFixed(4)})`,
                    filter: `brightness(${brightness.toFixed(3)})`,
                  }}
                  width="120"
                  height="120"
                  aria-hidden={!isFront}
                />
              );
            })}
          </div>
        </div>
      </div>

      {/* Navigation HUD */}
      <CornerHUD
        soundOn={!isMuted}
        onSoundToggle={toggleMute}
        hideScrollIndicators={true}
      />

      {/* Hidden Spotify Controller for persistent audio across routes */}
      <div
        style={{
          position: "fixed",
          bottom: 0,
          right: 0,
          width: 1,
          height: 1,
          opacity: 0,
          pointerEvents: "none",
          overflow: "hidden",
        }}
      >
        <SpotifyEmbed shouldPlay={!isMuted} />
      </div>

      {/* Custom Cursor */}
      <CustomCursor />
    </main>
  );
}
