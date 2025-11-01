import * as React from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Input, InputProps } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { CheckCircle2, AlertCircle } from "lucide-react";

interface AnimatedInputProps extends InputProps {
  error?: string;
  success?: boolean;
  showValidation?: boolean;
}

const AnimatedInput = React.forwardRef<HTMLInputElement, AnimatedInputProps>(
  ({ className, error, success, showValidation = true, ...props }, ref) => {
    const shouldReduceMotion = useReducedMotion();
    const [isFocused, setIsFocused] = React.useState(false);
    const [hasInteracted, setHasInteracted] = React.useState(false);

    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(true);
      setHasInteracted(true);
      props.onFocus?.(e);
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(false);
      props.onBlur?.(e);
    };

    return (
      <div className="relative">
        <motion.div
          initial={false}
          animate={
            error && hasInteracted && !shouldReduceMotion
              ? {
                  x: [0, -10, 10, -10, 10, 0],
                  transition: { duration: 0.4, type: "spring" },
                }
              : {}
          }
        >
          <div className="relative">
            <Input
              ref={ref}
              className={cn(
                "transition-all duration-200",
                isFocused && "ring-2 ring-primary ring-offset-1",
                error && hasInteracted && "border-destructive focus:ring-destructive",
                success && hasInteracted && "border-success focus:ring-success pr-10",
                className
              )}
              onFocus={handleFocus}
              onBlur={handleBlur}
              {...props}
            />
            
            {/* Success/Error Icons */}
            <AnimatePresence>
              {showValidation && hasInteracted && (success || error) && (
                <motion.div
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  transition={
                    shouldReduceMotion
                      ? { duration: 0 }
                      : { type: "spring", stiffness: 400, damping: 20 }
                  }
                >
                  {success && <CheckCircle2 className="h-5 w-5 text-success" />}
                  {error && <AlertCircle className="h-5 w-5 text-destructive" />}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* Error Message */}
        <AnimatePresence mode="wait">
          {error && hasInteracted && (
            <motion.p
              className="mt-1.5 text-sm text-destructive"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              transition={
                shouldReduceMotion
                  ? { duration: 0 }
                  : { duration: 0.2, ease: "easeOut" }
              }
            >
              {error}
            </motion.p>
          )}
        </AnimatePresence>

        {/* Focus Line */}
        {!shouldReduceMotion && (
          <motion.div
            className="absolute bottom-0 left-0 h-0.5 bg-primary"
            initial={{ width: 0 }}
            animate={{ width: isFocused ? "100%" : 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
          />
        )}
      </div>
    );
  }
);

AnimatedInput.displayName = "AnimatedInput";

export { AnimatedInput };

/**
 * Animated textarea with focus animations
 */
export const AnimatedTextarea = React.forwardRef<
  HTMLTextAreaElement,
  React.ComponentPropsWithoutRef<"textarea"> & {
    error?: string;
    success?: boolean;
  }
>(({ className, error, success, ...props }, ref) => {
  const shouldReduceMotion = useReducedMotion();
  const [isFocused, setIsFocused] = React.useState(false);

  return (
    <motion.div
      className="relative"
      animate={
        error && !shouldReduceMotion
          ? {
              x: [0, -5, 5, -5, 5, 0],
              transition: { duration: 0.4 },
            }
          : {}
      }
    >
      <textarea
        ref={ref}
        className={cn(
          "flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-200",
          isFocused && "ring-2 ring-primary ring-offset-1",
          error && "border-destructive focus-visible:ring-destructive",
          success && "border-success focus-visible:ring-success",
          className
        )}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        {...props}
      />
      {!shouldReduceMotion && (
        <motion.div
          className="absolute bottom-0 left-0 h-0.5 bg-primary rounded-b-md"
          initial={{ width: 0 }}
          animate={{ width: isFocused ? "100%" : 0 }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
        />
      )}
    </motion.div>
  );
});

AnimatedTextarea.displayName = "AnimatedTextarea";