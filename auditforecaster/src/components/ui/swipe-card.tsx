"use client";

import { motion, useMotionValue, useTransform, PanInfo } from "framer-motion";
import { useState } from "react";
import { clsx } from "clsx";

interface SwipeCardProps {
    children: React.ReactNode;
    onSwipeLeft: () => void;
    onSwipeRight: () => void;
    className?: string;
}

export function SwipeCard({ children, onSwipeLeft, onSwipeRight, className }: SwipeCardProps) {
    const [exitX, setExitX] = useState<number | null>(null);
    const x = useMotionValue(0);
    const rotate = useTransform(x, [-200, 200], [-25, 25]);
    const opacity = useTransform(x, [-200, -100, 0, 100, 200], [0, 1, 1, 1, 0]);

    // Background color interpolation
    const bg = useTransform(
        x,
        [-200, -100, 0, 100, 200],
        ["rgba(239, 68, 68, 0.2)", "rgba(239, 68, 68, 0.1)", "rgba(255, 255, 255, 0)", "rgba(34, 197, 94, 0.1)", "rgba(34, 197, 94, 0.2)"]
    );

    const handleDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
        if (info.offset.x < -100) {
            setExitX(-200);
            onSwipeLeft();
        } else if (info.offset.x > 100) {
            setExitX(200);
            onSwipeRight();
        }
    };

    return (
        <motion.div
            style={{ x, rotate, opacity, backgroundColor: bg }}
            whileTap={{ cursor: "grabbing" }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            onDragEnd={handleDragEnd}
            animate={exitX ? { x: exitX, opacity: 0 } : { x: 0, opacity: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            className={clsx(
                "absolute w-full h-full cursor-grab active:cursor-grabbing rounded-xl shadow-lg border bg-card overflow-hidden select-none touch-none",
                className
            )}
        >
            {children}

            {/* Overlay Indicators */}
            <motion.div
                style={{ opacity: useTransform(x, [20, 100], [0, 1]) }}
                className="absolute top-4 left-4 border-4 border-green-500 text-green-500 font-bold text-2xl px-2 rounded transform -rotate-12"
            >
                BUSINESS
            </motion.div>
            <motion.div
                style={{ opacity: useTransform(x, [-100, -20], [1, 0]) }}
                className="absolute top-4 right-4 border-4 border-red-500 text-red-500 font-bold text-2xl px-2 rounded transform rotate-12"
            >
                PERSONAL
            </motion.div>
        </motion.div>
    );
}
