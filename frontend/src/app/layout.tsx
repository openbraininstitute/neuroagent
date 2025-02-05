import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import ThemeChanger from "@/components/theme-changer";
import { QueryProvider } from "@/components/query-client-provider";
import { AuthProvider } from "@/components/auth-provider";

import { Body } from "@/components/body";
import { Footer } from "@/components/footer";
import { Header } from "@/components/header";
import { Sidebar } from "@/components/sidebar";
import { ThreadList } from "@/components/thread-list";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "OBI Chat",
  description: "Generated by create next app",
};

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
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen`}
      >
        <QueryProvider>
          <AuthProvider>
            <ThemeChanger>
              <div className="flex flex-col h-screen">
                <Header />
                <div className="flex flex-1 flex-row overflow-hidden">
                  <Sidebar>
                    <ThreadList />
                  </Sidebar>
                  <Body>{children}</Body>
                </div>
                <Footer />
              </div>
            </ThemeChanger>
          </AuthProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
