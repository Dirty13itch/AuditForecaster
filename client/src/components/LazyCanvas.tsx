import { lazy, Suspense } from "react";
import { CanvasLoadingFallback } from "@/components/LoadingStates";
import type { ComponentProps } from "react";

/**
 * Lazy-loaded wrapper components for React-Konva
 * This splits the heavy Konva library into a separate bundle
 * that only loads when the photo annotation editor is used
 */

// Lazy load Konva components
const LazyStage = lazy(() =>
  import("react-konva").then((module) => ({ default: module.Stage }))
);

const LazyLayer = lazy(() =>
  import("react-konva").then((module) => ({ default: module.Layer }))
);

const LazyLine = lazy(() =>
  import("react-konva").then((module) => ({ default: module.Line }))
);

const LazyRect = lazy(() =>
  import("react-konva").then((module) => ({ default: module.Rect }))
);

const LazyCircle = lazy(() =>
  import("react-konva").then((module) => ({ default: module.Circle }))
);

const LazyText = lazy(() =>
  import("react-konva").then((module) => ({ default: module.Text }))
);

const LazyArrow = lazy(() =>
  import("react-konva").then((module) => ({ default: module.Arrow }))
);

const LazyTransformer = lazy(() =>
  import("react-konva").then((module) => ({ default: module.Transformer }))
);

const LazyImage = lazy(() =>
  import("react-konva").then((module) => ({ default: module.Image }))
);

const LazyPath = lazy(() =>
  import("react-konva").then((module) => ({ default: module.Path }))
);

const LazyGroup = lazy(() =>
  import("react-konva").then((module) => ({ default: module.Group }))
);

// Wrapper components with loading states
export function Stage(props: ComponentProps<typeof LazyStage>) {
  return (
    <Suspense fallback={<CanvasLoadingFallback />}>
      <LazyStage {...props} />
    </Suspense>
  );
}

export function Layer(props: ComponentProps<typeof LazyLayer>) {
  return (
    <Suspense fallback={<div>Loading layer...</div>}>
      <LazyLayer {...props} />
    </Suspense>
  );
}

export function Line(props: ComponentProps<typeof LazyLine>) {
  return (
    <Suspense fallback={null}>
      <LazyLine {...props} />
    </Suspense>
  );
}

export function Rect(props: ComponentProps<typeof LazyRect>) {
  return (
    <Suspense fallback={null}>
      <LazyRect {...props} />
    </Suspense>
  );
}

export function Circle(props: ComponentProps<typeof LazyCircle>) {
  return (
    <Suspense fallback={null}>
      <LazyCircle {...props} />
    </Suspense>
  );
}

export function Text(props: ComponentProps<typeof LazyText>) {
  return (
    <Suspense fallback={null}>
      <LazyText {...props} />
    </Suspense>
  );
}

export function Arrow(props: ComponentProps<typeof LazyArrow>) {
  return (
    <Suspense fallback={null}>
      <LazyArrow {...props} />
    </Suspense>
  );
}

export function Transformer(props: ComponentProps<typeof LazyTransformer>) {
  return (
    <Suspense fallback={null}>
      <LazyTransformer {...props} />
    </Suspense>
  );
}

export function Image(props: ComponentProps<typeof LazyImage>) {
  return (
    <Suspense fallback={null}>
      <LazyImage {...props} />
    </Suspense>
  );
}

export function Path(props: ComponentProps<typeof LazyPath>) {
  return (
    <Suspense fallback={null}>
      <LazyPath {...props} />
    </Suspense>
  );
}

export function Group(props: ComponentProps<typeof LazyGroup>) {
  return (
    <Suspense fallback={null}>
      <LazyGroup {...props} />
    </Suspense>
  );
}

// Export utility functions directly (they're small)
export { useImage } from "use-image";