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
} from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import Login from "./components/Login";

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

const COORDENACAO_INICIAL = {
  nome: "Emerson",
  cargo: "Coordenação",
  empresas: ["Way 153", "Way 262", "Way CSC"],
  foto: null as string | null,
};

const ANALISTAS_INICIAIS = [
  { nome: "Raphaela", cargo: "Analista", foto: null as string | null },
  { nome: "Gustavo", cargo: "Analista", foto: null as string | null },
  { nome: "Julia", cargo: "Analista", foto: null as string | null },
];

const SUPORTE_GRUPOS_INICIAIS = [
  {
    grupo: "Grupo 1",
    empresas: ["Way 153", "Way 262", "Way CSC"],
    pessoas: [
      { nome: "Thacielli", cargo: "Suporte", foto: null as string | null },
      { nome: "João", cargo: "Suporte", foto: null as string | null },
    ],
  },
  {
    grupo: "Grupo 2",
    empresas: ["Way 364"],
    pessoas: [
      { nome: "A contratar", cargo: "Suporte", foto: null as string | null },
    ],
  },
  {
    grupo: "Grupo 3",
    empresas: ["Way 306", "Way 112"],
    pessoas: [
      { nome: "Jorge", cargo: "Suporte", foto: null as string | null },
      { nome: "A contratar", cargo: "Suporte", foto: null as string | null },
    ],
  },
];

const SISTEMAS_INICIAIS = [
  "TOTVS",
  "KRIA",
  "TECSIDEL",
  "PAPERSIGN",
  "PORTAIS",
  "PULSOS",
  "GLPI",
  "SISTEMAS SAT",
  "WAVE PTX",
  "SIRIEF",
  "SIGACO",
  "SIR",
  "SIG",
  "REGULATORIO",
  "BLIPCHATBOOT",
  "GUPY",
  "INTRANET",
];

const INFRA_INICIAL = [
  { nome: "Carlos", cargo: "Infraestrutura", foto: null as string | null },
  { nome: "Ana", cargo: "Infraestrutura", foto: null as string | null },
];

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

