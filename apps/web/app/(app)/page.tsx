'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useSessao } from '@/lib/sessao';

export default function InicioPage() {
  const sessao = useSessao();
  if (sessao.situacao !== 'autenticado') return null;
  const primeiroNome = sessao.usuario.nome.split(' ')[0];
  const professor = sessao.usuario.papel === 'PROFESSOR';

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl">Olá, {primeiroNome}</h1>
        <p className="mt-1 text-muted-foreground">
          Você entrou como {professor ? 'professor' : 'aluno'}.
        </p>
      </div>

      <Card>
        <h2 className="text-lg">Fichas de treino</h2>
        <p className="mt-1 text-muted-foreground">
          {professor
            ? 'As fichas que você montar para os seus alunos aparecem aqui.'
            : 'A ficha que o seu professor montar para você aparece aqui.'}
        </p>
      </Card>

      {professor ? (
        <Card>
          <h2 className="text-lg">Alunos</h2>
          <p className="mt-1 text-muted-foreground">
            Crie as contas dos seus alunos e redefina a senha de quem esqueceu.
          </p>
          <Button asChild variant="secondary" className="mt-4">
            <Link href="/alunos">Ver alunos</Link>
          </Button>
        </Card>
      ) : null}
    </div>
  );
}
