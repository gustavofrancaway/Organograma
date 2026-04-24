import {
  User,
  Building2,
  Server,
  Info,
  Network,
  X,
  ChevronDown,
  Crown,
  Briefcase,
} from "lucide-react";
import { useEffect, useState } from "react";
import type { JSX } from "react";
import { supabase } from "../lib/supabase";

type SetorSistema = "ITS" | "INFRA" | "ADM";

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

// cargos: aceita um ou vários "cargos internos" para o mesmo nível (compatibilidade com dados antigos)
type CargoConfig = { cargos: string[]; label: string };

// Setor Sistemas (ITS) — tem NÍVEL 4
const CARGOS_ITS: CargoConfig[] = [
  { cargos: ["Suporte"], label: "NÍVEL 1" },
  { cargos: ["Analista"], label: "NÍVEL 2" },
  { cargos: ["Analista N3"], label: "NÍVEL 3" },
  // aceita "Coordenação" e também "Nivel4" (dados antigos)
  { cargos: ["Coordenação"], label: "NÍVEL 4" },
  { cargos: ["Gerente"], label: "GERENTE" },
];

// Setor Infra e Redes
const CARGOS_INFRA: CargoConfig[] = [
  { cargos: ["Suporte"], label: "NÍVEL 1" },
  { cargos: ["Analista"], label: "NÍVEL 2" },
  { cargos: ["Coordenação"], label: "NÍVEL 3" },
  { cargos: ["Gerente"], label: "GERENTE" },
];

// Setor Administrativo
const CARGOS_ADM: CargoConfig[] = [
  { cargos: ["Suporte"], label: "NÍVEL 1" },
  { cargos: ["Analista"], label: "NÍVEL 2" },
  { cargos: ["Coordenação"], label: "NÍVEL 3" },
  { cargos: ["Gerente"], label: "GERENTE" },
];

const nomeSetor = (s: SetorSistema) =>
  s === "INFRA" ? "Infra e Redes" : s === "ADM" ? "Administrativo" : "Sistemas";

const ordenarPorOrdem = <T extends { ordem?: number | null; nome?: string }>(
  lista: T[],
) =>
  [...lista].sort((a, b) => {
    const oa = a.ordem ?? 0;
    const ob = b.ordem ?? 0;
    if (oa !== ob) return oa - ob;
    return (a.nome ?? "").localeCompare(b.nome ?? "");
  });

