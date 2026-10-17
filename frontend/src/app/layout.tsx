import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { Toaster } from "sonner";
import "./globals.css";
import StoreProviders from "../providers/StoreProvder";
import { IntegrationStatusProvider } from "../components/app-connections/context/IntegrationStatusProvider";
import { CrossTabLogoutProvider } from "../components/providers/cross-tab-logout";

// ── Fonts ─────────────────────────────────────────────────────
// CSS variables are consumed by globals.css → --font-sans / --font-mono
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

// ─────────────────────────────────────────────────────────────

const defaultUrl = process.env.NEXT_PUBLIC_APP_URL
  || (process.env.RAILWAY_PUBLIC_DOMAIN ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}` : null)
  || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null)
  || "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(defaultUrl),
  title: "job-management",
  description: "job-management",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${inter.variable} ${jetbrainsMono.variable}`}
    >
      <body className="antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <StoreProviders>
            <CrossTabLogoutProvider>
            <IntegrationStatusProvider>
              {children}
              <Toaster
                richColors
                position="top-right"
                offset="1rem"
              />
            </IntegrationStatusProvider>
            </CrossTabLogoutProvider>
          </StoreProviders>
        </ThemeProvider>
      </body>
    </html>
  );
}
