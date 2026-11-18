'use client';

import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { EditorDeFicha } from '@/components/ficha/editor-de-ficha';
import { Aviso } from '@/components/ui/card';
import { useAlunos, useExercicios } from '@/lib/consultas';

export default function NovaFichaPage() {
  const { alunoId } = useParams<{ alunoId: string }>();
  const alunos = useAlunos();
  const exercicios = useExercicios();
  const aluno = alunos.data?.find((a) => a.id === alunoId);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href={`/fichas/alunos/${alunoId}`}
          className="inline-flex min-h-11 items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft size={16} strokeWidth={1.5} aria-hidden />
          {aluno ? `Fichas de ${aluno.nome}` : 'Fichas do aluno'}
        </Link>
        <h1 className="text-2xl">Nova ficha</h1>
        <p className="mt-1 text-muted-foreground">
          Monte os dias da rotação (A, B, C…) e os itens de cada dia, na ordem de execução.
        </p>
      </div>

      {exercicios.isPending ? <p className="text-muted-foreground">Carregando…</p> : null}
      {exercicios.isError ? <Aviso tom="erro">{exercicios.error.message}</Aviso> : null}
      {exercicios.data ? (
        <EditorDeFicha
          alunoId={alunoId}
          exercicios={exercicios.data.filter((exercicio) => exercicio.ativo)}
        />
      ) : null}
    </div>
  );
}
