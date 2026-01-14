import { useEffect, useMemo, useState } from "react";
import Layout from "../components/Layout";
import BottomNav from "../components/BottomNav";
import { api } from "../api/client";

function euro(n) {
  return new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(n);
}

function formatDateTime(iso) {
  const d = new Date(iso);
  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

function Card({ children }) {
  return <div className="rounded-2xl border border-white/10 bg-white/5 p-4">{children}</div>;
}

async function getSafetyBalance() {
  return api("/safety/balance");
}

async function getSafetyHistory() {
  return api("/safety/history?limit=50");
}

export default function Savings() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [balance, setBalance] = useState(0);
  const [rows, setRows] = useState([]);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const [b, h] = await Promise.all([getSafetyBalance(), getSafetyHistory()]);
      setBalance(b?.balance ?? 0);
      setRows(h || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const summary = useMemo(() => {
    const cons = rows.filter((r) => r.type === "CONSOLIDATE_TO_SAFETY").reduce((a, r) => a + r.amount, 0);
    const emer = rows.filter((r) => r.type === "EMERGENCY_FROM_SAFETY").reduce((a, r) => a + r.amount, 0);
    return { cons, emer };
  }, [rows]);

  return (
    <>
      <Layout
        title="Ahorro total"
        rightSlot={
          <button
            onClick={load}
            className="text-sm px-3 py-2 rounded-xl bg-white/10 border border-white/10"
          >
            Refresh
          </button>
        }
      >
        {error ? (
          <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
            {error}
          </div>
        ) : null}

        {loading ? (
          <div className="text-white/60">Cargando…</div>
        ) : (
          <div className="space-y-4">
            <Card>
              <p className="text-white/60 text-sm">Fondo de seguridad (total acumulado)</p>
              <p className="mt-2 text-3xl font-semibold">{euro(balance)}</p>
              <p className="text-xs text-white/50 mt-2">
                Esto es lo que te queda tras cierres de mes + ajustes por imprevistos.
              </p>
            </Card>

            <Card>
              <p className="text-sm font-semibold">Resumen rápido</p>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-black/40 border border-white/10 p-3">
                  <p className="text-xs text-white/60">Entradas (cierres)</p>
                  <p className="mt-1 font-semibold">{euro(summary.cons)}</p>
                </div>
                <div className="rounded-xl bg-black/40 border border-white/10 p-3">
                  <p className="text-xs text-white/60">Salidas (imprevistos)</p>
                  <p className="mt-1 font-semibold">{euro(summary.emer)}</p>
                </div>
              </div>
            </Card>

            <div className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
              <div className="px-4 py-3 border-b border-white/10 text-sm text-white/60">
                Histórico (últimos 50)
              </div>

              {rows.length === 0 ? (
                <div className="p-4 text-white/60">Aún no hay movimientos del fondo.</div>
              ) : (
                <ul className="divide-y divide-white/10">
                  {rows.map((r) => {
                    const isIn = r.type === "CONSOLIDATE_TO_SAFETY";
                    return (
                      <li key={r.id} className="p-4 flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm text-white/60">
                            {formatDateTime(r.date_time)} · {isIn ? "Cierre de mes" : "Imprevisto"}
                          </p>
                          <p className="mt-1 font-medium truncate">
                            {r.note || r.concept || "—"}
                          </p>
                        </div>

                        <div className={`text-right font-semibold ${isIn ? "text-green-300" : "text-white"}`}>
                          {isIn ? "+" : "-"}
                          {euro(r.amount)}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            <a
              href="/"
              className="block text-center rounded-2xl bg-white/10 border border-white/10 py-3 font-semibold"
            >
              Volver a Home
            </a>
          </div>
        )}
      </Layout>

      <BottomNav />
    </>
  );
}
