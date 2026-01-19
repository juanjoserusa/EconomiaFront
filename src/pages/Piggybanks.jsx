import { useEffect, useMemo, useState } from "react";
import Layout from "../components/Layout";
import BottomNav from "../components/BottomNav";
import { getCurrentMonth } from "../api/month";
import { api } from "../api/client";

function euro(n) {
  const num = Number(n);
  return new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(
    Number.isFinite(num) ? num : 0
  );
}

function Card({ children }) {
  return <div className="rounded-2xl border border-white/10 bg-white/5 p-4">{children}</div>;
}

function sanitizeMoneyTyping(value) {
  let v = String(value).replace(/[^\d.,]/g, "");
  const parts = v.split(/[.,]/);
  if (parts.length > 2) v = parts[0] + "," + parts.slice(1).join("");
  return v;
}

function isValidMoneyInput(raw) {
  if (raw == null) return false;
  const s = String(raw).trim();
  if (!s) return false;
  const normalized = s.replace(",", ".");
  if (!/^\d+(\.\d{0,2})?$/.test(normalized)) return false;
  const n = Number(normalized);
  return Number.isFinite(n) && n > 0;
}

function parseMoneyLooseToNumber(raw) {
  if (raw == null) return NaN;
  const s = String(raw).trim();
  if (!s) return NaN;
  const normalized = s.replace(",", ".");
  const n = Number(normalized);
  return Number.isFinite(n) ? n : NaN;
}

function isMultipleOfTwoEuros(amountStr) {
  // true si amount es 2, 4, 6... (permitimos "2", "2,00", "4.0", etc)
  if (!isValidMoneyInput(amountStr)) return false;
  const n = parseMoneyLooseToNumber(amountStr);
  if (!Number.isFinite(n)) return false;
  // múltiplo exacto de 2 con tolerancia mínima por decimales
  const k = n / 2;
  return Math.abs(k - Math.round(k)) < 1e-9;
}

async function getPiggybanksSummary() {
  return api("/piggybanks/summary");
}

async function getPiggyEntries(piggyId) {
  return api(`/piggybanks/${piggyId}/entries`);
}

