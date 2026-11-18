'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { KeyRound } from 'lucide-react';
import { type FormEvent, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Aviso, Card } from '@/components/ui/card';
import { Input, Label } from '@/components/ui/input';
import { api, type Conta, mensagemDeErro } from '@/lib/api/cliente';

type SenhaMostrada = {
  nome: string;
  email: string;
  senha: string;
  motivo: 'criada' | 'redefinida';
};

export default function AlunosPage() {
  const queryClient = useQueryClient();
  // A provisória vem uma vez na resposta e fica só no estado desta tela: some ao sair dela.
  const [senhaMostrada, setSenhaMostrada] = useState<SenhaMostrada | null>(null);

  const alunos = useQuery({
    queryKey: ['alunos'],
    queryFn: async () => {
      const { data, error } = await api.GET('/api/alunos');
      if (!data) throw new Error(mensagemDeErro(error, 'Não foi possível carregar os alunos.'));
      return data;
    },
  });

  const criar = useMutation({
    mutationFn: async (dados: { nome: string; email: string }) => {
      const { data, error } = await api.POST('/api/alunos', { body: dados });
      if (!data) throw new Error(mensagemDeErro(error, 'Não foi possível criar o aluno.'));
      return data;
    },
    // A resposta traz a senha provisória: não fica no cache de mutações depois de usada.
    gcTime: 0,
    onSuccess: async ({ aluno, senhaProvisoria }) => {
      setSenhaMostrada({ ...aluno, senha: senhaProvisoria, motivo: 'criada' });
      await queryClient.invalidateQueries({ queryKey: ['alunos'] });
    },
  });

  const redefinir = useMutation({
    mutationFn: async (aluno: Conta) => {
      const { data, error } = await api.POST('/api/alunos/{id}/redefinir-senha', {
        params: { path: { id: aluno.id } },
      });
      if (!data) throw new Error(mensagemDeErro(error, 'Não foi possível redefinir a senha.'));
      return data;
    },
    gcTime: 0,
    onSuccess: async ({ aluno, senhaProvisoria }) => {
      setSenhaMostrada({ ...aluno, senha: senhaProvisoria, motivo: 'redefinida' });
      await queryClient.invalidateQueries({ queryKey: ['alunos'] });
    },
  });

  function aoEnviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const formulario = evento.currentTarget;
    const campos = new FormData(formulario);
    criar.mutate(
      { nome: String(campos.get('nome')), email: String(campos.get('email')) },
      { onSuccess: () => formulario.reset() },
    );
  }

  function esquecerSenhaMostrada() {
    setSenhaMostrada(null);
    criar.reset();
    redefinir.reset();
  }

  function confirmarRedefinicao(aluno: Conta) {
    const confirmou = window.confirm(
      `Gerar nova senha provisória para ${aluno.nome}? A senha atual deixa de valer e as sessões abertas dessa conta são encerradas.`,
    );
    if (confirmou) redefinir.mutate(aluno);
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl">Alunos</h1>
        <p className="mt-1 text-muted-foreground">
          Você cria a conta e passa a senha provisória; o aluno troca no primeiro acesso.
        </p>
      </div>

      {senhaMostrada ? (
        <Card aria-live="polite">
          <h2 className="text-lg">
            {senhaMostrada.motivo === 'criada' ? 'Conta criada' : 'Senha redefinida'}
          </h2>
          <p className="mt-1 text-muted-foreground">
            Senha provisória de {senhaMostrada.nome} ({senhaMostrada.email}):
          </p>
          <p className="mt-3 font-mono text-2xl tracking-wide select-all">{senhaMostrada.senha}</p>
          <Aviso tom="atencao" className="mt-4">
            Anote agora e passe ao aluno. Ela não aparece de novo; se perder, redefina a senha.
          </Aviso>
          <Button variant="secondary" className="mt-4" onClick={esquecerSenhaMostrada}>
            Já anotei
          </Button>
        </Card>
      ) : null}

      <Card>
        <h2 className="text-lg">Novo aluno</h2>
        <form onSubmit={aoEnviar} className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-end">
          <div className="flex flex-1 flex-col gap-1.5">
            <Label htmlFor="nome">Nome</Label>
            <Input id="nome" name="nome" autoComplete="off" required minLength={2} />
          </div>
          <div className="flex flex-1 flex-col gap-1.5">
            <Label htmlFor="email">E-mail</Label>
            <Input id="email" name="email" type="email" autoComplete="off" required />
          </div>
          <Button type="submit" disabled={criar.isPending}>
            {criar.isPending ? 'Criando…' : 'Criar aluno'}
          </Button>
        </form>
        {criar.isError ? (
          <Aviso tom="erro" className="mt-4">
            {criar.error.message}
          </Aviso>
        ) : null}
      </Card>

      <section aria-labelledby="titulo-lista">
        <h2 id="titulo-lista" className="text-lg">
          Seus alunos
        </h2>
        {redefinir.isError ? (
          <Aviso tom="erro" className="mt-3">
            {redefinir.error.message}
          </Aviso>
        ) : null}
        {alunos.isPending ? <p className="mt-3 text-muted-foreground">Carregando…</p> : null}
        {alunos.isError ? (
          <Aviso tom="erro" className="mt-3">
            {alunos.error.message}
          </Aviso>
        ) : null}
        {alunos.data?.length === 0 ? (
          <p className="mt-3 text-muted-foreground">
            Você ainda não tem alunos. Crie a primeira conta no formulário acima.
          </p>
        ) : null}
        {alunos.data && alunos.data.length > 0 ? (
          <ul className="mt-3 divide-y divide-border rounded-card border border-border bg-card">
            {alunos.data.map((aluno) => (
              <li
                key={aluno.id}
                className="flex min-h-14 flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="font-medium">{aluno.nome}</p>
                  <p className="truncate text-sm text-muted-foreground">{aluno.email}</p>
                </div>
                <div className="flex items-center gap-2">
                  {aluno.senhaProvisoria ? (
                    <span className="rounded-lg bg-warning-soft px-2 py-1 text-sm text-warning">
                      Senha provisória
                    </span>
                  ) : null}
                  <Button
                    variant="ghost"
                    disabled={redefinir.isPending}
                    onClick={() => confirmarRedefinicao(aluno)}
                  >
                    <KeyRound size={18} strokeWidth={1.5} aria-hidden />
                    Redefinir senha
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        ) : null}
      </section>
    </div>
  );
}
