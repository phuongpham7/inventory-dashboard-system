import './globals.css';
import { Barlow_Condensed, Source_Sans_3 } from 'next/font/google';

const head = Barlow_Condensed({ subsets: ['latin'], weight: ['600', '700'], variable: '--font-head' });
const body = Source_Sans_3({ subsets: ['latin'], variable: '--font-body' });

export const metadata = {
  title: 'Intelligent Inventory Dashboard',
  description: 'Real-time vehicle stock overview with aging stock insights',
};
export const viewport = { width: 'device-width', initialScale: 1, viewportFit: 'cover' };

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${head.variable} ${body.variable}`}>
      <body>{children}</body>
    </html>
  );
}
