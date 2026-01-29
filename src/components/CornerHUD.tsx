import styles from "../styles/CornerHUD.module.css";

interface CornerHUDProps {
  scrollProgress: number;
  soundOn: boolean;
  onSoundToggle: () => void;
  className?: string;
}

export const CornerHUD = ({
  scrollProgress,
  soundOn,
  onSoundToggle,
  className,
}: CornerHUDProps) => {
  const scrollPercentage = Math.round(scrollProgress * 100);
  const showScrollText = scrollProgress < 0.1;

  return (
    <div className={`${styles.container} ${className || ""}`}>
      {/* Top Left - Brand */}
      <div className={styles.topLeft}>
        <button
          onClick={() => window.location.reload()}
          className={styles.brandButton}
          aria-label="Reload page"
        >
          PLYGRND.
        </button>
      </div>

      {/* Top Right - Sound Toggle */}
      <div className={styles.topRight}>
        <button
          onClick={onSoundToggle}
          className={styles.soundToggle}
          aria-label={soundOn ? "Turn sound off" : "Turn sound on"}
        >
          SOUND {soundOn ? "OFF" : "ON"}
          <span className={styles.soundIndicator}>
            {soundOn ? "◻︎" : "◼︎"}
          </span>
        </button>
      </div>

      {/* Bottom Left - Scroll Percentage */}
      <div className={styles.bottomLeft}>
        <span className={styles.scrollPercentage}>{scrollPercentage}%</span>
        <div className={styles.progressBarContainer}>
          <div className={styles.progressBarTrack}>
            <div
              className={styles.progressBarFill}
              style={{ width: `${scrollPercentage}%` }}
            />
          </div>
        </div>
      </div>

      {/* Bottom Right - Scroll Hint */}
      <div
        className={`${styles.bottomRight} ${showScrollText ? styles.visible : styles.hidden}`}
      >
        <span className={styles.scrollText}>SCROLL</span>
        <div className={styles.verticalLine} />
      </div>
    </div>
  );
};
