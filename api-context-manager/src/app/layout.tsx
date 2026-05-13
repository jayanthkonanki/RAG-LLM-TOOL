import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: 'APIContext — AI-Native Endpoint Context Manager',
  description: 'Structure APIs for AI agent understanding. Define endpoint context, metadata, and operational intent in a developer-first workflow.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} font-sans antialiased bg-zinc-950 text-zinc-100 overflow-hidden`}>
        {children}
      </body>
    </html>
  );
}
