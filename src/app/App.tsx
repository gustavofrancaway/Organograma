import {
  User,
  Building2,
  Server,
  Edit2,
  Plus,
  Trash2,
  Upload,
  X,
  Check,
  Info,
  Network,
  ChevronDown,
  Crown,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { JSX } from "react";
import { supabase } from "../lib/supabase";
import Login from "./components/Login";

type SetorSistema = "ITS" | "INFRA";

type Pessoa = {
  id: string;
  nome: string;
  cargo: string;
  cargo_descricao?: string | null;
  descricao?: string | null;
  foto: string | null;
  setor: SetorSistema;
  unidade_id: string | null;
  gerente_id?: string | null;
  coordenador_id?: string | null;
  gerente_geral?: boolean | null;
  ordem?: number | null;
};

type Unidade = { id: string; nome: string; ordem: number | null };

type SistemaState = {
  id: string;
  nome: string;
  foto: string | null;
  responsaveis: Pessoa[];
  infraestrutura: Pessoa[];
  ordem?: number | null;
  setor: SetorSistema;
};

type SistemaPessoaDb = {
  id: string;
  sistema_id: string;
  pessoa_id: string;
  tipo: "responsaveis" | "infraestrutura";
};

type CargoConfig = { cargo: string; label: string };

// Ordem da tela do Setor Sistemas (ITS)
const CARGOS_ITS: CargoConfig[] = [
  { cargo: "Suporte", label: "Nível 1 - Suporte" },
  { cargo: "Analista", label: "Nível 2 - Analista" },
  { cargo: "Coordenação", label: "Nível 3 - Coordenação" },
  { cargo: "Gerente", label: "Gerente" },
];

// Ordem da tela do Setor Infra e Redes
const CARGOS_INFRA: CargoConfig[] = [
  { cargo: "Suporte", label: "Nível 1 - Suporte" },
  { cargo: "Coordenação", label: "Nível 2 - Coordenação" },
  { cargo: "Gerente", label: "Gerente" },
];

const ordenarPorOrdem = <T extends { ordem?: number | null; nome?: string }>(
  lista: T[],
) =>
  [...lista].sort((a, b) => {
    const oa = a.ordem ?? 0;
    const ob = b.ordem ?? 0;
    if (oa !== ob) return oa - ob;
    return (a.nome ?? "").localeCompare(b.nome ?? "");
  });

export default function App() {
  const [unidades, setUnidades] = useState<Unidade[]>([]);
  const [pessoas, setPessoas] = useState<Pessoa[]>([]);
  const [sistemas, setSistemas] = useState<SistemaState[]>([]);

  const [autenticado, setAutenticado] = useState(false);
  const [verificandoAuth, setVerificandoAuth] = useState(true);
  const [carregando, setCarregando] = useState(false);

  const [editandoNome, setEditandoNome] = useState<string | null>(null);
  const [valorTemp, setValorTemp] = useState("");

  const [unidadesAbertas, setUnidadesAbertas] = useState<Record<string, boolean>>({});
  const [sistemaExpandido, setSistemaExpandido] = useState<string | null>(null);

  const [novoSistemaITS, setNovoSistemaITS] = useState("");
  const [novoSistemaINFRA, setNovoSistemaINFRA] = useState("");

  const [modalAberto, setModalAberto] = useState(false);
  const [modalConfig, setModalConfig] = useState<{
    sistemaId: string;
    tipo: "responsaveis" | "infraestrutura";
  } | null>(null);

  const [pessoaInfoId, setPessoaInfoId] = useState<string | null>(null);

  useEffect(() => {
    const auth = localStorage.getItem("way_auth");
    if (auth === "true") setAutenticado(true);
    setVerificandoAuth(false);
  }, []);

  useEffect(() => {
    if (autenticado) carregarDados();
  }, [autenticado]);

  const mostrarErro = (e: unknown, ctx = "operação") => {
    console.error(`Erro em ${ctx}:`, e);
    alert(`Erro em ${ctx}. Veja o console.`);
  };

  const sair = () => {
    localStorage.removeItem("way_auth");
    setAutenticado(false);
  };

  const getCargoExibicao = (p: {
    cargo: string;
    cargo_descricao?: string | null;
  }) => p.cargo_descricao?.trim() || p.cargo;

  const carregarDados = async () => {
    try {
      setCarregando(true);
      const [uRes, pRes, sRes, spRes] = await Promise.all([
        supabase.from("unidades").select("*").order("ordem", { ascending: true }),
        supabase.from("pessoas").select("*").order("ordem", { ascending: true }),
        supabase.from("sistemas").select("*").order("ordem", { ascending: true }),
        supabase.from("sistema_pessoas").select("*"),
      ]);
      if (uRes.error) throw uRes.error;
      if (pRes.error) throw pRes.error;
      if (sRes.error) throw sRes.error;
      if (spRes.error) throw spRes.error;

      const u = (uRes.data ?? []) as Unidade[];
      const p = (pRes.data ?? []).map((r: any) => ({
        ...r,
        setor: r.setor === "INFRA" ? "INFRA" : "ITS",
      })) as Pessoa[];
      const sDb = (sRes.data ?? []).map((r: any) => ({
        ...r,
        setor: r.setor === "INFRA" ? "INFRA" : "ITS",
      })) as Array<{
        id: string;
        nome: string;
        foto: string | null;
        ordem: number | null;
        setor: SetorSistema;
      }>;
      const sp = (spRes.data ?? []) as SistemaPessoaDb[];

      setUnidades(u);
      setPessoas(p);

      const byId = new Map<string, Pessoa>();
      p.forEach((x) => byId.set(x.id, x));

      const sistemasMontados: SistemaState[] = sDb.map((s) => {
        const rels = sp.filter((r) => r.sistema_id === s.id);
        const responsaveis = rels
          .filter((r) => r.tipo === "responsaveis")
          .map((r) => byId.get(r.pessoa_id))
          .filter(Boolean) as Pessoa[];
        const infra = rels
          .filter((r) => r.tipo === "infraestrutura")
          .map((r) => byId.get(r.pessoa_id))
          .filter(Boolean) as Pessoa[];

        return {
          id: s.id,
          nome: s.nome,
          foto: s.foto,
          ordem: s.ordem,
          setor: s.setor,
          responsaveis,
          infraestrutura: infra,
        };
      });

      setSistemas(sistemasMontados);

      setUnidadesAbertas((prev) => {
        const copia = { ...prev };
        u.forEach((x) => {
          if (copia[x.id] === undefined) copia[x.id] = true;
        });
        return copia;
      });
    } catch (e) {
      mostrarErro(e, "carregarDados");
    } finally {
      setCarregando(false);
    }
  };

  const gerenteGeral = pessoas.find((p) => p.gerente_geral);

  const getPessoasUnidadeSetor = (uid: string, setor: SetorSistema) =>
    ordenarPorOrdem(
      pessoas.filter(
        (p) => p.unidade_id === uid && p.setor === setor && !p.gerente_geral,
      ),
    );

  const todosGerentes = useMemo(
    () =>
      ordenarPorOrdem(
        pessoas.filter(
          (p) =>
            p.cargo === "Gerente" ||
            p.cargo === "Gerente Geral" ||
            p.gerente_geral,
        ),
      ),
    [pessoas],
  );
  const todosCoordenadores = useMemo(
    () => ordenarPorOrdem(pessoas.filter((p) => p.cargo === "Coordenação")),
    [pessoas],
  );

  // unidades
  const addUnidade = async () => {
    try {
      const ord =
        unidades.length > 0 ? Math.max(...unidades.map((u) => u.ordem ?? 0)) + 1 : 1;
      const { error } = await supabase.from("unidades").insert({
        nome: "Nova Unidade",
        ordem: ord,
      });
      if (error) throw error;
      await carregarDados();
    } catch (e) {
      mostrarErro(e, "addUnidade");
    }
  };
  const updUnidade = async (id: string, nome: string) => {
    try {
      const { error } = await supabase.from("unidades").update({ nome }).eq("id", id);
      if (error) throw error;
      await carregarDados();
    } catch (e) {
      mostrarErro(e, "updUnidade");
    }
  };
  const delUnidade = async (id: string) => {
    try {
      if (!window.confirm("Remover esta unidade?")) return;
      const { error } = await supabase.from("unidades").delete().eq("id", id);
      if (error) throw error;
      await carregarDados();
    } catch (e) {
      mostrarErro(e, "delUnidade");
    }
  };

  // pessoas
  const addPessoa = async (uid: string, setor: SetorSistema, cargo: string) => {
    try {
      const list = pessoas.filter(
        (p) => p.unidade_id === uid && p.setor === setor && p.cargo === cargo,
      );
      const ord = list.length > 0 ? Math.max(...list.map((p) => p.ordem ?? 0)) + 1 : 1;
      const { error } = await supabase.from("pessoas").insert({
        nome: `Novo ${cargo}`,
        cargo,
        cargo_descricao: cargo,
        setor,
        unidade_id: uid,
        ordem: ord,
        gerente_geral: false,
      });
      if (error) throw error;
      await carregarDados();
    } catch (e) {
      mostrarErro(e, "addPessoa");
    }
  };

  const addGerenteGeral = async () => {
    try {
      const { error } = await supabase.from("pessoas").insert({
        nome: "Novo Gerente",
        cargo: "Gerente Geral",
        cargo_descricao: "Gerente Geral",
        setor: "ITS",
        unidade_id: null,
        ordem: 0,
        gerente_geral: true,
      });
      if (error) throw error;
      await carregarDados();
    } catch (e) {
      mostrarErro(e, "addGerenteGeral");
    }
  };

  const updPessoa = async (id: string, payload: Partial<Pessoa>) => {
    try {
      const { error } = await supabase.from("pessoas").update(payload).eq("id", id);
      if (error) throw error;
      await carregarDados();
    } catch (e) {
      mostrarErro(e, "updPessoa");
    }
  };

  const delPessoa = async (id: string) => {
    try {
      if (!window.confirm("Excluir esta pessoa?")) return;
      const { error } = await supabase.from("pessoas").delete().eq("id", id);
      if (error) throw error;
      if (pessoaInfoId === id) setPessoaInfoId(null);
      await carregarDados();
    } catch (e) {
      mostrarErro(e, "delPessoa");
    }
  };

  // sistemas
  const addSistema = async (setor: SetorSistema, nome: string) => {
    try {
      const n = nome.trim();
      if (!n) return;
      const ord =
        sistemas.length > 0 ? Math.max(...sistemas.map((s) => s.ordem ?? 0)) + 1 : 1;
      const { error } = await supabase.from("sistemas").insert({
        nome: n,
        setor,
        ordem: ord,
      });
      if (error) throw error;
      if (setor === "ITS") setNovoSistemaITS("");
      else setNovoSistemaINFRA("");
      await carregarDados();
    } catch (e) {
      mostrarErro(e, "addSistema");
    }
  };
  const updSistema = async (id: string, payload: Partial<SistemaState>) => {
    try {
      const { error } = await supabase.from("sistemas").update(payload).eq("id", id);
      if (error) throw error;
      await carregarDados();
    } catch (e) {
      mostrarErro(e, "updSistema");
    }
  };
  const delSistema = async (id: string) => {
    try {
      if (!window.confirm("Excluir este sistema?")) return;
      const { error } = await supabase.from("sistemas").delete().eq("id", id);
      if (error) throw error;
      await carregarDados();
    } catch (e) {
      mostrarErro(e, "delSistema");
    }
  };

  const togglePessoaSistema = async (p: Pessoa) => {
    try {
      if (!modalConfig) return;
      const s = sistemas.find((x) => x.id === modalConfig.sistemaId);
      if (!s) return;
      const tipo = modalConfig.tipo;
      const existe =
        tipo === "responsaveis"
          ? s.responsaveis.some((x) => x.id === p.id)
          : s.infraestrutura.some((x) => x.id === p.id);
      if (existe) {
        const { error } = await supabase
          .from("sistema_pessoas")
          .delete()
          .eq("sistema_id", s.id)
          .eq("pessoa_id", p.id)
          .eq("tipo", tipo);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("sistema_pessoas").insert({
          sistema_id: s.id,
          pessoa_id: p.id,
          tipo,
        });
        if (error) throw error;
      }
      await carregarDados();
    } catch (e) {
      mostrarErro(e, "togglePessoaSistema");
    }
  };

  const removerPessoaSistema = async (
    sid: string,
    pid: string,
    tipo: "responsaveis" | "infraestrutura",
  ) => {
    try {
      const { error } = await supabase
        .from("sistema_pessoas")
        .delete()
        .eq("sistema_id", sid)
        .eq("pessoa_id", pid)
        .eq("tipo", tipo);
      if (error) throw error;
      await carregarDados();
    } catch (e) {
      mostrarErro(e, "removerPessoaSistema");
    }
  };

  // upload
  const handleImageUpload = (
    file: File,
    cb: (url: string) => void | Promise<void>,
  ) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      if (e.target?.result) await cb(e.target.result as string);
    };
    reader.readAsDataURL(file);
  };

  const iniciarEdicao = (id: string, valor: string) => {
    setEditandoNome(id);
    setValorTemp(valor);
  };
  const limparEdicao = () => {
    setEditandoNome(null);
    setValorTemp("");
  };

  const abrirModal = (sid: string, tipo: "responsaveis" | "infraestrutura") => {
    setModalConfig({ sistemaId: sid, tipo });
    setModalAberto(true);
  };
  const fecharModal = () => {
    setModalAberto(false);
    setModalConfig(null);
  };
  const isSelecionada = (p: Pessoa) => {
    if (!modalConfig) return false;
    const s = sistemas.find((x) => x.id === modalConfig.sistemaId);
    if (!s) return false;
    return modalConfig.tipo === "responsaveis"
      ? s.responsaveis.some((x) => x.id === p.id)
      : s.infraestrutura.some((x) => x.id === p.id);
  };

  const todasPessoasOrdenadas = useMemo(() => ordenarPorOrdem(pessoas), [pessoas]);

  const AvatarUpload = ({
    foto,
    onUpload,
    size = "md",
    borderColor = "border-border",
  }: {
    foto: string | null;
    onUpload: (url: string) => void | Promise<void>;
    size?: "sm" | "md" | "lg";
    borderColor?: string;
  }) => {
    const sz = { sm: "w-8 h-8", md: "w-12 h-12", lg: "w-20 h-20" };
    const ic = { sm: "w-4 h-4", md: "w-6 h-6", lg: "w-10 h-10" };
    const up = { sm: "w-3 h-3", md: "w-4 h-4", lg: "w-5 h-5" };
    return (
      <div className="relative group flex-shrink-0">
        <div
          className={`${sz[size]} rounded-full bg-muted border-2 ${borderColor} flex items-center justify-center overflow-hidden`}
        >
          {foto ? (
            <img src={foto} alt="" className="w-full h-full object-cover" />
          ) : (
            <User className={`${ic[size]} text-muted-foreground`} />
          )}
        </div>
        <label className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity">
          <Upload className={`${up[size]} text-white`} />
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleImageUpload(f, onUpload);
            }}
          />
        </label>
      </div>
    );
  };

  if (verificandoAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-secondary/20">
        <div className="text-sm text-muted-foreground">Verificando acesso...</div>
      </div>
    );
  }
  if (!autenticado) {
    return <Login onSuccess={() => setAutenticado(true)} />;
  }

  const sistemasITS = sistemas.filter((s) => s.setor === "ITS");
  const sistemasINFRA = sistemas.filter((s) => s.setor === "INFRA");

  const renderCardPessoa = (p: Pessoa, borderCor: string) => (
    <div
      key={p.id}
      className="flex items-center gap-3 p-2 bg-secondary/50 rounded-lg relative"
    >
      <button
        onClick={() => delPessoa(p.id)}
        className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-destructive text-white flex items-center justify-center hover:bg-destructive/80"
      >
        <X className="w-3 h-3" />
      </button>
      <AvatarUpload
        foto={p.foto}
        size="md"
        borderColor={borderCor}
        onUpload={(url) => updPessoa(p.id, { foto: url })}
      />
      <div className="min-w-0">
        {editandoNome === `p-${p.id}-nome` ? (
          <input
            value={valorTemp}
            onChange={(e) => setValorTemp(e.target.value)}
            onBlur={async () => {
              await updPessoa(p.id, { nome: valorTemp.trim() });
              limparEdicao();
            }}
            onKeyDown={async (e) => {
              if (e.key === "Enter") {
                await updPessoa(p.id, { nome: valorTemp.trim() });
                limparEdicao();
              }
            }}
            className="font-medium text-sm px-2 py-1 border rounded"
            autoFocus
          />
        ) : (
          <div
            className="font-medium text-sm cursor-pointer inline-flex items-center gap-1 hover:bg-secondary rounded px-2 py-1"
            onClick={() => setPessoaInfoId(p.id)}
          >
            {p.nome}
            <Info className="w-3 h-3 opacity-50" />
          </div>
        )}

        {editandoNome === `p-${p.id}-cargo` ? (
          <input
            value={valorTemp}
            onChange={(e) => setValorTemp(e.target.value)}
            onBlur={async () => {
              await updPessoa(p.id, { cargo_descricao: valorTemp.trim() });
              limparEdicao();
            }}
            onKeyDown={async (e) => {
              if (e.key === "Enter") {
                await updPessoa(p.id, { cargo_descricao: valorTemp.trim() });
                limparEdicao();
              }
            }}
            className="text-xs border rounded px-1"
            autoFocus
          />
        ) : (
          <div
            className="text-xs text-muted-foreground cursor-pointer hover:text-foreground"
            onClick={() =>
              iniciarEdicao(`p-${p.id}-cargo`, p.cargo_descricao || p.cargo)
            }
          >
            {getCargoExibicao(p)}
          </div>
        )}

        <button
          onClick={() => iniciarEdicao(`p-${p.id}-nome`, p.nome)}
          className="text-xs text-muted-foreground hover:text-foreground mt-1"
        >
          <Edit2 className="w-3 h-3 inline" /> editar nome
        </button>
      </div>
    </div>
  );

  const renderSetor = (
    u: Unidade,
    setor: SetorSistema,
    titulo: string,
    cargos: CargoConfig[],
    cor: string,
  ) => (
    <div className="border border-border rounded-2xl p-5 bg-card">
      <div
        className={`${cor} text-white px-3 py-1 rounded-full inline-flex items-center gap-2 text-xs font-medium mb-4`}
      >
        {setor === "ITS" ? <Server className="w-3 h-3" /> : <Network className="w-3 h-3" />}
        {titulo}
      </div>

      <div className="space-y-5">
        {cargos.map(({ cargo, label }) => {
          const lista = getPessoasUnidadeSetor(u.id, setor).filter(
            (p) => p.cargo === cargo,
          );
          return (
            <div key={cargo}>
              <div className="flex items-center justify-between mb-2">
                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {label}
                </div>
                <button
                  onClick={() => addPessoa(u.id, setor, cargo)}
                  className="text-xs px-2 py-1 bg-secondary rounded hover:bg-secondary/80 flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" /> Adicionar
                </button>
              </div>

              {lista.length === 0 ? (
                <div className="text-xs text-muted-foreground italic">
                  Nenhuma pessoa cadastrada
                </div>
              ) : (
                <div className="flex flex-wrap gap-3">
                  {lista.map((p) => renderCardPessoa(p, cor.replace("bg-", "border-")))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );

  const renderSistemasBloco = (
    titulo: string,
    icone: JSX.Element,
    lista: SistemaState[],
    corClasse: string,
    setor: SetorSistema,
    valorNovo: string,
    setValorNovo: (v: string) => void,
  ) => (
    <div className="mb-16">
      <div className="text-center mb-6">
        <div
          className={`inline-flex items-center gap-2 ${corClasse} text-white px-6 py-2 rounded-full font-medium`}
        >
          {icone}
          <span>{titulo}</span>
        </div>
      </div>

      <div className="max-w-6xl mx-auto mb-5 flex flex-col sm:flex-row gap-3 justify-center">
        <input
          type="text"
          value={valorNovo}
          onChange={(e) => setValorNovo(e.target.value)}
          placeholder="Nome do novo sistema"
          className="flex-1 sm:flex-none sm:min-w-[280px] px-4 py-2 rounded-xl border border-border bg-card text-sm"
        />
        <button
          onClick={() => addSistema(setor, valorNovo)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-chart-2 text-white text-sm font-medium hover:bg-chart-2/80"
        >
          <Plus className="w-4 h-4" />
          Adicionar sistema
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-6xl mx-auto">
        {lista.length === 0 && (
          <div className="md:col-span-3 text-center text-sm text-muted-foreground py-6">
            Nenhum sistema cadastrado neste setor.
          </div>
        )}

        {lista.map((sistema) => (
          <div
            key={sistema.id}
            className="bg-card border border-border rounded-xl shadow hover:shadow-lg transition-all"
          >
            <div
              className="group relative p-4 cursor-pointer hover:bg-secondary/30 rounded-t-xl"
              onClick={() =>
                setSistemaExpandido(sistemaExpandido === sistema.id ? null : sistema.id)
              }
            >
              <div className="flex items-center gap-3">
                <div className="relative group/img">
                  <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-chart-4/20 to-chart-4/5 border border-chart-4/20 flex items-center justify-center overflow-hidden">
                    {sistema.foto ? (
                      <img
                        src={sistema.foto}
                        alt={sistema.nome}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Server className="w-6 h-6 text-chart-4" />
                    )}
                  </div>
                  <label
                    className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-lg opacity-0 group-hover/img:opacity-100 cursor-pointer transition-opacity"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Upload className="w-5 h-5 text-white" />
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) handleImageUpload(f, (url) => updSistema(sistema.id, { foto: url }));
                      }}
                    />
                  </label>
                </div>

                <div className="flex-1" onClick={(e) => e.stopPropagation()}>
                  {editandoNome === `sis-${sistema.id}` ? (
                    <input
                      value={valorTemp}
                      onChange={(e) => setValorTemp(e.target.value)}
                      onBlur={async () => {
                        await updSistema(sistema.id, { nome: valorTemp.trim() });
                        limparEdicao();
                      }}
                      onKeyDown={async (e) => {
                        if (e.key === "Enter") {
                          await updSistema(sistema.id, { nome: valorTemp.trim() });
                          limparEdicao();
                        }
                      }}
                      className="text-sm w-full px-2 py-1 border border-chart-4 rounded font-medium"
                      autoFocus
                    />
                  ) : (
                    <div
                      className="text-sm cursor-pointer hover:bg-secondary/50 rounded px-2 py-1 inline-flex items-center gap-1 font-medium"
                      onClick={() => iniciarEdicao(`sis-${sistema.id}`, sistema.nome)}
                    >
                      {sistema.nome}
                      <Edit2 className="w-3 h-3 opacity-50" />
                    </div>
                  )}
                  <div className="text-xs text-muted-foreground mt-1 px-2">
                    {sistema.responsaveis.length + sistema.infraestrutura.length} pessoa(s)
                  </div>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    delSistema(sistema.id);
                  }}
                  className="text-destructive hover:bg-destructive/10 p-1.5 rounded"
                  title="Excluir sistema"
                >
                  <Trash2 className="w-4 h-4" />
                </button>

                <div
                  className={`transition-transform ${
                    sistemaExpandido === sistema.id ? "rotate-180" : ""
                  }`}
                >
                  <ChevronDown className="w-5 h-5 text-muted-foreground" />
                </div>
              </div>
            </div>

            {sistemaExpandido === sistema.id && (
              <div className="border-t border-border p-4 space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-sm font-medium text-chart-2">Responsáveis</div>
                    <button
                      onClick={() => abrirModal(sistema.id, "responsaveis")}
                      className="text-xs px-2 py-1 bg-chart-2 text-white rounded hover:bg-chart-2/80 flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" />
                      Selecionar
                    </button>
                  </div>
                  <div className="space-y-2">
                    {sistema.responsaveis.length === 0 ? (
                      <div className="text-xs text-muted-foreground text-center py-2">
                        Nenhum responsável
                      </div>
                    ) : (
                      sistema.responsaveis.map((p) => (
                        <div
                          key={p.id}
                          className="flex items-center gap-2 p-2 bg-secondary/50 rounded-lg"
                        >
                          <div className="w-8 h-8 rounded-full bg-muted border border-chart-2 flex items-center justify-center overflow-hidden flex-shrink-0">
                            {p.foto ? (
                              <img
                                src={p.foto}
                                alt={p.nome}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <User className="w-4 h-4 text-muted-foreground" />
                            )}
                          </div>
                          <div
                            className="flex-1 min-w-0 cursor-pointer"
                            onClick={() => setPessoaInfoId(p.id)}
                          >
                            <div className="text-xs font-medium truncate flex items-center gap-1">
                              {p.nome}
                              <Info className="w-3 h-3 opacity-50" />
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {getCargoExibicao(p)}
                            </div>
                          </div>
                          <button
                            onClick={() =>
                              removerPessoaSistema(sistema.id, p.id, "responsaveis")
                            }
                            className="text-destructive hover:bg-destructive/10 p-1 rounded flex-shrink-0"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-sm font-medium text-chart-5">Infraestrutura</div>
                    <button
                      onClick={() => abrirModal(sistema.id, "infraestrutura")}
                      className="text-xs px-2 py-1 bg-chart-5 text-white rounded hover:bg-chart-5/80 flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" />
                      Selecionar
                    </button>
                  </div>
                  <div className="space-y-2">
                    {sistema.infraestrutura.length === 0 ? (
                      <div className="text-xs text-muted-foreground text-center py-2">
                        Nenhum suporte de infra
                      </div>
                    ) : (
                      sistema.infraestrutura.map((p) => (
                        <div
                          key={p.id}
                          className="flex items-center gap-2 p-2 bg-secondary/50 rounded-lg"
                        >
                          <div className="w-8 h-8 rounded-full bg-muted border border-chart-5 flex items-center justify-center overflow-hidden flex-shrink-0">
                            {p.foto ? (
                              <img
                                src={p.foto}
                                alt={p.nome}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <User className="w-4 h-4 text-muted-foreground" />
                            )}
                          </div>
                          <div
                            className="flex-1 min-w-0 cursor-pointer"
                            onClick={() => setPessoaInfoId(p.id)}
                          >
                            <div className="text-xs font-medium truncate flex items-center gap-1">
                              {p.nome}
                              <Info className="w-3 h-3 opacity-50" />
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {getCargoExibicao(p)}
                            </div>
                          </div>
                          <button
                            onClick={() =>
                              removerPessoaSistema(sistema.id, p.id, "infraestrutura")
                            }
                            className="text-destructive hover:bg-destructive/10 p-1 rounded flex-shrink-0"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );

  const pessoaInfo = pessoas.find((x) => x.id === pessoaInfoId) ?? null;
  const unidadeNomePessoaInfo =
    pessoaInfo && pessoaInfo.unidade_id
      ? unidades.find((u) => u.id === pessoaInfo.unidade_id)?.nome ?? "—"
      : "—";

  return (
    <div className="size-full bg-gradient-to-br from-background via-background to-secondary/20 overflow-auto">
      <div className="max-w-[1600px] mx-auto p-8">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="flex justify-center sm:justify-end mb-4">
            <button
              onClick={sair}
              className="px-4 py-2 text-sm bg-destructive text-white rounded-xl hover:bg-destructive/90 transition-colors"
            >
              Sair
            </button>
          </div>
          <h1 className="mb-2 text-3xl font-bold">Mapa de Sistemas</h1>
          <p className="text-muted-foreground mb-4">Way Brasil</p>
          {carregando && (
            <p className="text-xs text-muted-foreground">Sincronizando com o Supabase...</p>
          )}
        </div>

        {/* Way Brasil */}
        <div className="flex justify-center mb-10">
          <div className="w-48 h-48 rounded-full bg-gradient-to-br from-chart-1 to-chart-2 flex flex-col items-center justify-center text-white shadow-2xl">
            <Building2 className="w-16 h-16 mb-2" />
            <div className="text-xl font-bold">Way Brasil</div>
            <div className="text-sm opacity-80">Sistemas</div>
          </div>
        </div>

        {/* Gerente Geral (abaixo do Way Brasil) */}
        <div className="mb-12">
          <div className="text-center mb-6">
            <div className="inline-flex items-center gap-2 bg-primary text-white px-6 py-2 rounded-full font-medium">
              <Crown className="w-5 h-5" />
              <span>Gerente Geral</span>
            </div>
          </div>

          <div className="flex justify-center">
            {gerenteGeral ? (
              <div className="bg-card border-2 border-primary/40 rounded-2xl p-5 shadow-lg min-w-[260px] flex items-center gap-4 relative">
                <AvatarUpload
                  foto={gerenteGeral.foto}
                  size="lg"
                  borderColor="border-primary"
                  onUpload={(url) => updPessoa(gerenteGeral.id, { foto: url })}
                />
                <div className="min-w-0">
                  {editandoNome === `gg-nome-${gerenteGeral.id}` ? (
                    <input
                      value={valorTemp}
                      onChange={(e) => setValorTemp(e.target.value)}
                      onBlur={async () => {
                        await updPessoa(gerenteGeral.id, { nome: valorTemp.trim() });
                        limparEdicao();
                      }}
                      onKeyDown={async (e) => {
                        if (e.key === "Enter") {
                          await updPessoa(gerenteGeral.id, { nome: valorTemp.trim() });
                          limparEdicao();
                        }
                      }}
                      className="font-bold text-base px-2 py-1 border rounded"
                      autoFocus
                    />
                  ) : (
                    <div className="flex items-center gap-2">
                      <button
                        className="font-bold text-base inline-flex items-center gap-1 hover:text-primary"
                        onClick={() =>
                          iniciarEdicao(`gg-nome-${gerenteGeral.id}`, gerenteGeral.nome)
                        }
                      >
                        {gerenteGeral.nome}
                        <Edit2 className="w-3 h-3 opacity-50" />
                      </button>
                      <button
                        onClick={() => setPessoaInfoId(gerenteGeral.id)}
                        className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
                      >
                        <Info className="w-3 h-3" /> detalhes
                      </button>
                    </div>
                  )}

                  <div className="text-sm text-muted-foreground">
                    {getCargoExibicao(gerenteGeral)}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {gerenteGeral.setor === "INFRA" ? "Infra e Redes" : "Sistemas"}
                  </div>
                </div>
              </div>
            ) : (
              <button
                onClick={addGerenteGeral}
                className="px-4 py-2 rounded-xl bg-primary text-white text-sm inline-flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Cadastrar Gerente Geral
              </button>
            )}
          </div>
        </div>

        {/* Matriz de responsabilidade Unidades */}
        <div className="mb-16">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-bold">Matriz de responsabilidade Unidades</h2>
            <button
              onClick={addUnidade}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-white text-sm font-medium hover:bg-primary/90"
            >
              <Plus className="w-4 h-4" />
              Nova unidade
            </button>
          </div>

          <div className="space-y-5">
            {unidades.length === 0 && (
              <div className="text-center text-sm text-muted-foreground py-8 border border-dashed rounded-xl">
                Nenhuma unidade cadastrada.
              </div>
            )}

            {unidades.map((u) => {
              const aberto = unidadesAbertas[u.id] ?? true;
              return (
                <div
                  key={u.id}
                  className="border border-border rounded-2xl bg-card overflow-hidden"
                >
                  <div className="p-4 flex items-center gap-3 bg-secondary/30">
                    <button
                      className="p-2 rounded hover:bg-secondary"
                      onClick={() =>
                        setUnidadesAbertas((s) => ({ ...s, [u.id]: !aberto }))
                      }
                    >
                      <ChevronDown
                        className={`w-4 h-4 transition-transform ${aberto ? "" : "-rotate-90"}`}
                      />
                    </button>
                    <Building2 className="w-5 h-5 text-primary" />

                    {editandoNome === `u-${u.id}` ? (
                      <input
                        value={valorTemp}
                        onChange={(e) => setValorTemp(e.target.value)}
                        onBlur={async () => {
                          await updUnidade(u.id, valorTemp.trim());
                          limparEdicao();
                        }}
                        onKeyDown={async (e) => {
                          if (e.key === "Enter") {
                            await updUnidade(u.id, valorTemp.trim());
                            limparEdicao();
                          }
                        }}
                        className="font-bold text-base border rounded px-2 py-1"
                        autoFocus
                      />
                    ) : (
                      <div
                        className="font-bold text-base cursor-pointer hover:text-primary flex items-center gap-1"
                        onClick={() => iniciarEdicao(`u-${u.id}`, u.nome)}
                      >
                        {u.nome}
                        <Edit2 className="w-3 h-3 opacity-50" />
                      </div>
                    )}

                    <button
                      onClick={() => delUnidade(u.id)}
                      className="ml-auto p-2 rounded hover:bg-destructive/10 text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {aberto && (
                    <div className="p-5 grid grid-cols-1 lg:grid-cols-2 gap-5">
                      {renderSetor(u, "ITS", "Setor Sistemas", CARGOS_ITS, "bg-chart-2")}
                      {renderSetor(u, "INFRA", "Setor Infra e Redes", CARGOS_INFRA, "bg-chart-5")}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Sistemas */}
        {renderSistemasBloco(
          "Sistemas Gerenciados — ITS",
          <Server className="w-5 h-5" />,
          sistemasITS,
          "bg-chart-4",
          "ITS",
          novoSistemaITS,
          setNovoSistemaITS,
        )}
        {renderSistemasBloco(
          "Sistemas Gerenciados — Infra e Redes",
          <Network className="w-5 h-5" />,
          sistemasINFRA,
          "bg-chart-5",
          "INFRA",
          novoSistemaINFRA,
          setNovoSistemaINFRA,
        )}
      </div>

      {/* Modal Seleção */}
      {modalAberto && modalConfig && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={fecharModal}
        >
          <div
            className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div>
                <div className="font-medium text-sm">
                  Selecionar{" "}
                  {modalConfig.tipo === "responsaveis" ? "Responsáveis" : "Infraestrutura"}
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {sistemas.find((s) => s.id === modalConfig.sistemaId)?.nome}
                </div>
              </div>
              <button
                onClick={fecharModal}
                className="p-1.5 hover:bg-secondary rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="max-h-80 overflow-y-auto p-3 space-y-1.5">
              {todasPessoasOrdenadas.map((p) => {
                const selec = isSelecionada(p);
                return (
                  <div
                    key={p.id}
                    onClick={() => togglePessoaSistema(p)}
                    className={`flex items-center gap-3 p-2.5 rounded-lg cursor-pointer transition-colors ${
                      selec
                        ? "bg-chart-2/10 border border-chart-2/30"
                        : "hover:bg-secondary/60 border border-transparent"
                    }`}
                  >
                    <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center overflow-hidden flex-shrink-0 border border-border">
                      {p.foto ? (
                        <img src={p.foto} alt={p.nome} className="w-full h-full object-cover" />
                      ) : (
                        <User className="w-4 h-4 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{p.nome}</div>
                      <div className="text-xs text-muted-foreground">
                        {getCargoExibicao(p)} ·{" "}
                        {unidades.find((u) => u.id === p.unidade_id)?.nome ?? "—"} ·{" "}
                        {p.setor === "INFRA" ? "Infra e Redes" : "Sistemas"}
                      </div>
                    </div>
                    <div
                      className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${
                        selec ? "bg-chart-2 text-white" : "border border-border"
                      }`}
                    >
                      {selec && <Check className="w-3 h-3" />}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="px-5 py-3 border-t border-border bg-secondary/20">
              <button
                onClick={fecharModal}
                className="w-full text-sm py-2 bg-chart-2 text-white rounded-lg hover:bg-chart-2/80 transition-colors font-medium"
              >
                Confirmar seleção
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Info Pessoa */}
      {pessoaInfo && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={() => setPessoaInfoId(null)}
        >
          <div
            className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div className="font-medium text-sm flex items-center gap-2">
                <Info className="w-4 h-4" />
                Informações
              </div>
              <button
                onClick={() => setPessoaInfoId(null)}
                className="p-1.5 hover:bg-secondary rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 flex flex-col items-center gap-3">
              <AvatarUpload
                foto={pessoaInfo.foto}
                size="lg"
                borderColor="border-primary"
                onUpload={(url) => updPessoa(pessoaInfo.id, { foto: url })}
              />
              <div className="text-center">
                <div className="font-bold text-lg">{pessoaInfo.nome}</div>
                <div className="text-sm text-muted-foreground">
                  {pessoaInfo.cargo_descricao?.trim() || pessoaInfo.cargo}
                </div>
              </div>

              <div className="w-full border-t border-border mt-2 pt-4 text-sm space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Unidade</span>
                  <span className="font-medium">{unidadeNomePessoaInfo}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Setor</span>
                  <span className="font-medium">
                    {pessoaInfo.setor === "INFRA" ? "Infra e Redes" : "Sistemas"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Cargo</span>
                  <span className="font-medium">{pessoaInfo.cargo}</span>
                </div>

                <div>
                  <div className="text-muted-foreground mb-1">Descrição</div>
                  <textarea
                    defaultValue={pessoaInfo.descricao ?? ""}
                    onBlur={async (e) => {
                      await updPessoa(pessoaInfo.id, { descricao: e.target.value });
                    }}
                    placeholder="Descrição / responsabilidades"
                    className="w-full px-3 py-2 rounded-xl border border-border bg-card text-sm min-h-[70px]"
                  />
                </div>

                <div>
                  <div className="text-muted-foreground mb-1">Gerente</div>
                  <select
                    value={pessoaInfo.gerente_id ?? ""}
                    onChange={async (e) => {
                      const v = e.target.value || null;
                      await updPessoa(pessoaInfo.id, { gerente_id: v });
                    }}
                    className="w-full px-3 py-2 rounded-xl border border-border bg-card text-sm"
                  >
                    <option value="">— Nenhum —</option>
                    {todosGerentes.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.nome}
                        {g.unidade_id
                          ? ` (${unidades.find((u) => u.id === g.unidade_id)?.nome ?? ""})`
                          : g.gerente_geral
                          ? " (Geral)"
                          : ""}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <div className="text-muted-foreground mb-1">Coordenador</div>
                  <select
                    value={pessoaInfo.coordenador_id ?? ""}
                    onChange={async (e) => {
                      const v = e.target.value || null;
                      await updPessoa(pessoaInfo.id, { coordenador_id: v });
                    }}
                    className="w-full px-3 py-2 rounded-xl border border-border bg-card text-sm"
                  >
                    <option value="">— Nenhum —</option>
                    {todosCoordenadores.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nome}
                        {c.unidade_id
                          ? ` (${unidades.find((u) => u.id === c.unidade_id)?.nome ?? ""})`
                          : ""}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="px-5 py-3 border-t border-border bg-secondary/20 flex gap-2">
              <button
                onClick={() => delPessoa(pessoaInfo.id)}
                className="flex-1 text-sm py-2 bg-destructive text-white rounded-lg hover:bg-destructive/80 transition-colors font-medium"
              >
                Excluir
              </button>
              <button
                onClick={() => setPessoaInfoId(null)}
                className="flex-1 text-sm py-2 bg-chart-2 text-white rounded-lg hover:bg-chart-2/80 transition-colors font-medium"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
