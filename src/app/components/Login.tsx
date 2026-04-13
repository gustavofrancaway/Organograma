import { Building2 } from "lucide-react";
import { useState } from "react";
import type { FormEvent } from "react";

type LoginProps = {
  onSuccess: () => void;
};

export default function Login({ onSuccess }: LoginProps) {
  const [usuario, setUsuario] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");

  const fazerLogin = (e: FormEvent) => {
    e.preventDefault();

    if (usuario === "admin" && senha === "way") {
      localStorage.setItem("way_auth", "true");
      onSuccess();
      return;
    }

    setErro("Usuário ou senha inválidos.");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/20 flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl p-8">
        <div className="flex flex-col items-center mb-6">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-chart-1 to-chart-2 flex items-center justify-center text-white shadow-lg mb-4">
            <Building2 className="w-10 h-10" />
          </div>

          <h1 className="text-2xl font-bold text-center">Way Brasil</h1>
          <p className="text-sm text-muted-foreground text-center mt-1">
            Acesso ao Mapa de Sistemas
          </p>
        </div>

        <form onSubmit={fazerLogin} className="space-y-4">
          <div>
            <label className="text-sm font-medium block mb-1">Usuário</label>
            <input
              type="text"
              value={usuario}
              onChange={(e) => setUsuario(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-border bg-background outline-none focus:ring-2 focus:ring-chart-2"
              placeholder="Digite o usuário"
            />
          </div>

          <div>
            <label className="text-sm font-medium block mb-1">Senha</label>
            <input
              type="password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-border bg-background outline-none focus:ring-2 focus:ring-chart-2"
              placeholder="Digite a senha"
            />
          </div>

          {erro && (
            <div className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-xl px-3 py-2">
              {erro}
            </div>
          )}

          <button
            type="submit"
            className="w-full bg-chart-2 text-white py-2.5 rounded-xl font-medium hover:bg-chart-2/90 transition-colors"
          >
            Entrar
          </button>
        </form>
      </div>
    </div>
  );
}
