import { useEffect, useMemo, useState } from "react";
import Layout from "../components/Layout";
import BottomNav from "../components/BottomNav";
import { getCurrentMonth } from "../api/month";
import { getCategories } from "../api/categories";
import { createTransaction } from "../api/transactions";
import { api } from "../api/client";

function nowLocalDateTimeValue() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

// Deja escribir con coma o punto, y limpia caracteres no permitidos
function sanitizeMoneyTyping(value) {
  let v = String(value).replace(/[^\d.,]/g, "");
  const parts = v.split(/[.,]/);
  if (parts.length > 2) {
    v = parts[0] + "," + parts.slice(1).join("");
  }
  return v;
}

// Valida: número > 0, máx 2 decimales
function isValidMoneyInput(raw) {
  if (raw == null) return false;
  const s = String(raw).trim();
  if (!s) return false;

  const normalized = s.replace(",", ".");
  if (!/^\d+(\.\d{0,2})?$/.test(normalized)) return false;

  const n = Number(normalized);
  return Number.isFinite(n) && n > 0;
}

// Week current (tu endpoint del backend)
async function getCurrentWeek() {
  return api("/week/current");
}

export default function AddExpense() {
  const [month, setMonth] = useState(null);
  const [week, setWeek] = useState(null);
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
      setStatus({ loading: true, error: "", ok: "" });
      try {
        const [m, w, cats] = await Promise.all([
          getCurrentMonth(),
          getCurrentWeek(), // puede ser null si no hay mes
          getCategories(),
        ]);

        setMonth(m || null);
        setWeek(w || null);

        setCategories(cats || []);
        setCategoryId((cats || [])?.[0]?.id || "");
      } catch (e) {
        setStatus({ loading: false, error: e?.message || "Error cargando datos", ok: "" });
      } finally {
        setStatus((s) => ({ ...s, loading: false }));
      }
    }
    load();
  }, []);

  // Si pago es CASH y no hay week, avisamos (aunque normalmente habrá)
  const needsWeekForCash = useMemo(() => paymentMethod === "CASH", [paymentMethod]);

  const canSubmit = useMemo(() => {
    if (!month?.id) return false;
    if (!categoryId) return false;
    if (!attribution) return false;
    if (!paymentMethod) return false;
    if (!dateTimeLocal) return false;
    if (!isValidMoneyInput(amount)) return false;

    // Si es efectivo, queremos week_id para que “semana cash” funcione perfecto
    if (needsWeekForCash && !week?.id) return false;

    return true;
  }, [month, categoryId, attribution, paymentMethod, dateTimeLocal, amount, needsWeekForCash, week]);

  async function onSubmit() {
    setStatus({ loading: false, error: "", ok: "" });

    if (!isValidMoneyInput(amount)) {
      setStatus({ loading: false, error: "Cantidad inválida (usa 3,50 o 3.50)", ok: "" });
      return;
    }

    if (!month?.id) {
      setStatus({ loading: false, error: "No hay mes abierto.", ok: "" });
      return;
    }

    if (paymentMethod === "CASH" && !week?.id) {
      setStatus({
        loading: false,
        error: "No se ha podido detectar la semana actual. Refresh y prueba de nuevo.",
        ok: "",
      });
      return;
    }

    try {
      const iso = new Date(dateTimeLocal).toISOString();

      await createTransaction({
        month_id: month.id,

        // ✅ SOLO si es CASH, asignamos week_id para la semana cash
        week_id: paymentMethod === "CASH" ? week.id : null,

        // 🔥 Mandamos STRING para coma/punto, backend -> cents
        amount: amount.trim(),

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
      setStatus({ loading: false, error: e?.message || "Error guardando gasto", ok: "" });
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
            <p className="text-white/60 text-sm mt-1">Ve a Home y pulsa “Empezar mes”.</p>
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
                  onChange={(e) => setAmount(sanitizeMoneyTyping(e.target.value))}
                  placeholder="Ej: 3,50"
                />
                {!isValidMoneyInput(amount) && amount.trim() ? (
                  <p className="mt-1 text-xs text-red-200/80">
                    Formato inválido. Usa por ejemplo 3,50 o 3.50 (máx 2 decimales).
                  </p>
                ) : null}
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

                  {paymentMethod === "CASH" ? (
                    <p className="mt-1 text-[11px] text-white/50">
                      Efectivo usa el presupuesto semanal (se asigna a la semana actual).
                      {!week?.id ? " ⚠️ No se detecta semana." : ""}
                    </p>
                  ) : (
                    <p className="mt-1 text-[11px] text-white/50">
                      Tarjeta/transferencia va contra el banco (no consume presupuesto semanal).
                    </p>
                  )}
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
                  canSubmit ? "bg-white text-black" : "bg-white/10 text-white/40 border border-white/10"
                }`}
              >
                Guardar gasto
              </button>

              <p className="text-xs text-white/50">
                Mes activo: {month.period_key}
                {week?.id ? ` · Semana actual: #${week.week_index}` : ""}
              </p>
            </div>
          </div>
        )}
      </Layout>

      <BottomNav />
    </>
  );
}
