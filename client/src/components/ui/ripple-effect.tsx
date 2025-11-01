import { useState, useEffect } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

interface Ripple {
  x: number;
  y: number;
  id: number;
}

interface RippleEffectProps {
  className?: string;
  duration?: number;
  color?: string;
}

/**
 * Ripple effect component for touch feedback
 * Add this as a child of any clickable element
 */
export function RippleEffect({ 
  className, 
  duration = 0.6,
  color = "bg-white/30"
}: RippleEffectProps) {
  const [ripples, setRipples] = useState<Ripple[]>([]);
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const element = e.currentTarget as HTMLElement;
      const rect = element.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      const newRipple = {
        x,
        y,
        id: Date.now(),
      };
      
      setRipples((prev) => [...prev, newRipple]);
      
      // Clean up after animation
      setTimeout(() => {
        setRipples((prev) => prev.filter((r) => r.id !== newRipple.id));
      }, duration * 1000);
    };

    // Find parent element and attach listener
    const parent = document.currentScript?.parentElement;
    if (parent) {
      parent.addEventListener("click", handleClick);
      return () => parent.removeEventListener("click", handleClick);
    }
  }, [duration]);

  if (shouldReduceMotion) return null;

  return (
    <AnimatePresence>
      {ripples.map((ripple) => (
        <motion.span
          key={ripple.id}
          className={cn(
            "absolute pointer-events-none rounded-full",
            color,
            className
          )}
          style={{
            left: ripple.x,
            top: ripple.y,
          }}
          initial={{ 
            scale: 0, 
            opacity: 1,
            width: 0,
            height: 0,
            x: 0,
            y: 0,
          }}
          animate={{ 
            scale: 1,
            opacity: 0,
            width: 200,
            height: 200,
            x: -100,
            y: -100,
          }}
          exit={{ opacity: 0 }}
          transition={{
            duration,
            ease: "easeOut",
          }}
        />
      ))}
    </AnimatePresence>
  );
}

/**
 * Hook for adding ripple effect to any element
 */
export function useRipple(duration = 0.6) {
  const [ripples, setRipples] = useState<Ripple[]>([]);
  const shouldReduceMotion = useReducedMotion();

  const createRipple = (e: React.MouseEvent) => {
    if (shouldReduceMotion) return;

    const element = e.currentTarget as HTMLElement;
    const rect = element.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const newRipple = {
      x,
      y,
      id: Date.now(),
    };
    
    setRipples((prev) => [...prev, newRipple]);
    
    // Clean up after animation
    setTimeout(() => {
      setRipples((prev) => prev.filter((r) => r.id !== newRipple.id));
    }, duration * 1000);
  };

  const RippleContainer = ({ color = "bg-primary/20", className }: { color?: string; className?: string }) => (
    <AnimatePresence>
      {ripples.map((ripple) => (
        <motion.span
          key={ripple.id}
          className={cn(
            "absolute pointer-events-none rounded-full",
            color,
            className
          )}
          style={{
            left: ripple.x,
            top: ripple.y,
          }}
          initial={{ 
            scale: 0, 
            opacity: 0.5,
            width: 0,
            height: 0,
            x: 0,
            y: 0,
          }}
          animate={{ 
            scale: 1,
            opacity: 0,
            width: 300,
            height: 300,
            x: -150,
            y: -150,
          }}
          exit={{ opacity: 0 }}
          transition={{
            duration,
            ease: "easeOut",
          }}
        />
      ))}
    </AnimatePresence>
  );

  return { createRipple, RippleContainer };
}