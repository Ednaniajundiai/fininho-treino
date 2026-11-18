'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, mensagemDeErro } from '@/lib/api/cliente';

// Leituras compartilhadas entre as telas do professor. A API filtra tudo pelo dono; a chave
// de cada consulta é a mesma em toda tela, para o cache servir a todas.

/** Catálogo do professor logado (contrato fichas/C-02), com os desativados. */
export function useExercicios() {
  return useQuery({
    queryKey: ['exercicios'],
    queryFn: async () => {
      const { data, error } = await api.GET('/api/exercicios');
      if (!data) throw new Error(mensagemDeErro(error, 'Não foi possível carregar o catálogo.'));
      return data;
    },
  });
}

/** Alunos do professor logado (mesma chave da tela de alunos da 001). */
export function useAlunos() {
  return useQuery({
    queryKey: ['alunos'],
    queryFn: async () => {
      const { data, error } = await api.GET('/api/alunos');
      if (!data) throw new Error(mensagemDeErro(error, 'Não foi possível carregar os alunos.'));
      return data;
    },
  });
}

/** Sem `alunoId` (ainda carregando quem é o aluno), não consulta. */
export function useFichasDoAluno(alunoId: string | undefined) {
  return useQuery({
    queryKey: ['fichas', alunoId],
    enabled: Boolean(alunoId),
    queryFn: async () => {
      if (!alunoId) return [];
      const { data, error } = await api.GET('/api/alunos/{alunoId}/fichas', {
        params: { path: { alunoId } },
      });
      if (!data) throw new Error(mensagemDeErro(error, 'Não foi possível carregar as fichas.'));
      return data;
    },
  });
}

/**
 * Ativa a ficha; a API arquiva a ativa anterior do mesmo aluno (FR-006), por isso a lista
 * do aluno inteira é recarregada.
 */
export function useAtivarFicha() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await api.POST('/api/fichas/{id}/ativar', {
        params: { path: { id } },
      });
      if (!data) throw new Error(mensagemDeErro(error, 'Não foi possível ativar a ficha.'));
      return data;
    },
    onSuccess: async (ficha) => {
      queryClient.setQueryData(['ficha', ficha.id], ficha);
      await queryClient.invalidateQueries({ queryKey: ['fichas', ficha.alunoId] });
    },
  });
}

/** Confirma antes de ativar quando já há uma ativa, que será arquivada. */
export function confirmarAtivacao(temOutraAtiva: boolean): boolean {
  if (!temOutraAtiva) return true;
  return window.confirm(
    'Este aluno já tem uma ficha ativa. Ao ativar esta, a atual é arquivada e passa a ser só leitura. Continuar?',
  );
}

/** Ficha ativa do aluno logado, ou null sem ficha ativa (FR-008). Só consulta para aluno. */
export function useMinhaFicha(habilitada: boolean) {
  return useQuery({
    queryKey: ['minha-ficha'],
    enabled: habilitada,
    queryFn: async () => {
      const { data, error } = await api.GET('/api/minha-ficha');
      if (!data) throw new Error(mensagemDeErro(error, 'Não foi possível carregar a sua ficha.'));
      return data.ficha ?? null;
    },
  });
}

export function useFicha(id: string) {
  return useQuery({
    queryKey: ['ficha', id],
    queryFn: async () => {
      const { data, error } = await api.GET('/api/fichas/{id}', { params: { path: { id } } });
      if (!data) throw new Error(mensagemDeErro(error, 'Não foi possível carregar a ficha.'));
      return data;
    },
  });
}
