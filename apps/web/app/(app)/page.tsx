'use client';

import { Card } from '@/components/ui/card';
import { useSessao } from '@/lib/sessao';

export default function InicioPage() {
  const sessao = useSessao();
  if (sessao.situacao !== 'autenticado') return null;
  const primeiroNome = sessao.usuario.nome.split(' ')[0];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl">Olá, {primeiroNome}</h1>
        <p className="mt-1 text-muted-foreground">Você entrou como professor.</p>
      </div>

      <Card>
        <h2 className="text-lg">Fichas de treino</h2>
        <p className="mt-1 text-muted-foreground">
          As fichas que você montar para os seus alunos aparecem aqui.
        </p>
      </Card>
    </div>
  );
}