async function createPiggyEntry(piggyId, payload) {
  return api(`/piggybanks/${piggyId}/entries`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

async function deletePiggyEntry(entryId) {
  return api(`/piggybanks/entries/${entryId}`, { method: "DELETE" });
}

export default function Piggybanks() {
  const [month, setMonth] = useState(null);
  const [items, setItems] = useState([]);

  const [openForm, setOpenForm] = useState(null); // piggyId abierto (para añadir)
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");

  const [entriesOpenFor, setEntriesOpenFor] = useState(null); // piggyId abierto (para ver entradas)
  const [entries, setEntries] = useState([]);
  const [entriesLoading, setEntriesLoading] = useState(false);
  const [deletingEntryId, setDeletingEntryId] = useState("");

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
      setError(e?.message || "Error cargando huchas");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const openPiggy = useMemo(() => {
    if (!openForm) return null;
    return items.find((x) => x.id === openForm) || null;
  }, [openForm, items]);

  const isTwoEuroPiggy = openPiggy?.type === "TWO_EURO";

  const canSave = useMemo(() => {
    if (!openForm) return false;
    if (!isValidMoneyInput(amount)) return false;
    if (isTwoEuroPiggy && !isMultipleOfTwoEuros(amount)) return false;
    return true;
  }, [amount, openForm, isTwoEuroPiggy]);

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
      await createPiggyEntry(piggyId, {
        amount: String(amount).trim(), // string para "3,5"
        note: note.trim() ? note.trim() : null,
        month_id: month?.id || null,
      });

      setOk("Añadido ✅");
      resetForm();
      await load();

      // si estaba abierto el panel de entradas de esa misma hucha, refrescamos
      if (entriesOpenFor === piggyId) {
        await openEntries(piggyId);
      }
    } catch (e) {
      setError(e?.message || "Error guardando en hucha");
    } finally {
      setSaving(false);
      setTimeout(() => setOk(""), 1200);
    }
  }

  async function openEntries(piggyId) {
    setEntriesOpenFor(piggyId);
    setEntries([]);
    setEntriesLoading(true);
    setError("");
    try {
      const rows = await getPiggyEntries(piggyId);
      setEntries(rows || []);
    } catch (e) {
      setError(e?.message || "Error cargando entradas");
    } finally {
      setEntriesLoading(false);
    }
  }

  function closeEntries() {
    setEntriesOpenFor(null);
    setEntries([]);
  }

  async function onDeleteEntry(entryId) {
    if (!entryId) return;
    setDeletingEntryId(entryId);
    setError("");
    setOk("");
    try {
      await deletePiggyEntry(entryId);
      setOk("Entrada borrada ✅");

      // refresca panel + summary
      if (entriesOpenFor) await openEntries(entriesOpenFor);
      await load();
    } catch (e) {
      setError(e?.message || "Error borrando entrada");
    } finally {
      setDeletingEntryId("");
      setTimeout(() => setOk(""), 1200);
    }
  }

  return (
    <>
      <Layout
        title="Huchas"
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
                {items.map((p) => {
                  const isEntriesOpen = entriesOpenFor === p.id;
                  const isFormOpen = openForm === p.id;

                  return (
                    <Card key={p.id}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-xs text-white/60">{p.type}</p>
                          <p className="mt-1 text-lg font-semibold truncate">{p.name}</p>
                          <p className="text-xs text-white/50 mt-1">
                            Entradas: {p.entries_count}{" "}
                            {p.last_entry_at
                              ? `· Última: ${new Date(p.last_entry_at).toLocaleString("es-ES")}`
                              : ""}
                          </p>
                        </div>

                        <div className="text-right">
                          <p className="text-xs text-white/60">Saldo</p>
                          {/* ✅ SIEMPRE balance_eur (euros), NO balance (céntimos) */}
                          <p className="mt-1 text-xl font-semibold">{euro(p.balance_eur ?? 0)}</p>
                        </div>
                      </div>

                      <div className="mt-3 grid grid-cols-2 gap-3">
                        <button
                          onClick={() => {
                            if (isFormOpen) {
                              resetForm();
                            } else {
                              setOpenForm(p.id);
                              setAmount("");
                              setNote("");
                            }
                          }}
                          className="rounded-2xl bg-white text-black py-3 font-semibold"
                        >
                          {isFormOpen ? "Cancelar" : "Añadir"}
                        </button>

                        <button
                          onClick={() => {
                            if (isEntriesOpen) closeEntries();
                            else openEntries(p.id);
                          }}
                          className="rounded-2xl bg-white/10 border border-white/10 py-3 font-semibold"
                        >
                          {isEntriesOpen ? "Cerrar entradas" : "Ver entradas"}
                        </button>
                      </div>

                      {isFormOpen ? (
                        <div className="mt-4 rounded-2xl border border-white/10 bg-black/30 p-3 space-y-3">
                          <label className="block">
                            <span className="text-xs text-white/60">
                              Cantidad (€){" "}
                              {p.type === "TWO_EURO" ? "(múltiplos de 2€)" : ""}
                            </span>
                            <input
                              inputMode="decimal"
                              className="mt-1 w-full rounded-xl bg-black/40 border border-white/10 px-3 py-3 text-lg"
                              value={amount}
                              onChange={(e) => setAmount(sanitizeMoneyTyping(e.target.value))}
                              placeholder={p.type === "TWO_EURO" ? "Ej: 2 o 4 o 6" : "Ej: 20 o 36,8"}
                            />

                            {/* Validaciones */}
                            {!isValidMoneyInput(amount) && amount.trim() ? (
                              <p className="mt-1 text-xs text-red-200/80">
                                Formato inválido. Usa por ejemplo 3,50 o 3.50 (máx 2 decimales).
                              </p>
                            ) : null}

                            {p.type === "TWO_EURO" && isValidMoneyInput(amount) && !isMultipleOfTwoEuros(amount) ? (
                              <p className="mt-1 text-xs text-red-200/80">
                                En la hucha de 2€ solo puedes meter 2, 4, 6… (múltiplos de 2€).
                              </p>
                            ) : null}
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

                          <p className="text-xs text-white/50">Se registra con fecha/hora actual.</p>
                        </div>
                      ) : null}

                      {isEntriesOpen ? (
                        <div className="mt-4 rounded-2xl border border-white/10 bg-black/30 p-3">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-semibold">Entradas</p>
                            <button
                              onClick={() => openEntries(p.id)}
                              className="text-xs px-3 py-2 rounded-xl bg-white/10 border border-white/10"
                              disabled={entriesLoading}
                            >
                              {entriesLoading ? "Actualizando…" : "Actualizar"}
                            </button>
                          </div>

                          {entriesLoading ? (
                            <p className="mt-3 text-white/60 text-sm">Cargando entradas…</p>
                          ) : entries.length === 0 ? (
                            <p className="mt-3 text-white/60 text-sm">No hay entradas todavía.</p>
                          ) : (
                            <div className="mt-3 space-y-2">
                              {entries.map((e) => (
                                <div
                                  key={e.id}
                                  className="rounded-xl border border-white/10 bg-black/40 px-3 py-2 flex items-center justify-between gap-3"
                                >
                                  <div className="min-w-0">
                                    <p className="text-sm font-semibold truncate">
                                      {euro(e.amount_eur ?? 0)}
                                    </p>
                                    <p className="text-[11px] text-white/50">
                                      {new Date(e.date_time).toLocaleString("es-ES")}
                                      {e.note ? ` · ${e.note}` : ""}
                                    </p>
                                  </div>

                                  <button
                                    onClick={() => onDeleteEntry(e.id)}
                                    disabled={deletingEntryId === e.id}
                                    className={`text-xs px-3 py-2 rounded-xl border ${
                                      deletingEntryId === e.id
                                        ? "bg-white/10 text-white/40 border-white/10"
                                        : "bg-red-500/10 text-red-200 border-red-500/30"
                                    }`}
                                  >
                                    {deletingEntryId === e.id ? "Borrando…" : "Borrar"}
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}

                          <p className="mt-3 text-xs text-white/50">
                            Al borrar una entrada se ajusta el saldo y se borra también su transacción asociada.
                          </p>
                        </div>
                      ) : null}
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </Layout>

      <BottomNav />
    </>
  );
}
