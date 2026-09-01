import type { Metadata } from "next";
import "./globals.css";
import BottomNav from "./bottom-nav";
import ToastProvider from "./components/toast-provider";
import NavigationTracker from "./components/navigation-tracker";

export const metadata: Metadata = {
  title: "Recipe Planner",
  description: "Personal recipe and dinner planning",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-page-bg pb-16">
        {/* Constrained to a phone-width column, centred, with the page
            background filling the rest of the viewport. Reads as a phone
            app deliberately rather than a stretched desktop layout. */}
        <NavigationTracker />
        <ToastProvider>
          <div className="mx-auto min-h-screen max-w-[420px] bg-page-bg shadow-xl shadow-black/[0.03]">
            <main>{children}</main>
          </div>
          <BottomNav />
        </ToastProvider>
      </body>
    </html>
  );
}
