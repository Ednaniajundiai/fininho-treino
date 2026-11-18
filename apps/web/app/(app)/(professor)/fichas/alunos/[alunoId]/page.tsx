'use client';

import { ArrowLeft, Plus } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ChipDeStatus } from '@/components/ficha/status-da-ficha';
import { Button } from '@/components/ui/button';
import { Aviso } from '@/components/ui/card';
import { confirmarAtivacao, useAlunos, useAtivarFicha, useFichasDoAluno } from '@/lib/consultas';
import { dataCurta } from '@/lib/fichas';

export default function FichasDoAlunoPage() {
  const { alunoId } = useParams<{ alunoId: string }>();
  const alunos = useAlunos();
  const fichas = useFichasDoAluno(alunoId);
  const ativar = useAtivarFicha();

  const aluno = alunos.data?.find((a) => a.id === alunoId);
  const temAtiva = fichas.data?.some((ficha) => ficha.status === 'ativa') ?? false;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href="/fichas"
          className="inline-flex min-h-11 items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft size={16} strokeWidth={1.5} aria-hidden />
          Alunos
        </Link>
        <h1 className="text-2xl">{aluno ? `Fichas de ${aluno.nome}` : 'Fichas do aluno'}</h1>
        <p className="mt-1 text-muted-foreground">
          O aluno vê só a ficha ativa. Ativar outra arquiva a atual, que continua aqui para
          consulta.
        </p>
      </div>

      <Button asChild className="self-start">
        <Link href={`/fichas/alunos/${alunoId}/nova`}>
          <Plus size={18} strokeWidth={1.5} aria-hidden />
          Nova ficha
        </Link>
      </Button>

      {ativar.isError ? <Aviso tom="erro">{ativar.error.message}</Aviso> : null}
      {fichas.isPending ? <p className="text-muted-foreground">Carregando…</p> : null}
      {fichas.isError ? <Aviso tom="erro">{fichas.error.message}</Aviso> : null}
      {fichas.data?.length === 0 ? (
        <p className="text-muted-foreground">
          Este aluno ainda não tem ficha. Monte a primeira em “Nova ficha”.
        </p>
      ) : null}
      {fichas.data && fichas.data.length > 0 ? (
        <ul className="divide-y divide-border rounded-card border border-border bg-card">
          {fichas.data.map((ficha) => (
            <li
              key={ficha.id}
              className="flex min-h-14 flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-3"
            >
              <Link
                href={`/fichas/${ficha.id}`}
                className="min-w-0 flex-1 underline-offset-2 hover:underline"
              >
                <p className="font-medium">{ficha.nome}</p>
                <p className="text-sm text-muted-foreground">
                  Criada em {dataCurta(ficha.criadaEm)}
                </p>
              </Link>
              <div className="flex items-center gap-2">
                <ChipDeStatus status={ficha.status} />
                {ficha.status === 'rascunho' ? (
                  <Button
                    variant="ghost"
                    disabled={ativar.isPending}
                    onClick={() => {
                      if (confirmarAtivacao(temAtiva)) ativar.mutate(ficha.id);
                    }}
                  >
                    Ativar
                  </Button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
