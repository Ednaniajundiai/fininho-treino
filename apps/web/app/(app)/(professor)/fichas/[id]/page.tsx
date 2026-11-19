'use client';

import { Archive, ArrowLeft, Pencil } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { DiasDaFicha } from '@/components/ficha/dias-da-ficha';
import { DuplicarFicha } from '@/components/ficha/duplicar-ficha';
import { ChipDeStatus } from '@/components/ficha/status-da-ficha';
import { Button } from '@/components/ui/button';
import { Aviso } from '@/components/ui/card';
import {
  confirmarArquivamento,
  confirmarAtivacao,
  useAlunos,
  useArquivarFicha,
  useAtivarFicha,
  useFicha,
  useFichasDoAluno,
} from '@/lib/consultas';
import { dataCurta } from '@/lib/fichas';

const TEXTO_DO_STATUS = {
  rascunho: 'Rascunho: o aluno ainda não vê esta ficha. Ative quando estiver pronta.',
  ativa: 'Ficha ativa: é a que o aluno vê. As edições chegam a ele assim que você salva.',
  arquivada: 'Arquivada: só leitura. Para reaproveitá-la, duplique.',
} as const;

export default function FichaPage() {
  const { id } = useParams<{ id: string }>();
  const ficha = useFicha(id);
  const alunos = useAlunos();
  const ativar = useAtivarFicha();
  const arquivar = useArquivarFicha();
  const outras = useFichasDoAluno(ficha.data?.alunoId);

  if (ficha.isPending) return <p className="text-muted-foreground">Carregando…</p>;
  if (ficha.isError) return <Aviso tom="erro">{ficha.error.message}</Aviso>;

  const dados = ficha.data;
  const aluno = alunos.data?.find((a) => a.id === dados.alunoId);
  const temOutraAtiva =
    outras.data?.some((outra) => outra.status === 'ativa' && outra.id !== dados.id) ?? false;
  const somenteLeitura = dados.status === 'arquivada';
  const ocupado = ativar.isPending || arquivar.isPending;
  const erro = ativar.error ?? arquivar.error;

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

      <div className="flex flex-col gap-3">
        <p className="text-muted-foreground">{TEXTO_DO_STATUS[dados.status]}</p>
        {somenteLeitura ? null : (
          <div className="flex flex-wrap gap-3">
            {dados.status === 'rascunho' ? (
              <Button
                disabled={ocupado}
                onClick={() => {
                  if (confirmarAtivacao(temOutraAtiva)) ativar.mutate(dados.id);
                }}
              >
                {ativar.isPending ? 'Ativando…' : 'Ativar ficha'}
              </Button>
            ) : null}
            <Button asChild variant={dados.status === 'ativa' ? 'primary' : 'secondary'}>
              <Link href={`/fichas/${dados.id}/editar`}>
                <Pencil size={18} strokeWidth={1.5} aria-hidden />
                Editar
              </Link>
            </Button>
            <Button
              variant="ghost"
              disabled={ocupado}
              onClick={() => {
                if (confirmarArquivamento(dados.status === 'ativa')) arquivar.mutate(dados.id);
              }}
            >
              <Archive size={18} strokeWidth={1.5} aria-hidden />
              {arquivar.isPending ? 'Arquivando…' : 'Arquivar'}
            </Button>
          </div>
        )}
        {erro ? <Aviso tom="erro">{erro.message}</Aviso> : null}
      </div>

      <DiasDaFicha dias={dados.dias} />

      <DuplicarFicha key={dados.id} ficha={dados} primario={somenteLeitura} />
    </div>
  );
}
