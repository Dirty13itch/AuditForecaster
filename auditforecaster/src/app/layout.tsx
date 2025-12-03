import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ServiceWorkerRegister } from "@/components/service-worker-register";
import { ErrorBoundary } from "@/components/error-boundary";
import { SyncProvider } from "@/providers/sync-provider";
import { SyncIndicator } from "@/components/sync-indicator";
import { Toaster } from "sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Ulrich Energy Auditing",
    template: "%s | Ulrich Energy"
  },
  description: "Professional field auditing tool for energy inspectors. Manage jobs, photos, and reports efficiently.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Ulrich Audit",
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
