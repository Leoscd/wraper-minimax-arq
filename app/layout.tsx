import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Providers } from './providers';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'SoyLeo AI — Presentador',
  description:
    'Genera presentaciones profesionales de proyectos arquitectónicos con IA. Metodología SoyLeo AI potenciada por MiniMax M3.',
  keywords: [
    'arquitectura',
    'presentaciones',
    'presupuestos',
    'IA',
    'MiniMax',
    'SoyLeo AI',
  ],
  authors: [{ name: 'Arq. Leonardo Díaz', url: 'https://soyleoai.com' }],
  openGraph: {
    title: 'SoyLeo AI — Presentador',
    description: 'Presentaciones arquitectónicas premium con IA',
    type: 'website',
    locale: 'es_AR',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className={inter.variable}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;1,300;1,400&family=DM+Mono:wght@300;400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
