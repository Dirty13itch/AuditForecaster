import { type Variants } from "framer-motion";

/**
 * Centralized Animation Variants Library
 * 
 * World-class micro-interactions for the energy auditing field application.
 * All animations respect `prefers-reduced-motion` when used with framer-motion's
 * useReducedMotion hook.
 * 
 * Design Principles:
 * - All animations < 200ms (feel instant)
 * - Subtle, not distracting
 * - No layout shifts
 * - Respect accessibility
 * 
 * References:
 * - Linear: Fast, minimal animations (150-200ms)
 * - Stripe: Smooth state transitions
 * - Vercel: Subtle feedback
 */

// ==================== CORE ANIMATIONS ====================

/**
 * Fade In - Simple opacity transition
 * Duration: 200ms
 * Use: Content appearing, page transitions
 */
export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { 
    opacity: 1,
    transition: { duration: 0.2, ease: "easeOut" }
  },
  exit: { 
    opacity: 0,
    transition: { duration: 0.15 }
  }
};

/**
 * Fade In Up - Opacity + slight upward movement
 * Duration: 250ms
 * Use: Cards, list items, modals
 */
export const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.25, ease: [0.22, 1, 0.36, 1] } // Custom easing
  },
  exit: {
    opacity: 0,
    y: -12,
    transition: { duration: 0.2 }
  }
};

/**
 * Fade In Down - Opacity + slight downward movement
 * Duration: 250ms
 * Use: Dropdowns, notifications, tooltips
 */
export const fadeInDown: Variants = {
  hidden: { opacity: 0, y: -12 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.25, ease: [0.22, 1, 0.36, 1] }
  },
  exit: {
    opacity: 0,
    y: 12,
    transition: { duration: 0.2 }
  }
};

/**
 * Scale In - Subtle scale + opacity
 * Duration: 200ms
 * Use: Buttons, badges, small elements
 */
export const scaleIn: Variants = {
  hidden: { scale: 0.95, opacity: 0 },
  visible: { 
    scale: 1, 
    opacity: 1,
    transition: { duration: 0.2, ease: "easeOut" }
  },
  exit: {
    scale: 0.95,
    opacity: 0,
    transition: { duration: 0.15 }
  }
};

/**
 * Pop In - Bouncy scale effect
 * Duration: 300ms (spring)
 * Use: Success states, completed items, celebrations
 */
export const popIn: Variants = {
  hidden: { scale: 0, opacity: 0 },
  visible: {
    scale: 1,
    opacity: 1,
    transition: {
      type: "spring",
      stiffness: 400,
      damping: 20,
      mass: 0.8
    }
  },
  exit: {
    scale: 0,
    opacity: 0,
    transition: { duration: 0.15 }
  }
};

// ==================== LIST & STAGGER ANIMATIONS ====================

/**
 * Stagger Container - Parent container for staggered children
 * Use with: staggerItem variants
 */
export const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05, // 50ms between each child
      delayChildren: 0.1 // 100ms before first child
    }
  },
  exit: {
    opacity: 0,
    transition: {
      staggerChildren: 0.03,
      staggerDirection: -1 // Reverse order on exit
    }
  }
};

/**
 * Stagger Item - Child items in staggered list
 * Use inside: StaggerContainer
 */
export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { 
      type: "spring", 
      stiffness: 100,
      damping: 15
    }
  },
  exit: {
    opacity: 0,
    y: -10,
    transition: { duration: 0.15 }
  }
};

/**
 * Fast Stagger - Quick succession for small lists
 * Stagger: 30ms
 */
export const fastStaggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.03,
      delayChildren: 0.05
    }
  }
};

// ==================== SLIDE ANIMATIONS ====================

/**
 * Slide In Right - Horizontal slide from right
 * Duration: 300ms (spring)
 * Use: Sidebars, drawers, panels
 */
export const slideInRight: Variants = {
  hidden: { x: "100%", opacity: 0 },
  visible: { 
    x: 0,
    opacity: 1,
    transition: { 
      type: "spring", 
      stiffness: 300, 
      damping: 30 
    }
  },
  exit: {
    x: "100%",
    opacity: 0,
    transition: { duration: 0.2, ease: "easeIn" }
  }
};

/**
 * Slide In Left - Horizontal slide from left
 * Duration: 300ms (spring)
 * Use: Back navigation, sidebars
 */
export const slideInLeft: Variants = {
  hidden: { x: "-100%", opacity: 0 },
  visible: { 
    x: 0,
    opacity: 1,
    transition: { 
      type: "spring", 
      stiffness: 300, 
      damping: 30 
    }
  },
  exit: {
    x: "-100%",
    opacity: 0,
    transition: { duration: 0.2, ease: "easeIn" }
  }
};

/**
 * Slide Up - Vertical slide from bottom
 * Duration: 300ms
 * Use: Bottom sheets, mobile modals
 */
export const slideUp: Variants = {
  hidden: { y: "100%", opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      type: "spring",
      stiffness: 300,
      damping: 30
    }
  },
  exit: {
    y: "100%",
    opacity: 0,
    transition: { duration: 0.2, ease: "easeIn" }
  }
};

