import React, { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Text3D, Center, Float, Environment } from "@react-three/drei";
import * as THREE from "three";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, ArrowDown } from "lucide-react";
import { Helmet } from "react-helmet";
import { toast } from "sonner";

import { useAudioPlayer } from "./useAudioPlayer";
import { useNewsletterSubscribe } from "./useNewsletterSubscribe";
import { useIsMobile } from "./useIsMobile";
import { Input } from "./Input";
import { Button } from "./Button";
import { CornerHUD } from "./CornerHUD";
import { CustomCursor } from "./CustomCursor";
import styles from "../styles/_index.module.css";

// --- Constants ---
const FONT_URL =
  "https://threejs.org/examples/fonts/helvetiker_bold.typeface.json";
const SCROLL_HEIGHT_VH = 500; // Total scroll height in VH
const INTRO_DURATION = 8.0; // Increased duration for a slower, more cinematic intro
const TOTAL_SPINS = 2; // Reduced spins (from 3) for a less dizzying effect

// --- Types ---
type FormSchema = {
  email: string;
};

const formSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

// --- 3D Components ---

const Logo = ({
  mousePosition,
  isMobile = false,
}: {
  mousePosition: { x: number; y: number };
  isMobile?: boolean;
}) => {
  const groupRef = useRef<THREE.Group>(null);
  const materialRef = useRef<THREE.MeshStandardMaterial>(null);
  // Store smoothed mouse coordinates to avoid jittery movement
  const smoothMouseRef = useRef({ x: 0, y: 0 });

  // Define the final scale based on device type
  const FINAL_SCALE = isMobile ? 0.4 : 0.8;
  const INTRO_FINAL_SCALE = isMobile ? 0.4 : 0.8;

  useFrame((state) => {
    if (!groupRef.current) return;

    const time = state.clock.getElapsedTime();

    // Smooth mouse interpolation
    smoothMouseRef.current.x = THREE.MathUtils.lerp(
      smoothMouseRef.current.x,
      mousePosition.x,
      0.05,
    );
    smoothMouseRef.current.y = THREE.MathUtils.lerp(
      smoothMouseRef.current.y,
      mousePosition.y,
      0.05,
    );

    // Mouse influence factor (how much the mouse affects the position)
    const mouseInfluence = isMobile ? 0.04 : 0.08; // Reduce mouse influence on mobile
    const mouseOffsetX = smoothMouseRef.current.x * mouseInfluence;
    const mouseOffsetY = smoothMouseRef.current.y * mouseInfluence;

    // Animation Timing
    const GROW_START_TIME = 5.0; // Start growing around halfway

    // Animation State Variables
    let scale = 0.2; // Start small
    let rotationY = 0;
    let positionY = 0;
    let positionX = 0;

    if (time < INTRO_DURATION) {
      // --- INTRO PHASE ---
      const progress = time / INTRO_DURATION;

      // 1. Rotation:
      // Use EaseInOutQuad for a smooth start and stop, preventing mechanical feel
      const spinEase =
        progress < 0.5
          ? 2 * progress * progress
          : 1 - Math.pow(-2 * progress + 2, 2) / 2;

      // Full rotations ending exactly at 0 visual rotation (modulo 2PI)
      rotationY = spinEase * (Math.PI * 2 * TOTAL_SPINS);

      // 2. Growth:
      if (time > GROW_START_TIME) {
        const growDuration = INTRO_DURATION - GROW_START_TIME;
        const growProgress = Math.min(
          (time - GROW_START_TIME) / growDuration,
          1,
        );

        // EaseOutCubic for a nice, organic "pop" into full size
        const growEase = 1 - Math.pow(1 - growProgress, 3);
        scale = THREE.MathUtils.lerp(0.2, INTRO_FINAL_SCALE, growEase);
      }

      // Keep centered during intro
      positionY = 0;
      positionX = 0;
    } else {
      // --- FLOATING PHASE ---
      const floatTime = time - INTRO_DURATION;

      // Final settled scale - stays at the size reached after intro
      scale = FINAL_SCALE;

      // Smoothly fade in the floating motion to avoid any velocity jumps/jitter
      // We use a squared ramp over 2 seconds to dampen the start of the float
      const floatMix = Math.pow(Math.min(floatTime / 2.0, 1.0), 2);

      // Rotation:
      // Since intro ends at a multiple of 2PI, we can treat base rotation as 0.
      // We add a gentle sine sway, mixed in smoothly.
      rotationY = Math.sin(floatTime * 0.3) * 0.05 * floatMix;

      // Floating Position:
      // Use differing frequencies for organic, non-repetitive motion
      positionY = Math.sin(floatTime * 0.6) * 0.12 * floatMix;
      positionX = Math.sin(floatTime * 0.4) * 0.08 * floatMix; // Changed to sin for 0-velocity start
    }

    // Apply transformations
    groupRef.current.scale.setScalar(scale);
    // Combine animation rotation with mouse interactive tilt
    groupRef.current.rotation.y = rotationY + smoothMouseRef.current.x * 0.1;
    groupRef.current.rotation.x = -(smoothMouseRef.current.y * 0.1);
    groupRef.current.position.y = positionY + mouseOffsetY;
    groupRef.current.position.x = positionX + mouseOffsetX;

    // Material pulse effect
    if (materialRef.current) {
      const pulse = (Math.sin(time * 1.5) + 1) * 0.5;
      materialRef.current.emissiveIntensity = 0.15 + pulse * 0.1;
    }
  });

  return (
    <group ref={groupRef}>
      <Center>
        <Text3D
          font={FONT_URL}
          size={1}
          height={0.2}
          curveSegments={12}
          bevelEnabled
          bevelThickness={0.02}
          bevelSize={0.02}
          bevelOffset={0}
          bevelSegments={5}
        >
          plygrnd.
          <meshStandardMaterial
            ref={materialRef}
            color="#111"
            roughness={0.4}
            metalness={0.4}
            emissive="#333"
            emissiveIntensity={0.1}
          />
        </Text3D>
      </Center>
    </group>
  );
};

