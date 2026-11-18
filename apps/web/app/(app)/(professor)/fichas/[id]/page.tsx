'use client';

import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { DiasDaFicha } from '@/components/ficha/dias-da-ficha';
import { ChipDeStatus } from '@/components/ficha/status-da-ficha';
import { Button } from '@/components/ui/button';
import { Aviso } from '@/components/ui/card';
import {
  confirmarAtivacao,
  useAlunos,
  useAtivarFicha,
  useFicha,
  useFichasDoAluno,
} from '@/lib/consultas';
import { dataCurta } from '@/lib/fichas';

export default function FichaPage() {
  const { id } = useParams<{ id: string }>();
  const ficha = useFicha(id);
  const alunos = useAlunos();
  const ativar = useAtivarFicha();
  const outras = useFichasDoAluno(ficha.data?.alunoId);

  if (ficha.isPending) return <p className="text-muted-foreground">Carregando…</p>;
  if (ficha.isError) return <Aviso tom="erro">{ficha.error.message}</Aviso>;

  const dados = ficha.data;
  const aluno = alunos.data?.find((a) => a.id === dados.alunoId);
  const temOutraAtiva =
    outras.data?.some((outra) => outra.status === 'ativa' && outra.id !== dados.id) ?? false;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href={`/fichas/alunos/${dados.alunoId}`}
          className="inline-flex min-h-11 items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft size={16} strokeWidth={1.5} aria-hidden />
          {aluno ? `Fichas de ${aluno.nome}` : 'Fichas do aluno'}
        </Link>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <h1 className="text-2xl">{dados.nome}</h1>
          <ChipDeStatus status={dados.status} />
        </div>
        <p className="mt-1 text-muted-foreground">
          Criada em {dataCurta(dados.criadaEm)} · {dados.dias.length}{' '}
          {dados.dias.length === 1 ? 'dia' : 'dias'} na rotação
        </p>
      </div>

      {dados.status === 'rascunho' ? (
        <div className="flex flex-col gap-3">
          <p className="text-muted-foreground">
            Rascunho: o aluno ainda não vê esta ficha. Ative quando estiver pronta.
          </p>
          <Button
            className="self-start"
            disabled={ativar.isPending}
            onClick={() => {
              if (confirmarAtivacao(temOutraAtiva)) ativar.mutate(dados.id);
            }}
          >
            {ativar.isPending ? 'Ativando…' : 'Ativar ficha'}
          </Button>
          {ativar.isError ? <Aviso tom="erro">{ativar.error.message}</Aviso> : null}
        </div>
      ) : null}
      {dados.status === 'arquivada' ? (
        <p className="text-muted-foreground">Arquivada: fica só para consulta.</p>
      ) : null}

      <DiasDaFicha dias={dados.dias} />
    </div>
  );
}
