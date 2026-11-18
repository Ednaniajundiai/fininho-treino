'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowDown, ArrowUp, Dumbbell, HeartPulse, Plus, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { type ComponentProps, type ReactNode, useState } from 'react';
import {
  type Control,
  type FieldErrors,
  get,
  type UseFormRegister,
  type UseFormSetValue,
  useFieldArray,
  useForm,
} from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Aviso, Card } from '@/components/ui/card';
import { Input, Label } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { api, type Exercicio, mensagensDeErro } from '@/lib/api/cliente';
import { NOME_DA_MODALIDADE, NOME_DA_UNIDADE, rotuloDoDia } from '@/lib/fichas';
import { cn } from '@/lib/utils';
import {
  esquemaDaFicha,
  type FichaNoFormulario,
  type FichaValida,
  MAX_DIAS,
  MAX_ITENS_POR_DIA,
  motivosParaNaoAtivar,
  novoItemDeCardio,
  novoItemDeForca,
  paraCorpo,
} from './esquema';

type Props = {
  alunoId: string;
  /** Só os exercícios ativos entram nas novas escolhas (FR-011). */
  exercicios: Exercicio[];
};

type Contexto = {
  control: Control<FichaNoFormulario, unknown, FichaValida>;
  register: UseFormRegister<FichaNoFormulario>;
  setValue: UseFormSetValue<FichaNoFormulario>;
  errors: FieldErrors<FichaNoFormulario>;
  exercicios: Exercicio[];
};

/** Mensagem do erro num caminho do formulário (o erro de lista pode vir em `.root`). */
function erroEm(errors: FieldErrors<FichaNoFormulario>, caminho: string): string | undefined {
  return get(errors, `${caminho}.message`) ?? get(errors, `${caminho}.root.message`);
}

/**
 * Editor de ficha nova (História 1): dias em rotação e itens de força e cardio, em ordem.
 * Salva como rascunho ou já ativa num POST só; o rótulo do dia vem da posição.
 */
