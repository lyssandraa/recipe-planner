import type { Metadata, Viewport } from "next";
import "./globals.css";
import BottomNav from "./bottom-nav";
import ToastProvider from "./components/toast-provider";
import NavigationTracker from "./components/navigation-tracker";
import ServiceWorkerRegister from "./components/service-worker-register";

export const metadata: Metadata = {
  title: "Recipe Planner",
  description: "Personal recipe and dinner planning",
  icons: {
    icon: [
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16.png", sizes: "16x16", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
  // iOS only reads a handful of these meta tags directly (it doesn't fully
  // use the web manifest the way Android/desktop browsers do), so the
  // standalone "Add to Home Screen" behaviour depends on appleWebApp
  // specifically, not just manifest.ts.
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Recipes",
  },
};

export const viewport: Viewport = {
  themeColor: "#2F5E3A",
  width: "device-width",
  initialScale: 1,
  // Needed for `env(safe-area-inset-bottom)` to report the actual home
  // indicator height on iOS instead of 0, used by the bottom nav.
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-cream pb-[calc(4rem+env(safe-area-inset-bottom))]">
        {/* Constrained to a phone-width column, centred, with the page
            background filling the rest of the viewport. Reads as a phone
            app deliberately rather than a stretched desktop layout. */}
        <NavigationTracker />
        <ServiceWorkerRegister />
        <ToastProvider>
          <div className="mx-auto min-h-screen max-w-[420px] bg-cream shadow-xl shadow-black/[0.03]">
            <main>{children}</main>
          </div>
          <BottomNav />
        </ToastProvider>
      </body>
    </html>
  );
}
