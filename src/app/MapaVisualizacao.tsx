import { User, Building2, Server } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

type Pessoa = {
  id: string;
  nome: string;
  cargo: string;
  cargo_descricao?: string | null;
  foto: string | null;
  grupo_id?: string | null;
  ordem?: number | null;
};

type PessoaSistema = {
  id: string;
  nome: string;
  foto: string | null;
  cargo: string;
  cargo_descricao?: string | null;
};

type CoordenacaoState = {
  id: string;
  nome: string;
  cargo: string;
  empresas: string[];
  foto: string | null;
};

type GrupoSuporteState = {
  id: string;
  grupo: string;
  empresas: string[];
  pessoas: Pessoa[];
  ordem?: number | null;
};

type SistemaState = {
  id: string;
  nome: string;
  foto: string | null;
  responsaveis: PessoaSistema[];
  infraestrutura: PessoaSistema[];
  ordem?: number | null;
};

type GrupoDb = {
  id: string;
  nome: string;
  ordem: number | null;
};

type GrupoEmpresaDb = {
  id: string;
  grupo_id: string;
  empresa: string;
  ordem: number | null;
};

type PessoaEmpresaDb = {
  id: string;
  pessoa_id: string;
  empresa: string;
  ordem: number | null;
};

type SistemaPessoaDb = {
  id: string;
  sistema_id: string;
  pessoa_id: string;
  tipo: "responsaveis" | "infraestrutura";
};

const ordenarPorOrdem = <T extends { ordem?: number | null; nome?: string }>(
  lista: T[],
) => {
  return [...lista].sort((a, b) => {
    const ordemA = a.ordem ?? 0;
    const ordemB = b.ordem ?? 0;
    if (ordemA !== ordemB) return ordemA - ordemB;
    return (a.nome ?? "").localeCompare(b.nome ?? "");
  });
};

