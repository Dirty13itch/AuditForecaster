import { lazy, Suspense } from "react";
import { ChartLoadingFallback } from "@/components/LoadingStates";
import type { ComponentProps } from "react";

/**
 * Lazy-loaded wrapper components for Recharts
 * This splits the heavy Recharts library into a separate bundle
 * that only loads when charts are actually rendered
 */

// Lazy load individual chart components from Recharts
const LazyLineChart = lazy(() =>
  import("recharts").then((module) => ({ default: module.LineChart }))
);

const LazyBarChart = lazy(() =>
  import("recharts").then((module) => ({ default: module.BarChart }))
);

const LazyAreaChart = lazy(() =>
  import("recharts").then((module) => ({ default: module.AreaChart }))
);

const LazyPieChart = lazy(() =>
  import("recharts").then((module) => ({ default: module.PieChart }))
);

const LazyComposedChart = lazy(() =>
  import("recharts").then((module) => ({ default: module.ComposedChart }))
);

const LazyRadarChart = lazy(() =>
  import("recharts").then((module) => ({ default: module.RadarChart }))
);

const LazyRadialBarChart = lazy(() =>
  import("recharts").then((module) => ({ default: module.RadialBarChart }))
);

const LazyScatterChart = lazy(() =>
  import("recharts").then((module) => ({ default: module.ScatterChart }))
);

const LazyTreChart = lazy(() =>
  import("recharts").then((module) => ({ default: module.Treemap }))
);

// Export chart utility components directly (they're small)
export {
  ResponsiveContainer,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Line,
  Bar,
  Area,
  Pie,
  Cell,
  Scatter,
  Radar,
  RadialBar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Brush,
  ReferenceArea,
  ReferenceLine,
  ReferenceDot,
  ErrorBar,
  LabelList,
} from "recharts";

// Type exports for TypeScript support
export type { 
  LineProps, 
  BarProps, 
  AreaProps, 
  PieProps,
  ScatterProps,
  RadarProps,
  RadialBarProps 
} from "recharts";

// Wrapper components with loading states
export function LineChart(props: ComponentProps<typeof LazyLineChart>) {
  return (
    <Suspense fallback={<ChartLoadingFallback />}>
      <LazyLineChart {...props} />
    </Suspense>
  );
}

export function BarChart(props: ComponentProps<typeof LazyBarChart>) {
  return (
    <Suspense fallback={<ChartLoadingFallback />}>
      <LazyBarChart {...props} />
    </Suspense>
  );
}

export function AreaChart(props: ComponentProps<typeof LazyAreaChart>) {
  return (
    <Suspense fallback={<ChartLoadingFallback />}>
      <LazyAreaChart {...props} />
    </Suspense>
  );
}

export function PieChart(props: ComponentProps<typeof LazyPieChart>) {
  return (
    <Suspense fallback={<ChartLoadingFallback />}>
      <LazyPieChart {...props} />
    </Suspense>
  );
}

export function ComposedChart(props: ComponentProps<typeof LazyComposedChart>) {
  return (
    <Suspense fallback={<ChartLoadingFallback />}>
      <LazyComposedChart {...props} />
    </Suspense>
  );
}

export function RadarChart(props: ComponentProps<typeof LazyRadarChart>) {
  return (
    <Suspense fallback={<ChartLoadingFallback />}>
      <LazyRadarChart {...props} />
    </Suspense>
  );
}

export function RadialBarChart(props: ComponentProps<typeof LazyRadialBarChart>) {
  return (
    <Suspense fallback={<ChartLoadingFallback />}>
      <LazyRadialBarChart {...props} />
    </Suspense>
  );
}

export function ScatterChart(props: ComponentProps<typeof LazyScatterChart>) {
  return (
    <Suspense fallback={<ChartLoadingFallback />}>
      <LazyScatterChart {...props} />
    </Suspense>
  );
}

export function Treemap(props: ComponentProps<typeof LazyTreChart>) {
  return (
    <Suspense fallback={<ChartLoadingFallback />}>
      <LazyTreChart {...props} />
    </Suspense>
  );
}