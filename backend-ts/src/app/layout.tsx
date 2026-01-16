import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Neuroagent Backend API',
  description: 'TypeScript backend for Neuroagent with Vercel AI SDK',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