export function EditorDeFicha({ alunoId, exercicios }: Props) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [motivos, setMotivos] = useState<string[]>([]);

  const form = useForm<FichaNoFormulario, unknown, FichaValida>({
    resolver: zodResolver(esquemaDaFicha),
    defaultValues: { nome: '', dias: [{ titulo: '', itens: [] }] },
  });
  const dias = useFieldArray({ control: form.control, name: 'dias' });
  const { errors } = form.formState;

  const salvar = useMutation({
    mutationFn: async ({ ficha, ativar }: { ficha: FichaValida; ativar: boolean }) => {
      const { data, error } = await api.POST('/api/alunos/{alunoId}/fichas', {
        params: { path: { alunoId } },
        body: paraCorpo(ficha, ativar),
      });
      if (!data)
        throw new Error(mensagensDeErro(error, 'Não foi possível salvar a ficha.').join('\n'));
      return data;
    },
    onSuccess: async (ficha) => {
      await queryClient.invalidateQueries({ queryKey: ['fichas', alunoId] });
      router.push(`/fichas/${ficha.id}`);
    },
  });

  function enviar(ativar: boolean) {
    return form.handleSubmit((ficha) => {
      const recusas = ativar ? motivosParaNaoAtivar(ficha) : [];
      setMotivos(recusas);
      if (recusas.length === 0) salvar.mutate({ ficha, ativar });
    });
  }

  const contexto: Contexto = {
    control: form.control,
    register: form.register,
    setValue: form.setValue,
    errors,
    exercicios,
  };
  const errosDaApi = salvar.isError ? salvar.error.message.split('\n') : [];

  return (
    <form noValidate onSubmit={(evento) => evento.preventDefault()} className="flex flex-col gap-6">
      <Card>
        <Campo id="nome" rotulo="Nome da ficha" erro={errors.nome?.message}>
          <Input
            id="nome"
            autoComplete="off"
            placeholder="Ex.: Hipertrofia — bloco 1"
            aria-invalid={errors.nome ? true : undefined}
            {...form.register('nome')}
          />
        </Campo>
      </Card>

      {exercicios.length === 0 ? (
        <Aviso tom="atencao">
          Seu catálogo não tem exercícios ativos, então só dá para adicionar cardio.{' '}
          <Link href="/exercicios" className="underline underline-offset-2">
            Cadastrar exercícios
          </Link>
        </Aviso>
      ) : null}

      {dias.fields.map((campo, d) => (
        <DiaDoEditor
          key={campo.id}
          indice={d}
          total={dias.fields.length}
          contexto={contexto}
          aoSubir={() => dias.move(d, d - 1)}
          aoDescer={() => dias.move(d, d + 1)}
          aoRemover={() => dias.remove(d)}
        />
      ))}

      <div className="flex flex-col gap-2">
        <Button
          type="button"
          variant="secondary"
          className="self-start"
          disabled={dias.fields.length >= MAX_DIAS}
          onClick={() => dias.append({ titulo: '', itens: [] })}
        >
          <Plus size={18} strokeWidth={1.5} aria-hidden />
          Adicionar dia {dias.fields.length < MAX_DIAS ? rotuloDoDia(dias.fields.length + 1) : ''}
        </Button>
        {dias.fields.length >= MAX_DIAS ? (
          <p className="text-sm text-muted-foreground">
            A ficha chegou ao limite de {MAX_DIAS} dias.
          </p>
        ) : null}
        {erroEm(errors, 'dias') ? (
          <p className="text-sm text-destructive">{erroEm(errors, 'dias')}</p>
        ) : null}
      </div>

      {motivos.length > 0 || errosDaApi.length > 0 ? (
        <Aviso tom="erro">
          {[...motivos, ...errosDaApi].map((motivo) => (
            <span key={motivo} className="block">
              {motivo}
            </span>
          ))}
        </Aviso>
      ) : null}

      <div className="flex flex-col-reverse gap-3 border-t border-border pt-6 sm:flex-row sm:justify-end">
        <Button
          type="button"
          variant="secondary"
          disabled={salvar.isPending}
          onClick={() => void enviar(false)()}
        >
          Salvar rascunho
        </Button>
        <Button type="button" disabled={salvar.isPending} onClick={() => void enviar(true)()}>
          {salvar.isPending ? 'Salvando…' : 'Salvar e ativar'}
        </Button>
      </div>
    </form>
  );
}

function DiaDoEditor({
  indice,
  total,
  contexto,
  aoSubir,
  aoDescer,
  aoRemover,
}: {
  indice: number;
  total: number;
  contexto: Contexto;
  aoSubir: () => void;
  aoDescer: () => void;
  aoRemover: () => void;
}) {
  const { control, register, errors, exercicios } = contexto;
  const itens = useFieldArray({ control, name: `dias.${indice}.itens` });
  const rotulo = rotuloDoDia(indice + 1);
  const caminho = `dias.${indice}` as const;
  const erroDoTitulo = erroEm(errors, `${caminho}.titulo`);
  const cheio = itens.fields.length >= MAX_ITENS_POR_DIA;

  return (
    <Card className="flex flex-col gap-4 p-4 sm:p-6">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg">Dia {rotulo}</h2>
        <BotoesDeOrdem
          nome={`dia ${rotulo}`}
          podeSubir={indice > 0}
          podeDescer={indice < total - 1}
          aoSubir={aoSubir}
          aoDescer={aoDescer}
          aoRemover={aoRemover}
        />
      </div>

      <Campo id={`${caminho}.titulo`} rotulo="Título do dia" erro={erroDoTitulo}>
        <Input
          id={`${caminho}.titulo`}
          autoComplete="off"
          placeholder="Ex.: Peito e tríceps"
          aria-invalid={erroDoTitulo ? true : undefined}
          {...register(`${caminho}.titulo`)}
        />
      </Campo>

      {itens.fields.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Adicione os exercícios de força e o cardio deste dia, na ordem em que o aluno vai fazer.
        </p>
      ) : (
        <ol className="flex flex-col gap-3">
          {itens.fields.map((item, i) => (
            <ItemDoEditor
              key={item.id}
              dia={indice}
              indice={i}
              tipo={item.tipo}
              total={itens.fields.length}
              contexto={contexto}
              aoSubir={() => itens.move(i, i - 1)}
              aoDescer={() => itens.move(i, i + 1)}
              aoRemover={() => itens.remove(i)}
            />
          ))}
        </ol>
      )}

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="secondary"
          disabled={cheio || exercicios.length === 0}
          onClick={() => itens.append(novoItemDeForca())}
        >
          <Dumbbell size={18} strokeWidth={1.5} aria-hidden />
          Força
        </Button>
        <Button
          type="button"
          variant="secondary"
          disabled={cheio}
          onClick={() => itens.append(novoItemDeCardio())}
        >
          <HeartPulse size={18} strokeWidth={1.5} aria-hidden />
          Cardio
        </Button>
      </div>
      {cheio ? (
        <p className="text-sm text-muted-foreground">
          O dia chegou ao limite de {MAX_ITENS_POR_DIA} itens.
        </p>
      ) : null}
      {erroEm(errors, `${caminho}.itens`) ? (
        <p className="text-sm text-destructive">{erroEm(errors, `${caminho}.itens`)}</p>
      ) : null}
    </Card>
  );
}

