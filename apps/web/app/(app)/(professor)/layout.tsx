'use client';

import type { ReactNode } from 'react';
import { Aviso } from '@/components/ui/card';
import { useSessao } from '@/lib/sessao';

/**
 * Telas só do professor (catálogo e fichas). Para o aluno a API responde 403 em todas elas;
 * aqui o front só evita mostrar uma tela que daria erro.
 */
export default function ProfessorLayout({ children }: { children: ReactNode }) {
  const sessao = useSessao();
  if (sessao.situacao !== 'autenticado') return null;
  if (sessao.usuario.papel !== 'PROFESSOR') {
    return <Aviso tom="atencao">Esta área é só do professor.</Aviso>;
  }
  return children;
}
