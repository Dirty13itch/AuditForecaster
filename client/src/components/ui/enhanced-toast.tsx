import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { CheckCircle2, XCircle, AlertCircle, Info, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Toast, ToastProps } from "@/components/ui/toast";

interface EnhancedToastProps extends ToastProps {
  type?: "success" | "error" | "warning" | "info" | "loading";
  progress?: number;
}

const toastIcons = {
  success: CheckCircle2,
  error: XCircle,
  warning: AlertCircle,
  info: Info,
  loading: Loader2,
};

const toastColors = {
  success: "text-success",
  error: "text-destructive",
  warning: "text-warning",
  info: "text-primary",
  loading: "text-primary",
};

const toastVariants = {
  initial: { opacity: 0, x: 100, scale: 0.95 },
  animate: { 
    opacity: 1, 
    x: 0, 
    scale: 1,
    transition: {
      type: "spring",
      stiffness: 300,
      damping: 20,
    }
  },
  exit: { 
    opacity: 0, 
    x: 100,
    scale: 0.95,
    transition: {
      duration: 0.2,
    }
  },
  shake: {
    x: [0, -10, 10, -10, 10, 0],
    transition: { duration: 0.4 },
  },
};

export function EnhancedToast({ 
  type = "info", 
  progress,
  className,
  children,
  ...props 
}: EnhancedToastProps) {
  const shouldReduceMotion = useReducedMotion();
  const Icon = toastIcons[type];
  const iconColor = toastColors[type];

  return (
    <motion.div
      variants={toastVariants}
      initial={shouldReduceMotion ? {} : "initial"}
      animate={type === "error" && !shouldReduceMotion ? ["animate", "shake"] : "animate"}
      exit={shouldReduceMotion ? {} : "exit"}
      layout
      className={cn("relative overflow-hidden", className)}
    >
      <Toast {...props}>
        <div className="flex items-start gap-3">
          {/* Animated Icon */}
          <motion.div
            initial={{ rotate: type === "loading" ? 0 : -180, scale: 0 }}
            animate={{ 
              rotate: type === "loading" ? 360 : 0, 
              scale: 1 
            }}
            transition={
              type === "loading"
                ? { rotate: { duration: 1, repeat: Infinity, ease: "linear" }, scale: { duration: 0.2 } }
                : { type: "spring", stiffness: 200, damping: 15 }
            }
          >
            <Icon className={cn("h-5 w-5", iconColor)} />
          </motion.div>

          {/* Content */}
          <div className="flex-1">
            {children}
          </div>
        </div>

        {/* Progress Bar */}
        {progress !== undefined && (
          <motion.div
            className="absolute bottom-0 left-0 h-1 bg-primary"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
          />
        )}

        {/* Success checkmark animation overlay */}
        {type === "success" && !shouldReduceMotion && (
          <motion.div
            className="absolute inset-0 pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.2, 0] }}
            transition={{ duration: 1, times: [0, 0.5, 1] }}
          >
            <div className="absolute inset-0 bg-success opacity-20" />
          </motion.div>
        )}
      </Toast>
    </motion.div>
  );
}

/**
 * Toast container with stagger animations
 */
export function AnimatedToastContainer({ children }: { children: React.ReactNode }) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <AnimatePresence mode="popLayout">
      <motion.div
        initial={false}
        animate={shouldReduceMotion ? {} : { transition: { staggerChildren: 0.1 } }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

/**
 * Loading toast with progress
 */
export function LoadingToast({ 
  message, 
  progress 
}: { 
  message: string; 
  progress?: number;
}) {
  return (
    <EnhancedToast type="loading" progress={progress}>
      <div className="space-y-1">
        <p className="text-sm font-medium">{message}</p>
        {progress !== undefined && (
          <p className="text-xs text-muted-foreground">{Math.round(progress)}% complete</p>
        )}
      </div>
    </EnhancedToast>
  );
}

/**
 * Success toast with celebration animation
 */
export function SuccessToast({ 
  title, 
  description 
}: { 
  title: string; 
  description?: string;
}) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <EnhancedToast type="success">
      <div className="space-y-1">
        <motion.p 
          className="text-sm font-medium"
          animate={!shouldReduceMotion ? {
            scale: [1, 1.05, 1],
            transition: { duration: 0.3 }
          } : {}}
        >
          {title}
        </motion.p>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
      </div>
    </EnhancedToast>
  );
}

/**
 * Error toast with shake animation
 */
export function ErrorToast({ 
  title, 
  description 
}: { 
  title: string; 
  description?: string;
}) {
  return (
    <EnhancedToast type="error">
      <div className="space-y-1">
        <p className="text-sm font-medium">{title}</p>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
      </div>
    </EnhancedToast>
  );
}