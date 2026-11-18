'use client';

import { LogOut } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { type ReactNode, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useSessao } from '@/lib/sessao';
import { cn } from '@/lib/utils';

// Menu do professor. O aluno não vê estes links: a API responderia 403 a todas essas telas.
const MENU_DO_PROFESSOR = [
  { href: '/alunos', rotulo: 'Alunos' },
  { href: '/exercicios', rotulo: 'Exercícios' },
  { href: '/fichas', rotulo: 'Fichas' },
];

/**
 * Área logada. Só esconde o que a API já negaria: sem sessão, leva para /entrar. A
 * autorização de verdade é da API, em toda rota.
 */
export default function AppLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const sessao = useSessao();
  const caminho = usePathname();

  // Conta com senha provisória só troca a senha (a API responde 403 em todo o resto).
  const precisaTrocarSenha = sessao.situacao === 'autenticado' && sessao.usuario.senhaProvisoria;

  useEffect(() => {
    if (sessao.situacao === 'anonimo') router.replace('/entrar');
    if (precisaTrocarSenha) router.replace('/trocar-senha');
  }, [sessao.situacao, precisaTrocarSenha, router]);

  if (sessao.situacao !== 'autenticado' || precisaTrocarSenha) {
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
        {sessao.usuario.papel === 'PROFESSOR' ? (
          <nav aria-label="Menu" className="mx-auto flex w-full max-w-3xl gap-1 px-2 pb-1">
            {MENU_DO_PROFESSOR.map((item) => {
              const atual = caminho === item.href || caminho.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={atual ? 'page' : undefined}
                  className={cn(
                    'flex min-h-11 items-center rounded-control px-3 text-sm hover:text-foreground',
                    atual ? 'bg-border/60 font-medium text-foreground' : 'text-muted-foreground',
                  )}
                >
                  {item.rotulo}
                </Link>
              );
            })}
          </nav>
        ) : null}
      </header>
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">{children}</main>
    </>
  );
}
