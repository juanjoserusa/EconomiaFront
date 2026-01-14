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

async function getSafetyBalance() {
  return api("/safety/balance");
}

async function postEmergency(payload) {
  return api("/safety/emergency", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export default function Emergency() {
  const [month, setMonth] = useState(null);
  const [safety, setSafety] = useState({ balance: 0 });

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
      const [m, sb] = await Promise.all([getCurrentMonth(), getSafetyBalance()]);
      setMonth(m || null);
      setSafety(sb || { balance: 0 });
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
    return month?.id && Number.isFinite(n) && n > 0 && note.trim().length > 0;
  }, [amount, note, month]);

  async function onSave() {
    if (!canSave) return;
    setSaving(true);
    setError("");
    setOk("");

    try {
      await postEmergency({
        month_id: month.id,
        amount: Number(amount),
        note: note.trim(),
      });

      setOk("Imprevisto registrado ✅");
      setAmount("");
      setNote("");
      await load();
      // opcional: volver a Home tras 800ms
      setTimeout(() => {
        window.location.href = "/";
      }, 800);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Layout
        title="Imprevisto"
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
        ) : !month ? (
          <Card>
            <p className="text-white/80 font-semibold">No hay mes abierto</p>
            <p className="text-white/60 text-sm mt-1">
              Para registrar un imprevisto tiene que existir un mes OPEN.
            </p>
          </Card>
        ) : (
          <div className="space-y-4">
            <Card>
              <p className="text-white/60 text-sm">Fondo de seguridad (banco)</p>
              <p className="mt-1 text-2xl font-semibold">{euro(safety.balance ?? 0)}</p>
              <p className="text-xs text-white/50 mt-2">
                Usa esto solo si hace falta. Se registrará como movimiento del fondo.
              </p>
            </Card>

            <Card>
              <p className="text-sm font-semibold">Registrar imprevisto</p>

              <div className="mt-3 space-y-3">
                <label className="block">
                  <span className="text-xs text-white/60">Cantidad (€)</span>
                  <input
                    inputMode="decimal"
                    className="mt-1 w-full rounded-xl bg-black/40 border border-white/10 px-3 py-3 text-lg"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="Ej: 120"
                  />
                </label>

                <label className="block">
                  <span className="text-xs text-white/60">Motivo (obligatorio)</span>
                  <input
                    className="mt-1 w-full rounded-xl bg-black/40 border border-white/10 px-3 py-3"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Ej: avería coche, urgencias farmacia…"
                  />
                </label>

                <button
                  disabled={!canSave || saving}
                  onClick={onSave}
                  className={`w-full rounded-2xl py-3 font-semibold ${
                    canSave && !saving
                      ? "bg-white text-black"
                      : "bg-white/10 text-white/40 border border-white/10"
                  }`}
                >
                  {saving ? "Guardando…" : "Guardar imprevisto"}
                </button>

                <p className="text-xs text-white/50">
                  Se guarda con fecha/hora actual.
                </p>
              </div>
            </Card>
          </div>
        )}
      </Layout>

      <BottomNav />
    </>
  );
}
