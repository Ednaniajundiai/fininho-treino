'use client';

import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { type FormEvent, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Aviso, Card } from '@/components/ui/card';
import { Input, Label } from '@/components/ui/input';
import { api, definirSessao, mensagemDeErro } from '@/lib/api/cliente';
import { useSessao } from '@/lib/sessao';

export default function EntrarPage() {
  const router = useRouter();
  const sessao = useSessao();

  // Quem já está dentro não precisa ver esta tela.
  useEffect(() => {
    if (sessao.situacao === 'autenticado') router.replace('/');
  }, [sessao.situacao, router]);

  const entrar = useMutation({
    mutationFn: async (credenciais: { email: string; senha: string }) => {
      const { data, error } = await api.POST('/api/auth/login', { body: credenciais });
      if (!data) throw new Error(mensagemDeErro(error, 'Não foi possível entrar. Tente de novo.'));
      return data;
    },
    onSuccess: (dados) => definirSessao(dados),
  });

  function aoEnviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const campos = new FormData(evento.currentTarget);
    entrar.mutate({ email: String(campos.get('email')), senha: String(campos.get('senha')) });
  }

  return (
    <Card>
      <h1 className="text-2xl">Entrar</h1>
      <p className="mt-1 text-sm text-muted-foreground">Use o e-mail e a senha da sua conta.</p>

      <form onSubmit={aoEnviar} className="mt-6 flex flex-col gap-4" noValidate>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="email">E-mail</Label>
          <Input id="email" name="email" type="email" autoComplete="username" required />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="senha">Senha</Label>
          <Input id="senha" name="senha" type="password" autoComplete="current-password" required />
        </div>

        {entrar.isError ? <Aviso tom="erro">{entrar.error.message}</Aviso> : null}

        <Button type="submit" disabled={entrar.isPending}>
          {entrar.isPending ? 'Entrando…' : 'Entrar'}
        </Button>
      </form>
    </Card>
  );
}