const Scene = ({
  scrollProgress,
  mousePosition,
  isMobile = false,
}: {
  scrollProgress: number;
  mousePosition: { x: number; y: number };
  isMobile?: boolean;
}) => {
  const { camera } = useThree();

  useFrame((state) => {
    const time = state.clock.getElapsedTime();

    // After intro animation, camera movement is controlled by scroll
    if (time > INTRO_DURATION) {
      // Scroll-based camera animation
      // At 0% scroll: camera at (0, 0, 5) - centered, normal distance
      // At 100% scroll: camera at (-3, 0, 1) - left side, much closer, zoomed in on the "." in plygrnd.

      // Adjust final zoom distance on mobile to be even closer
      const targetX = scrollProgress * -2; // Move left same as desktop
      const targetY = scrollProgress * 0; // Stay level
      const targetZ = isMobile 
        ? 5 - scrollProgress * 4.5 // Even closer on mobile (from 5 to 0.5)
        : 5 - scrollProgress * 4; // Desktop (from 5 to 1)

      // Smooth interpolation for scroll movement
      camera.position.x = THREE.MathUtils.lerp(camera.position.x, targetX, 0.1);
      camera.position.y = THREE.MathUtils.lerp(camera.position.y, targetY, 0.1);
      camera.position.z = THREE.MathUtils.lerp(camera.position.z, targetZ, 0.1);

      // Always look at the logo center
      camera.lookAt(0, 0, 0);
    } else {
      // During intro, keep camera static/centered
      camera.position.x = THREE.MathUtils.lerp(camera.position.x, 0, 0.05);
      camera.position.y = THREE.MathUtils.lerp(camera.position.y, 0, 0.05);
      camera.position.z = THREE.MathUtils.lerp(camera.position.z, 5, 0.05);
      camera.lookAt(0, 0, 0);
    }
  });

  return (
    <>
      <ambientLight intensity={0.2} />

      {/* Rim Lights for the "Noir" edge highlight */}
      <spotLight
        position={[10, 10, 10]}
        angle={0.15}
        penumbra={1}
        intensity={20}
        color="#fff"
      />
      <spotLight
        position={[-10, -10, -5]}
        angle={0.15}
        penumbra={1}
        intensity={10}
        color="#4444ff" // Subtle blue rim
      />

      <Logo mousePosition={mousePosition} isMobile={isMobile} />

      {/* Environment for reflections */}
      <Environment preset="city" />
    </>
  );
};

