import type { Metadata } from 'next';
import { Geist } from 'next/font/google';
import './globals.css';
import { ThemeProvider } from '@/components/ThemeProvider';

const geist = Geist({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Gate Pass System — NxtWave',
  description: 'Office Entry Gate Pass Management System',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geist.className} bg-gray-50`}>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
