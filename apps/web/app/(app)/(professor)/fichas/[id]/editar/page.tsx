'use client';

import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { EditorDeFicha } from '@/components/ficha/editor-de-ficha';
import { ChipDeStatus } from '@/components/ficha/status-da-ficha';
import { Aviso } from '@/components/ui/card';
import { useExercicios, useFicha } from '@/lib/consultas';

/** Edição da ficha (História 3): o editor da criação, preenchido; arquivada não se edita. */
export default function EditarFichaPage() {
  const { id } = useParams<{ id: string }>();
  const ficha = useFicha(id);
  const exercicios = useExercicios();

  if (ficha.isPending || exercicios.isPending) {
    return <p className="text-muted-foreground">Carregando…</p>;
  }
  if (ficha.isError) return <Aviso tom="erro">{ficha.error.message}</Aviso>;
  if (exercicios.isError) return <Aviso tom="erro">{exercicios.error.message}</Aviso>;

  const dados = ficha.data;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href={`/fichas/${dados.id}`}
          className="inline-flex min-h-11 items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft size={16} strokeWidth={1.5} aria-hidden />
          Voltar à ficha
        </Link>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <h1 className="text-2xl">Editar ficha</h1>
          <ChipDeStatus status={dados.status} />
        </div>
        {dados.status === 'arquivada' ? null : (
          <p className="mt-1 text-muted-foreground">
            {dados.status === 'ativa'
              ? 'Esta é a ficha ativa: o aluno vê as mudanças assim que você salvar.'
              : 'Rascunho: o aluno ainda não vê esta ficha.'}
          </p>
        )}
      </div>

      {dados.status === 'arquivada' ? (
        <Aviso tom="atencao">
          Ficha arquivada é só leitura. Para reaproveitá-la, duplique na página da ficha.
        </Aviso>
      ) : (
        <EditorDeFicha
          key={dados.id}
          alunoId={dados.alunoId}
          exercicios={exercicios.data}
          ficha={dados}
        />
      )}
    </div>
  );
}
