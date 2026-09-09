import { Suspense, useEffect, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Text3D, Center, Environment } from "@react-three/drei";
import * as THREE from "three";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, CheckCircle2 } from "lucide-react";

import { useAudioPlayer, SpotifyEmbed } from "./useAudioPlayer";
import { useNewsletterSubscribe } from "./useNewsletterSubscribe";
import { useIsMobile } from "./useIsMobile";
import { Input } from "./Input";
import { Button } from "./Button";
import { CornerHUD } from "./CornerHUD";
import { CustomCursor } from "./CustomCursor";
import styles from "../styles/_index.module.css";
import {
  InputSchema,
  InputType,
  ALLOWED_INTERESTS,
} from "../../endpoints/newsletter/subscribe_POST.schema";

const FONT_URL =
  "https://threejs.org/examples/fonts/helvetiker_bold.typeface.json";
const SCROLL_HEIGHT_VH = 500; // Total scroll height in VH
const INTRO_DURATION = 8.0; // Increased duration for a slower, more cinematic intro
const TOTAL_SPINS = 2; // Reduced spins (from 3) for a less dizzying effect

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
  onFormSubmit?: () => void;
}) => {
  const { mutate: subscribe, isPending } = useNewsletterSubscribe();
  const [isSuccess, setIsSuccess] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const statusSummaryRef = useRef<HTMLDivElement>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<InputType>({
    resolver: zodResolver(InputSchema),
    defaultValues: {
      name: "",
      phone: "",
      email: "",
      instagram_handle: "",
      interests: [],
      consent: false as unknown as true,
      honeypot: "",
    },
  });

  const onSubmit = (data: InputType) => {
    setServerError(null);

    subscribe(data, {
      onSuccess: () => {
        setIsSuccess(true);
        reset();
        setTimeout(() => {
          statusSummaryRef.current?.focus();
        }, 50);
        onFormSubmit?.();
      },
      onError: (error) => {
        const errorMsg =
          error.message ||
          "We couldn’t complete your signup right now. Please try again.";
        setServerError(errorMsg);
        setTimeout(() => {
          statusSummaryRef.current?.focus();
        }, 50);
      },
    });
  };

  return (
    <div
      className={`${styles.formWrapper} ${visible ? styles.visible : ""}`}
      aria-hidden={!visible}
    >
      <div className={styles.formContent}>
        {isSuccess ? (
          <div
            ref={statusSummaryRef}
            tabIndex={-1}
            role="status"
            aria-live="polite"
            className={styles.successContainer}
          >
            <img
              src="/assets/png2.png"
              alt="PLYGRND"
              className={styles.logoImage}
              width="64"
              height="64"
            />
            <p className={styles.successMessage}>
              You’re in. Keep an eye on your inbox for a welcome from PLYGRND.
            </p>
          </div>
        ) : (
          <>
            <div className={styles.logoWrapper}>
              <img
                src="/assets/png2.png"
                alt="PLYGRND"
                className={styles.logoImage}
                width="72"
                height="72"
              />
            </div>
            <p className={styles.formDescription}>
              SUBSCRIBE FOR NEW UPDATES BY PLYGRND.
            </p>

            {serverError && (
              <div
                ref={statusSummaryRef}
                tabIndex={-1}
                role="status"
                aria-live="polite"
                className={styles.serverErrorAlert}
              >
                {serverError}
              </div>
            )}

            <form
              onSubmit={handleSubmit(onSubmit)}
              className={styles.form}
              noValidate
            >
              {/* Honeypot field for bot protection */}
              <div
                className={styles.honeypotWrapper}
                aria-hidden="true"
                style={{ display: "none" }}
              >
                <input
                  type="text"
                  tabIndex={-1}
                  autoComplete="off"
                  data-lpignore="true"
                  data-form-type="other"
                  {...register("honeypot")}
                />
              </div>

              {/* 1. Name */}
              <div className={styles.inputGroup}>
                <label htmlFor="newsletter-name" className={styles.label}>
                  Name
                </label>
                <Input
                  {...register("name")}
                  id="newsletter-name"
                  type="text"
                  autoComplete="name"
                  placeholder="Your Name"
                  className={styles.input}
                  disabled={!visible || isPending}
                  aria-required="true"
                  aria-invalid={!!errors.name}
                  aria-describedby={errors.name ? "name-error" : undefined}
                />
                {errors.name && (
                  <span id="name-error" className={styles.error}>
                    {errors.name.message}
                  </span>
                )}
              </div>

              {/* 2. Phone number */}
              <div className={styles.inputGroup}>
                <label htmlFor="newsletter-phone" className={styles.label}>
                  Phone number
                </label>
                <Input
                  {...register("phone")}
                  id="newsletter-phone"
                  type="tel"
                  autoComplete="tel"
                  placeholder="+46 70 123 4567"
                  className={styles.input}
                  disabled={!visible || isPending}
                  aria-required="true"
                  aria-invalid={!!errors.phone}
                  aria-describedby={errors.phone ? "phone-error" : undefined}
                />
                {errors.phone && (
                  <span id="phone-error" className={styles.error}>
                    {errors.phone.message}
                  </span>
                )}
              </div>

              {/* 3. Email address */}
              <div className={styles.inputGroup}>
                <label htmlFor="newsletter-email" className={styles.label}>
                  Email address
                </label>
                <Input
                  {...register("email")}
                  id="newsletter-email"
                  type="email"
                  autoComplete="email"
                  placeholder="your@email.com"
                  className={styles.input}
                  disabled={!visible || isPending}
                  aria-required="true"
                  aria-invalid={!!errors.email}
                  aria-describedby={errors.email ? "email-error" : undefined}
                />
                {errors.email && (
                  <span id="email-error" className={styles.error}>
                    {errors.email.message}
                  </span>
                )}
              </div>

              {/* 4. Instagram handle (Optional) */}
              <div className={styles.inputGroup}>
                <label htmlFor="newsletter-instagram" className={styles.label}>
                  Instagram
                </label>
                <Input
                  {...register("instagram_handle")}
                  id="newsletter-instagram"
                  type="text"
                  autoComplete="username"
                  placeholder="@username"
                  className={styles.input}
                  disabled={!visible || isPending}
                  aria-required="false"
                  aria-invalid={!!errors.instagram_handle}
                  aria-describedby={
                    errors.instagram_handle
                      ? "instagram-error"
                      : "instagram-helper"
                  }
                />
                <span id="instagram-helper" className={styles.helperText}>
                  Optional — because we’d love to connect with you.
                </span>
                {errors.instagram_handle && (
                  <span id="instagram-error" className={styles.error}>
                    {errors.instagram_handle.message}
                  </span>
                )}
              </div>

              {/* 5. Interests (Multi-select Chips) */}
              <div className={styles.interestsGroup}>
                <span id="interests-label" className={styles.label}>
                  Choose your interests
                </span>
                <div
                  role="group"
                  aria-labelledby="interests-label"
                  aria-describedby={
                    errors.interests ? "interests-error" : undefined
                  }
                  className={styles.interestsGrid}
                >
                  {ALLOWED_INTERESTS.map((interest) => (
                    <label key={interest} className={styles.chipContainer}>
                      <input
                        type="checkbox"
                        value={interest}
                        {...register("interests")}
                        disabled={!visible || isPending}
                        className={styles.chipInput}
                      />
                      <span className={styles.chipLabel}>{interest}</span>
                    </label>
                  ))}
                </div>
                {errors.interests && (
                  <span id="interests-error" className={styles.error}>
                    {errors.interests.message}
                  </span>
                )}
              </div>

              {/* 6. Consent Checkbox */}
              <div className={styles.consentGroup}>
                <label className={styles.consentLabelContainer}>
                  <input
                    type="checkbox"
                    {...register("consent")}
                    disabled={!visible || isPending}
                    className={styles.consentCheckbox}
                    aria-required="true"
                    aria-invalid={!!errors.consent}
                    aria-describedby={
                      errors.consent ? "consent-error" : undefined
                    }
                  />
                  <div className={styles.consentBox} />
                  <span className={styles.consentText}>
                    I agree to receive emails from PLYGRND. and understand that I
                    can unsubscribe at any time.
                  </span>
                </label>
                {errors.consent && (
                  <span id="consent-error" className={styles.error}>
                    {errors.consent.message}
                  </span>
                )}
              </div>

              {/* Submit Button */}
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
          </>
        )}
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
            visible={showForm}
            onFormSubmit={() => setFormSubmitted(true)}
          />
          {/* Hidden Spotify Controller - kept in DOM for audio playback */}
          <div style={{ position: 'fixed', bottom: 0, right: 0, width: 1, height: 1, opacity: 0, pointerEvents: 'none', overflow: 'hidden' }}>
            <SpotifyEmbed shouldPlay={!isMuted} />
          </div>
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
