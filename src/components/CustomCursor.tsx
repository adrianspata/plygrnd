import { useState, useEffect } from "react";
import styles from "../styles/CustomCursor.module.css";

const EDITABLE_SELECTOR =
  'input[type="text"], input[type="email"], input[type="tel"], input[type="search"], input[type="url"], textarea, [contenteditable="true"]';
const HIDE_CURSOR_SELECTOR =
  '[data-hide-cursor="true"], [data-cursor-hidden="true"], [data-hide-cursor]';

export const CustomCursor = () => {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isVisible, setIsVisible] = useState(false);
  const [isIBeam, setIsIBeam] = useState(false);
  const [isHidden, setIsHidden] = useState(false);

  useEffect(() => {
    // Hide custom cursor on touch devices
    const isTouchDevice =
      "ontouchstart" in window || navigator.maxTouchPoints > 0;
    if (isTouchDevice) {
      return;
    }

    const handleMouseMove = (e: MouseEvent) => {
      setPosition({ x: e.clientX, y: e.clientY });
      setIsVisible(true);

      const target = e.target;
      if (target instanceof Element) {
        setIsIBeam(Boolean(target.closest(EDITABLE_SELECTOR)));
        setIsHidden(Boolean(target.closest(HIDE_CURSOR_SELECTOR)));
      } else {
        setIsIBeam(false);
        setIsHidden(false);
      }
    };

    const handleMouseLeave = () => {
      setIsVisible(false);
    };

    const handleMouseEnter = () => {
      setIsVisible(true);
    };

    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    document.addEventListener("mouseleave", handleMouseLeave);
    document.addEventListener("mouseenter", handleMouseEnter);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseleave", handleMouseLeave);
      document.removeEventListener("mouseenter", handleMouseEnter);
    };
  }, []);

  // Don't render on touch devices
  const isTouchDevice =
    typeof window !== "undefined" &&
    ("ontouchstart" in window || navigator.maxTouchPoints > 0);
  if (isTouchDevice) {
    return null;
  }

  return (
    <div
      className={`${styles.customCursor} ${isVisible && !isHidden ? styles.visible : ""}`}
      style={{
        transform: `translate(${position.x}px, ${position.y}px)`,
      }}
      aria-hidden="true"
    >
      {isIBeam ? (
        /* Custom I-beam cursor for text fields */
        <svg
          width="16"
          height="22"
          viewBox="0 0 16 22"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Top horizontal serif bar */}
          <line
            x1="3"
            y1="2"
            x2="13"
            y2="2"
            stroke="white"
            strokeWidth="1.5"
            strokeLinecap="square"
          />
          {/* Center vertical stem */}
          <line
            x1="8"
            y1="2"
            x2="8"
            y2="20"
            stroke="white"
            strokeWidth="1.5"
          />
          {/* Bottom horizontal serif bar */}
          <line
            x1="3"
            y1="20"
            x2="13"
            y2="20"
            stroke="white"
            strokeWidth="1.5"
            strokeLinecap="square"
          />
        </svg>
      ) : (
        /* Default crosshair cursor */
        <svg
          width="25"
          height="25"
          viewBox="0 0 25 25"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <line
            x1="12.5"
            y1="0"
            x2="12.5"
            y2="25"
            stroke="white"
            strokeWidth="1"
          />
          <line
            x1="0"
            y1="12.5"
            x2="25"
            y2="12.5"
            stroke="white"
            strokeWidth="1"
          />
        </svg>
      )}
    </div>
  );
};