import { useEffect, useMemo, useState } from "react";
import Layout from "../components/Layout";
import BottomNav from "../components/BottomNav";
import { getCurrentMonth } from "../api/month";
import { getCategories } from "../api/categories";
import { createTransaction } from "../api/transactions";

function nowLocalDateTimeValue() {
  // HTML datetime-local expects "YYYY-MM-DDTHH:mm"
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

export default function AddExpense() {
  const [month, setMonth] = useState(null);
  const [categories, setCategories] = useState([]);

  const [amount, setAmount] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [attribution, setAttribution] = useState("MINE");
  const [paymentMethod, setPaymentMethod] = useState("CARD");
  const [concept, setConcept] = useState("");
  const [dateTimeLocal, setDateTimeLocal] = useState(nowLocalDateTimeValue());

  const [status, setStatus] = useState({ loading: true, error: "", ok: "" });

  useEffect(() => {
    async function load() {
      try {
        const [m, cats] = await Promise.all([getCurrentMonth(), getCategories()]);
        setMonth(m);
        setCategories(cats);
        setCategoryId(cats?.[0]?.id || "");
      } catch (e) {
        setStatus((s) => ({ ...s, error: e.message }));
      } finally {
        setStatus((s) => ({ ...s, loading: false }));
      }
    }
    load();
  }, []);

  const canSubmit = useMemo(() => {
    return !!month?.id && amount && categoryId && attribution && paymentMethod;
  }, [month, amount, categoryId, attribution, paymentMethod]);

  async function onSubmit() {
    setStatus({ loading: false, error: "", ok: "" });
    try {
      // Convert datetime-local to ISO (keeps local time by browser, sent as ISO)
      const iso = new Date(dateTimeLocal).toISOString();

      await createTransaction({
        month_id: month.id,
        amount: Number(amount),
        type: "EXPENSE",
        direction: "OUT",
        category_id: categoryId,
        attribution,
        payment_method: paymentMethod,
        concept: concept.trim() ? concept.trim() : null,
        date_time: iso,
      });

      setAmount("");
      setConcept("");
      setDateTimeLocal(nowLocalDateTimeValue());
      setStatus({ loading: false, error: "", ok: "Gasto guardado ✅" });
    } catch (e) {
      setStatus({ loading: false, error: e.message, ok: "" });
    }
  }

  return (
    <>
      <Layout title="Añadir gasto">
        {status.loading ? (
          <div className="text-white/60">Cargando…</div>
        ) : !month ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="text-white/80">No hay mes abierto.</p>
            <p className="text-white/60 text-sm mt-1">
              Ve a Home y pulsa “Empezar mes”.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {status.error ? (
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
                {status.error}
              </div>
            ) : null}
            {status.ok ? (
              <div className="rounded-xl border border-green-500/30 bg-green-500/10 p-3 text-sm text-green-200">
                {status.ok}
              </div>
            ) : null}

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-3">
              <label className="block">
                <span className="text-xs text-white/60">Cantidad (€)</span>
                <input
                  inputMode="decimal"
                  className="mt-1 w-full rounded-xl bg-black/40 border border-white/10 px-3 py-3 text-lg"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="Ej: 3.50"
                />
              </label>

              <label className="block">
                <span className="text-xs text-white/60">Categoría</span>
                <select
                  className="mt-1 w-full rounded-xl bg-black/40 border border-white/10 px-3 py-3"
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>

              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-xs text-white/60">Quién lo paga</span>
                  <select
                    className="mt-1 w-full rounded-xl bg-black/40 border border-white/10 px-3 py-3"
                    value={attribution}
                    onChange={(e) => setAttribution(e.target.value)}
                  >
                    <option value="MINE">Mío</option>
                    <option value="PARTNER">Mi mujer</option>
                    <option value="HOUSE">Casa</option>
                  </select>
                </label>

                <label className="block">
                  <span className="text-xs text-white/60">Método</span>
                  <select
                    className="mt-1 w-full rounded-xl bg-black/40 border border-white/10 px-3 py-3"
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                  >
                    <option value="CARD">Tarjeta</option>
                    <option value="CASH">Efectivo</option>
                    <option value="TRANSFER">Transferencia</option>
                  </select>
                </label>
              </div>

              <label className="block">
                <span className="text-xs text-white/60">Fecha y hora</span>
                <input
                  type="datetime-local"
                  className="mt-1 w-full rounded-xl bg-black/40 border border-white/10 px-3 py-3"
                  value={dateTimeLocal}
                  onChange={(e) => setDateTimeLocal(e.target.value)}
                />
              </label>

              <label className="block">
                <span className="text-xs text-white/60">Concepto (opcional)</span>
                <input
                  className="mt-1 w-full rounded-xl bg-black/40 border border-white/10 px-3 py-3"
                  value={concept}
                  onChange={(e) => setConcept(e.target.value)}
                  placeholder="Ej: Leche, pañales, regalo..."
                />
              </label>

              <button
                disabled={!canSubmit}
                onClick={onSubmit}
                className={`w-full rounded-2xl py-3 font-semibold ${
                  canSubmit
                    ? "bg-white text-black"
                    : "bg-white/10 text-white/40 border border-white/10"
                }`}
              >
                Guardar gasto
              </button>

              <p className="text-xs text-white/50">
                Mes activo: {month.period_key}
              </p>
            </div>
          </div>
        )}
      </Layout>

      <BottomNav />
    </>
  );
}
