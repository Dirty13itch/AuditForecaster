import * as React from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Button, ButtonProps } from "@/components/ui/button";
import { CheckCircle2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useRipple } from "./ripple-effect";

interface EnhancedButtonProps extends ButtonProps {
  loading?: boolean;
  success?: boolean;
  successMessage?: string;
  ripple?: boolean;
  rippleColor?: string;
  scaleOnPress?: boolean;
  animateSuccess?: boolean;
}

/**
 * Enhanced button with micro-interactions
 * - Press animations
 * - Ripple effect
 * - Loading state
 * - Success state with checkmark
 */
const EnhancedButton = React.forwardRef<HTMLButtonElement, EnhancedButtonProps>(
  ({ 
    className, 
    children,
    loading = false,
    success = false,
    successMessage,
    ripple = true,
    rippleColor = "bg-white/20",
    scaleOnPress = true,
    animateSuccess = true,
    disabled,
    onClick,
    ...props 
  }, ref) => {
    const shouldReduceMotion = useReducedMotion();
    const { createRipple, RippleContainer } = useRipple(0.5);
    const [isPressed, setIsPressed] = React.useState(false);
    const [showSuccess, setShowSuccess] = React.useState(false);

    React.useEffect(() => {
      if (success && animateSuccess) {
        setShowSuccess(true);
        const timer = setTimeout(() => setShowSuccess(false), 2000);
        return () => clearTimeout(timer);
      }
    }, [success, animateSuccess]);

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (!disabled && !loading) {
        if (ripple && !shouldReduceMotion) {
          createRipple(e);
        }
        onClick?.(e);
      }
    };

    const handleMouseDown = () => setIsPressed(true);
    const handleMouseUp = () => setIsPressed(false);
    const handleMouseLeave = () => setIsPressed(false);

    return (
      <motion.div
        className="relative inline-block"
        animate={
          scaleOnPress && !shouldReduceMotion && isPressed
            ? { scale: 0.97 }
            : { scale: 1 }
        }
        transition={{ type: "spring", stiffness: 400, damping: 20 }}
      >
        <Button
          ref={ref}
          className={cn(
            "relative overflow-hidden transition-all duration-200",
            loading && "cursor-wait",
            success && showSuccess && "border-success",
            className
          )}
          disabled={disabled || loading}
          onClick={handleClick}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
          {...props}
        >
          {/* Ripple Effect */}
          {ripple && !shouldReduceMotion && (
            <RippleContainer color={rippleColor} />
          )}

          {/* Button Content with Loading/Success States */}
          <AnimatePresence mode="wait">
            {loading ? (
              <motion.div
                key="loading"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.2 }}
                className="flex items-center justify-center"
              >
                <Loader2 className="h-4 w-4 animate-spin" />
              </motion.div>
            ) : showSuccess ? (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ 
                  type: "spring", 
                  stiffness: 300,
                  damping: 20
                }}
                className="flex items-center gap-2"
              >
                <motion.div
                  initial={{ rotate: -180, scale: 0 }}
                  animate={{ rotate: 0, scale: 1 }}
                  transition={{ 
                    type: "spring",
                    stiffness: 200,
                    delay: 0.1
                  }}
                >
                  <CheckCircle2 className="h-4 w-4 text-success" />
                </motion.div>
                <span>{successMessage || "Success!"}</span>
              </motion.div>
            ) : (
              <motion.div
                key="content"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                {children}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Success background pulse */}
          {showSuccess && !shouldReduceMotion && (
            <motion.div
              className="absolute inset-0 bg-success/20 pointer-events-none"
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 0.3, 0] }}
              transition={{ duration: 0.6 }}
            />
          )}
        </Button>
      </motion.div>
    );
  }
);

EnhancedButton.displayName = "EnhancedButton";

export { EnhancedButton };

/**
 * Icon button with rotation animation on click
 */
export function AnimatedIconButton({
  icon,
  onClick,
  rotateOnClick = true,
  className,
  ...props
}: ButtonProps & {
  icon: React.ReactNode;
  rotateOnClick?: boolean;
}) {
  const [isRotating, setIsRotating] = React.useState(false);
  const shouldReduceMotion = useReducedMotion();

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (rotateOnClick && !shouldReduceMotion) {
      setIsRotating(true);
      setTimeout(() => setIsRotating(false), 500);
    }
    onClick?.(e);
  };

  return (
    <Button
      size="icon"
      onClick={handleClick}
      className={cn("relative", className)}
      {...props}
    >
      <motion.div
        animate={
          isRotating
            ? { rotate: 360, scale: [1, 1.1, 1] }
            : { rotate: 0, scale: 1 }
        }
        transition={{ duration: 0.5, type: "spring" }}
      >
        {icon}
      </motion.div>
    </Button>
  );
}

/**
 * Floating action button with hover animation
 */
export function FloatingActionButton({
  icon,
  label,
  onClick,
  className,
  ...props
}: ButtonProps & {
  icon: React.ReactNode;
  label?: string;
}) {
  const [isHovered, setIsHovered] = React.useState(false);
  const shouldReduceMotion = useReducedMotion();
  const { createRipple, RippleContainer } = useRipple();

  return (
    <motion.div
      className="fixed bottom-6 right-6 z-50"
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ 
        type: "spring",
        stiffness: 200,
        damping: 15,
        delay: 0.2
      }}
      whileHover={!shouldReduceMotion ? { scale: 1.05 } : {}}
      whileTap={!shouldReduceMotion ? { scale: 0.95 } : {}}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
    >
      <Button
        size="icon"
        onClick={(e) => {
          createRipple(e);
          onClick?.(e);
        }}
        className={cn(
          "relative h-14 w-14 rounded-full shadow-lg overflow-hidden",
          className
        )}
        {...props}
      >
        <RippleContainer />
        <motion.div
          animate={isHovered && !shouldReduceMotion ? { rotate: 90 } : { rotate: 0 }}
          transition={{ type: "spring", stiffness: 200 }}
        >
          {icon}
        </motion.div>
      </Button>
      
      {/* Label on hover */}
      <AnimatePresence>
        {label && isHovered && (
          <motion.div
            className="absolute right-16 top-1/2 -translate-y-1/2 bg-background border rounded-md px-2 py-1 shadow-sm"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.2 }}
          >
            <span className="text-xs font-medium whitespace-nowrap">{label}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}