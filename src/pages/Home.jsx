import { useEffect, useMemo, useState } from "react";
import Layout from "../components/Layout";
import BottomNav from "../components/BottomNav";
import { getCurrentMonth, startMonth } from "../api/month";
import { getTransactions } from "../api/transactions";
import { api } from "../api/client";

function Card({ children }) {
  return <div className="rounded-2xl border border-white/10 bg-white/5 p-4">{children}</div>;
}

function euro(n) {
  const num = Number(n);
  return new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(
    Number.isFinite(num) ? num : 0
  );
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function ProgressBar({ value, max }) {
  const pct = max > 0 ? clamp(Math.round((value / max) * 100), 0, 100) : 0;
  return (
    <div className="mt-2 h-2 w-full rounded-full bg-white/10 overflow-hidden">
      <div className="h-2 rounded-full bg-white" style={{ width: `${pct}%` }} />
    </div>
  );
}

function formatMonthLabel(periodKey) {
  if (!periodKey) return "—";
  const [y, m] = String(periodKey).split("-");
  const monthIndex = Number(m) - 1;
  if (!Number.isFinite(monthIndex) || monthIndex < 0 || monthIndex > 11) return periodKey;

  const d = new Date(Number(y), monthIndex, 1);
  const label = new Intl.DateTimeFormat("es-ES", { month: "long", year: "numeric" }).format(d);
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function formatDateTimeFromDateString(dateStr, endOfDay = false) {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  d.setHours(endOfDay ? 23 : 0, endOfDay ? 59 : 0, 0, 0);

  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(d);
}

async function getSummaryCurrent() {
  return api("/summary/current");
}
async function getSafetyBalance() {
  return api("/safety/balance");
}
async function getPiggybanksSummary() {
  return api("/piggybanks/summary");
}

function getAmountEur(t) {
  if (t?.amount_eur !== undefined && t?.amount_eur !== null) {
    const n = Number(t.amount_eur);
    return Number.isFinite(n) ? n : 0;
  }
  const cents = Number(t?.amount ?? 0);
  return Number.isFinite(cents) ? cents / 100 : 0;
}

export default function Home() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [month, setMonth] = useState(null);
  const [summary, setSummary] = useState(null);
  const [tx, setTx] = useState([]);

  const [safety, setSafety] = useState({ balance: 0, balance_eur: 0 });
  const [piggySummary, setPiggySummary] = useState([]);

  const [incomeAmount, setIncomeAmount] = useState("");
  const [savingGoalAmount, setSavingGoalAmount] = useState("");
  const [weeklyBudgetAmount, setWeeklyBudgetAmount] = useState("");

  async function load() {
    setLoading(true);
    setError("");

    try {
      const s = await getSummaryCurrent();
      setSummary(s);

      const m = s?.month ? s.month : await getCurrentMonth();
      setMonth(m || null);

      if (m?.id) {
        const [rows, sb, pbs] = await Promise.all([
          getTransactions(m.id),
          getSafetyBalance(),
          getPiggybanksSummary(),
        ]);

        setTx(rows || []);
        setSafety(sb || { balance: 0, balance_eur: 0 });
        setPiggySummary(pbs || []);
      } else {
        setTx([]);
        setSafety({ balance: 0, balance_eur: 0 });
        setPiggySummary([]);
      }
    } catch (e) {
      setError(e?.message || "Error cargando datos");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleStartMonth() {
    setError("");
    try {
      const payload = {
        incomeAmount: String(incomeAmount).trim(),
        savingGoalAmount: String(savingGoalAmount).trim(),
        weeklyBudgetAmount: String(weeklyBudgetAmount).trim(),
      };

      await startMonth(payload);
      await load();
    } catch (e) {
      setError(e?.message || "Error iniciando mes");
    }
  }

  const totals = summary?.totals || null;
  const week = summary?.week || null;

  // ✅ NUEVO: balances bank/cash desde backend
  const balances = summary?.balances || null;
  const bankEur = balances?.bank_eur ?? 0;
  const cashEur = balances?.cash_eur ?? 0;
  const bankOutEur = balances?.bank_out_eur ?? 0;
  const cashOutEur = balances?.cash_out_eur ?? 0;
  const cashInEur = balances?.cash_in_eur ?? 0;

  const remainingWeekEur = totals?.remainingWeek_eur ?? 0;
  const weekSpentEur = totals?.weekSpent_eur ?? 0;
  const remainingMonthEur = totals?.remainingMonth_eur ?? 0;
  const totalExpensesEur = totals?.totalExpenses_eur ?? 0;
  const totalIncomeEur = totals?.totalIncome_eur ?? 0;
  const dailyPaceEur = totals?.dailyPace_eur ?? 0;

  const byAttrEur = totals?.byAttr_eur || { MINE: 0, PARTNER: 0, HOUSE: 0 };

  const monthLabel = formatMonthLabel(month?.period_key);
  const monthIncomeEur = month?.income_amount_eur ?? 0;
  const monthSavingGoalEur = month?.saving_goal_amount_eur ?? 0;
  const monthWeeklyBudgetEur = month?.weekly_budget_amount_eur ?? 0;

  const weekRangeLabel = week
    ? `${formatDateTimeFromDateString(week.start_date, false)} → ${formatDateTimeFromDateString(
        week.end_date,
        true
      )}`
    : "Semana no disponible";

  const insights = useMemo(() => {
    const expenses = tx.filter((t) => t.direction === "OUT" && t.type === "EXPENSE");
    const total = expenses.reduce((a, t) => a + getAmountEur(t), 0);

    const catMap = new Map();
    for (const t of expenses) {
      const key = t.category_name || "Sin categoría";
      catMap.set(key, (catMap.get(key) || 0) + getAmountEur(t));
    }
    const topCategories = Array.from(catMap.entries())
      .map(([name, sum]) => ({ name, sum }))
      .sort((a, b) => b.sum - a.sum)
      .slice(0, 5);

    const conceptMap = new Map();
    for (const t of expenses) {
      const key = t.concept?.trim() ? t.concept.trim() : t.category_name || "—";
      conceptMap.set(key, (conceptMap.get(key) || 0) + getAmountEur(t));
    }
    const topConcepts = Array.from(conceptMap.entries())
      .map(([label, sum]) => ({ label, sum }))
      .sort((a, b) => b.sum - a.sum)
      .slice(0, 5);

    return { total, topCategories, topConcepts };
  }, [tx]);

  const piggyTwoEuro = useMemo(() => piggySummary.find((p) => p.type === "TWO_EURO"), [piggySummary]);
  const piggyNormal = useMemo(() => piggySummary.find((p) => p.type === "NORMAL"), [piggySummary]);

  const safetyEur = safety?.balance_eur ?? 0;
function centsToEurSafe(cents) {
  const n = Number(cents);
  return Number.isFinite(n) ? n  : 0;
}

// ✅ SIEMPRE desde balance (céntimos). balance_eur lo ignoramos.
const piggyTwoEur = centsToEurSafe(piggyTwoEuro?.balance ?? 0);
const piggyNormalEur = centsToEurSafe(piggyNormal?.balance ?? 0);

  return (
    <>
      <Layout
        title="Home"
        rightSlot={
          <button onClick={load} className="text-sm px-3 py-2 rounded-xl bg-white/10 border border-white/10">
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
        ) : !month ? (
          <div className="space-y-4">
            <Card>
              <p className="text-white/60 text-sm">No hay mes abierto</p>
              <p className="mt-1 text-lg font-semibold">Inicia el mes para empezar a registrar gastos.</p>
            </Card>

            <Card>
              <p className="text-sm font-semibold">Iniciar mes</p>

              <div className="mt-3 space-y-3">
                <label className="block">
                  <span className="text-xs text-white/60">Ingreso del mes (€)</span>
                  <input
                    inputMode="decimal"
                    className="mt-1 w-full rounded-xl bg-black/40 border border-white/10 px-3 py-3"
                    value={incomeAmount}
                    onChange={(e) => setIncomeAmount(e.target.value)}
                    placeholder="Ej: 2500"
                  />
                </label>

                <label className="block">
                  <span className="text-xs text-white/60">Ahorro objetivo (€)</span>
                  <input
                    inputMode="decimal"
                    className="mt-1 w-full rounded-xl bg-black/40 border border-white/10 px-3 py-3"
                    value={savingGoalAmount}
                    onChange={(e) => setSavingGoalAmount(e.target.value)}
                    placeholder="Ej: 400"
                  />
                </label>

                <label className="block">
                  <span className="text-xs text-white/60">Presupuesto semanal (€)</span>
                  <input
                    inputMode="decimal"
                    className="mt-1 w-full rounded-xl bg-black/40 border border-white/10 px-3 py-3"
                    value={weeklyBudgetAmount}
                    onChange={(e) => setWeeklyBudgetAmount(e.target.value)}
                    placeholder="Ej: 150"
                  />
                </label>

                <button onClick={handleStartMonth} className="w-full rounded-2xl bg-white text-black py-3 font-semibold">
                  Empezar mes
                </button>
              </div>
            </Card>
          </div>
        ) : (
          <div className="space-y-4">
            <Card>
              <p className="text-white/60 text-sm">Mes activo</p>
              <p className="mt-1 text-2xl font-semibold">{monthLabel}</p>
              <p className="text-xs text-white/60 mt-2">
                Ingreso base: {euro(monthIncomeEur)} · Ahorro objetivo: {euro(monthSavingGoalEur)} · Semana:{" "}
                {euro(monthWeeklyBudgetEur)}
              </p>
            </Card>

            {/* ✅ NUEVO: Banco / Bolsillo */}
            <Card>
              <p className="text-sm font-semibold">Banco y bolsillo</p>

              <div className="mt-3 grid grid-cols-2 gap-3 justify-between text-center">
                <div className="rounded-xl bg-black/40 border border-white/10 p-3">
                  <p className="text-xs text-white/60">Banco (saldo)</p>
                  <p className="mt-1 text-xl font-semibold">{euro(bankEur)}</p>
                </div>

                <div className="rounded-xl bg-black/40 border border-white/10 p-3">
                  <p className="text-xs text-white/60">Bolsillo (saldo)</p>
                  <p className="mt-1 text-xl font-semibold">{euro(cashEur)}</p>
                  
                </div>
              </div>

              <p className="mt-2 text-[11px] text-white/50">
                Tarjeta/transferencia resta del banco. Efectivo resta del bolsillo. La retirada semanal mueve banco → bolsillo.
              </p>
            </Card>

            <div className="grid grid-cols-2 gap-3">
              <Card>
                <p className="text-xs text-white/60">Queda esta semana</p>
                <p className={`mt-2 text-2xl font-semibold ${remainingWeekEur < 0 ? "text-red-200" : ""}`}>
                  {euro(remainingWeekEur)}
                </p>
                <p className="text-xs text-white/50 mt-1">Gastado: {euro(weekSpentEur)}</p>
                <p className="text-[11px] text-white/40 mt-2">{weekRangeLabel}</p>
              </Card>

              <Card>
                <p className="text-xs text-white/60">Queda este mes</p>
                <p className={`mt-2 text-2xl font-semibold ${remainingMonthEur < 0 ? "text-red-200" : ""}`}>
                  {euro(remainingMonthEur)}
                </p>
                <p className="text-xs text-white/50 mt-1">Gastos: {euro(totalExpensesEur)}</p>
                <p className="text-xs text-white/50">Ingresos: {euro(totalIncomeEur)}</p>
              </Card>
            </div>

            <Card>
              <p className="text-xs text-white/60">Ritmo diario recomendado</p>
              <div className="mt-2 flex items-end justify-between gap-2">
                <p className="text-2xl font-semibold">{euro(dailyPaceEur)}/día</p>
                <p className="text-xs text-white/50">{totals?.daysLeft ?? 0} días restantes</p>
              </div>
              <p className="mt-2 text-xs text-white/50">Si te mantienes cerca, llegas al final sin pasarte.</p>
            </Card>

            <Card>
              <p className="text-sm font-semibold">¿Quién está pagando qué?</p>
              <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                <div className="rounded-xl bg-black/40 border border-white/10 p-3">
                  <p className="text-xs text-white/60">Mío</p>
                  <p className="mt-1 font-semibold">{euro(byAttrEur.MINE ?? 0)}</p>
                </div>
                <div className="rounded-xl bg-black/40 border border-white/10 p-3">
                  <p className="text-xs text-white/60">Mi mujer</p>
                  <p className="mt-1 font-semibold">{euro(byAttrEur.PARTNER ?? 0)}</p>
                </div>
                <div className="rounded-xl bg-black/40 border border-white/10 p-3">
                  <p className="text-xs text-white/60">Casa</p>
                  <p className="mt-1 font-semibold">{euro(byAttrEur.HOUSE ?? 0)}</p>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-4 gap-3">
  <a href="/add" className="rounded-2xl bg-white text-black text-center py-3 font-semibold">
    Gasto
  </a>

  <a href="/add-income" className="rounded-2xl bg-green-400 text-black text-center py-3 font-semibold">
    Ingreso
  </a>

  <a href="/close-week" className="rounded-2xl bg-white/10 border border-white/10 text-center py-3 font-semibold">
    Cerrar semana
  </a>

  <a href="/movements" className="rounded-2xl bg-white/10 border border-white/10 text-center py-3 font-semibold">
    Movs
  </a>
</div>
            </Card>

            <Card>
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold">Insights (solo gastos)</p>
                <p className="text-xs text-white/60">Total: {euro(insights.total)}</p>
              </div>

              <div className="mt-4">
                <p className="text-xs text-white/60">Top categorías</p>
                <div className="mt-2 space-y-3">
                  {insights.topCategories.length === 0 ? (
                    <p className="text-white/60 text-sm">Aún no hay gastos.</p>
                  ) : (
                    insights.topCategories.map((c) => (
                      <div key={c.name} className="rounded-xl bg-black/40 border border-white/10 p-3">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-semibold truncate">{c.name}</p>
                          <p className="text-sm">{euro(c.sum)}</p>
                        </div>
                        <ProgressBar value={c.sum} max={insights.total} />
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="mt-5">
                <p className="text-xs text-white/60">Top conceptos</p>
                <div className="mt-2 space-y-2">
                  {insights.topConcepts.length === 0 ? (
                    <p className="text-white/60 text-sm">Aún no hay gastos.</p>
                  ) : (
                    insights.topConcepts.map((c) => (
                      <div
                        key={c.label}
                        className="flex items-center justify-between gap-2 rounded-xl bg-black/40 border border-white/10 px-3 py-2"
                      >
                        <p className="text-sm font-medium truncate">{c.label}</p>
                        <p className="text-sm">{euro(c.sum)}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <p className="mt-3 text-xs text-white/50">
                Solo cuenta <span className="font-semibold">EXPENSE</span>.
              </p>
            </Card>

            <Card>
              <p className="text-sm font-semibold">Ahorros y huchas</p>

              <div className="mt-3 grid grid-cols-1 gap-3">
                <div className="rounded-xl bg-black/40 border border-white/10 p-3">
                  <p className="text-xs text-white/60">Fondo de seguridad (banco)</p>
                  <p className="mt-1 text-xl font-semibold">{euro(safetyEur)}</p>
                  <p className="text-xs text-white/50 mt-1">Solo para imprevistos (y registrarlo en la app).</p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-black/40 border border-white/10 p-3">
                    <p className="text-xs text-white/60">Hucha 2€</p>
                    <p className="mt-1 text-lg font-semibold">{euro(piggyTwoEur)}</p>
                    <p className="text-[11px] text-white/40 mt-1">{piggyTwoEuro?.entries_count ?? 0} entradas</p>
                  </div>

                  <div className="rounded-xl bg-black/40 border border-white/10 p-3">
                    <p className="text-xs text-white/60">Hucha normal</p>
                    <p className="mt-1 text-lg font-semibold">{euro(piggyNormalEur)}</p>
                    <p className="text-[11px] text-white/40 mt-1">{piggyNormal?.entries_count ?? 0} entradas</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <a
                    href="/huchas"
                    className="rounded-2xl bg-white/10 border border-white/10 text-center py-3 font-semibold"
                  >
                    Ver huchas
                  </a>
                  <a
                    href="/imprevisto"
                    className="rounded-2xl bg-white/10 border border-white/10 text-center py-3 font-semibold"
                  >
                    Imprevisto
                  </a>
                </div>
              </div>
            </Card>
          </div>
        )}
      </Layout>

      <BottomNav />
    </>
  );
}
