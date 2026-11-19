'use client';

import { DiasDaFicha } from '@/components/ficha/dias-da-ficha';
import { Aviso, Card } from '@/components/ui/card';
import { useMinhaFicha } from '@/lib/consultas';
import { dataCurta } from '@/lib/fichas';
import { useSessao } from '@/lib/sessao';

/**
 * A ficha ativa do aluno logado (FR-008), como o professor prescreveu. A API só devolve a
 * ativa dele; aqui o front só evita mostrar ao professor uma tela que daria 403.
 */
export default function MinhaFichaPage() {
  const sessao = useSessao();
  const aluno = sessao.situacao === 'autenticado' && sessao.usuario.papel === 'ALUNO';
  const minhaFicha = useMinhaFicha(aluno);

  if (sessao.situacao !== 'autenticado') return null;
  if (!aluno) return <Aviso tom="atencao">Esta área é só do aluno.</Aviso>;
  if (minhaFicha.isPending) return <p className="text-muted-foreground">Carregando…</p>;
  if (minhaFicha.isError) return <Aviso tom="erro">{minhaFicha.error.message}</Aviso>;

  const ficha = minhaFicha.data;
  if (!ficha) {
    return (
      <div className="flex flex-col gap-6">
        <h1 className="text-2xl">Minha ficha</h1>
        <Card>
          <h2 className="text-lg">Você ainda não tem ficha</h2>
          <p className="mt-1 text-muted-foreground">
            Assim que o seu professor montar e ativar a sua ficha de treino, ela aparece aqui.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-sm text-muted-foreground">Minha ficha</p>
        <h1 className="text-2xl">{ficha.nome}</h1>
        <p className="mt-1 text-muted-foreground">
          Atualizada em {dataCurta(ficha.atualizadaEm)} · {ficha.dias.length}{' '}
          {ficha.dias.length === 1 ? 'dia' : 'dias'} na rotação, um por treino, em sequência
        </p>
      </div>
      <DiasDaFicha dias={ficha.dias} />
    </div>
  );
}
