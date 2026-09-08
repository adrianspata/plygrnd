import { useAudioPlayer, SpotifyEmbed } from "./useAudioPlayer";
import { CornerHUD } from "./CornerHUD";
import { CustomCursor } from "./CustomCursor";
import styles from "../styles/About.module.css";

export default function AboutPage() {
  const { isMuted, toggleMute } = useAudioPlayer();

  return (
    <main className={styles.container}>
      {/* Central Interactive Content */}
      <div
        className={styles.aboutInteraction}
        tabIndex={0}
        role="region"
        aria-label="About PLYGRND"
      >
        <p className={styles.aboutText}>
          Introducing plygrnd. - an independent creative studio, service, and
          platform built around crafting and designing experiences, shaping
          identities, and building meaningful collaborations.
        </p>

        <div className={styles.aboutLogoWrapper} aria-hidden="true">
          <img
            src="/assets/png2.png"
            alt=""
            className={styles.aboutLogo}
            width="120"
            height="120"
          />
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
