import { useNavigate, useLocation } from "react-router-dom";
import styles from "../styles/CornerHUD.module.css";

interface CornerHUDProps {
  scrollProgress?: number;
  soundOn: boolean;
  onSoundToggle: () => void;
  className?: string;
  hideScrollIndicators?: boolean;
}

export const CornerHUD = ({
  scrollProgress = 0,
  soundOn,
  onSoundToggle,
  className,
  hideScrollIndicators = false,
}: CornerHUDProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const isAboutPage = location.pathname === "/about";

  const scrollPercentage = Math.round(scrollProgress * 100);
  const showScrollText = !hideScrollIndicators && scrollProgress < 0.1;

  return (
    <div className={`${styles.container} ${className || ""}`}>
      {/* Top Left - Brand */}
      <div className={styles.topLeft}>
        <button
          onClick={() => navigate("/")}
          className={styles.brandButton}
          aria-label="PLYGRND Home"
        >
          PLYGRND.
        </button>
      </div>

      {/* Top Right - Navigation (ABOUT -> SOUND) */}
      <div className={styles.topRight}>
        <button
          onClick={() => navigate(isAboutPage ? "/" : "/about")}
          className={`${styles.navButton} ${isAboutPage ? styles.navButtonActive : ""}`}
          aria-label={isAboutPage ? "Go to Home" : "Go to About"}
        >
          ABOUT
        </button>

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
      {!hideScrollIndicators && (
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
      )}

      {/* Bottom Right - Scroll Hint */}
      {!hideScrollIndicators && (
        <div
          className={`${styles.bottomRight} ${showScrollText ? styles.visible : styles.hidden}`}
        >
          <span className={styles.scrollText}>SCROLL</span>
          <div className={styles.verticalLine} />
        </div>
      )}
    </div>
  );
};
