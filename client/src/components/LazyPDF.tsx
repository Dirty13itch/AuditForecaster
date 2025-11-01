import { lazy, Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import type { ComponentProps } from "react";

/**
 * Lazy-loaded wrapper components for React-PDF
 * This splits the heavy PDF library into a separate bundle
 * that only loads when PDF generation or viewing is needed
 */

// Lazy load PDF components
const LazyDocument = lazy(() =>
  import("@react-pdf/renderer").then((module) => ({ 
    default: module.Document 
  }))
);

const LazyPage = lazy(() =>
  import("@react-pdf/renderer").then((module) => ({ 
    default: module.Page 
  }))
);

const LazyView = lazy(() =>
  import("@react-pdf/renderer").then((module) => ({ 
    default: module.View 
  }))
);

const LazyText = lazy(() =>
  import("@react-pdf/renderer").then((module) => ({ 
    default: module.Text 
  }))
);

const LazyImage = lazy(() =>
  import("@react-pdf/renderer").then((module) => ({ 
    default: module.Image 
  }))
);

const LazyLink = lazy(() =>
  import("@react-pdf/renderer").then((module) => ({ 
    default: module.Link 
  }))
);

const LazyCanvas = lazy(() =>
  import("@react-pdf/renderer").then((module) => ({ 
    default: module.Canvas 
  }))
);

const LazyPDFViewer = lazy(() =>
  import("@react-pdf/renderer").then((module) => ({ 
    default: module.PDFViewer 
  }))
);

const LazyPDFDownloadLink = lazy(() =>
  import("@react-pdf/renderer").then((module) => ({ 
    default: module.PDFDownloadLink 
  }))
);

const LazyBlobProvider = lazy(() =>
  import("@react-pdf/renderer").then((module) => ({ 
    default: module.BlobProvider 
  }))
);

// Loading fallback for PDF components
const PDFLoadingFallback = () => (
  <div className="space-y-2 p-4">
    <Skeleton className="h-4 w-32" />
    <Skeleton className="h-[600px] w-full" />
  </div>
);

// Wrapper components with loading states
export function Document(props: ComponentProps<typeof LazyDocument>) {
  return (
    <Suspense fallback={<PDFLoadingFallback />}>
      <LazyDocument {...props} />
    </Suspense>
  );
}

export function Page(props: ComponentProps<typeof LazyPage>) {
  return (
    <Suspense fallback={null}>
      <LazyPage {...props} />
    </Suspense>
  );
}

export function View(props: ComponentProps<typeof LazyView>) {
  return (
    <Suspense fallback={null}>
      <LazyView {...props} />
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

export function Image(props: ComponentProps<typeof LazyImage>) {
  return (
    <Suspense fallback={null}>
      <LazyImage {...props} />
    </Suspense>
  );
}

export function Link(props: ComponentProps<typeof LazyLink>) {
  return (
    <Suspense fallback={null}>
      <LazyLink {...props} />
    </Suspense>
  );
}

export function Canvas(props: ComponentProps<typeof LazyCanvas>) {
  return (
    <Suspense fallback={null}>
      <LazyCanvas {...props} />
    </Suspense>
  );
}

export function PDFViewer(props: ComponentProps<typeof LazyPDFViewer>) {
  return (
    <Suspense fallback={<PDFLoadingFallback />}>
      <LazyPDFViewer {...props} />
    </Suspense>
  );
}

export function PDFDownloadLink(props: ComponentProps<typeof LazyPDFDownloadLink>) {
  return (
    <Suspense fallback={
      <div className="inline-flex items-center px-4 py-2 bg-primary text-primary-foreground rounded-md">
        <div className="animate-spin h-4 w-4 border-2 border-primary-foreground border-t-transparent rounded-full mr-2" />
        Generating PDF...
      </div>
    }>
      <LazyPDFDownloadLink {...props} />
    </Suspense>
  );
}

export function BlobProvider(props: ComponentProps<typeof LazyBlobProvider>) {
  return (
    <Suspense fallback={<div>Generating document...</div>}>
      <LazyBlobProvider {...props} />
    </Suspense>
  );
}

// Export StyleSheet and Font directly (they're utilities)
export { StyleSheet, Font } from "@react-pdf/renderer";

// Lazy load PDF generation utility
export const pdf = async (document: any) => {
  const { pdf: pdfFunction } = await import("@react-pdf/renderer");
  return pdfFunction(document);
};