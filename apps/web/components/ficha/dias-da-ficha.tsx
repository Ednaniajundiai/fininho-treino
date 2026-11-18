import { Card } from '@/components/ui/card';
import type { Ficha } from '@/lib/api/cliente';
import { faixa, NOME_DA_MODALIDADE, SUFIXO_DA_UNIDADE } from '@/lib/fichas';

type Item = Ficha['dias'][number]['itens'][number];

/** Os dias e itens da ficha como prescritos, na ordem (leitura; serve também ao aluno na H2). */
export function DiasDaFicha({ dias }: { dias: Ficha['dias'] }) {
  if (dias.length === 0) {
    return <p className="text-muted-foreground">Esta ficha ainda não tem dias.</p>;
  }
  return (
    <div className="flex flex-col gap-4">
      {dias.map((dia) => (
        <Card key={dia.ordem} className="p-4 sm:p-6">
          <h2 className="flex items-baseline gap-3 text-lg">
            <span className="text-muted-foreground">{dia.rotulo}</span>
            {dia.titulo}
          </h2>
          {dia.itens.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">Dia sem itens.</p>
          ) : (
            <ol className="mt-3 divide-y divide-border">
              {dia.itens.map((item) => (
                <li key={item.ordem} className="flex min-h-12 gap-3 py-3">
                  <span className="w-5 shrink-0 text-muted-foreground tabular-nums">
                    {item.ordem}.
                  </span>
                  <div className="min-w-0 flex-1">
                    <LinhaDoItem item={item} />
                    {item.observacao ? (
                      <p className="mt-0.5 text-sm text-muted-foreground">{item.observacao}</p>
                    ) : null}
                  </div>
                </li>
              ))}
            </ol>
          )}
        </Card>
      ))}
    </div>
  );
}

function LinhaDoItem({ item }: { item: Item }) {
  if (item.tipo === 'forca') {
    const sufixo = item.unidade ? SUFIXO_DA_UNIDADE[item.unidade] : '';
    return (
      <p className="flex flex-wrap justify-between gap-x-4">
        <span className="font-medium">{item.exercicioNome}</span>
        <span className="tabular-nums">
          {item.series} × {faixa(item.faixaMin, item.faixaMax)} {sufixo}
        </span>
      </p>
    );
  }
  return (
    <p className="flex flex-wrap justify-between gap-x-4">
      <span className="font-medium">
        Cardio{item.modalidade ? ` · ${NOME_DA_MODALIDADE[item.modalidade]}` : ''}
      </span>
      <span className="tabular-nums">{faixa(item.duracaoMinMin, item.duracaoMaxMin)} min</span>
    </p>
  );
}
