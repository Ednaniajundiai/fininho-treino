'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Aviso, Card } from '@/components/ui/card';
import { Input, Label } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { api, mensagemDeErro, type Unidade } from '@/lib/api/cliente';
import { useExercicios } from '@/lib/consultas';
import { NOME_DA_UNIDADE } from '@/lib/fichas';

export default function ExerciciosPage() {
  const queryClient = useQueryClient();
  const exercicios = useExercicios();

  const criar = useMutation({
    mutationFn: async (dados: { nome: string; unidadePadrao: Unidade }) => {
      const { data, error } = await api.POST('/api/exercicios', { body: dados });
      // 409 de nome repetido chega com a mensagem da API, em português.
      if (!data) throw new Error(mensagemDeErro(error, 'Não foi possível cadastrar o exercício.'));
      return data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['exercicios'] });
    },
  });

  function aoEnviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const formulario = evento.currentTarget;
    const campos = new FormData(formulario);
    criar.mutate(
      {
        nome: String(campos.get('nome')).trim(),
        unidadePadrao: String(campos.get('unidadePadrao')) as Unidade,
      },
      { onSuccess: () => formulario.reset() },
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl">Exercícios</h1>
        <p className="mt-1 text-muted-foreground">
          Seu catálogo. Os exercícios cadastrados aqui aparecem na hora de montar as fichas.
        </p>
      </div>

      <Card>
        <h2 className="text-lg">Novo exercício</h2>
        <form onSubmit={aoEnviar} className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-end">
          <div className="flex flex-1 flex-col gap-1.5">
            <Label htmlFor="nome">Nome</Label>
            <Input
              id="nome"
              name="nome"
              autoComplete="off"
              required
              maxLength={100}
              placeholder="Ex.: Supino reto"
            />
          </div>
          <div className="flex flex-col gap-1.5 sm:w-44">
            <Label htmlFor="unidadePadrao">Unidade padrão</Label>
            <Select id="unidadePadrao" name="unidadePadrao" defaultValue="repeticoes">
              {Object.entries(NOME_DA_UNIDADE).map(([valor, nome]) => (
                <option key={valor} value={valor}>
                  {nome}
                </option>
              ))}
            </Select>
          </div>
          <Button type="submit" disabled={criar.isPending}>
            {criar.isPending ? 'Cadastrando…' : 'Cadastrar'}
          </Button>
        </form>
        {criar.isError ? (
          <Aviso tom="erro" className="mt-4">
            {criar.error.message}
          </Aviso>
        ) : null}
      </Card>

      <section aria-labelledby="titulo-catalogo">
        <h2 id="titulo-catalogo" className="text-lg">
          Seu catálogo
        </h2>
        {exercicios.isPending ? <p className="mt-3 text-muted-foreground">Carregando…</p> : null}
        {exercicios.isError ? (
          <Aviso tom="erro" className="mt-3">
            {exercicios.error.message}
          </Aviso>
        ) : null}
        {exercicios.data?.length === 0 ? (
          <p className="mt-3 text-muted-foreground">
            Seu catálogo está vazio. Cadastre o primeiro exercício no formulário acima.
          </p>
        ) : null}
        {exercicios.data && exercicios.data.length > 0 ? (
          <ul className="mt-3 divide-y divide-border rounded-card border border-border bg-card">
            {exercicios.data.map((exercicio) => (
              <li
                key={exercicio.id}
                className="flex min-h-12 flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-3"
              >
                <p className={exercicio.ativo ? 'font-medium' : 'text-muted-foreground'}>
                  {exercicio.nome}
                </p>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  {exercicio.ativo ? null : (
                    <span className="rounded-lg bg-border/60 px-2 py-1">Desativado</span>
                  )}
                  <span>{NOME_DA_UNIDADE[exercicio.unidadePadrao]}</span>
                </div>
              </li>
            ))}
          </ul>
        ) : null}
      </section>
    </div>
  );
}
