export const FeatureFlags = {
    // Phase 2: Task Claiming & Scaling
    ENABLE_TASK_CLAIMING: process.env.NEXT_PUBLIC_ENABLE_TASK_CLAIMING === 'true',

    // Future Phases
    ENABLE_ADVANCED_ANALYTICS: process.env.NEXT_PUBLIC_ENABLE_ADVANCED_ANALYTICS === 'true',
    ENABLE_OFFLINE_SYNC_V2: process.env.NEXT_PUBLIC_ENABLE_OFFLINE_SYNC_V2 === 'true',
} as const;

export type FeatureFlag = keyof typeof FeatureFlags;

export function isFeatureEnabled(flag: FeatureFlag): boolean {
    return FeatureFlags[flag];
}