// ==================== INTERACTIVE STATES ====================

/**
 * Button Press - Subtle scale down on press
 * Use with: whileTap
 */
export const buttonPress = {
  scale: 0.98,
  transition: { duration: 0.1 }
};

/**
 * Button Hover - Subtle lift on hover
 * Use with: whileHover
 */
export const buttonHover = {
  y: -2,
  transition: { duration: 0.15, ease: "easeOut" }
};

/**
 * Card Hover - Lift and shadow effect
 * Use with: whileHover
 */
export const cardHover = {
  y: -4,
  scale: 1.01,
  transition: { 
    duration: 0.2, 
    ease: [0.22, 1, 0.36, 1] 
  }
};

/**
 * Icon Hover - Rotate slightly on hover
 * Use with: whileHover (for icons)
 */
export const iconHover = {
  scale: 1.1,
  rotate: 5,
  transition: { duration: 0.15 }
};

// ==================== FORM ANIMATIONS ====================

/**
 * Input Focus - Scale and glow on focus
 * Use with: form inputs (already handled by shadcn, but available for custom)
 */
export const inputFocus: Variants = {
  idle: { 
    scale: 1,
    boxShadow: "0 0 0 0px rgba(59, 130, 246, 0)"
  },
  focused: {
    scale: 1.01,
    boxShadow: "0 0 0 3px rgba(59, 130, 246, 0.1)",
    transition: { duration: 0.2 }
  }
};

/**
 * Success State - Checkmark animation
 * Use: Form submission success, task completion
 */
export const successCheckmark: Variants = {
  hidden: { 
    scale: 0,
    opacity: 0,
    pathLength: 0
  },
  visible: {
    scale: 1,
    opacity: 1,
    pathLength: 1,
    transition: {
      scale: { 
        type: "spring", 
        stiffness: 300,
        damping: 15
      },
      pathLength: { 
        duration: 0.3,
        ease: "easeOut"
      }
    }
  }
};

/**
 * Error Shake - Horizontal shake for errors
 * Use: Form validation errors, failed actions
 */
export const errorShake: Variants = {
  idle: { x: 0 },
  shake: {
    x: [-10, 10, -10, 10, -5, 5, 0],
    transition: { duration: 0.5 }
  }
};

// ==================== LOADING STATES ====================

/**
 * Pulse - Opacity pulse animation
 * Use: Loading placeholders, skeleton screens
 */
export const pulse: Variants = {
  pulse: {
    opacity: [0.5, 1, 0.5],
    transition: {
      duration: 1.5,
      repeat: Infinity,
      ease: "easeInOut"
    }
  }
};

/**
 * Spinner - Rotation animation
 * Use: Loading spinners
 */
export const spinner: Variants = {
  spin: {
    rotate: 360,
    transition: {
      duration: 1,
      repeat: Infinity,
      ease: "linear"
    }
  }
};

/**
 * Skeleton Shimmer - Loading placeholder effect
 * Use: Content loading states
 */
export const skeletonShimmer: Variants = {
  shimmer: {
    backgroundPosition: ["200% 0", "-200% 0"],
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: "linear"
    }
  }
};

// ==================== PAGE TRANSITIONS ====================

/**
 * Page Fade - Simple page transition
 * Duration: 200ms
 * Use: Route changes
 */
export const pageFade: Variants = {
  hidden: { opacity: 0 },
  visible: { 
    opacity: 1,
    transition: { duration: 0.2, ease: "easeInOut" }
  },
  exit: { 
    opacity: 0,
    transition: { duration: 0.15 }
  }
};

/**
 * Page Slide - Horizontal slide page transition
 * Duration: 300ms
 * Use: Forward/back navigation
 */
export const pageSlide: Variants = {
  enterFromRight: {
    x: "100%",
    opacity: 0
  },
  enterFromLeft: {
    x: "-100%",
    opacity: 0
  },
  center: {
    x: 0,
    opacity: 1,
    transition: {
      duration: 0.3,
      ease: [0.22, 1, 0.36, 1]
    }
  },
  exitToRight: {
    x: "100%",
    opacity: 0,
    transition: {
      duration: 0.3,
      ease: [0.22, 1, 0.36, 1]
    }
  },
  exitToLeft: {
    x: "-100%",
    opacity: 0,
    transition: {
      duration: 0.3,
      ease: [0.22, 1, 0.36, 1]
    }
  }
};

// ==================== MODAL & OVERLAY ANIMATIONS ====================

/**
 * Modal Overlay - Background overlay fade
 * Duration: 200ms
 * Use: Modal backgrounds, dialogs
 */
export const modalOverlay: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 0.2 }
  },
  exit: {
    opacity: 0,
    transition: { duration: 0.15 }
  }
};

/**
 * Modal Content - Modal/dialog content animation
 * Duration: 250ms
 * Use: Modal content, dialogs, sheets
 */
