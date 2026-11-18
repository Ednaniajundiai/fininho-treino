import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { Inter, Plus_Jakarta_Sans } from 'next/font/google';
import { Providers } from '@/components/providers';
import './globals.css';

const inter = Inter({ variable: '--font-inter', subsets: ['latin'] });
const jakarta = Plus_Jakarta_Sans({
  variable: '--font-jakarta',
  subsets: ['latin'],
  weight: ['500'],
});

export const metadata: Metadata = {
  title: 'fininho-treino',
  description: 'Fichas de treino: o professor monta, o aluno registra.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR" className={`${inter.variable} ${jakarta.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