export default function App() {
  const [coordenacao, setCoordenacao] = useState<CoordenacaoState>({
    id: "",
    nome: COORDENACAO_INICIAL.nome,
    cargo: COORDENACAO_INICIAL.cargo,
    empresas: COORDENACAO_INICIAL.empresas,
    foto: COORDENACAO_INICIAL.foto,
  });

  const [analistas, setAnalistas] = useState<Pessoa[]>(
    ANALISTAS_INICIAIS.map((a, idx) => ({
      id: `analista-local-${idx}`,
      nome: a.nome,
      cargo: a.cargo,
      foto: a.foto,
      ordem: idx + 1,
    })),
  );

  const [suporteGrupos, setSuporteGrupos] = useState<GrupoSuporteState[]>(
    SUPORTE_GRUPOS_INICIAIS.map((g, gIdx) => ({
      id: `grupo-local-${gIdx}`,
      grupo: g.grupo,
      empresas: g.empresas,
      ordem: gIdx + 1,
      pessoas: g.pessoas.map((p, pIdx) => ({
        id: `suporte-local-${gIdx}-${pIdx}`,
        nome: p.nome,
        cargo: p.cargo,
        foto: p.foto,
        ordem: pIdx + 1,
      })),
    })),
  );

  const [sistemas, setSistemas] = useState<SistemaState[]>(
    SISTEMAS_INICIAIS.map((nome, idx) => ({
      id: `sistema-local-${idx}`,
      nome,
      foto: null,
      responsaveis: [],
      infraestrutura: [],
      ordem: idx + 1,
    })),
  );

  const [equipeInfra, setEquipeInfra] = useState<Pessoa[]>(
    INFRA_INICIAL.map((i, idx) => ({
      id: `infra-local-${idx}`,
      nome: i.nome,
      cargo: i.cargo,
      cargo_descricao: i.cargo,
      foto: i.foto,
      ordem: idx + 1,
    })),
  );

  const [sistemaExpandido, setSistemaExpandido] = useState<number | null>(null);
  const [editandoNome, setEditandoNome] = useState<string | null>(null);
  const [valorTemp, setValorTemp] = useState("");

  const [modalAberto, setModalAberto] = useState(false);
  const [modalConfig, setModalConfig] = useState<{
    sistemaIdx: number;
    tipo: "responsaveis" | "infraestrutura";
  } | null>(null);

  const [carregando, setCarregando] = useState(false);

  const [autenticado, setAutenticado] = useState(false);
  const [verificandoAuth, setVerificandoAuth] = useState(true);

  useEffect(() => {
    const auth = localStorage.getItem("way_auth");
    if (auth === "true") {
      setAutenticado(true);
    }
    setVerificandoAuth(false);
  }, []);

  useEffect(() => {
    if (autenticado) {
      carregarDados();
    }
  }, [autenticado]);

  const mostrarErro = (error: unknown, contexto = "operação") => {
    console.error(`Erro em ${contexto}:`, error);
    alert(`Erro em ${contexto}. Veja o console.`);
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

  const sair = () => {
    localStorage.removeItem("way_auth");
    setAutenticado(false);
  };

  const testar = async () => {
    const { data, error } = await supabase.from("pessoas").select("*");
    console.log(data, error);
  };

  const popularBancoInicial = async () => {
    const { error: gruposError } = await supabase.from("grupos_suporte").insert(
      SUPORTE_GRUPOS_INICIAIS.map((g, idx) => ({
        nome: g.grupo,
        ordem: idx + 1,
      })),
    );
    if (gruposError) throw gruposError;

    const { data: gruposCriados, error: gruposCriadosError } = await supabase
      .from("grupos_suporte")
      .select("*")
      .order("ordem", { ascending: true });

    if (gruposCriadosError) throw gruposCriadosError;

    const grupoMap = new Map<string, string>();
    (gruposCriados as GrupoDb[]).forEach((g) => grupoMap.set(g.nome, g.id));

    const empresasGrupoPayload = SUPORTE_GRUPOS_INICIAIS.flatMap((g) =>
      g.empresas.map((empresa, idx) => ({
        grupo_id: grupoMap.get(g.grupo)!,
        empresa,
        ordem: idx + 1,
      })),
    );

    if (empresasGrupoPayload.length > 0) {
      const { error } = await supabase
        .from("grupo_empresas")
        .insert(empresasGrupoPayload);
      if (error) throw error;
    }

    const { data: coordInserida, error: coordError } = await supabase
      .from("pessoas")
      .insert({
        nome: COORDENACAO_INICIAL.nome,
        cargo: COORDENACAO_INICIAL.cargo,
        foto: COORDENACAO_INICIAL.foto,
        ordem: 1,
      })
      .select()
      .single();

    if (coordError) throw coordError;

    if (coordInserida?.id) {
      const { error: pessoaEmpresasError } = await supabase
        .from("pessoa_empresas")
        .insert(
          COORDENACAO_INICIAL.empresas.map((empresa, idx) => ({
            pessoa_id: coordInserida.id,
            empresa,
            ordem: idx + 1,
          })),
        );

      if (pessoaEmpresasError) throw pessoaEmpresasError;
    }

    const { error: analistasError } = await supabase.from("pessoas").insert(
      ANALISTAS_INICIAIS.map((a, idx) => ({
        nome: a.nome,
        cargo: a.cargo,
        foto: a.foto,
        ordem: idx + 1,
      })),
    );
    if (analistasError) throw analistasError;

    const { error: infraError } = await supabase.from("pessoas").insert(
      INFRA_INICIAL.map((i, idx) => ({
        nome: i.nome,
        cargo: i.cargo,
        cargo_descricao: i.cargo,
        foto: i.foto,
        ordem: idx + 1,
      })),
    );
    if (infraError) throw infraError;

    const suportePayload = SUPORTE_GRUPOS_INICIAIS.flatMap((g) =>
      g.pessoas.map((p, idx) => ({
        nome: p.nome,
        cargo: p.cargo,
        foto: p.foto,
        grupo_id: grupoMap.get(g.grupo)!,
        ordem: idx + 1,
      })),
    );

    if (suportePayload.length > 0) {
      const { error: suporteError } = await supabase
        .from("pessoas")
        .insert(suportePayload);
      if (suporteError) throw suporteError;
    }

    const { error: sistemasError } = await supabase.from("sistemas").insert(
      SISTEMAS_INICIAIS.map((nome, idx) => ({
        nome,
        foto: null,
        ordem: idx + 1,
      })),
    );
    if (sistemasError) throw sistemasError;
  };

  const carregarDados = async () => {
    try {
      setCarregando(true);

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

      if (pessoas.length === 0 && grupos.length === 0 && sistemasDb.length === 0) {
        await popularBancoInicial();
        await carregarDados();
        return;
      }

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

      await testar();
    } catch (error) {
      mostrarErro(error, "carregarDados");
    } finally {
      setCarregando(false);
    }
  };

  const atualizarPessoa = async (
    pessoaId: string,
    payload: Partial<Pessoa>,
    contexto = "atualizarPessoa",
  ) => {
    const { error } = await supabase
      .from("pessoas")
      .update(payload)
      .eq("id", pessoaId);

    if (error) throw new Error(`${contexto}: ${error.message}`);
  };

  const atualizarSistema = async (
    sistemaId: string,
    payload: Partial<SistemaState>,
    contexto = "atualizarSistema",
  ) => {
    const { error } = await supabase
      .from("sistemas")
      .update(payload)
      .eq("id", sistemaId);

    if (error) throw new Error(`${contexto}: ${error.message}`);
  };

  const excluirPessoa = async (pessoaId: string, contexto = "excluirPessoa") => {
    const { error } = await supabase.from("pessoas").delete().eq("id", pessoaId);
    if (error) throw new Error(`${contexto}: ${error.message}`);
  };

  const adicionarAnalista = async () => {
    try {
      const proximaOrdem =
        analistas.length > 0
          ? Math.max(...analistas.map((a) => a.ordem ?? 0)) + 1
          : 1;

      const { error } = await supabase.from("pessoas").insert({
        nome: "Novo Analista",
        cargo: "Analista",
        foto: null,
        ordem: proximaOrdem,
      });

      if (error) throw error;
      await carregarDados();
    } catch (error) {
      mostrarErro(error, "adicionarAnalista");
    }
  };

  const removerAnalista = async (idx: number) => {
    try {
      const pessoa = analistas[idx];
      if (!pessoa?.id) return;
      await excluirPessoa(pessoa.id, "removerAnalista");
      await carregarDados();
    } catch (error) {
      mostrarErro(error, "removerAnalista");
    }
  };

  const adicionarInfra = async () => {
    try {
      const proximaOrdem =
        equipeInfra.length > 0
          ? Math.max(...equipeInfra.map((i) => i.ordem ?? 0)) + 1
          : 1;

      const { error } = await supabase.from("pessoas").insert({
        nome: "Nova Infra",
        cargo: "Infraestrutura",
        cargo_descricao: "Infraestrutura",
        foto: null,
        ordem: proximaOrdem,
      });

      if (error) throw error;
      await carregarDados();
    } catch (error) {
      mostrarErro(error, "adicionarInfra");
    }
  };

  const removerInfra = async (idx: number) => {
    try {
      const pessoa = equipeInfra[idx];
      if (!pessoa?.id) return;
      await excluirPessoa(pessoa.id, "removerInfra");
      await carregarDados();
    } catch (error) {
      mostrarErro(error, "removerInfra");
    }
  };

  const adicionarPessoaGrupo = async (gIdx: number) => {
    try {
      const grupo = suporteGrupos[gIdx];
      if (!grupo?.id) return;

      const proximaOrdem =
        grupo.pessoas.length > 0
          ? Math.max(...grupo.pessoas.map((p) => p.ordem ?? 0)) + 1
          : 1;

      const { error } = await supabase.from("pessoas").insert({
        nome: "Nova Pessoa",
        cargo: "Suporte",
        foto: null,
        grupo_id: grupo.id,
        ordem: proximaOrdem,
      });

      if (error) throw error;
      await carregarDados();
    } catch (error) {
      mostrarErro(error, "adicionarPessoaGrupo");
    }
  };

  const removerPessoaGrupo = async (gIdx: number, pIdx: number) => {
    try {
      const pessoa = suporteGrupos[gIdx]?.pessoas[pIdx];
      if (!pessoa?.id) return;
      await excluirPessoa(pessoa.id, "removerPessoaGrupo");
      await carregarDados();
    } catch (error) {
      mostrarErro(error, "removerPessoaGrupo");
    }
  };

  const removerPessoaSistema = async (
    sistemaIdx: number,
    pessoaIdx: number,
    tipo: "responsaveis" | "infraestrutura",
  ) => {
    try {
      const sistema = sistemas[sistemaIdx];
      const pessoa = sistema?.[tipo]?.[pessoaIdx];
      if (!sistema?.id || !pessoa?.id) return;

      const { error } = await supabase
        .from("sistema_pessoas")
        .delete()
        .eq("sistema_id", sistema.id)
        .eq("pessoa_id", pessoa.id)
        .eq("tipo", tipo);

      if (error) throw error;
      await carregarDados();
    } catch (error) {
      mostrarErro(error, "removerPessoaSistema");
    }
  };

  const todasPessoas = (): PessoaSistema[] => {
    const pessoas: PessoaSistema[] = [];

    if (coordenacao.id) {
      pessoas.push({
        id: coordenacao.id,
        nome: coordenacao.nome,
        cargo: coordenacao.cargo,
        foto: coordenacao.foto,
      });
    }

    analistas.forEach((a) =>
      pessoas.push({
        id: a.id,
        nome: a.nome,
        cargo: a.cargo,
        cargo_descricao: a.cargo_descricao,
        foto: a.foto,
      }),
    );

    suporteGrupos.forEach((g) =>
      g.pessoas.forEach((p) =>
        pessoas.push({
          id: p.id,
          nome: p.nome,
          cargo: p.cargo,
          cargo_descricao: p.cargo_descricao,
          foto: p.foto,
        }),
      ),
    );

    equipeInfra.forEach((i) =>
      pessoas.push({
        id: i.id,
        nome: i.nome,
        cargo: i.cargo,
        cargo_descricao: i.cargo_descricao,
        foto: i.foto,
      }),
    );

    return pessoas;
  };

  const abrirModal = (
    sistemaIdx: number,
    tipo: "responsaveis" | "infraestrutura",
  ) => {
    setModalConfig({ sistemaIdx, tipo });
    setModalAberto(true);
  };

  const fecharModal = () => {
    setModalAberto(false);
    setModalConfig(null);
  };

  const isPessoaSelecionada = (pessoa: PessoaSistema) => {
    if (!modalConfig) return false;
    return sistemas[modalConfig.sistemaIdx][modalConfig.tipo].some(
      (p) => p.id === pessoa.id,
    );
  };

  const togglePessoa = async (pessoa: PessoaSistema) => {
    try {
      if (!modalConfig) return;

      const { sistemaIdx, tipo } = modalConfig;
      const sistema = sistemas[sistemaIdx];
      if (!sistema?.id) return;

      const idx = sistema[tipo].findIndex((p) => p.id === pessoa.id);

      if (idx >= 0) {
        const { error } = await supabase
          .from("sistema_pessoas")
          .delete()
          .eq("sistema_id", sistema.id)
          .eq("pessoa_id", pessoa.id)
          .eq("tipo", tipo);

        if (error) throw error;
      } else {
        const { error } = await supabase.from("sistema_pessoas").insert({
          sistema_id: sistema.id,
          pessoa_id: pessoa.id,
          tipo,
        });

        if (error) throw error;
      }

      await carregarDados();
    } catch (error) {
      mostrarErro(error, "togglePessoa");
    }
  };

  const handleImageUpload = (
    file: File,
    callback: (url: string) => void | Promise<void>,
  ) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      if (e.target?.result) {
        await callback(e.target.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  const iniciarEdicao = (id: string, valorAtual: string) => {
    setEditandoNome(id);
    setValorTemp(valorAtual);
  };

  const salvarEdicao = async (tipo: string, ...indices: number[]) => {
    try {
      const valor = valorTemp.trim();

      if (!valor) {
        setEditandoNome(null);
        return;
      }

      if (tipo === "coordenacao-nome") {
        if (!coordenacao.id) return;
        await atualizarPessoa(coordenacao.id, { nome: valor }, "coordenacao");
      } else if (tipo === "analista") {
        const pessoa = analistas[indices[0]];
        if (!pessoa?.id) return;
        await atualizarPessoa(pessoa.id, { nome: valor }, "analista");
      } else if (tipo === "suporte") {
        const pessoa = suporteGrupos[indices[0]]?.pessoas[indices[1]];
        if (!pessoa?.id) return;
        await atualizarPessoa(pessoa.id, { nome: valor }, "suporte");
      } else if (tipo === "sistema") {
        const sistema = sistemas[indices[0]];
        if (!sistema?.id) return;
        await atualizarSistema(sistema.id, { nome: valor }, "sistema");
      } else if (tipo === "infra") {
        const pessoa = equipeInfra[indices[0]];
        if (!pessoa?.id) return;
        await atualizarPessoa(pessoa.id, { nome: valor }, "infra");
      } else if (tipo === "infra-cargo") {
        const pessoa = equipeInfra[indices[0]];
        if (!pessoa?.id) return;
        await atualizarPessoa(
          pessoa.id,
          { cargo_descricao: valor },
          "infra-cargo",
        );
      }

      await carregarDados();
    } catch (error) {
      mostrarErro(error, "salvarEdicao");
    } finally {
      setEditandoNome(null);
      setValorTemp("");
    }
  };

  const salvarFotoPessoa = async (pessoaId: string, foto: string) => {
    try {
      await atualizarPessoa(pessoaId, { foto }, "salvarFotoPessoa");
      await carregarDados();
    } catch (error) {
      mostrarErro(error, "salvarFotoPessoa");
    }
  };

  const salvarFotoSistema = async (sistemaId: string, foto: string) => {
    try {
      await atualizarSistema(sistemaId, { foto }, "salvarFotoSistema");
      await carregarDados();
    } catch (error) {
      mostrarErro(error, "salvarFotoSistema");
    }
  };

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
    const uploadSizes = {
      sm: "w-3 h-3",
      md: "w-4 h-4",
      lg: "w-5 h-5",
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
        <label className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity">
          <Upload className={`${uploadSizes[size]} text-white`} />
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleImageUpload(file, onUpload);
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

  return (
    <div className="size-full bg-gradient-to-br from-background via-background to-secondary/20 overflow-auto">
      <div className="max-w-[1600px] mx-auto p-8">
        <div className="text-center mb-16 relative">
          <button
            onClick={sair}
            className="absolute right-0 top-0 px-4 py-2 text-sm bg-destructive text-white rounded-xl hover:bg-destructive/90 transition-colors"
          >
            Sair
          </button>

          <h1 className="mb-2 text-3xl font-bold">Mapa de Sistemas</h1>
          <p className="text-muted-foreground mb-4">Way Brasil</p>
          {carregando && (
            <p className="text-xs text-muted-foreground">
              Sincronizando com o Supabase...
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
              {suporteGrupos.map((grupo, gIdx) => (
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
                    {grupo.pessoas.map((pessoa, pIdx) => (
                      <div
                        key={pessoa.id || pIdx}
                        className="flex items-center gap-3 p-2 bg-secondary/50 rounded-lg"
                      >
                        <AvatarUpload
                          foto={pessoa.foto}
                          size="md"
                          borderColor="border-chart-3"
                          onUpload={(url) => salvarFotoPessoa(pessoa.id, url)}
                        />
                        <div className="flex-1 min-w-0">
                          {editandoNome === `suporte-${gIdx}-${pIdx}` ? (
                            <input
                              type="text"
                              value={valorTemp}
                              onChange={(e) => setValorTemp(e.target.value)}
                              onBlur={() => salvarEdicao("suporte", gIdx, pIdx)}
                              onKeyDown={(e) =>
                                e.key === "Enter" &&
                                salvarEdicao("suporte", gIdx, pIdx)
                              }
                              className="font-medium text-sm w-full px-2 py-1 border border-chart-3 rounded"
                              autoFocus
                            />
                          ) : (
                            <div
                              className="font-medium text-sm cursor-pointer hover:bg-secondary rounded px-2 py-1 inline-flex items-center gap-1"
                              onClick={() =>
                                iniciarEdicao(
                                  `suporte-${gIdx}-${pIdx}`,
                                  pessoa.nome,
                                )
                              }
                            >
                              <span className="truncate">{pessoa.nome}</span>
                              <Edit2 className="w-3 h-3 opacity-50 flex-shrink-0" />
                            </div>
                          )}
                          <div className="text-xs text-muted-foreground">
                            {pessoa.cargo}
                          </div>
                        </div>
                        <button
                          onClick={() => removerPessoaGrupo(gIdx, pIdx)}
                          className="text-destructive hover:bg-destructive/10 p-1 rounded flex-shrink-0"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={() => adicionarPessoaGrupo(gIdx)}
                      className="flex items-center justify-center gap-1.5 text-xs text-chart-3 border border-dashed border-chart-3/40 rounded-lg py-2 hover:bg-chart-3/5 transition-colors"
                    >
                      <Plus className="w-3 h-3" />
                      Adicionar pessoa
                    </button>
                  </div>
                </div>
              ))}
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
                {analistas.map((analista, idx) => (
                  <div
                    key={analista.id || idx}
                    className="flex flex-col items-center gap-2 relative"
                  >
                    <button
                      onClick={() => removerAnalista(idx)}
                      className="absolute -top-1 -right-1 z-10 w-5 h-5 rounded-full bg-destructive text-white flex items-center justify-center hover:bg-destructive/80 transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                    <AvatarUpload
                      foto={analista.foto}
                      size="lg"
                      borderColor="border-chart-2"
                      onUpload={(url) => salvarFotoPessoa(analista.id, url)}
                    />
                    <div className="text-center">
                      {editandoNome === `analista-${idx}` ? (
                        <input
                          type="text"
                          value={valorTemp}
                          onChange={(e) => setValorTemp(e.target.value)}
                          onBlur={() => salvarEdicao("analista", idx)}
                          onKeyDown={(e) =>
                            e.key === "Enter" && salvarEdicao("analista", idx)
                          }
                          className="font-medium text-center w-full px-2 py-1 border border-chart-2 rounded text-sm"
                          autoFocus
                        />
                      ) : (
                        <div
                          className="font-medium cursor-pointer hover:bg-secondary/50 rounded px-2 py-1 inline-flex items-center gap-1"
                          onClick={() =>
                            iniciarEdicao(`analista-${idx}`, analista.nome)
                          }
                        >
                          {analista.nome}
                          <Edit2 className="w-3 h-3 opacity-50" />
                        </div>
                      )}
                      <div className="text-sm text-muted-foreground">
                        {analista.cargo}
                      </div>
                    </div>
                  </div>
                ))}
                <div className="flex flex-col items-center justify-center gap-2 mt-1">
                  <button
                    onClick={adicionarAnalista}
                    className="w-20 h-20 rounded-full border-2 border-dashed border-chart-2/40 flex items-center justify-center hover:bg-chart-2/5 transition-colors text-chart-2"
                  >
                    <Plus className="w-7 h-7" />
                  </button>
                  <div className="text-xs text-muted-foreground">Adicionar</div>
                </div>
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
                <AvatarUpload
                  foto={coordenacao.foto}
                  size="lg"
                  borderColor="border-chart-1"
                  onUpload={(url) => salvarFotoPessoa(coordenacao.id, url)}
                />
                <div className="text-center w-full">
                  {editandoNome === "coordenacao-nome" ? (
                    <input
                      type="text"
                      value={valorTemp}
                      onChange={(e) => setValorTemp(e.target.value)}
                      onBlur={() => salvarEdicao("coordenacao-nome")}
                      onKeyDown={(e) =>
                        e.key === "Enter" && salvarEdicao("coordenacao-nome")
                      }
                      className="font-medium text-center w-full px-2 py-1 border border-chart-1 rounded"
                      autoFocus
                    />
                  ) : (
                    <div
                      className="font-medium cursor-pointer hover:bg-secondary/50 rounded px-2 py-1 inline-flex items-center gap-2"
                      onClick={() =>
                        iniciarEdicao("coordenacao-nome", coordenacao.nome)
                      }
                    >
                      {coordenacao.nome}
                      <Edit2 className="w-3 h-3 opacity-50" />
                    </div>
                  )}
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
            {sistemas.map((sistema, idx) => (
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
                            const file = e.target.files?.[0];
                            if (file) {
                              handleImageUpload(file, (url) =>
                                salvarFotoSistema(sistema.id, url),
                              );
                            }
                          }}
                        />
                      </label>
                    </div>
                    <div className="flex-1" onClick={(e) => e.stopPropagation()}>
                      {editandoNome === `sistema-${idx}` ? (
                        <input
                          type="text"
                          value={valorTemp}
                          onChange={(e) => setValorTemp(e.target.value)}
                          onBlur={() => salvarEdicao("sistema", idx)}
                          onKeyDown={(e) =>
                            e.key === "Enter" && salvarEdicao("sistema", idx)
                          }
                          className="text-sm w-full px-2 py-1 border border-chart-4 rounded font-medium"
                          autoFocus
                        />
                      ) : (
                        <div
                          className="text-sm cursor-pointer hover:bg-secondary/50 rounded px-2 py-1 inline-flex items-center gap-1 font-medium"
                          onClick={() =>
                            iniciarEdicao(`sistema-${idx}`, sistema.nome)
                          }
                        >
                          {sistema.nome}
                          <Edit2 className="w-3 h-3 opacity-50" />
                        </div>
                      )}
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
                        <button
                          onClick={() => abrirModal(idx, "responsaveis")}
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
                              <button
                                onClick={() =>
                                  removerPessoaSistema(idx, pIdx, "responsaveis")
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
                        <div className="text-sm font-medium text-chart-5">
                          Infraestrutura
                        </div>
                        <button
                          onClick={() => abrirModal(idx, "infraestrutura")}
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
                              <button
                                onClick={() =>
                                  removerPessoaSistema(
                                    idx,
                                    pIdx,
                                    "infraestrutura",
                                  )
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
                {equipeInfra.map((infra, idx) => (
                  <div
                    key={infra.id || idx}
                    className="flex flex-col items-center gap-2 relative"
                  >
                    <button
                      onClick={() => removerInfra(idx)}
                      className="absolute -top-1 -right-1 z-10 w-5 h-5 rounded-full bg-destructive text-white flex items-center justify-center hover:bg-destructive/80 transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                    <AvatarUpload
                      foto={infra.foto}
                      size="lg"
                      borderColor="border-chart-5"
                      onUpload={(url) => salvarFotoPessoa(infra.id, url)}
                    />
                    <div className="text-center">
                      {editandoNome === `infra-${idx}` ? (
                        <input
                          type="text"
                          value={valorTemp}
                          onChange={(e) => setValorTemp(e.target.value)}
                          onBlur={() => salvarEdicao("infra", idx)}
                          onKeyDown={(e) =>
                            e.key === "Enter" && salvarEdicao("infra", idx)
                          }
                          className="font-medium text-center w-full px-2 py-1 border border-chart-5 rounded text-sm"
                          autoFocus
                        />
                      ) : (
                        <div
                          className="font-medium cursor-pointer hover:bg-secondary/50 rounded px-2 py-1 inline-flex items-center gap-1"
                          onClick={() => iniciarEdicao(`infra-${idx}`, infra.nome)}
                        >
                          {infra.nome}
                          <Edit2 className="w-3 h-3 opacity-50" />
                        </div>
                      )}
                      <div className="text-sm text-muted-foreground">
                        {editandoNome === `infra-cargo-${idx}` ? (
                          <input
                            type="text"
                            value={valorTemp}
                            onChange={(e) => setValorTemp(e.target.value)}
                            onBlur={() => salvarEdicao("infra-cargo", idx)}
                            onKeyDown={(e) =>
                              e.key === "Enter" &&
                              salvarEdicao("infra-cargo", idx)
                            }
                            className="text-xs text-muted-foreground border border-chart-5 rounded px-1 text-center"
                            autoFocus
                          />
                        ) : (
                          <div
                            onClick={() =>
                              iniciarEdicao(
                                `infra-cargo-${idx}`,
                                infra.cargo_descricao || "Infraestrutura",
                              )
                            }
                            className="text-xs text-muted-foreground cursor-pointer hover:text-foreground flex items-center justify-center gap-1 italic"
                          >
                            {getCargoExibicao(infra)}
                            <Edit2 className="w-2 h-2 opacity-30" />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                <div className="flex flex-col items-center justify-center gap-2 mt-1">
                  <button
                    onClick={adicionarInfra}
                    className="w-20 h-20 rounded-full border-2 border-dashed border-chart-5/40 flex items-center justify-center hover:bg-chart-5/5 transition-colors text-chart-5"
                  >
                    <Plus className="w-7 h-7" />
                  </button>
                  <div className="text-xs text-muted-foreground">Adicionar</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

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
                  {modalConfig.tipo === "responsaveis"
                    ? "Responsáveis"
                    : "Infraestrutura"}
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {sistemas[modalConfig.sistemaIdx]?.nome}
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
              {todasPessoas().map((pessoa) => {
                const selecionada = isPessoaSelecionada(pessoa);
                return (
                  <div
                    key={pessoa.id}
                    onClick={() => togglePessoa(pessoa)}
                    className={`flex items-center gap-3 p-2.5 rounded-lg cursor-pointer transition-colors ${
                      selecionada
                        ? "bg-chart-2/10 border border-chart-2/30"
                        : "hover:bg-secondary/60 border border-transparent"
                    }`}
                  >
                    <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center overflow-hidden flex-shrink-0 border border-border">
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
                      <div className="text-sm font-medium truncate">
                        {pessoa.nome}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {getCargoExibicao(pessoa)}
                      </div>
                    </div>
                    <div
                      className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${
                        selecionada
                          ? "bg-chart-2 text-white"
                          : "border border-border"
                      }`}
                    >
                      {selecionada && <Check className="w-3 h-3" />}
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
    </div>
  );
}