export default function MapaVisualizacao() {
  const [coordenacao, setCoordenacao] = useState<CoordenacaoState>({
    id: "",
    nome: "",
    cargo: "",
    empresas: [],
    foto: null,
  });

  const [analistas, setAnalistas] = useState<Pessoa[]>([]);
  const [suporteGrupos, setSuporteGrupos] = useState<GrupoSuporteState[]>([]);
  const [sistemas, setSistemas] = useState<SistemaState[]>([]);
  const [equipeInfra, setEquipeInfra] = useState<Pessoa[]>([]);

  const [sistemaExpandido, setSistemaExpandido] = useState<number | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState("");

  useEffect(() => {
    carregarDados();
  }, []);

  const mostrarErro = (error: unknown, contexto = "operação") => {
    console.error(`Erro em ${contexto}:`, error);
    setErro(`Erro em ${contexto}. Veja o console.`);
  };

  const getCargoExibicao = (pessoa: {
    cargo: string;
    cargo_descricao?: string | null;
  }) => {
    if (pessoa.cargo === "Infraestrutura") {
      return pessoa.cargo_descricao?.trim() || "Infraestrutura";
    }
    return pessoa.cargo;
  };

  const carregarDados = async () => {
    try {
      setCarregando(true);
      setErro("");

      const [
        pessoasRes,
        gruposRes,
        grupoEmpresasRes,
        pessoaEmpresasRes,
        sistemasRes,
        sistemaPessoasRes,
      ] = await Promise.all([
        supabase.from("pessoas").select("*").order("ordem", { ascending: true }),
        supabase
          .from("grupos_suporte")
          .select("*")
          .order("ordem", { ascending: true }),
        supabase
          .from("grupo_empresas")
          .select("*")
          .order("ordem", { ascending: true }),
        supabase
          .from("pessoa_empresas")
          .select("*")
          .order("ordem", { ascending: true }),
        supabase.from("sistemas").select("*").order("ordem", { ascending: true }),
        supabase.from("sistema_pessoas").select("*"),
      ]);

      if (pessoasRes.error) throw pessoasRes.error;
      if (gruposRes.error) throw gruposRes.error;
      if (grupoEmpresasRes.error) throw grupoEmpresasRes.error;
      if (pessoaEmpresasRes.error) throw pessoaEmpresasRes.error;
      if (sistemasRes.error) throw sistemasRes.error;
      if (sistemaPessoasRes.error) throw sistemaPessoasRes.error;

      const pessoas = (pessoasRes.data ?? []) as Pessoa[];
      const grupos = (gruposRes.data ?? []) as GrupoDb[];
      const grupoEmpresas = (grupoEmpresasRes.data ?? []) as GrupoEmpresaDb[];
      const pessoaEmpresas = (pessoaEmpresasRes.data ?? []) as PessoaEmpresaDb[];
      const sistemasDb = (sistemasRes.data ?? []) as Array<{
        id: string;
        nome: string;
        foto: string | null;
        ordem: number | null;
      }>;
      const sistemaPessoas = (sistemaPessoasRes.data ?? []) as SistemaPessoaDb[];

      const coordenacaoDb = pessoas.find((p) => p.cargo === "Coordenação");

      if (coordenacaoDb) {
        setCoordenacao({
          id: coordenacaoDb.id,
          nome: coordenacaoDb.nome,
          cargo: coordenacaoDb.cargo,
          foto: coordenacaoDb.foto,
          empresas: pessoaEmpresas
            .filter((e) => e.pessoa_id === coordenacaoDb.id)
            .sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0))
            .map((e) => e.empresa),
        });
      } else {
        setCoordenacao({
          id: "",
          nome: "",
          cargo: "",
          empresas: [],
          foto: null,
        });
      }

      setAnalistas(ordenarPorOrdem(pessoas.filter((p) => p.cargo === "Analista")));
      setEquipeInfra(
        ordenarPorOrdem(pessoas.filter((p) => p.cargo === "Infraestrutura")),
      );

      const suportePessoas = ordenarPorOrdem(
        pessoas.filter((p) => p.cargo === "Suporte"),
      );

      const suporteGruposMontados: GrupoSuporteState[] = grupos.map((grupo) => ({
        id: grupo.id,
        grupo: grupo.nome,
        ordem: grupo.ordem,
        empresas: grupoEmpresas
          .filter((e) => e.grupo_id === grupo.id)
          .sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0))
          .map((e) => e.empresa),
        pessoas: ordenarPorOrdem(
          suportePessoas.filter((p) => p.grupo_id === grupo.id),
        ),
      }));

      setSuporteGrupos(suporteGruposMontados);

      const pessoasById = new Map<string, Pessoa>();
      pessoas.forEach((p) => pessoasById.set(p.id, p));

      const sistemasMontados: SistemaState[] = sistemasDb.map((sistema) => {
        const rels = sistemaPessoas.filter((sp) => sp.sistema_id === sistema.id);

        const responsaveis = rels
          .filter((sp) => sp.tipo === "responsaveis")
          .map((sp) => pessoasById.get(sp.pessoa_id))
          .filter(Boolean)
          .map((p) => ({
            id: (p as Pessoa).id,
            nome: (p as Pessoa).nome,
            cargo: (p as Pessoa).cargo,
            cargo_descricao: (p as Pessoa).cargo_descricao,
            foto: (p as Pessoa).foto,
          }));

        const infraestrutura = rels
          .filter((sp) => sp.tipo === "infraestrutura")
          .map((sp) => pessoasById.get(sp.pessoa_id))
          .filter(Boolean)
          .map((p) => ({
            id: (p as Pessoa).id,
            nome: (p as Pessoa).nome,
            cargo: (p as Pessoa).cargo,
            cargo_descricao: (p as Pessoa).cargo_descricao,
            foto: (p as Pessoa).foto,
          }));

        return {
          id: sistema.id,
          nome: sistema.nome,
          foto: sistema.foto,
          ordem: sistema.ordem,
          responsaveis,
          infraestrutura,
        };
      });

      setSistemas(sistemasMontados);
    } catch (error) {
      mostrarErro(error, "carregarDados");
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
    const sizes = {
      sm: "w-8 h-8",
      md: "w-12 h-12",
      lg: "w-20 h-20",
    };

    const iconSizes = {
      sm: "w-4 h-4",
      md: "w-6 h-6",
      lg: "w-10 h-10",
    };

    return (
      <div className="relative group flex-shrink-0">
        <div
          className={`${sizes[size]} rounded-full bg-muted border-2 ${borderColor} flex items-center justify-center overflow-hidden`}
        >
          {foto ? (
            <img src={foto} alt="" className="w-full h-full object-cover" />
          ) : (
            <User className={`${iconSizes[size]} text-muted-foreground`} />
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="size-full bg-gradient-to-br from-background via-background to-secondary/20 overflow-auto">
      <div className="max-w-[1600px] mx-auto p-8">
        <div className="text-center mb-16 relative pt-14 sm:pt-0">
  <a
    href="/admin"
    className="absolute left-1/2 -translate-x-1/2 top-0 sm:left-auto sm:translate-x-0 sm:right-0 sm:top-0 px-4 py-2 text-sm bg-chart-2 text-white rounded-xl hover:bg-chart-2/90 transition-colors"
  >
    Área ADM
  </a>

  <h1 className="mb-2 text-3xl font-bold">Mapa de Sistemas</h1>
  <p className="text-muted-foreground mb-4">Way Brasil</p>


          {carregando && (
            <p className="text-xs text-muted-foreground">
              Carregando informações...
            </p>
          )}

          {erro && (
            <p className="text-xs text-destructive mt-2">
              {erro}
            </p>
          )}
        </div>

        <div className="relative mb-20">
          <div className="flex justify-center mb-8">
            <div className="relative">
              <div className="w-48 h-48 rounded-full bg-gradient-to-br from-chart-1 to-chart-2 flex flex-col items-center justify-center text-white shadow-2xl">
                <Building2 className="w-16 h-16 mb-2" />
                <div className="text-xl font-bold">Way Brasil</div>
                <div className="text-sm opacity-80">Sistemas</div>
              </div>
              <svg
                className="absolute inset-0 w-full h-full pointer-events-none"
                style={{ overflow: "visible" }}
              >
                <line
                  x1="96"
                  y1="192"
                  x2="96"
                  y2="280"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="text-border"
                  strokeDasharray="4 4"
                />
              </svg>
            </div>
          </div>

          {/* Nível 1 - Suporte */}
          <div className="mb-12">
            <div className="text-center mb-6">
              <span className="bg-chart-3 text-white px-4 py-1.5 rounded-full text-sm font-medium">
                Nível 1 - Suporte
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto mb-8">
              {suporteGrupos.length === 0 ? (
                <div className="md:col-span-3 text-center text-sm text-muted-foreground py-8">
                  Nenhum grupo de suporte cadastrado.
                </div>
              ) : (
                suporteGrupos.map((grupo, gIdx) => (
                  <div
                    key={grupo.id || gIdx}
                    className="bg-card border-2 border-chart-3 rounded-xl p-5 shadow-lg"
                  >
                    <div className="text-center mb-4">
                      <div className="font-medium text-chart-3 mb-2">
                        {grupo.grupo}
                      </div>

                      <div className="flex gap-1.5 flex-wrap justify-center mb-3">
                        {grupo.empresas.map((empresa, eIdx) => (
                          <span
                            key={eIdx}
                            className="text-xs px-2 py-0.5 bg-chart-3/10 text-chart-3 rounded border border-chart-3/20"
                          >
                            {empresa}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="flex flex-col gap-3">
                      {grupo.pessoas.length === 0 ? (
                        <div className="text-xs text-muted-foreground text-center py-2">
                          Nenhuma pessoa cadastrada
                        </div>
                      ) : (
                        grupo.pessoas.map((pessoa, pIdx) => (
                          <div
                            key={pessoa.id || pIdx}
                            className="flex items-center gap-3 p-2 bg-secondary/50 rounded-lg"
                          >
                            <AvatarView
                              foto={pessoa.foto}
                              size="md"
                              borderColor="border-chart-3"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-sm">
                                <span className="truncate">{pessoa.nome}</span>
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {pessoa.cargo}
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="flex justify-center">
              <svg width="2" height="40">
                <line
                  x1="1"
                  y1="0"
                  x2="1"
                  y2="40"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="text-border"
                  strokeDasharray="4 4"
                />
              </svg>
            </div>
          </div>

          {/* Nível 2 - Analistas */}
          <div className="flex justify-center mb-12">
            <div className="relative bg-card border-2 border-chart-2 rounded-2xl p-6 shadow-lg max-w-4xl w-full">
              <div className="absolute -top-3 left-6 bg-chart-2 text-white px-3 py-1 rounded-full text-sm font-medium">
                Nível 2 - Analistas
              </div>

              <div className="flex gap-6 justify-center mt-2 flex-wrap items-start">
                {analistas.length === 0 ? (
                  <div className="text-sm text-muted-foreground py-6">
                    Nenhum analista cadastrado.
                  </div>
                ) : (
                  analistas.map((analista, idx) => (
                    <div
                      key={analista.id || idx}
                      className="flex flex-col items-center gap-2 relative"
                    >
                      <AvatarView
                        foto={analista.foto}
                        size="lg"
                        borderColor="border-chart-2"
                      />
                      <div className="text-center">
                        <div className="font-medium">
                          {analista.nome}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {analista.cargo}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <svg
                className="absolute left-1/2 top-full pointer-events-none"
                width="2"
                height="40"
              >
                <line
                  x1="1"
                  y1="0"
                  x2="1"
                  y2="40"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="text-border"
                  strokeDasharray="4 4"
                />
              </svg>
            </div>
          </div>

          {/* Nível 3 - Coordenação */}
          <div className="flex justify-center mb-16">
            <div className="relative bg-card border-2 border-chart-1 rounded-2xl p-6 shadow-lg w-80">
              <div className="absolute -top-3 left-6 bg-chart-1 text-white px-3 py-1 rounded-full text-sm font-medium">
                Nível 3 - Coordenação
              </div>

              <div className="flex flex-col items-center gap-4 mt-2">
                <AvatarView
                  foto={coordenacao.foto}
                  size="lg"
                  borderColor="border-chart-1"
                />

                <div className="text-center w-full">
                  <div className="font-medium">
                    {coordenacao.nome || "Sem coordenação cadastrada"}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {coordenacao.cargo}
                  </div>
                </div>

                <div className="flex gap-2 flex-wrap justify-center">
                  {coordenacao.empresas.map((empresa, idx) => (
                    <span
                      key={idx}
                      className="text-xs px-2 py-1 bg-chart-1/10 text-chart-1 rounded-md border border-chart-1/20"
                    >
                      {empresa}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sistemas */}
        <div className="mb-16">
          <div className="text-center mb-6">
            <div className="inline-flex items-center gap-2 bg-chart-4 text-white px-6 py-2 rounded-full font-medium">
              <Server className="w-5 h-5" />
              <span>Sistemas Gerenciados</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-6xl mx-auto">
            {sistemas.length === 0 ? (
              <div className="lg:col-span-3 text-center text-sm text-muted-foreground py-8">
                Nenhum sistema cadastrado.
              </div>
            ) : (
              sistemas.map((sistema, idx) => (
                <div
                  key={sistema.id || idx}
                  className="bg-card border border-border rounded-xl shadow hover:shadow-lg transition-all"
                >
                  <div
                    className="group relative p-4 cursor-pointer hover:bg-secondary/30 rounded-t-xl"
                    onClick={() =>
                      setSistemaExpandido(sistemaExpandido === idx ? null : idx)
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
                      </div>

                      <div className="flex-1">
                        <div className="text-sm font-medium px-2 py-1">
                          {sistema.nome}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1 px-2">
                          {sistema.responsaveis.length +
                            sistema.infraestrutura.length}{" "}
                          pessoa(s)
                        </div>
                      </div>

                      <div
                        className={`transition-transform ${
                          sistemaExpandido === idx ? "rotate-180" : ""
                        }`}
                      >
                        <svg
                          className="w-5 h-5 text-muted-foreground"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 9l-7 7-7-7"
                          />
                        </svg>
                      </div>
                    </div>
                  </div>

                  {sistemaExpandido === idx && (
                    <div className="border-t border-border p-4 space-y-4">
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <div className="text-sm font-medium text-chart-2">
                            Responsáveis
                          </div>
                        </div>

                        <div className="space-y-2">
                          {sistema.responsaveis.length === 0 ? (
                            <div className="text-xs text-muted-foreground text-center py-2">
                              Nenhum responsável
                            </div>
                          ) : (
                            sistema.responsaveis.map((pessoa, pIdx) => (
                              <div
                                key={pessoa.id || pIdx}
                                className="flex items-center gap-2 p-2 bg-secondary/50 rounded-lg"
                              >
                                <div className="w-8 h-8 rounded-full bg-muted border border-chart-2 flex items-center justify-center overflow-hidden flex-shrink-0">
                                  {pessoa.foto ? (
                                    <img
                                      src={pessoa.foto}
                                      alt={pessoa.nome}
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    <User className="w-4 h-4 text-muted-foreground" />
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="text-xs font-medium truncate">
                                    {pessoa.nome}
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    {getCargoExibicao(pessoa)}
                                  </div>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <div className="text-sm font-medium text-chart-5">
                            Infraestrutura
                          </div>
                        </div>

                        <div className="space-y-2">
                          {sistema.infraestrutura.length === 0 ? (
                            <div className="text-xs text-muted-foreground text-center py-2">
                              Nenhum suporte de infra
                            </div>
                          ) : (
                            sistema.infraestrutura.map((pessoa, pIdx) => (
                              <div
                                key={pessoa.id || pIdx}
                                className="flex items-center gap-2 p-2 bg-secondary/50 rounded-lg"
                              >
                                <div className="w-8 h-8 rounded-full bg-muted border border-chart-5 flex items-center justify-center overflow-hidden flex-shrink-0">
                                  {pessoa.foto ? (
                                    <img
                                      src={pessoa.foto}
                                      alt={pessoa.nome}
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    <User className="w-4 h-4 text-muted-foreground" />
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="text-xs font-medium truncate">
                                    {pessoa.nome}
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    {getCargoExibicao(pessoa)}
                                  </div>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Equipe de Infraestrutura */}
        <div className="mb-12 mt-12">
          <div className="text-center mb-6">
            <div className="inline-flex items-center gap-2 bg-chart-5 text-white px-6 py-2 rounded-full font-medium">
              <User className="w-5 h-5" />
              <span>Equipe de Infraestrutura</span>
            </div>
          </div>

          <div className="flex justify-center">
            <div className="relative bg-card border-2 border-chart-5 rounded-2xl p-6 shadow-lg max-w-4xl w-full">
              <div className="absolute -top-3 left-6 bg-chart-5 text-white px-3 py-1 rounded-full text-sm font-medium">
                Infraestrutura
              </div>

              <div className="flex gap-6 justify-center mt-2 flex-wrap items-start">
                {equipeInfra.length === 0 ? (
                  <div className="text-sm text-muted-foreground py-6">
                    Nenhuma pessoa de infraestrutura cadastrada.
                  </div>
                ) : (
                  equipeInfra.map((infra, idx) => (
                    <div
                      key={infra.id || idx}
                      className="flex flex-col items-center gap-2 relative"
                    >
                      <AvatarView
                        foto={infra.foto}
                        size="lg"
                        borderColor="border-chart-5"
                      />
                      <div className="text-center">
                        <div className="font-medium">
                          {infra.nome}
                        </div>
                        <div className="text-xs text-muted-foreground italic">
                          {getCargoExibicao(infra)}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
