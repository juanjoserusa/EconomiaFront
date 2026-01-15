import { useEffect, useMemo, useState } from "react";
import Layout from "../components/Layout";
import BottomNav from "../components/BottomNav";
import { getCurrentMonth } from "../api/month";
import { createTransaction } from "../api/transactions";

function nowLocalDateTimeValue() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

function sanitizeMoneyTyping(value) {
  let v = String(value).replace(/[^\d.,]/g, "");
  const parts = v.split(/[.,]/);
  if (parts.length > 2) {
    v = parts[0] + "," + parts.slice(1).join("");
  }
  return v;
}

function isValidMoneyInput(raw) {
  if (!raw) return false;
  const s = raw.trim().replace(",", ".");
  return /^\d+(\.\d{0,2})?$/.test(s) && Number(s) > 0;
}

export default function AddIncome() {
  const [month, setMonth] = useState(null);

  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("TRANSFER");
  const [concept, setConcept] = useState("");
  const [dateTimeLocal, setDateTimeLocal] = useState(nowLocalDateTimeValue());

  const [status, setStatus] = useState({ loading: true, error: "", ok: "" });

  useEffect(() => {
    async function load() {
      try {
        const m = await getCurrentMonth();
        setMonth(m);
      } catch (e) {
        setStatus((s) => ({ ...s, error: e.message }));
      } finally {
        setStatus((s) => ({ ...s, loading: false }));
      }
    }
    load();
  }, []);

  const canSubmit = useMemo(() => {
    return month?.id && isValidMoneyInput(amount);
  }, [month, amount]);

  async function onSubmit() {
    if (!canSubmit) return;

    setStatus({ loading: false, error: "", ok: "" });

    try {
      const iso = new Date(dateTimeLocal).toISOString();

      await createTransaction({
        month_id: month.id,
        amount: amount.trim(), // string
        type: "EXTRA_INCOME",
        direction: "IN",
        attribution: "HOUSE",
        payment_method: paymentMethod,
        concept: concept.trim() || "Ingreso extra",
        date_time: iso,
      });

      setAmount("");
      setConcept("");
      setStatus({ loading: false, error: "", ok: "Ingreso guardado ✅" });
    } catch (e) {
      setStatus({ loading: false, error: e.message, ok: "" });
    }
  }

  return (
    <>
      <Layout title="Añadir ingreso">
        {status.loading ? (
          <div className="text-white/60">Cargando…</div>
        ) : !month ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            No hay mes abierto
          </div>
        ) : (
          <div className="space-y-4">
            {status.error && (
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
                {status.error}
              </div>
            )}
            {status.ok && (
              <div className="rounded-xl border border-green-500/30 bg-green-500/10 p-3 text-sm text-green-200">
                {status.ok}
              </div>
            )}

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-3">
              <label className="block">
                <span className="text-xs text-white/60">Cantidad (€)</span>
                <input
                  inputMode="decimal"
                  className="mt-1 w-full rounded-xl bg-black/40 border border-white/10 px-3 py-3 text-lg"
                  value={amount}
                  onChange={(e) => setAmount(sanitizeMoneyTyping(e.target.value))}
                  placeholder="Ej: 200 o 200,50"
                />
              </label>

              <label className="block">
                <span className="text-xs text-white/60">Método</span>
                <select
                  className="mt-1 w-full rounded-xl bg-black/40 border border-white/10 px-3 py-3"
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                >
                  <option value="TRANSFER">Transferencia (banco)</option>
                  <option value="CASH">Efectivo</option>
                </select>
              </label>

              <label className="block">
                <span className="text-xs text-white/60">Concepto</span>
                <input
                  className="mt-1 w-full rounded-xl bg-black/40 border border-white/10 px-3 py-3"
                  value={concept}
                  onChange={(e) => setConcept(e.target.value)}
                  placeholder="Ej: ingreso extra, devolución…"
                />
              </label>

              <button
                disabled={!canSubmit}
                onClick={onSubmit}
                className={`w-full rounded-2xl py-3 font-semibold ${
                  canSubmit
                    ? "bg-green-400 text-black"
                    : "bg-white/10 text-white/40 border border-white/10"
                }`}
              >
                Guardar ingreso
              </button>
            </div>
          </div>
        )}
      </Layout>

      <BottomNav />
    </>
  );
}
