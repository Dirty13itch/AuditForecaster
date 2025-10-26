import { useState, useEffect, useRef } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";
import { ImageOff } from "lucide-react";

interface LazyImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  placeholder?: string;
  blurDataUrl?: string;
  aspectRatio?: string;
  objectFit?: "cover" | "contain" | "fill" | "none" | "scale-down";
  onLoad?: () => void;
  onError?: () => void;
  fallback?: React.ReactNode;
}

export function LazyImage({
  src,
  alt,
  placeholder,
  blurDataUrl,
  aspectRatio,
  objectFit = "cover",
  className,
  onLoad,
  onError,
  fallback,
  ...props
}: LazyImageProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true);
            observer.disconnect();
          }
        });
      },
      { threshold: 0.1, rootMargin: "50px" }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, []);

  const handleLoad = () => {
    setIsLoading(false);
    onLoad?.();
  };

  const handleError = () => {
    setIsLoading(false);
    setError(true);
    onError?.();
  };

  return (
    <div
      ref={containerRef}
      className={cn("relative overflow-hidden", className)}
      style={{ aspectRatio }}
    >
      {/* Blur placeholder background */}
      {(isLoading || !isInView) && (blurDataUrl || placeholder) && (
        <motion.div
          className="absolute inset-0"
          initial={{ opacity: 1 }}
          animate={{ opacity: isLoading ? 1 : 0 }}
          transition={{ duration: shouldReduceMotion ? 0 : 0.3 }}
        >
          {blurDataUrl ? (
            <div
              className="absolute inset-0 scale-110 blur-xl"
              style={{
                backgroundImage: `url(${blurDataUrl})`,
                backgroundSize: objectFit,
                backgroundPosition: "center",
              }}
            />
          ) : (
            <div className="absolute inset-0 animate-pulse bg-muted" />
          )}
        </motion.div>
      )}

      {/* Loading shimmer effect */}
      {isLoading && isInView && (
        <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      )}

      {/* Actual image */}
      {isInView && !error && (
        <motion.img
          ref={imgRef}
          src={src}
          alt={alt}
          className={cn("h-full w-full", className)}
          style={{ objectFit }}
          onLoad={handleLoad}
          onError={handleError}
          initial={{ opacity: 0, scale: shouldReduceMotion ? 1 : 1.1 }}
          animate={{ 
            opacity: isLoading ? 0 : 1,
            scale: 1 
          }}
          transition={{ 
            duration: shouldReduceMotion ? 0 : 0.4,
            ease: "easeOut"
          }}
          {...props}
        />
      )}

      {/* Error fallback */}
      {error && (
        <motion.div
          className="absolute inset-0 flex flex-col items-center justify-center bg-muted text-muted-foreground"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          {fallback || (
            <>
              <ImageOff className="h-8 w-8 mb-2" />
              <span className="text-sm">Failed to load image</span>
            </>
          )}
        </motion.div>
      )}
    </div>
  );
}

// Optimized background image with lazy loading
export function LazyBackgroundImage({
  src,
  blurDataUrl,
  className,
  children,
  overlay = true,
  overlayOpacity = 0.4,
}: {
  src: string;
  blurDataUrl?: string;
  className?: string;
  children?: React.ReactNode;
  overlay?: boolean;
  overlayOpacity?: number;
}) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true);
            observer.disconnect();
          }
        });
      },
      { threshold: 0.1 }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (isInView) {
      const img = new Image();
      img.src = src;
      img.onload = () => setIsLoaded(true);
    }
  }, [isInView, src]);

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      {/* Blur placeholder */}
      {blurDataUrl && (
        <div
          className="absolute inset-0 scale-110 blur-xl"
          style={{
            backgroundImage: `url(${blurDataUrl})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
      )}

      {/* Actual background image */}
      <motion.div
        className="absolute inset-0"
        style={{
          backgroundImage: isInView ? `url(${src})` : undefined,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: isLoaded ? 1 : 0 }}
        transition={{ duration: shouldReduceMotion ? 0 : 0.6 }}
      />

      {/* Optional overlay */}
      {overlay && (
        <div
          className="absolute inset-0 bg-black"
          style={{ opacity: overlayOpacity }}
        />
      )}

      {/* Content */}
      <div className="relative z-10">{children}</div>
    </div>
  );
}

// Image gallery with lazy loading
export function LazyImageGallery({
  images,
  columns = 3,
  gap = 4,
  className,
}: {
  images: Array<{ src: string; alt: string; blurDataUrl?: string }>;
  columns?: number;
  gap?: number;
  className?: string;
}) {
  return (
    <div
      className={cn("grid", className)}
      style={{
        gridTemplateColumns: `repeat(${columns}, 1fr)`,
        gap: `${gap * 0.25}rem`,
      }}
    >
      {images.map((image, index) => (
        <motion.div
          key={image.src}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
        >
          <LazyImage
            src={image.src}
            alt={image.alt}
            blurDataUrl={image.blurDataUrl}
            aspectRatio="1"
            className="rounded-lg"
          />
        </motion.div>
      ))}
    </div>
  );
}