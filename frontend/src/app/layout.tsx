import { Geist, Geist_Mono } from "next/font/google";
import "@/app/globals.css";
import ThemeChangerProvider from "@/components/layout/theme-changer";
import { QueryProvider } from "@/components/query-client-provider";
import { AuthProvider } from "@/components/auth-provider";
import { ProgressBarProvider, ProgressBar } from "@/components/progress-bar";
import { Toaster } from "@/components/ui/toaster";

import { Body } from "@/components/layout/body";
import { Footer } from "@/components/layout/footer";
import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/sidebar/sidebar";
import { ThreadList } from "@/components/sidebar/thread-list";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className="transition-colors duration-300 ease-in-out"
      suppressHydrationWarning
    >
      <body
        className={`${geistSans.variable} ${geistMono.variable} min-h-screen antialiased`}
      >
        <QueryProvider>
          <AuthProvider>
            <ThemeChangerProvider>
              <ProgressBarProvider>
                <div className="flex h-screen flex-col">
                  <Header />
                  <div className="flex flex-1 flex-row overflow-hidden">
                    <Sidebar>
                      <ThreadList />
                    </Sidebar>
                    <Body>
                      <ProgressBar />
                      {children}
                    </Body>
                  </div>
                  <Footer />
                </div>
                <Toaster />
              </ProgressBarProvider>
            </ThemeChangerProvider>
          </AuthProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
