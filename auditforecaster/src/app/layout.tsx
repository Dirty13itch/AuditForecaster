import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { ServiceWorkerRegister } from "@/components/service-worker-register";
import { ErrorBoundary } from "@/components/error-boundary";
import { SyncProvider } from "@/providers/sync-provider";
import { SyncIndicator } from "@/components/sync-indicator";
import { Toaster } from "sonner";

const geistSans = localFont({
  src: "../../node_modules/geist/dist/fonts/geist-sans/Geist-Regular.woff2",
  variable: "--font-geist-sans",
  display: "swap",
});

const geistMono = localFont({
  src: "../../node_modules/geist/dist/fonts/geist-mono/GeistMono-Regular.woff2",
  variable: "--font-geist-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Field Inspect",
    template: "%s | Field Inspect"
  },
  description: "Professional field inspection platform for energy auditors. Manage jobs, inspections, photos, and reports efficiently.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Field Inspect",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: "/icons/icon-192x192.png",
    apple: "/icons/icon-192x192.png",
  },
};

export const viewport = {
  themeColor: "#FFFFFF",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ErrorBoundary>
          <SyncProvider>
            <SyncIndicator />
            <Toaster position="top-center" richColors closeButton />
            <ServiceWorkerRegister />
            {children}
          </SyncProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