export const modalContent: Variants = {
  hidden: { 
    opacity: 0, 
    scale: 0.95,
    y: 20
  },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      duration: 0.25,
      ease: [0.22, 1, 0.36, 1]
    }
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    y: 20,
    transition: { duration: 0.2 }
  }
};

/**
 * Dropdown Menu - Menu appearance animation
 * Duration: 200ms
 * Use: Dropdown menus, context menus
 */
export const dropdownMenu: Variants = {
  hidden: { 
    opacity: 0,
    scale: 0.95,
    y: -10
  },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      duration: 0.2,
      ease: "easeOut"
    }
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    transition: { duration: 0.15 }
  }
};

// ==================== NOTIFICATION ANIMATIONS ====================

/**
 * Toast Slide In - Toast notification from right
 * Duration: 300ms
 * Use: Toast notifications
 */
export const toastSlideIn: Variants = {
  hidden: { 
    x: "100%",
    opacity: 0
  },
  visible: {
    x: 0,
    opacity: 1,
    transition: {
      type: "spring",
      stiffness: 300,
      damping: 30
    }
  },
  exit: {
    x: "100%",
    opacity: 0,
    transition: {
      duration: 0.2,
      ease: "easeIn"
    }
  }
};

/**
 * Badge Bounce - Badge number change animation
 * Duration: 400ms
 * Use: Notification counts, badges
 */
export const badgeBounce: Variants = {
  hidden: { scale: 0 },
  visible: {
    scale: 1,
    transition: {
      type: "spring",
      stiffness: 500,
      damping: 15
    }
  }
};

// ==================== ACCORDION & COLLAPSE ====================

/**
 * Accordion Expand - Smooth height expansion
 * Use: Accordions, expandable sections
 * Note: Requires AnimatePresence
 */
export const accordionExpand: Variants = {
  collapsed: {
    height: 0,
    opacity: 0,
    transition: {
      height: { duration: 0.2, ease: "easeInOut" },
      opacity: { duration: 0.15 }
    }
  },
  expanded: {
    height: "auto",
    opacity: 1,
    transition: {
      height: { duration: 0.3, ease: [0.22, 1, 0.36, 1] },
      opacity: { duration: 0.2, delay: 0.1 }
    }
  }
};

// ==================== UTILITY FUNCTIONS ====================

/**
 * Create custom stagger with timing
 */
export function createStagger(delayBetween: number, initialDelay: number = 0): Variants {
  return {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: delayBetween,
        delayChildren: initialDelay
      }
    }
  };
}

/**
 * Create custom fade with duration
 */
export function createFade(duration: number = 0.2): Variants {
  return {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { duration, ease: "easeOut" }
    },
    exit: {
      opacity: 0,
      transition: { duration: duration * 0.75 }
    }
  };
}

/**
 * Combine multiple animation variants
 * Use: When you need multiple effects (fade + slide, etc.)
 */
export function combineVariants(...variants: Variants[]): Variants {
  return variants.reduce((acc, variant) => {
    Object.keys(variant).forEach(key => {
      acc[key] = {
        ...acc[key],
        ...variant[key]
      };
    });
    return acc;
  }, {});
}

// ==================== PRESET COMBINATIONS ====================

/**
 * Card Appear - Fade in up with subtle scale
 * Perfect for: Job cards, photo cards, list items
 */
export const cardAppear: Variants = {
  hidden: { 
    opacity: 0, 
    y: 20,
    scale: 0.98
  },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.3,
      ease: [0.22, 1, 0.36, 1]
    }
  }
};

/**
 * List Item - Optimized for lists
 * Perfect for: Job lists, photo grids, search results
 */
export const listItem: Variants = {
  hidden: { 
    opacity: 0,
    x: -20
  },
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      duration: 0.25,
      ease: "easeOut"
    }
  }
};

/**
 * Photo Grid Item - Photo gallery item
 * Perfect for: Photo thumbnails, image galleries
 */
export const photoGridItem: Variants = {
  hidden: {
    opacity: 0,
    scale: 0.9
  },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: 0.3,
      ease: [0.22, 1, 0.36, 1]
    }
  },
  hover: {
    scale: 1.05,
    transition: {
      duration: 0.2
    }
  }
};

// Export all variants for easy importing
export default {
  // Core
  fadeIn,
  fadeInUp,
  fadeInDown,
  scaleIn,
  popIn,
  
  // List & Stagger
  staggerContainer,
  staggerItem,
  fastStaggerContainer,
  
  // Slides
  slideInRight,
  slideInLeft,
  slideUp,
  
  // Interactive
  buttonPress,
  buttonHover,
  cardHover,
  iconHover,
  
  // Forms
  inputFocus,
  successCheckmark,
  errorShake,
  
  // Loading
  pulse,
  spinner,
  skeletonShimmer,
  
  // Pages
  pageFade,
  pageSlide,
  
  // Modals
  modalOverlay,
  modalContent,
  dropdownMenu,
  
  // Notifications
  toastSlideIn,
  badgeBounce,
  
  // Accordion
  accordionExpand,
  
  // Presets
  cardAppear,
  listItem,
  photoGridItem
};