// --- UI Components ---

const NewsletterForm = ({
  visible,
  onFormSubmit,
}: {
  visible: boolean;
  onFormSubmit: () => void;
}) => {
  const { mutate: subscribe, isPending } = useNewsletterSubscribe();
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedSuggestion, setSelectedSuggestion] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
    watch,
    setValue,
  } = useForm<FormSchema>({
    resolver: zodResolver(formSchema),
  });

  const emailValue = watch("email");

  // Load saved emails from localStorage when component mounts or focus
  const handleEmailFocus = () => {
    const savedEmails = localStorage.getItem("savedEmails");
    if (savedEmails) {
      try {
        const emails = JSON.parse(savedEmails);
        setSuggestions(Array.isArray(emails) ? emails : []);
        setShowSuggestions(true);
      } catch (e) {
        console.error("Failed to parse saved emails", e);
      }
    }
  };

  const handleSelectSuggestion = (email: string) => {
    setValue("email", email);
    setSelectedSuggestion(email);
    setShowSuggestions(false);
  };

  const onSubmit = (data: FormSchema) => {
    // Save email to localStorage
    const savedEmails = localStorage.getItem("savedEmails");
    let emailsList: string[] = [];
    try {
      emailsList = savedEmails ? JSON.parse(savedEmails) : [];
    } catch (e) {
      emailsList = [];
    }

    // Add new email if not already in list
    if (!emailsList.includes(data.email)) {
      emailsList.unshift(data.email); // Add to beginning
      emailsList = emailsList.slice(0, 5); // Keep only last 5
      localStorage.setItem("savedEmails", JSON.stringify(emailsList));
    }

    // Notify parent that form was submitted
    onFormSubmit();

    // Show success immediately - no waiting!
    toast.success("Welcome to the playground.", {
      description: "You have been added to the list.",
    });

    // Clear form immediately
    reset();
    setSuggestions([]);
    setShowSuggestions(false);
    setSelectedSuggestion(null);

    // Scroll to top immediately
    window.scrollTo({ top: 0, behavior: "smooth" });

    // Do the actual API call in background
    subscribe(data, {
      onError: (error) => {
        // Only log error, don't show to user since they already saw success
        console.error(
          "Newsletter subscription error:",
          error.message || "Something went wrong.",
        );
      },
    });
  };

  return (
    <div
      className={`${styles.formWrapper} ${visible ? styles.visible : ""}`}
      aria-hidden={!visible}
    >
      <div className={styles.formContent}>
        <h2 className={styles.formTitle}>PLYGRND</h2>
        <p className={styles.formDescription}>
          SUBSCRIBE FOR NEW UPDATES BY PLYGRND.
        </p>

        <form onSubmit={handleSubmit(onSubmit)} className={styles.form}>
          <div className={styles.inputGroup}>
            <label htmlFor="email-input" className={styles.label}>
              EMAIL ADDRESS
            </label>
            <div style={{ position: "relative" }}>
              <Input
                {...register("email")}
                id="email-input"
                placeholder="your@email.com"
                className={styles.input}
                onFocus={handleEmailFocus}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                disabled={!visible || isPending}
              />
              {showSuggestions && suggestions.length > 0 && (
                <div
                  style={{
                    position: "absolute",
                    top: "100%",
                    left: 0,
                    right: 0,
                    backgroundColor: "rgba(0, 0, 0, 0.9)",
                    border: "1px solid white",
                    borderTop: "none",
                    borderRadius: "0 0 4px 4px",
                    zIndex: 10,
                    maxHeight: "200px",
                    overflowY: "auto",
                  }}
                >
                  {suggestions.map((email, index) => (
                    <div
                      key={index}
                      onClick={() => handleSelectSuggestion(email)}
                      style={{
                        padding: "8px 12px",
                        cursor: "pointer",
                        borderBottom: index < suggestions.length - 1 ? "1px solid rgba(255,255,255,0.1)" : "none",
                        color: "white",
                        fontSize: "0.875rem",
                        transition: "background-color 0.2s",
                      }}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.1)")
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.backgroundColor = "transparent")
                      }
                    >
                      {email}
                    </div>
                  ))}
                </div>
              )}
            </div>
            {errors.email && (
              <span className={styles.error}>{errors.email.message}</span>
            )}
          </div>

          <Button
            type="submit"
            variant="primary"
            className={styles.submitButton}
            disabled={!visible || isPending}
          >
            {isPending ? (
              <Loader2 className="animate-spin" size={16} />
            ) : (
              "SUBSCRIBE"
            )}
          </Button>
        </form>
      </div>
    </div>
  );
};

