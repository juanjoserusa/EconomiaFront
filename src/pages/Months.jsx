import { useEffect, useMemo, useState } from "react";
import Layout from "../components/Layout";
import BottomNav from "../components/BottomNav";

import {
  getMonths,
  updateMonth,
  closeMonth,
  deleteMonth,
  startMonth,
} from "../api/month";

function euro(n) {
  return new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(n);
}

function monthLabel(periodKey) {
  if (!periodKey) return "—";
  const [y, m] = String(periodKey).split("-");
  const idx = Number(m) - 1;
  if (idx < 0 || idx > 11) return periodKey;
  const d = new Date(Number(y), idx, 1);
  const label = new Intl.DateTimeFormat("es-ES", { month: "long", year: "numeric" }).format(d);
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function formatDate(dateStr) {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  return new Intl.DateTimeFormat("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" }).format(d);
}

function Card({ children }) {
  return <div className="rounded-2xl border border-white/10 bg-white/5 p-4">{children}</div>;
}

export default function Months() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");

  // Editor (para el mes OPEN)
  const [editId, setEditId] = useState("");
  const [incomeAmount, setIncomeAmount] = useState("");
  const [savingGoalAmount, setSavingGoalAmount] = useState("");
  const [weeklyBudgetAmount, setWeeklyBudgetAmount] = useState("");

  // Crear mes nuevo (cuando no hay OPEN)
  const [newIncome, setNewIncome] = useState("");
  const [newSaving, setNewSaving] = useState("");
  const [newWeekly, setNewWeekly] = useState("");

  const openMonth = useMemo(() => rows.find((m) => m.status === "OPEN") || null, [rows]);

  async function load() {
    setLoading(true);
    setError("");
    setOk("");
    try {
      const m = await getMonths();
      setRows(m || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  // Cuando cambia el openMonth, precarga editor
  useEffect(() => {
    if (openMonth?.id) {
      setEditId(openMonth.id);
      setIncomeAmount(String(openMonth.income_amount ?? ""));
      setSavingGoalAmount(String(openMonth.saving_goal_amount ?? ""));
      setWeeklyBudgetAmount(String(openMonth.weekly_budget_amount ?? ""));
    } else {
      setEditId("");
      setIncomeAmount("");
      setSavingGoalAmount("");
      setWeeklyBudgetAmount("");
    }
  }, [openMonth?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  function flashOk(msg) {
    setOk(msg);
    setTimeout(() => setOk(""), 1200);
  }

  async function onUpdateOpenMonth() {
    if (!editId) return;

    const payload = {};
    if (incomeAmount !== "") payload.incomeAmount = Number(incomeAmount);
    if (savingGoalAmount !== "") payload.savingGoalAmount = Number(savingGoalAmount);
    if (weeklyBudgetAmount !== "") payload.weeklyBudgetAmount = Number(weeklyBudgetAmount);

    setBusyId(editId);
    setError("");
    setOk("");
    try {
      await updateMonth(editId, payload);
      flashOk("Mes actualizado ✅");
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusyId("");
    }
  }

  async function onCloseMonth() {
    if (!openMonth?.id) return;
    const sure = window.confirm(
      `¿Cerrar ${monthLabel(openMonth.period_key)}?\n\nEsto consolidará ahorro + sobrante al fondo y cerrará el mes.`
    );
    if (!sure) return;

    setBusyId(openMonth.id);
    setError("");
    setOk("");
    try {
      await closeMonth(openMonth.id);
      flashOk("Mes cerrado ✅");
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusyId("");
    }
  }

  async function onDeleteMonth(monthId, label) {
    const sure = window.confirm(
      `¿Borrar el mes ${label}?\n\nSe borrarán también sus semanas y movimientos.\nLas huchas NO se tocan.`
    );
    if (!sure) return;

    setBusyId(monthId);
    setError("");
    setOk("");
    try {
      await deleteMonth(monthId);
      flashOk("Mes borrado ✅");
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusyId("");
    }
  }

  async function onStartNewMonth() {
    setError("");
    setOk("");

    if (openMonth) {
      setError("Ya existe un mes OPEN. Ciérralo o bórralo antes de crear otro.");
      return;
    }

    if (!newIncome || !newSaving || !newWeekly) {
      setError("Rellena ingreso, ahorro objetivo y presupuesto semanal.");
      return;
    }

    setBusyId("NEW");
    try {
      await startMonth({
        incomeAmount: Number(newIncome),
        savingGoalAmount: Number(newSaving),
        weeklyBudgetAmount: Number(newWeekly),
      });
      flashOk("Mes creado ✅");
      setNewIncome("");
      setNewSaving("");
      setNewWeekly("");
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusyId("");
    }
  }

  return (
    <>
      <Layout
        title="Meses"
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

        {ok ? (
          <div className="mb-4 rounded-xl border border-green-500/30 bg-green-500/10 p-3 text-sm text-green-200">
            {ok}
          </div>
        ) : null}

        {loading ? (
          <div className="text-white/60">Cargando…</div>
        ) : (
          <div className="space-y-4">
            {/* ====== MES ACTIVO ====== */}
            <Card>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs text-white/60">Mes activo</p>
                  <p className="mt-1 text-xl font-semibold truncate">
                    {openMonth ? monthLabel(openMonth.period_key) : "—"}
                  </p>
                  <p className="text-xs text-white/50 mt-1">
                    {openMonth
                      ? `Del ${formatDate(openMonth.start_date)} al ${formatDate(openMonth.end_date)}`
                      : "No hay mes abierto"}
                  </p>
                </div>

                <a
                  href="/"
                  className="text-sm px-3 py-2 rounded-xl bg-white/10 border border-white/10"
                >
                  Home
                </a>
              </div>

              {openMonth ? (
                <div className="mt-4 space-y-3">
                  <div className="grid grid-cols-3 gap-2">
                    <label className="block">
                      <span className="text-[11px] text-white/60">Ingreso</span>
                      <input
                        inputMode="numeric"
                        className="mt-1 w-full rounded-xl bg-black/40 border border-white/10 px-3 py-2"
                        value={incomeAmount}
                        onChange={(e) => setIncomeAmount(e.target.value)}
                      />
                    </label>

                    <label className="block">
                      <span className="text-[11px] text-white/60">Ahorro</span>
                      <input
                        inputMode="numeric"
                        className="mt-1 w-full rounded-xl bg-black/40 border border-white/10 px-3 py-2"
                        value={savingGoalAmount}
                        onChange={(e) => setSavingGoalAmount(e.target.value)}
                      />
                    </label>

                    <label className="block">
                      <span className="text-[11px] text-white/60">Semana</span>
                      <input
                        inputMode="numeric"
                        className="mt-1 w-full rounded-xl bg-black/40 border border-white/10 px-3 py-2"
                        value={weeklyBudgetAmount}
                        onChange={(e) => setWeeklyBudgetAmount(e.target.value)}
                      />
                    </label>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={onUpdateOpenMonth}
                      disabled={busyId === openMonth.id}
                      className={`rounded-2xl py-3 font-semibold ${
                        busyId === openMonth.id
                          ? "bg-white/10 text-white/40 border border-white/10"
                          : "bg-white text-black"
                      }`}
                    >
                      {busyId === openMonth.id ? "Guardando…" : "Guardar cambios"}
                    </button>

                    <button
                      onClick={onCloseMonth}
                      disabled={busyId === openMonth.id}
                      className="rounded-2xl py-3 font-semibold bg-white/10 border border-white/10"
                    >
                      Cerrar mes
                    </button>
                  </div>

                  <p className="text-xs text-white/50">
                    Presupuesto semanal: <span className="font-semibold">{euro(openMonth.weekly_budget_amount)}</span>
                    {" · "}
                    Ahorro objetivo: <span className="font-semibold">{euro(openMonth.saving_goal_amount)}</span>
                  </p>
                </div>
              ) : (
                <div className="mt-4 rounded-2xl border border-white/10 bg-black/30 p-3 space-y-3">
                  <p className="text-sm font-semibold">Crear mes nuevo</p>

                  <div className="grid grid-cols-3 gap-2">
                    <label className="block">
                      <span className="text-[11px] text-white/60">Ingreso</span>
                      <input
                        inputMode="numeric"
                        className="mt-1 w-full rounded-xl bg-black/40 border border-white/10 px-3 py-2"
                        value={newIncome}
                        onChange={(e) => setNewIncome(e.target.value)}
                        placeholder="2500"
                      />
                    </label>

                    <label className="block">
                      <span className="text-[11px] text-white/60">Ahorro</span>
                      <input
                        inputMode="numeric"
                        className="mt-1 w-full rounded-xl bg-black/40 border border-white/10 px-3 py-2"
                        value={newSaving}
                        onChange={(e) => setNewSaving(e.target.value)}
                        placeholder="400"
                      />
                    </label>

                    <label className="block">
                      <span className="text-[11px] text-white/60">Semana</span>
                      <input
                        inputMode="numeric"
                        className="mt-1 w-full rounded-xl bg-black/40 border border-white/10 px-3 py-2"
                        value={newWeekly}
                        onChange={(e) => setNewWeekly(e.target.value)}
                        placeholder="150"
                      />
                    </label>
                  </div>

                  <button
                    onClick={onStartNewMonth}
                    disabled={busyId === "NEW"}
                    className={`w-full rounded-2xl py-3 font-semibold ${
                      busyId === "NEW" ? "bg-white/10 text-white/40 border border-white/10" : "bg-white text-black"
                    }`}
                  >
                    {busyId === "NEW" ? "Creando…" : "Empezar mes"}
                  </button>
                </div>
              )}
            </Card>

            {/* ====== LISTA DE MESES ====== */}
            <div className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
              <div className="px-4 py-3 border-b border-white/10 text-sm text-white/60">
                Historial de meses
              </div>

              {rows.length === 0 ? (
                <div className="p-4 text-white/60">No hay meses todavía.</div>
              ) : (
                <ul className="divide-y divide-white/10">
                  {rows.map((m) => {
                    const label = monthLabel(m.period_key);
                    const isOpen = m.status === "OPEN";
                    return (
                      <li key={m.id} className="p-4 flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold truncate">
                            {label}{" "}
                            {isOpen ? (
                              <span className="ml-2 text-[11px] px-2 py-1 rounded-full bg-green-500/15 border border-green-500/30 text-green-200">
                                OPEN
                              </span>
                            ) : (
                              <span className="ml-2 text-[11px] px-2 py-1 rounded-full bg-white/10 border border-white/10 text-white/60">
                                CLOSED
                              </span>
                            )}
                          </p>
                          <p className="text-xs text-white/50 mt-1">
                            {formatDate(m.start_date)} → {formatDate(m.end_date)}
                          </p>
                          <p className="text-xs text-white/50 mt-1">
                            Ingreso {euro(m.income_amount)} · Ahorro {euro(m.saving_goal_amount)} · Semana{" "}
                            {euro(m.weekly_budget_amount)}
                          </p>
                        </div>

                        <div className="flex flex-col gap-2">
                          <button
                            onClick={() => onDeleteMonth(m.id, label)}
                            disabled={busyId === m.id}
                            className="px-3 py-2 rounded-xl bg-red-500/10 border border-red-500/30 text-red-200 text-sm font-semibold"
                          >
                            {busyId === m.id ? "Borrando…" : "Borrar"}
                          </button>

                          {isOpen ? (
                            <button
                              onClick={onCloseMonth}
                              disabled={busyId === m.id}
                              className="px-3 py-2 rounded-xl bg-white/10 border border-white/10 text-sm font-semibold"
                            >
                              Cerrar
                            </button>
                          ) : null}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            <p className="text-xs text-white/40 px-1">
              Borrar un mes elimina sus semanas y movimientos. Las huchas no se tocan.
            </p>
          </div>
        )}
      </Layout>

      <BottomNav />
    </>
  );
}
