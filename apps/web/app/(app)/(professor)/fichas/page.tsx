'use client';

import { ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Aviso } from '@/components/ui/card';
import { useAlunos } from '@/lib/consultas';

/** Fichas começam pelo aluno: escolhe o aluno, vê as fichas dele, monta uma nova. */
export default function FichasPage() {
  const alunos = useAlunos();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl">Fichas</h1>
        <p className="mt-1 text-muted-foreground">
          Escolha o aluno para ver as fichas dele ou montar uma nova.
        </p>
      </div>

      {alunos.isPending ? <p className="text-muted-foreground">Carregando…</p> : null}
      {alunos.isError ? <Aviso tom="erro">{alunos.error.message}</Aviso> : null}
      {alunos.data?.length === 0 ? (
        <div className="flex flex-col items-start gap-3">
          <p className="text-muted-foreground">
            Você ainda não tem alunos. Crie a conta do primeiro para montar a ficha dele.
          </p>
          <Button asChild variant="secondary">
            <Link href="/alunos">Criar aluno</Link>
          </Button>
        </div>
      ) : null}
      {alunos.data && alunos.data.length > 0 ? (
        <ul className="divide-y divide-border rounded-card border border-border bg-card">
          {alunos.data.map((aluno) => (
            <li key={aluno.id}>
              <Link
                href={`/fichas/alunos/${aluno.id}`}
                className="flex min-h-14 items-center justify-between gap-4 rounded-card px-4 py-3 hover:bg-background focus-visible:outline-2 focus-visible:outline-ring"
              >
                <div className="min-w-0">
                  <p className="font-medium">{aluno.nome}</p>
                  <p className="truncate text-sm text-muted-foreground">{aluno.email}</p>
                </div>
                <ChevronRight
                  size={18}
                  strokeWidth={1.5}
                  className="shrink-0 text-muted-foreground"
                  aria-hidden
                />
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
