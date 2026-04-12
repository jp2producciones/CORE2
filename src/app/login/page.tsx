"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });

    if (res.ok) {
      router.push("/");
      router.refresh();
    } else {
      setError("Contraseña incorrecta");
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F9FAFB] p-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#1A1A1A]">
            <Lock className="text-white" size={28} />
          </div>
          <h1 className="text-2xl font-bold text-[#111]">CORE 2</h1>
          <p className="mt-1 text-sm text-[#666]">
            Sistema de Producción Audiovisual
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-xl border border-[#E5E7EB] bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.06)]"
        >
          <label className="mb-2 block text-sm font-medium text-[#111]">
            Contraseña
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Ingresa la contraseña"
            className="mb-4 w-full rounded-lg border border-[#E5E7EB] px-4 py-2.5 text-sm text-[#111] placeholder-[#999] outline-none focus:border-[#111] focus:ring-1 focus:ring-[#111]"
            autoFocus
          />
          {error && (
            <p className="mb-4 text-sm text-[#DC2626]">{error}</p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-[#111] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#333] disabled:opacity-50"
          >
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>
      </div>
    </div>
  );
}
