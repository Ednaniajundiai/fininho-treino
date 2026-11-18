'use client';

import { LogOut } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { type ReactNode, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useSessao } from '@/lib/sessao';

/**
 * Área logada. Só esconde o que a API já negaria: sem sessão, leva para /entrar. A
 * autorização de verdade é da API, em toda rota.
 */
export default function AppLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const sessao = useSessao();

  useEffect(() => {
    if (sessao.situacao === 'anonimo') router.replace('/entrar');
  }, [sessao.situacao, router]);

  if (sessao.situacao !== 'autenticado') {
    return (
      <main className="flex flex-1 items-center justify-center text-muted-foreground">
        Carregando…
      </main>
    );
  }

  return (
    <>
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-3 px-4 py-2">
          <Link href="/" className="font-display text-lg font-medium">
            fininho-treino
          </Link>
          <div className="flex items-center gap-1">
            <span className="hidden text-sm text-muted-foreground sm:inline">
              {sessao.usuario.nome}
            </span>
            <Button variant="ghost" onClick={() => void sessao.sair()}>
              <LogOut size={18} strokeWidth={1.5} aria-hidden />
              Sair
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">{children}</main>
    </>
  );
}