// --- Main Page ---

export default function LandingPage() {
  const [scrollProgress, setScrollProgress] = useState(0);
  const [showForm, setShowForm] = useState(false);
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  const { isMuted, toggleMute } = useAudioPlayer();
  const isMobile = useIsMobile();

  // Mouse tracking for 3D interaction
  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      // Normalize to -1 to 1
      const x = (event.clientX / window.innerWidth) * 2 - 1;
      const y = -(event.clientY / window.innerHeight) * 2 + 1; // Invert Y
      setMousePosition({ x, y });
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      const totalHeight = document.body.scrollHeight - window.innerHeight;
      const currentScroll = window.scrollY;
      const progress = Math.min(Math.max(currentScroll / totalHeight, 0), 1);

      setScrollProgress(progress);

      // Show form when scrolled near the bottom (85%)
      setShowForm(progress > 0.85);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll(); // Init

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <>
      <Helmet>
        <title>plygrnd. | Interactive 3D Experience</title>
        <meta
          name="description"
          content="A minimal, dark, interactive 3D landing page."
        />
        <style>{`
          body { 
            background-color: #050505; 
            overscroll-behavior: none;
          }
          /* Hide scrollbar for cleaner look but keep functionality */
          ::-webkit-scrollbar {
            width: 8px;
            background: #050505;
          }
          ::-webkit-scrollbar-thumb {
            background: #222;
            border-radius: 4px;
          }
        `}</style>
      </Helmet>

      <div className={styles.container}>
        {/* Fixed 3D Canvas Background */}
        <div className={styles.canvasContainer}>
          <Canvas
            shadows
            dpr={[1, 2]}
            camera={{ position: [0, 0, 5], fov: 45 }}
            gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping }}
          >
            <Suspense fallback={null}>
              <Scene
                scrollProgress={scrollProgress}
                mousePosition={mousePosition}
                isMobile={isMobile}
              />
            </Suspense>
          </Canvas>
        </div>

        {/* Scroll Track (Invisible height setter) */}
        <div
          className={styles.scrollTrack}
          style={{ height: `${SCROLL_HEIGHT_VH}vh` }}
        />

        {/* UI Overlays */}
        <div className={styles.uiLayer}>
          <NewsletterForm
            visible={showForm && !formSubmitted}
            onFormSubmit={() => setFormSubmitted(true)}
          />
        </div>

        {/* Corner HUD */}
        <CornerHUD
          scrollProgress={scrollProgress}
          soundOn={!isMuted}
          onSoundToggle={toggleMute}
        />

        {/* Custom Cursor */}
        <CustomCursor />
      </div>
    </>
  );
}
