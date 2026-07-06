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
  title: 'IA para Arquitectos — SoyLeo',
  description:
    'Tu asistente de IA para arquitectura: precios reales, cómputos, presupuestos y cronogramas en un chat. Y cuando tu trabajo está listo, generá la presentación con tu logo y tus colores.',
  keywords: [
    'arquitectura',
    'IA',
    'asistente',
    'presupuestos',
    'cómputos',
    'presentaciones',
    'SoyLeo',
  ],
  authors: [{ name: 'Arq. Leonardo Díaz', url: 'https://soyleoai.com' }],
  openGraph: {
    title: 'IA para Arquitectos — SoyLeo',
    description:
      'Asistente de IA para arquitectos: precios, cómputos, presupuestos y presentaciones con tu marca.',
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
