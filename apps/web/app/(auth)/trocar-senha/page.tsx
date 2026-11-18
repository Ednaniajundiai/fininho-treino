'use client';

import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { type FormEvent, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Aviso, Card } from '@/components/ui/card';
import { Input, Label } from '@/components/ui/input';
import { api, definirSessao, mensagemDeErro } from '@/lib/api/cliente';
import { useSessao } from '@/lib/sessao';

export default function TrocarSenhaPage() {
  const router = useRouter();
  const sessao = useSessao();
  const [erroDoFormulario, setErroDoFormulario] = useState<string | null>(null);

  // Só faz sentido para quem está logado e ainda com a senha provisória.
  useEffect(() => {
    if (sessao.situacao === 'anonimo') router.replace('/entrar');
    if (sessao.situacao === 'autenticado' && !sessao.usuario.senhaProvisoria) router.replace('/');
  }, [sessao, router]);

  const trocar = useMutation({
    mutationFn: async (corpo: { senhaAtual: string; novaSenha: string }) => {
      const { data, error } = await api.POST('/api/auth/trocar-senha', { body: corpo });
      if (!data) throw new Error(mensagemDeErro(error, 'Não foi possível trocar a senha.'));
      return data;
    },
    // A resposta já é a sessão nova, sem a marca de senha provisória: o efeito acima leva ao início.
    onSuccess: (dados) => definirSessao(dados),
  });

  function aoEnviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const campos = new FormData(evento.currentTarget);
    const novaSenha = String(campos.get('novaSenha'));
    if (novaSenha !== String(campos.get('confirmacao'))) {
      setErroDoFormulario('A confirmação não confere com a nova senha.');
      return;
    }
    setErroDoFormulario(null);
    trocar.mutate({ senhaAtual: String(campos.get('senhaAtual')), novaSenha });
  }

  if (sessao.situacao !== 'autenticado') {
    return <p className="text-center text-muted-foreground">Carregando…</p>;
  }

  const erro = erroDoFormulario ?? (trocar.isError ? trocar.error.message : null);

  return (
    <Card>
      <h1 className="text-2xl">Crie a sua senha</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Você entrou com uma senha provisória. Troque por uma só sua para continuar.
      </p>

      <form onSubmit={aoEnviar} className="mt-6 flex flex-col gap-4" noValidate>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="senhaAtual">Senha provisória</Label>
          <Input
            id="senhaAtual"
            name="senhaAtual"
            type="password"
            autoComplete="current-password"
            required
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="novaSenha">Nova senha</Label>
          <Input
            id="novaSenha"
            name="novaSenha"
            type="password"
            autoComplete="new-password"
            aria-describedby="dica-da-senha"
            required
          />
          <p id="dica-da-senha" className="text-sm text-muted-foreground">
            De 8 a 128 caracteres.
          </p>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="confirmacao">Repita a nova senha</Label>
          <Input
            id="confirmacao"
            name="confirmacao"
            type="password"
            autoComplete="new-password"
            required
          />
        </div>

        {erro ? <Aviso tom="erro">{erro}</Aviso> : null}

        <Button type="submit" disabled={trocar.isPending}>
          {trocar.isPending ? 'Salvando…' : 'Salvar nova senha'}
        </Button>
        <Button type="button" variant="ghost" onClick={() => void sessao.sair()}>
          Sair
        </Button>
      </form>
    </Card>
  );
}
