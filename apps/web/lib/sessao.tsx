'use client';

import { createContext, type ReactNode, useContext, useEffect, useMemo, useState } from 'react';
import { aoMudarSessao, api, type Conta, definirSessao, renovarSessao } from '@/lib/api/cliente';

type Estado =
  | { situacao: 'carregando' }
  | { situacao: 'anonimo' }
  | { situacao: 'autenticado'; usuario: Conta };

type ContextoDaSessao = Estado & { sair: () => Promise<void> };

const Contexto = createContext<ContextoDaSessao | null>(null);

/**
 * Sessão no navegador. Ao abrir ou recarregar a página não há token em memória: a primeira
 * coisa é tentar a renovação pelo cookie. O front só decide o que mostrar; quem autoriza é a
 * API, em toda rota.
 */
export function SessaoProvider({ children }: { children: ReactNode }) {
  const [estado, setEstado] = useState<Estado>({ situacao: 'carregando' });

  useEffect(() => {
    const parar = aoMudarSessao((sessao) =>
      setEstado(
        sessao ? { situacao: 'autenticado', usuario: sessao.usuario } : { situacao: 'anonimo' },
      ),
    );
    void renovarSessao();
    return parar;
  }, []);

  const valor = useMemo<ContextoDaSessao>(
    () => ({
      ...estado,
      async sair() {
        await api.POST('/api/auth/logout');
        definirSessao(null);
      },
    }),
    [estado],
  );

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useSessao(): ContextoDaSessao {
  const contexto = useContext(Contexto);
  if (!contexto) throw new Error('useSessao precisa estar dentro de SessaoProvider');
  return contexto;
}
