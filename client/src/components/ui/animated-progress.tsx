import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";

interface AnimatedProgressProps {
  value: number;
  max?: number;
  className?: string;
  showValue?: boolean;
  size?: "sm" | "md" | "lg";
  variant?: "default" | "success" | "warning" | "danger";
  animated?: boolean;
  striped?: boolean;
  label?: string;
}

const sizeClasses = {
  sm: "h-1",
  md: "h-2",
  lg: "h-4",
};

const variantClasses = {
  default: "bg-primary",
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-destructive",
};

export function AnimatedProgress({
  value,
  max = 100,
  className,
  showValue = false,
  size = "md",
  variant = "default",
  animated = true,
  striped = false,
  label,
}: AnimatedProgressProps) {
  const shouldReduceMotion = useReducedMotion();
  const percentage = Math.min((value / max) * 100, 100);
  const [displayPercentage, setDisplayPercentage] = useState(0);

  useEffect(() => {
    if (!animated || shouldReduceMotion) {
      setDisplayPercentage(percentage);
    } else {
      const timer = setTimeout(() => {
        setDisplayPercentage(percentage);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [percentage, animated, shouldReduceMotion]);

  return (
    <div className={cn("w-full", className)}>
      {(label || showValue) && (
        <div className="mb-1 flex items-center justify-between">
          {label && <span className="text-sm font-medium">{label}</span>}
          {showValue && (
            <motion.span
              className="text-sm text-muted-foreground"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              {Math.round(displayPercentage)}%
            </motion.span>
          )}
        </div>
      )}
      <div className={cn("relative w-full overflow-hidden rounded-full bg-secondary", sizeClasses[size])}>
        <motion.div
          className={cn(
            "h-full rounded-full",
            variantClasses[variant],
            striped && "bg-gradient-to-r from-transparent via-white/20 to-transparent bg-[length:20px_100%]",
            animated && striped && "animate-progress-stripes"
          )}
          initial={{ width: 0 }}
          animate={{ width: `${displayPercentage}%` }}
          transition={
            shouldReduceMotion
              ? { duration: 0 }
              : {
                  type: "spring",
                  stiffness: 100,
                  damping: 20,
                  mass: 1,
                }
          }
        >
          {animated && !striped && (
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
              animate={{
                x: ["-100%", "200%"],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                repeatDelay: 1,
                ease: "easeInOut",
              }}
            />
          )}
        </motion.div>
      </div>
    </div>
  );
}

// Step progress indicator
export function StepProgress({
  steps,
  currentStep,
  className,
}: {
  steps: string[];
  currentStep: number;
  className?: string;
}) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <div className={cn("w-full", className)}>
      <div className="relative">
        {/* Progress line */}
        <div className="absolute left-0 top-5 h-0.5 w-full bg-muted">
          <motion.div
            className="h-full bg-primary"
            initial={{ width: 0 }}
            animate={{ width: `${(currentStep / (steps.length - 1)) * 100}%` }}
            transition={
              shouldReduceMotion
                ? { duration: 0 }
                : { duration: 0.5, ease: "easeInOut" }
            }
          />
        </div>

        {/* Steps */}
        <div className="relative flex justify-between">
          {steps.map((step, index) => {
            const isCompleted = index < currentStep;
            const isCurrent = index === currentStep;

            return (
              <div key={step} className="flex flex-col items-center">
                <motion.div
                  className={cn(
                    "relative z-10 flex h-10 w-10 items-center justify-center rounded-full border-2",
                    isCompleted || isCurrent
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-muted bg-background text-muted-foreground"
                  )}
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: isCurrent ? 1.1 : 1, opacity: 1 }}
                  transition={{
                    delay: index * 0.1,
                    duration: shouldReduceMotion ? 0 : 0.3,
                  }}
                >
                  {isCompleted ? (
                    <motion.svg
                      className="h-5 w-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ duration: 0.3 }}
                    >
                      <motion.path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </motion.svg>
                  ) : (
                    <span className="text-sm font-semibold">{index + 1}</span>
                  )}
                </motion.div>
                <motion.span
                  className="mt-2 text-xs text-muted-foreground"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 + 0.2 }}
                >
                  {step}
                </motion.span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// Circular progress
export function CircularProgress({
  value,
  size = 120,
  strokeWidth = 8,
  showValue = true,
  variant = "default",
  className,
}: {
  value: number;
  size?: number;
  strokeWidth?: number;
  showValue?: boolean;
  variant?: "default" | "success" | "warning" | "danger";
  className?: string;
}) {
  const shouldReduceMotion = useReducedMotion();
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;

  const colors = {
    default: "hsl(var(--primary))",
    success: "hsl(var(--success))",
    warning: "hsl(var(--warning))",
    danger: "hsl(var(--destructive))",
  };

  return (
    <div className={cn("relative inline-flex items-center justify-center", className)}>
      <svg width={size} height={size}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="hsl(var(--muted))"
          strokeWidth={strokeWidth}
          fill="none"
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={colors[variant]}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={
            shouldReduceMotion
              ? { duration: 0 }
              : { duration: 1, ease: "easeInOut" }
          }
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      {showValue && (
        <div className="absolute inset-0 flex items-center justify-center">
          <motion.span
            className="text-2xl font-bold"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5 }}
          >
            {value}%
          </motion.span>
        </div>
      )}
    </div>
  );
}