import { useEffect, useMemo, useState } from "react";
import Layout from "../components/Layout";
import BottomNav from "../components/BottomNav";
import { api } from "../api/client";
import { getWeeks, closeWeek } from "../api/weeks";

function Card({ children }) {
  return <div className="rounded-2xl border border-white/10 bg-white/5 p-4">{children}</div>;
}

function euro(n) {
  const num = Number(n);
  return new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(
    Number.isFinite(num) ? num : 0
  );
}

function sanitizeMoneyTyping(value) {
  let v = String(value).replace(/[^\d.,]/g, "");
  const parts = v.split(/[.,]/);
  if (parts.length > 2) v = parts[0] + "," + parts.slice(1).join("");
  return v;
}

function parseMoneyLooseToNumber(raw) {
  if (raw == null) return 0;
  const s = String(raw).trim();
  if (!s) return 0;
  const normalized = s.replace(",", ".");
  const n = Number(normalized);
  return Number.isFinite(n) ? n : 0;
}

async function getSummaryCurrent() {
  return api("/summary/current");
}

function isEnded(week) {
  // week.end_date es DATE -> "YYYY-MM-DD"
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const end = new Date(week.end_date);
  end.setHours(0, 0, 0, 0);
  return end < today;
}

export default function CloseWeek() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [ok, setOk] = useState("");

  const [weeks, setWeeks] = useState([]);
  const [selectedWeekId, setSelectedWeekId] = useState("");

  const [summary, setSummary] = useState(null);

  const [piggyTwoAmount, setPiggyTwoAmount] = useState("");
  const [piggyNormalAmount, setPiggyNormalAmount] = useState("");
  const [returnToBankAmount, setReturnToBankAmount] = useState("");
  const [note, setNote] = useState("");

  const selectedWeek = useMemo(
    () => weeks.find((w) => w.id === selectedWeekId) || null,
    [weeks, selectedWeekId]
  );

  async function load() {
    setLoading(true);
    setError("");
    setOk("");
    try {
      const [w, s] = await Promise.all([getWeeks(), getSummaryCurrent()]);
      const list = (w || []).filter((x) => x.status === "OPEN");
      setWeeks(list);
      setSummary(s || null);

      // ✅ default: última OPEN que ya terminó
      const ended = list.filter(isEnded);
      const defaultWeek = ended.length ? ended[ended.length - 1] : list[list.length - 1] || null;

      setSelectedWeekId(defaultWeek?.id || "");
      setPiggyTwoAmount("");
      setPiggyNormalAmount("");
      setReturnToBankAmount("");
      setNote("");
    } catch (e) {
      setError(e?.message || "Error cargando datos");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  // Ojo: el bolsillo disponible que muestras en summary es “global del mes”.
  // Para cerrar la semana concreta, el backend valida el bolsillo DE ESA SEMANA.
  const cashEurMonth = summary?.balances?.cash_eur ?? 0;

  const totalToMoveEur = useMemo(() => {
    return (
      parseMoneyLooseToNumber(piggyTwoAmount) +
      parseMoneyLooseToNumber(piggyNormalAmount) +
      parseMoneyLooseToNumber(returnToBankAmount)
    );
  }, [piggyTwoAmount, piggyNormalAmount, returnToBankAmount]);

  const canClose = useMemo(() => {
    if (!selectedWeekId) return false;
    if (totalToMoveEur <= 0) return false;
    return true;
  }, [selectedWeekId, totalToMoveEur]);

  async function onSubmit() {
    if (!canClose) return;

    setSaving(true);
    setError("");
    setOk("");

    try {
      const payload = {
        piggyTwoAmount: String(piggyTwoAmount || "0").trim(),
        piggyNormalAmount: String(piggyNormalAmount || "0").trim(),
        returnToBankAmount: String(returnToBankAmount || "0").trim(),
        note: note.trim() ? note.trim() : null,
      };

      const r = await closeWeek(selectedWeekId, payload);

      setOk(`Semana cerrada ✅ · Total movido: ${euro(r?.moved?.total_eur ?? totalToMoveEur)}`);
      await load();
    } catch (e) {
      setError(e?.message || "Error cerrando semana");
    } finally {
      setSaving(false);
      setTimeout(() => setOk(""), 1500);
    }
  }

  return (
    <>
      <Layout
        title="Cerrar semana"
        rightSlot={
          <a href="/" className="text-sm px-3 py-2 rounded-xl bg-white/10 border border-white/10">
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
        ) : weeks.length === 0 ? (
          <Card>
            <p className="text-white/80">No hay semanas OPEN.</p>
            <p className="text-white/60 text-sm mt-1">Necesitas un mes abierto.</p>
          </Card>
        ) : (
          <div className="space-y-4">
            <Card>
              <p className="text-sm font-semibold">Elige qué semana cerrar</p>

              <label className="block mt-3">
                <span className="text-xs text-white/60">Semana</span>
                <select
                  className="mt-1 w-full rounded-xl bg-black/40 border border-white/10 px-3 py-3"
                  value={selectedWeekId}
                  onChange={(e) => setSelectedWeekId(e.target.value)}
                >
                  {weeks.map((w) => (
                    <option key={w.id} value={w.id}>
                      #{w.week_index} · {w.start_date} → {w.end_date} {isEnded(w) ? "(terminada)" : "(actual)"}
                    </option>
                  ))}
                </select>
              </label>

              <p className="mt-2 text-xs text-white/50">
                Consejo: cierra una semana cuando ya terminó (lunes→domingo).
              </p>
            </Card>

            <Card>
              <p className="text-sm font-semibold">Info rápida</p>
              <p className="text-xs text-white/60 mt-2">Bolsillo (mes): {euro(cashEurMonth)}</p>
              <p className="text-xs text-white/50 mt-1">
                El backend valida el bolsillo de la semana que cierres.
              </p>
            </Card>

            <Card>
              <p className="text-sm font-semibold">Reparto del sobrante</p>

              <div className="mt-3 space-y-3">
                <label className="block">
                  <span className="text-xs text-white/60">Hucha 2€</span>
                  <input
                    inputMode="decimal"
                    className="mt-1 w-full rounded-xl bg-black/40 border border-white/10 px-3 py-3 text-lg"
                    value={piggyTwoAmount}
                    onChange={(e) => setPiggyTwoAmount(sanitizeMoneyTyping(e.target.value))}
                    placeholder="Ej: 6,00"
                  />
                </label>

                <label className="block">
                  <span className="text-xs text-white/60">Hucha normal</span>
                  <input
                    inputMode="decimal"
                    className="mt-1 w-full rounded-xl bg-black/40 border border-white/10 px-3 py-3 text-lg"
                    value={piggyNormalAmount}
                    onChange={(e) => setPiggyNormalAmount(sanitizeMoneyTyping(e.target.value))}
                    placeholder="Ej: 10,50"
                  />
                </label>

                <label className="block">
                  <span className="text-xs text-white/60">Vuelve al banco</span>
                  <input
                    inputMode="decimal"
                    className="mt-1 w-full rounded-xl bg-black/40 border border-white/10 px-3 py-3 text-lg"
                    value={returnToBankAmount}
                    onChange={(e) => setReturnToBankAmount(sanitizeMoneyTyping(e.target.value))}
                    placeholder="Ej: 5"
                  />
                </label>

                <label className="block">
                  <span className="text-xs text-white/60">Nota (opcional)</span>
                  <input
                    className="mt-1 w-full rounded-xl bg-black/40 border border-white/10 px-3 py-3"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Ej: cierre semana"
                  />
                </label>

                <div className="rounded-xl bg-black/30 border border-white/10 p-3">
                  <p className="text-xs text-white/60">Total a mover</p>
                  <p className="mt-1 text-xl font-semibold">{euro(totalToMoveEur)}</p>
                </div>

                <button
                  disabled={!canClose || saving}
                  onClick={onSubmit}
                  className={`w-full rounded-2xl py-3 font-semibold ${
                    canClose && !saving
                      ? "bg-white text-black"
                      : "bg-white/10 text-white/40 border border-white/10"
                  }`}
                >
                  {saving ? "Cerrando…" : "Cerrar semana seleccionada"}
                </button>
              </div>
            </Card>
          </div>
        )}
      </Layout>

      <BottomNav />
    </>
  );
}
