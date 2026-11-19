'use client';

import { Copy } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Aviso, Card } from '@/components/ui/card';
import { Label } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import type { Ficha } from '@/lib/api/cliente';
import { useAlunos, useDuplicarFicha } from '@/lib/consultas';

/**
 * Duplica a ficha para um aluno do professor (FR-010): a cópia nasce em rascunho, com os
 * mesmos dias e itens, e abre em seguida para revisar e ativar.
 */
export function DuplicarFicha({ ficha, primario }: { ficha: Ficha; primario: boolean }) {
  const router = useRouter();
  const alunos = useAlunos();
  const duplicar = useDuplicarFicha();
  const [alunoId, setAlunoId] = useState(ficha.alunoId);

  return (
    <Card className="flex flex-col gap-4 p-4 sm:p-6">
      <div>
        <h2 className="text-lg">Duplicar ficha</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Cria uma ficha nova em rascunho, com os mesmos dias e itens. Mudar a cópia não altera
          esta.
        </p>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <Label htmlFor="aluno-destino">Para o aluno</Label>
          <Select
            id="aluno-destino"
            value={alunoId}
            onChange={(evento) => setAlunoId(evento.target.value)}
            disabled={!alunos.data}
          >
            {alunos.data?.map((aluno) => (
              <option key={aluno.id} value={aluno.id}>
                {aluno.id === ficha.alunoId ? `${aluno.nome} (o mesmo)` : aluno.nome}
              </option>
            )) ?? <option value={ficha.alunoId}>Carregando…</option>}
          </Select>
        </div>
        <Button
          type="button"
          variant={primario ? 'primary' : 'secondary'}
          disabled={duplicar.isPending}
          onClick={() =>
            duplicar.mutate(
              { id: ficha.id, alunoId },
              { onSuccess: (copia) => router.push(`/fichas/${copia.id}`) },
            )
          }
        >
          <Copy size={18} strokeWidth={1.5} aria-hidden />
          {duplicar.isPending ? 'Duplicando…' : 'Duplicar'}
        </Button>
      </div>
      {duplicar.isError ? <Aviso tom="erro">{duplicar.error.message}</Aviso> : null}
    </Card>
  );
}