function ItemDoEditor({
  dia,
  indice,
  tipo,
  total,
  contexto,
  aoSubir,
  aoDescer,
  aoRemover,
}: {
  dia: number;
  indice: number;
  tipo: 'forca' | 'cardio';
  total: number;
  contexto: Contexto;
  aoSubir: () => void;
  aoDescer: () => void;
  aoRemover: () => void;
}) {
  const { register, setValue, errors, exercicios } = contexto;
  const caminho = `dias.${dia}.itens.${indice}` as const;
  const erro = (campo: string) => erroEm(errors, `${caminho}.${campo}`);
  const id = (campo: string) => `${caminho}.${campo}`;
  const numero = { type: 'number', inputMode: 'numeric', min: 1 } as const;

  return (
    <li className="flex flex-col gap-3 rounded-control border border-border p-3 sm:p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="flex items-center gap-2 font-medium">
          <span className="text-muted-foreground tabular-nums">{indice + 1}.</span>
          {tipo === 'forca' ? 'Força' : 'Cardio'}
        </p>
        <BotoesDeOrdem
          nome={`item ${indice + 1} do dia ${rotuloDoDia(dia + 1)}`}
          podeSubir={indice > 0}
          podeDescer={indice < total - 1}
          aoSubir={aoSubir}
          aoDescer={aoDescer}
          aoRemover={aoRemover}
        />
      </div>

      {tipo === 'forca' ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Campo
            id={id('exercicioId')}
            rotulo="Exercício"
            erro={erro('exercicioId')}
            className="col-span-2 sm:col-span-4"
          >
            <Select
              id={id('exercicioId')}
              aria-invalid={erro('exercicioId') ? true : undefined}
              {...register(`${caminho}.exercicioId`, {
                // Ao escolher o exercício, a unidade do item segue a padrão dele.
                onChange: (evento: { target: { value: string } }) => {
                  const escolhido = exercicios.find((e) => e.id === evento.target.value);
                  if (escolhido) setValue(`${caminho}.unidade`, escolhido.unidadePadrao);
                },
              })}
            >
              <option value="">Escolha…</option>
              {exercicios.map((exercicio) => (
                <option key={exercicio.id} value={exercicio.id}>
                  {exercicio.nome}
                </option>
              ))}
            </Select>
          </Campo>
          <Campo id={id('series')} rotulo="Séries" erro={erro('series')}>
            <Input
              id={id('series')}
              {...numero}
              aria-invalid={erro('series') ? true : undefined}
              {...register(`${caminho}.series`, { valueAsNumber: true })}
            />
          </Campo>
          <Campo id={id('unidade')} rotulo="Unidade" erro={erro('unidade')}>
            <Select id={id('unidade')} {...register(`${caminho}.unidade`)}>
              {Object.entries(NOME_DA_UNIDADE).map(([valor, nome]) => (
                <option key={valor} value={valor}>
                  {nome}
                </option>
              ))}
            </Select>
          </Campo>
          <Campo id={id('faixaMin')} rotulo="Mínimo" erro={erro('faixaMin')}>
            <Input
              id={id('faixaMin')}
              {...numero}
              aria-invalid={erro('faixaMin') ? true : undefined}
              {...register(`${caminho}.faixaMin`, { valueAsNumber: true })}
            />
          </Campo>
          <Campo id={id('faixaMax')} rotulo="Máximo" erro={erro('faixaMax')}>
            <Input
              id={id('faixaMax')}
              {...numero}
              aria-invalid={erro('faixaMax') ? true : undefined}
              {...register(`${caminho}.faixaMax`, { valueAsNumber: true })}
            />
          </Campo>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Campo
            id={id('modalidade')}
            rotulo="Modalidade"
            erro={erro('modalidade')}
            className="col-span-2"
          >
            <Select id={id('modalidade')} {...register(`${caminho}.modalidade`)}>
              {Object.entries(NOME_DA_MODALIDADE).map(([valor, nome]) => (
                <option key={valor} value={valor}>
                  {nome}
                </option>
              ))}
            </Select>
          </Campo>
          <Campo id={id('duracaoMinMin')} rotulo="Mínimo (min)" erro={erro('duracaoMinMin')}>
            <Input
              id={id('duracaoMinMin')}
              {...numero}
              aria-invalid={erro('duracaoMinMin') ? true : undefined}
              {...register(`${caminho}.duracaoMinMin`, { valueAsNumber: true })}
            />
          </Campo>
          <Campo id={id('duracaoMaxMin')} rotulo="Máximo (min)" erro={erro('duracaoMaxMin')}>
            <Input
              id={id('duracaoMaxMin')}
              {...numero}
              aria-invalid={erro('duracaoMaxMin') ? true : undefined}
              {...register(`${caminho}.duracaoMaxMin`, { valueAsNumber: true })}
            />
          </Campo>
        </div>
      )}

      <Campo id={id('observacao')} rotulo="Observação (opcional)" erro={erro('observacao')}>
        <Input
          id={id('observacao')}
          autoComplete="off"
          aria-invalid={erro('observacao') ? true : undefined}
          {...register(`${caminho}.observacao`)}
        />
      </Campo>
    </li>
  );
}

