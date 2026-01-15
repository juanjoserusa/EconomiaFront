import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Layout from "../components/Layout";
import BottomNav from "../components/BottomNav";
import { getCurrentMonth } from "../api/month";
import { getCategories } from "../api/categories";
import { getTransaction, updateTransaction, deleteTransaction } from "../api/transactions";

function toLocalDateTimeValue(iso) {
  // ISO -> "YYYY-MM-DDTHH:mm" (para datetime-local)
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

// Deja escribir con coma o punto, y limpia caracteres no permitidos
function sanitizeMoneyTyping(value) {
  let v = String(value).replace(/[^\d.,]/g, "");

  // Si hay más de un separador decimal, dejamos solo el primero
  const parts = v.split(/[.,]/);
  if (parts.length > 2) {
    v = parts[0] + "," + parts.slice(1).join("");
  }

  return v;
}

// Valida de forma segura (máx 2 decimales)
function isValidMoneyInput(raw) {
  if (raw == null) return false;
  const s = String(raw).trim();
  if (!s) return false;

  const normalized = s.replace(",", ".");
  if (!/^\d+(\.\d{0,2})?$/.test(normalized)) return false;

  const n = Number(normalized);
  return Number.isFinite(n) && n > 0;
}

// Formatea un número (o string) a "0.00" usando coma si quieres (aquí lo dejo con coma visual)
function formatToTwoDecimals(value) {
  if (value === null || value === undefined || value === "") return "";
  const n = typeof value === "number" ? value : Number(String(value).replace(",", "."));
  if (!Number.isFinite(n)) return "";
  // usamos punto en value interno y coma visual en el input si quieres
  return n.toFixed(2).replace(".", ",");
}

export default function EditExpense() {
  const { id } = useParams();
  const nav = useNavigate();

  const [month, setMonth] = useState(null);
  const [categories, setCategories] = useState([]);

  const [amount, setAmount] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [attribution, setAttribution] = useState("MINE");
  const [paymentMethod, setPaymentMethod] = useState("CARD");
  const [concept, setConcept] = useState("");
  const [dateTimeLocal, setDateTimeLocal] = useState("");

  const [status, setStatus] = useState({ loading: true, error: "", ok: "" });

  useEffect(() => {
    async function load() {
      try {
        const [m, cats, tx] = await Promise.all([
          getCurrentMonth(),
          getCategories(),
          getTransaction(id),
        ]);

        setMonth(m);
        setCategories(cats);

        // ✅ Si el backend ya devuelve amount_eur, lo usamos (recomendado)
        // Si no existe, fallback:
        // - si tx.amount parece céntimos (int grande), lo pasamos a euros
        // - si no, lo dejamos tal cual
        let initialAmount = "";
        if (tx?.amount_eur !== undefined && tx?.amount_eur !== null) {
          initialAmount = formatToTwoDecimals(tx.amount_eur);
        } else if (typeof tx?.amount === "number") {
          // heurística: si viene como entero, y tú ya migraste a céntimos, convertimos
          // (si aún no migraste, lo verás con 2 decimales igualmente)
          const eur = tx.amount >= 100 ? tx.amount / 100 : tx.amount;
          initialAmount = formatToTwoDecimals(eur);
        } else {
          initialAmount = String(tx?.amount ?? "");
        }

        setAmount(initialAmount);
        setCategoryId(tx.category_id || (cats?.[0]?.id ?? ""));
        setAttribution(tx.attribution || "MINE");
        setPaymentMethod(tx.payment_method || "CARD");
        setConcept(tx.concept || "");
        setDateTimeLocal(toLocalDateTimeValue(tx.date_time));
      } catch (e) {
        setStatus({ loading: false, error: e.message, ok: "" });
        return;
      }
      setStatus({ loading: false, error: "", ok: "" });
    }
    load();
  }, [id]);

  const canSubmit = useMemo(() => {
    return (
      isValidMoneyInput(amount) &&
      !!categoryId &&
      !!attribution &&
      !!paymentMethod &&
      !!dateTimeLocal
    );
  }, [amount, categoryId, attribution, paymentMethod, dateTimeLocal]);

  async function onSave() {
    setStatus({ loading: false, error: "", ok: "" });

    if (!isValidMoneyInput(amount)) {
      setStatus({ loading: false, error: "Cantidad inválida (usa 3,50 o 3.50)", ok: "" });
      return;
    }

    try {
      const iso = new Date(dateTimeLocal).toISOString();

      await updateTransaction(id, {
        // ✅ mandamos STRING (coma/punto) y que backend convierta a céntimos
        amount: amount.trim(),
        category_id: categoryId,
        attribution,
        payment_method: paymentMethod,
        concept: concept.trim() ? concept.trim() : null,
        date_time: iso,
      });

      setStatus({ loading: false, error: "", ok: "Cambios guardados ✅" });

      setTimeout(() => nav("/movements"), 450);
    } catch (e) {
      setStatus({ loading: false, error: e.message, ok: "" });
    }
  }

  async function onDelete() {
    const ok = window.confirm("¿Borrar este gasto? No se puede deshacer.");
    if (!ok) return;

    setStatus({ loading: false, error: "", ok: "" });
    try {
      await deleteTransaction(id);
      nav("/movements");
    } catch (e) {
      setStatus({ loading: false, error: e.message, ok: "" });
    }
  }

  return (
    <>
      <Layout
        title="Editar gasto"
        rightSlot={
          <button
            onClick={() => nav("/movements")}
            className="text-sm px-3 py-2 rounded-xl bg-white/10 border border-white/10"
          >
            Volver
          </button>
        }
      >
        {status.loading ? (
          <div className="text-white/60">Cargando…</div>
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
                    Formato inválido. Usa 3,50 o 3.50 (máx 2 decimales).
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
                  <span className="text-xs text-white/60">Quién</span>
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
                onClick={onSave}
                className={`w-full rounded-2xl py-3 font-semibold ${
                  canSubmit
                    ? "bg-white text-black"
                    : "bg-white/10 text-white/40 border border-white/10"
                }`}
              >
                Guardar cambios
              </button>

              <button
                onClick={onDelete}
                className="w-full rounded-2xl py-3 font-semibold bg-red-500/20 border border-red-500/30 text-red-200"
              >
                Borrar gasto
              </button>

              <p className="text-xs text-white/50">
                Mes activo: {month?.period_key || "—"}
              </p>
            </div>
          </div>
        )}
      </Layout>

      <BottomNav />
    </>
  );
}