export default function MapaVisualizacao() {
  const [unidades, setUnidades] = useState<Unidade[]>([]);
  const [pessoas, setPessoas] = useState<Pessoa[]>([]);
  const [sistemas, setSistemas] = useState<SistemaState[]>([]);

  const [sistemaExpandido, setSistemaExpandido] = useState<string | null>(null);
  const [unidadesAbertas, setUnidadesAbertas] = useState<Record<string, boolean>>({});

  const [pessoaInfoId, setPessoaInfoId] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState("");

  useEffect(() => {
    carregar();
  }, []);

  const getCargoExibicao = (p: { cargo: string; cargo_descricao?: string | null }) =>
    p.cargo_descricao?.trim() || p.cargo;

  const getPessoasUnidadeSetor = (uid: string, setor: SetorSistema) =>
    ordenarPorOrdem(
      pessoas.filter(
        (p) => p.unidade_id === uid && p.setor === setor && !p.gerente_geral,
      ),
    );

  const normalizarSetor = (s: any): SetorSistema =>
    s === "INFRA" ? "INFRA" : s === "ADM" ? "ADM" : "ITS";

  const carregar = async () => {
    try {
      setCarregando(true);
      setErro("");
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
        setor: normalizarSetor(r.setor),
      })) as Pessoa[];
      const sDb = (sRes.data ?? []).map((r: any) => ({
        ...r,
        setor: normalizarSetor(r.setor),
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

      setSistemas(
        sDb.map((s) => {
          const rels = sp.filter((r) => r.sistema_id === s.id);
          return {
            id: s.id,
            nome: s.nome,
            foto: s.foto,
            ordem: s.ordem,
            setor: s.setor,
            responsaveis: rels
              .filter((r) => r.tipo === "responsaveis")
              .map((r) => byId.get(r.pessoa_id))
              .filter(Boolean) as Pessoa[],
            infraestrutura: rels
              .filter((r) => r.tipo === "infraestrutura")
              .map((r) => byId.get(r.pessoa_id))
              .filter(Boolean) as Pessoa[],
          };
        }),
      );

      setUnidadesAbertas((prev) => {
        const c = { ...prev };
        u.forEach((x) => {
          if (c[x.id] === undefined) c[x.id] = true;
        });
        return c;
      });
    } catch (e) {
      console.error(e);
      setErro("Erro ao carregar dados.");
    } finally {
      setCarregando(false);
    }
  };

  const AvatarView = ({
    foto,
    size = "md",
    borderColor = "border-border",
  }: {
    foto: string | null;
    size?: "sm" | "md" | "lg";
    borderColor?: string;
  }) => {
    const sz = { sm: "w-8 h-8", md: "w-12 h-12", lg: "w-20 h-20" };
    const ic = { sm: "w-4 h-4", md: "w-6 h-6", lg: "w-10 h-10" };
    return (
      <div
        className={`${sz[size]} rounded-full bg-muted border-2 ${borderColor} flex items-center justify-center overflow-hidden`}
      >
        {foto ? (
          <img src={foto} alt="" className="w-full h-full object-cover" />
        ) : (
          <User className={`${ic[size]} text-muted-foreground`} />
        )}
      </div>
    );
  };

  const sistemasITS = sistemas.filter((s) => s.setor === "ITS");
  const sistemasINFRA = sistemas.filter((s) => s.setor === "INFRA");
  const gerenteGeral = pessoas.find((p) => p.gerente_geral);

  const pessoaInfo = pessoas.find((x) => x.id === pessoaInfoId) ?? null;
  const unidadeDaPessoa =
    pessoaInfo && pessoaInfo.unidade_id
      ? unidades.find((u) => u.id === pessoaInfo.unidade_id)?.nome ?? "—"
      : "—";
  const gerenteResp = pessoaInfo?.gerente_id
    ? pessoas.find((p) => p.id === pessoaInfo.gerente_id)
    : null;
  const coordResp = pessoaInfo?.coordenador_id
    ? pessoas.find((p) => p.id === pessoaInfo.coordenador_id)
    : null;

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
        {setor === "ITS" ? (
          <Server className="w-3 h-3" />
        ) : setor === "INFRA" ? (
          <Network className="w-3 h-3" />
        ) : (
          <Briefcase className="w-3 h-3" />
        )}
        {titulo}
      </div>

      <div className="space-y-5">
        {cargos.map(({ cargos: cargosNivel, label }) => {
          const lista = getPessoasUnidadeSetor(u.id, setor).filter((p) =>
            cargosNivel.includes(p.cargo),
          );
          return (
            <div key={label}>
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                {label}
              </div>
              {lista.length === 0 ? (
                <div className="text-xs text-muted-foreground italic">
                  Nenhuma pessoa cadastrada
                </div>
              ) : (
                <div className="flex flex-wrap gap-3">
                  {lista.map((p) => (
                    <div
                      key={p.id}
                      onClick={() => setPessoaInfoId(p.id)}
                      className="flex items-center gap-3 p-2 bg-secondary/50 rounded-lg cursor-pointer hover:bg-secondary/70"
                    >
                      <AvatarView
                        foto={p.foto}
                        size="md"
                        borderColor={cor.replace("bg-", "border-")}
                      />
                      <div className="min-w-0">
                        <div className="font-medium text-sm flex items-center gap-1">
                          {p.nome}
                          <Info className="w-3 h-3 opacity-50" />
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {getCargoExibicao(p)}
                        </div>
                      </div>
                    </div>
                  ))}
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-6xl mx-auto">
        {lista.length === 0 && (
          <div className="md:col-span-3 text-center text-sm text-muted-foreground py-6">
            Nenhum sistema cadastrado.
          </div>
        )}

        {lista.map((sistema) => (
          <div
            key={sistema.id}
            className="bg-card border border-border rounded-xl shadow hover:shadow-lg transition-all"
          >
            <div
              className="p-4 cursor-pointer hover:bg-secondary/30 rounded-t-xl"
              onClick={() =>
                setSistemaExpandido(sistemaExpandido === sistema.id ? null : sistema.id)
              }
            >
              <div className="flex items-center gap-3">
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
                <div className="flex-1">
                  <div className="text-sm font-medium px-2 py-1">{sistema.nome}</div>
                  <div className="text-xs text-muted-foreground px-2">
                    {sistema.responsaveis.length + sistema.infraestrutura.length} pessoa(s)
                  </div>
                </div>
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
                  <div className="text-sm font-medium text-chart-2 mb-2">Responsáveis</div>
                  {sistema.responsaveis.length === 0 ? (
                    <div className="text-xs text-muted-foreground text-center py-2">
                      Nenhum responsável
                    </div>
                  ) : (
                    sistema.responsaveis.map((p) => (
                      <div
                        key={p.id}
                        onClick={() => setPessoaInfoId(p.id)}
                        className="flex items-center gap-2 p-2 bg-secondary/50 rounded-lg mb-2 cursor-pointer hover:bg-secondary/70"
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
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-medium truncate flex items-center gap-1">
                            {p.nome}
                            <Info className="w-3 h-3 opacity-50" />
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {getCargoExibicao(p)}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <div>
                  <div className="text-sm font-medium text-chart-5 mb-2">Infraestrutura</div>
                  {sistema.infraestrutura.length === 0 ? (
                    <div className="text-xs text-muted-foreground text-center py-2">
                      Nenhum suporte de infra
                    </div>
                  ) : (
                    sistema.infraestrutura.map((p) => (
                      <div
                        key={p.id}
                        onClick={() => setPessoaInfoId(p.id)}
                        className="flex items-center gap-2 p-2 bg-secondary/50 rounded-lg mb-2 cursor-pointer hover:bg-secondary/70"
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
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-medium truncate flex items-center gap-1">
                            {p.nome}
                            <Info className="w-3 h-3 opacity-50" />
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {getCargoExibicao(p)}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="size-full bg-gradient-to-br from-background via-background to-secondary/20 overflow-auto">
      <div className="max-w-[1600px] mx-auto p-8">
        <div className="text-center mb-10 relative">
          <a
            href="/admin"
            className="absolute right-0 top-0 px-4 py-2 text-sm bg-chart-2 text-white rounded-xl hover:bg-chart-2/90 transition-colors"
          >
            Área ADM
          </a>
          <h1 className="mb-2 text-3xl font-bold">Mapa de Sistemas</h1>
          <p className="text-muted-foreground mb-4">Way Brasil</p>
          {carregando && (
            <p className="text-xs text-muted-foreground">Carregando informações...</p>
          )}
          {erro && <p className="text-xs text-destructive mt-2">{erro}</p>}
        </div>

        <div className="flex justify-center mb-10">
          <div className="w-48 h-48 rounded-full bg-gradient-to-br from-chart-1 to-chart-2 flex flex-col items-center justify-center text-white shadow-2xl">
            <Building2 className="w-16 h-16 mb-2" />
            <div className="text-xl font-bold">Way Brasil</div>
            <div className="text-sm opacity-80">Sistemas</div>
          </div>
        </div>

        <div className="mb-12">
          <div className="text-center mb-6">
            <div className="inline-flex items-center gap-2 bg-primary text-white px-6 py-2 rounded-full font-medium">
              <Crown className="w-5 h-5" />
              <span>Gerente Geral</span>
            </div>
          </div>

          <div className="flex justify-center">
            {gerenteGeral ? (
              <div
                className="bg-card border-2 border-primary/40 rounded-2xl p-5 shadow-lg min-w-[260px] flex items-center gap-4 cursor-pointer"
                onClick={() => setPessoaInfoId(gerenteGeral.id)}
              >
                <AvatarView foto={gerenteGeral.foto} size="lg" borderColor="border-primary" />
                <div>
                  <div className="font-bold flex items-center gap-1">
                    {gerenteGeral.nome}
                    <Info className="w-3 h-3 opacity-50" />
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {getCargoExibicao(gerenteGeral)}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {nomeSetor(gerenteGeral.setor)}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">
                Nenhum gerente geral cadastrado.
              </div>
            )}
          </div>
        </div>

        <div className="mb-16">
          <h2 className="text-lg font-bold mb-6">Matriz de responsabilidade Unidades</h2>
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
                    <div className="font-bold text-base">{u.nome}</div>
                  </div>

                  {aberto && (
                    <div className="p-5 grid grid-cols-1 lg:grid-cols-3 gap-5">
                      {renderSetor(u, "ITS", "Setor Sistemas", CARGOS_ITS, "bg-chart-2")}
                      {renderSetor(u, "INFRA", "Setor Infra e Redes", CARGOS_INFRA, "bg-chart-5")}
                      {renderSetor(u, "ADM", "Setor Administrativo", CARGOS_ADM, "bg-chart-3")}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {renderSistemasBloco(
          "Sistemas Gerenciados — ITS",
          <Server className="w-5 h-5" />,
          sistemasITS,
          "bg-chart-4",
        )}
        {renderSistemasBloco(
          "Sistemas Gerenciados — Infra e Redes",
          <Network className="w-5 h-5" />,
          sistemasINFRA,
          "bg-chart-5",
        )}
      </div>

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
              <div className="w-20 h-20 rounded-full bg-muted border-2 border-primary flex items-center justify-center overflow-hidden">
                {pessoaInfo.foto ? (
                  <img
                    src={pessoaInfo.foto}
                    alt={pessoaInfo.nome}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User className="w-10 h-10 text-muted-foreground" />
                )}
              </div>
              <div className="text-center">
                <div className="font-bold text-lg">{pessoaInfo.nome}</div>
                <div className="text-sm text-muted-foreground">
                  {pessoaInfo.cargo_descricao?.trim() || pessoaInfo.cargo}
                </div>
              </div>

              <div className="w-full border-t border-border mt-2 pt-4 text-sm space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Unidade</span>
                  <span className="font-medium">{unidadeDaPessoa}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Setor</span>
                  <span className="font-medium">{nomeSetor(pessoaInfo.setor)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Cargo</span>
                  <span className="font-medium">
                    {pessoaInfo.cargo_descricao?.trim() || pessoaInfo.cargo}
                  </span>
                </div>
                <div>
                  <div className="text-muted-foreground mb-1">Descrição</div>
                  <div className="font-medium whitespace-pre-wrap">
                    {pessoaInfo.descricao?.trim() || "—"}
                  </div>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Gerente</span>
                  <span className="font-medium">{gerenteResp?.nome ?? "Não definido"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Coordenador</span>
                  <span className="font-medium">{coordResp?.nome ?? "Não definido"}</span>
                </div>
              </div>
            </div>

            <div className="px-5 py-3 border-t border-border bg-secondary/20">
              <button
                onClick={() => setPessoaInfoId(null)}
                className="w-full text-sm py-2 bg-chart-2 text-white rounded-lg hover:bg-chart-2/80 transition-colors font-medium"
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
