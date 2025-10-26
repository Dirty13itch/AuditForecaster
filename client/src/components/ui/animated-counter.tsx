import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion, useInView, useSpring, useTransform } from "framer-motion";
import { cn } from "@/lib/utils";

interface AnimatedCounterProps {
  value: number;
  duration?: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
  format?: (value: number) => string;
  start?: number;
  delay?: number;
  onComplete?: () => void;
}

export function AnimatedCounter({
  value,
  duration = 2,
  decimals = 0,
  prefix = "",
  suffix = "",
  className,
  format,
  start = 0,
  delay = 0,
  onComplete,
}: AnimatedCounterProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const shouldReduceMotion = useReducedMotion();
  const isInView = useInView(ref, { once: true });
  const [hasAnimated, setHasAnimated] = useState(false);

  const spring = useSpring(start, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001,
  });

  const display = useTransform(spring, (current) => {
    const formatted = format ? format(current) : current.toFixed(decimals);
    return `${prefix}${formatted}${suffix}`;
  });

  useEffect(() => {
    if (isInView && !hasAnimated && !shouldReduceMotion) {
      const timer = setTimeout(() => {
        spring.set(value);
        setHasAnimated(true);
        
        const completeTimer = setTimeout(() => {
          onComplete?.();
        }, duration * 1000);
        
        return () => clearTimeout(completeTimer);
      }, delay * 1000);
      
      return () => clearTimeout(timer);
    } else if (shouldReduceMotion) {
      spring.set(value);
    }
  }, [isInView, value, hasAnimated, spring, shouldReduceMotion, delay, duration, onComplete]);

  if (shouldReduceMotion) {
    const formatted = format ? format(value) : value.toFixed(decimals);
    return (
      <span ref={ref} className={className}>
        {prefix}{formatted}{suffix}
      </span>
    );
  }

  return (
    <motion.span
      ref={ref}
      className={cn("tabular-nums", className)}
      initial={{ opacity: 0, y: 20 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay }}
    >
      <motion.span>{display}</motion.span>
    </motion.span>
  );
}

// Animated percentage with circular progress
export function AnimatedPercentage({
  value,
  size = 60,
  strokeWidth = 4,
  className,
  showValue = true,
  color = "hsl(var(--primary))",
}: {
  value: number;
  size?: number;
  strokeWidth?: number;
  className?: string;
  showValue?: boolean;
  color?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const shouldReduceMotion = useReducedMotion();
  const isInView = useInView(ref, { once: true });
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  
  const spring = useSpring(0, {
    stiffness: 100,
    damping: 30,
  });

  const strokeDashoffset = useTransform(
    spring,
    (latest) => circumference - (latest / 100) * circumference
  );

  useEffect(() => {
    if (isInView && !shouldReduceMotion) {
      spring.set(value);
    } else if (shouldReduceMotion) {
      spring.set(value);
    }
  }, [isInView, value, spring, shouldReduceMotion]);

  return (
    <div ref={ref} className={cn("relative inline-flex items-center justify-center", className)}>
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="hsl(var(--border))"
          strokeWidth={strokeWidth}
          fill="none"
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          style={{
            strokeDasharray: circumference,
            strokeDashoffset: shouldReduceMotion ? circumference - (value / 100) * circumference : strokeDashoffset,
          }}
        />
      </svg>
      {showValue && (
        <div className="absolute inset-0 flex items-center justify-center">
          <AnimatedCounter
            value={value}
            suffix="%"
            className="text-sm font-semibold"
            duration={1.5}
          />
        </div>
      )}
    </div>
  );
}

// Animated stat card with icon
export function AnimatedStat({
  label,
  value,
  icon,
  change,
  changeType = "neutral",
  prefix,
  suffix,
  format,
  className,
}: {
  label: string;
  value: number;
  icon?: React.ReactNode;
  change?: number;
  changeType?: "positive" | "negative" | "neutral";
  prefix?: string;
  suffix?: string;
  format?: (value: number) => string;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true });
  const shouldReduceMotion = useReducedMotion();

  const changeColors = {
    positive: "text-success",
    negative: "text-destructive",
    neutral: "text-muted-foreground",
  };

  return (
    <motion.div
      ref={ref}
      className={cn("space-y-2", className)}
      initial={{ opacity: 0, y: 20 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5 }}
    >
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground">{label}</span>
        {icon && (
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={isInView ? { scale: 1, rotate: 0 } : {}}
            transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
          >
            {icon}
          </motion.div>
        )}
      </div>
      <div className="space-y-1">
        <div className="text-2xl font-bold">
          <AnimatedCounter
            value={value}
            prefix={prefix}
            suffix={suffix}
            format={format}
            duration={2}
            decimals={0}
          />
        </div>
        {change !== undefined && (
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ delay: 0.5 }}
            className={cn("flex items-center text-xs", changeColors[changeType])}
          >
            <motion.span
              animate={!shouldReduceMotion ? {
                y: changeType === "positive" ? [0, -2, 0] : changeType === "negative" ? [0, 2, 0] : 0,
              } : {}}
              transition={{ duration: 1, repeat: Infinity, repeatDelay: 2 }}
            >
              {changeType === "positive" ? "↑" : changeType === "negative" ? "↓" : "→"}
            </motion.span>
            <span className="ml-1">
              {change > 0 && "+"}
              {change}%
            </span>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}