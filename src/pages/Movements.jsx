import { useEffect, useMemo, useState } from "react";
import Layout from "../components/Layout";
import BottomNav from "../components/BottomNav";
import { getCurrentMonth } from "../api/month";
import { getTransactions } from "../api/transactions";

function formatEuro(n) {
  return new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(n);
}

function formatDateTime(iso) {
  const d = new Date(iso);
  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

const ATTR_OPTIONS = [
  { value: "ALL", label: "Todos" },
  { value: "MINE", label: "Mío" },
  { value: "PARTNER", label: "Mi mujer" },
  { value: "HOUSE", label: "Casa" },
];

function Chip({ active, children, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-xl text-xs font-semibold border ${
        active
          ? "bg-white text-black border-white"
          : "bg-white/10 text-white border-white/10"
      }`}
    >
      {children}
    </button>
  );
}

export default function Movements() {
  const [month, setMonth] = useState(null);
  const [tx, setTx] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // filtros
  const [attrFilter, setAttrFilter] = useState("ALL");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [search, setSearch] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const m = await getCurrentMonth();
      setMonth(m);
      if (m?.id) {
        const rows = await getTransactions(m.id);
        setTx(rows);
      } else {
        setTx([]);
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  // categorías disponibles (a partir de lo que venga en los movimientos)
  const categoryOptions = useMemo(() => {
    const set = new Map(); // id -> name
    for (const t of tx) {
      if (t.category_id && (t.category_name || t.category_id)) {
        set.set(t.category_id, t.category_name || "Sin nombre");
      }
    }
    const arr = Array.from(set.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
    return arr;
  }, [tx]);

  // lista filtrada
  const filteredTx = useMemo(() => {
    const q = search.trim().toLowerCase();

    return tx
      .filter((t) => {
        // attribution
        if (attrFilter !== "ALL" && t.attribution !== attrFilter) return false;

        // category
        if (categoryFilter !== "ALL" && t.category_id !== categoryFilter) return false;

        // search
        if (!q) return true;

        const haystack = [
          t.concept,
          t.note,
          t.category_name,
          t.type,
          t.payment_method,
          t.attribution,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return haystack.includes(q);
      })
      .sort((a, b) => new Date(b.date_time) - new Date(a.date_time));
  }, [tx, attrFilter, categoryFilter, search]);

  const totalOutFiltered = useMemo(() => {
    return filteredTx
      .filter((t) => t.direction === "OUT" && t.type === "EXPENSE")
      .reduce((acc, t) => acc + t.amount, 0);
  }, [filteredTx]);

  const countFiltered = filteredTx.length;

  return (
    <>
      <Layout
        title="Movimientos"
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

        {loading ? (
          <div className="text-white/60">Cargando…</div>
        ) : !month ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="text-white/80">No hay mes abierto.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* RESUMEN */}
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-white/60 text-sm">Mes {month.period_key}</p>
              <p className="mt-1 text-xl font-semibold">
                Gastos (EXPENSE filtrados): {formatEuro(totalOutFiltered)}
              </p>
              <p className="text-xs text-white/50 mt-1">
                Movimientos mostrados: {countFiltered}
              </p>
            </div>

            {/* FILTROS */}
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-3">
              <div className="flex flex-wrap gap-2">
                {ATTR_OPTIONS.map((opt) => (
                  <Chip
                    key={opt.value}
                    active={attrFilter === opt.value}
                    onClick={() => setAttrFilter(opt.value)}
                  >
                    {opt.label}
                  </Chip>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-xs text-white/60">Categoría</span>
                  <select
                    className="mt-1 w-full rounded-xl bg-black/40 border border-white/10 px-3 py-3"
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                  >
                    <option value="ALL">Todas</option>
                    {categoryOptions.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="text-xs text-white/60">Buscar</span>
                  <input
                    className="mt-1 w-full rounded-xl bg-black/40 border border-white/10 px-3 py-3"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Ej: pádel, glovo, farmacia…"
                  />
                </label>
              </div>

              {(attrFilter !== "ALL" || categoryFilter !== "ALL" || search.trim()) && (
                <button
                  onClick={() => {
                    setAttrFilter("ALL");
                    setCategoryFilter("ALL");
                    setSearch("");
                  }}
                  className="w-full rounded-2xl py-3 font-semibold bg-white/10 border border-white/10"
                >
                  Limpiar filtros
                </button>
              )}
            </div>

            {/* LISTA */}
            <div className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
              <div className="px-4 py-3 border-b border-white/10 text-sm text-white/60">
                Movimientos
              </div>

              {filteredTx.length === 0 ? (
                <div className="p-4 text-white/60">
                  No hay resultados con estos filtros.
                </div>
              ) : (
                <ul className="divide-y divide-white/10">
                  {filteredTx.map((t) => (
                    <li key={t.id} className="p-4 flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm text-white/60">
                          {formatDateTime(t.date_time)} · {t.category_name || t.type}
                        </p>

                        <p className="mt-1 font-medium truncate">
                          {t.concept || "—"}
                        </p>

                        <p className="text-xs text-white/50 mt-1">
                          {t.attribution} · {t.payment_method}
                        </p>

                        <div className="mt-2 flex gap-2">
                          <a
                            href={`/edit/${t.id}`}
                            className="px-3 py-1.5 rounded-xl bg-white/10 border border-white/10 text-xs font-semibold"
                          >
                            Editar
                          </a>
                        </div>
                      </div>

                      <div
                        className={`text-right font-semibold ${
                          t.direction === "OUT" ? "text-white" : "text-green-300"
                        }`}
                      >
                        {t.direction === "OUT" ? "-" : "+"}
                        {formatEuro(t.amount)}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </Layout>

      <BottomNav />
    </>
  );
}
