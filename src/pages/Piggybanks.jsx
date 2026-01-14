import { useEffect, useMemo, useState } from "react";
import Layout from "../components/Layout";
import BottomNav from "../components/BottomNav";
import { getCurrentMonth } from "../api/month";
import { api } from "../api/client";

function euro(n) {
  return new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(n);
}

function Card({ children }) {
  return <div className="rounded-2xl border border-white/10 bg-white/5 p-4">{children}</div>;
}

async function getPiggybanksSummary() {
  return api("/piggybanks/summary");
}

async function createPiggyEntry(piggyId, payload) {
  return api(`/piggybanks/${piggyId}/entries`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export default function Piggybanks() {
  const [month, setMonth] = useState(null);
  const [items, setItems] = useState([]);
  const [openForm, setOpenForm] = useState(null); // piggyId abierto
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    setOk("");
    try {
      const m = await getCurrentMonth();
      setMonth(m || null);

      const rows = await getPiggybanksSummary();
      setItems(rows || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const canSave = useMemo(() => {
    const n = Number(amount);
    return Number.isFinite(n) && n > 0 && openForm;
  }, [amount, openForm]);

  function resetForm() {
    setAmount("");
    setNote("");
    setOpenForm(null);
  }

  async function onSave(piggyId) {
    if (!canSave) return;
    setSaving(true);
    setError("");
    setOk("");
    try {
      // month_id opcional (si hay mes abierto lo asociamos)
      await createPiggyEntry(piggyId, {
        amount: Number(amount),
        note: note.trim() ? note.trim() : null,
        month_id: month?.id || null,
      });

      setOk("Añadido ✅");
      resetForm();
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
      setTimeout(() => setOk(""), 1200);
    }
  }

  return (
    <>
      <Layout
        title="Huchas"
        rightSlot={
          <a
            href="/"
            className="text-sm px-3 py-2 rounded-xl bg-white/10 border border-white/10"
          >
            Volver
          </a>
        }
      >
        {error ? (
          <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
            {error}
          </div>
        ) : null}

        {ok ? (
          <div className="mb-4 rounded-xl border border-green-500/30 bg-green-500/10 p-3 text-sm text-green-200">
            {ok}
          </div>
        ) : null}

        {loading ? (
          <div className="text-white/60">Cargando…</div>
        ) : (
          <div className="space-y-4">
            <Card>
              <p className="text-white/60 text-sm">Mes activo</p>
              <p className="mt-1 text-lg font-semibold">{month?.period_key || "—"}</p>
              <p className="text-xs text-white/50 mt-1">
                Aquí registras dinero que metes en las huchas (separado de los gastos normales).
              </p>
            </Card>

            {items.length === 0 ? (
              <Card>
                <p className="text-white/80">No hay huchas.</p>
              </Card>
            ) : (
              <div className="space-y-3">
                {items.map((p) => (
                  <Card key={p.id}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-xs text-white/60">{p.type}</p>
                        <p className="mt-1 text-lg font-semibold truncate">{p.name}</p>
                        <p className="text-xs text-white/50 mt-1">
                          Entradas: {p.entries_count}{" "}
                          {p.last_entry_at ? `· Última: ${new Date(p.last_entry_at).toLocaleString("es-ES")}` : ""}
                        </p>
                      </div>

                      <div className="text-right">
                        <p className="text-xs text-white/60">Saldo</p>
                        <p className="mt-1 text-xl font-semibold">{euro(p.balance || 0)}</p>
                      </div>
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-3">
                      <button
                        onClick={() => {
                          if (openForm === p.id) {
                            resetForm();
                          } else {
                            setOpenForm(p.id);
                            setAmount("");
                            setNote("");
                          }
                        }}
                        className="rounded-2xl bg-white text-black py-3 font-semibold"
                      >
                        {openForm === p.id ? "Cancelar" : "Añadir"}
                      </button>

                      <button
                        disabled
                        className="rounded-2xl bg-white/10 border border-white/10 py-3 font-semibold text-white/40"
                        title="Lo montamos después"
                      >
                        Ver entradas
                      </button>
                    </div>

                    {openForm === p.id ? (
                      <div className="mt-4 rounded-2xl border border-white/10 bg-black/30 p-3 space-y-3">
                        <label className="block">
                          <span className="text-xs text-white/60">Cantidad (€)</span>
                          <input
                            inputMode="decimal"
                            className="mt-1 w-full rounded-xl bg-black/40 border border-white/10 px-3 py-3 text-lg"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            placeholder="Ej: 20"
                          />
                        </label>

                        <label className="block">
                          <span className="text-xs text-white/60">Nota (opcional)</span>
                          <input
                            className="mt-1 w-full rounded-xl bg-black/40 border border-white/10 px-3 py-3"
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            placeholder="Ej: sobrante semana, monedas…"
                          />
                        </label>

                        <button
                          disabled={!canSave || saving}
                          onClick={() => onSave(p.id)}
                          className={`w-full rounded-2xl py-3 font-semibold ${
                            canSave && !saving
                              ? "bg-white text-black"
                              : "bg-white/10 text-white/40 border border-white/10"
                          }`}
                        >
                          {saving ? "Guardando…" : "Guardar"}
                        </button>

                        <p className="text-xs text-white/50">
                          Se registra con fecha/hora actual.
                        </p>
                      </div>
                    ) : null}
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
      </Layout>

      <BottomNav />
    </>
  );
}