function Campo({
  id,
  rotulo,
  erro,
  className,
  children,
}: {
  id: string;
  rotulo: string;
  erro: string | undefined;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn('flex min-w-0 flex-col gap-1.5', className)}>
      <Label htmlFor={id}>{rotulo}</Label>
      {children}
      {erro ? <p className="text-sm text-destructive">{erro}</p> : null}
    </div>
  );
}

function BotoesDeOrdem({
  nome,
  podeSubir,
  podeDescer,
  aoSubir,
  aoDescer,
  aoRemover,
}: {
  nome: string;
  podeSubir: boolean;
  podeDescer: boolean;
  aoSubir: () => void;
  aoDescer: () => void;
  aoRemover: () => void;
}) {
  return (
    <div className="flex items-center">
      <BotaoDeIcone rotulo={`Subir ${nome}`} disabled={!podeSubir} onClick={aoSubir}>
        <ArrowUp size={18} strokeWidth={1.5} aria-hidden />
      </BotaoDeIcone>
      <BotaoDeIcone rotulo={`Descer ${nome}`} disabled={!podeDescer} onClick={aoDescer}>
        <ArrowDown size={18} strokeWidth={1.5} aria-hidden />
      </BotaoDeIcone>
      <BotaoDeIcone rotulo={`Remover ${nome}`} onClick={aoRemover}>
        <Trash2 size={18} strokeWidth={1.5} aria-hidden />
      </BotaoDeIcone>
    </div>
  );
}

function BotaoDeIcone({ rotulo, ...props }: ComponentProps<'button'> & { rotulo: string }) {
  return (
    <Button
      type="button"
      variant="ghost"
      aria-label={rotulo}
      title={rotulo}
      className="w-11 px-0"
      {...props}
    />
  );
}
