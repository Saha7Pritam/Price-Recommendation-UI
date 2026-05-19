// src/App.jsx
import { useEffect, useState, useMemo } from 'react';
import PriceTable from './components/Pricetable';
import SearchBar from './components/SearchBar';
import CategoryFilter from './components/CategoryFilter';
import { fetchRecommendations } from './services/api';

export default function App() {
  const [data, setData]             = useState([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState(null);
  const [lastRefreshed, setLastRefreshed] = useState(null);

  // ── Filter state ──────────────────────────────────────────
  const [searchQuery, setSearchQuery]     = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const rows = await fetchRecommendations();
      setData(rows);
      setLastRefreshed(new Date());
    } catch (err) {
      setError('Failed to fetch data. Make sure the API server is running on port 3001.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadData(); }, []);

  // ── Derived: unique sorted categories from loaded data ────
  const categories = useMemo(() => {
    const cats = [...new Set(data.map(r => r.Category).filter(Boolean))];
    return cats.sort((a, b) => a.localeCompare(b));
  }, [data]);

  // ── Filtered data ─────────────────────────────────────────
  const filteredData = useMemo(() => {
    let result = data;

    if (selectedCategory) {
      result = result.filter(r => r.Category === selectedCategory);
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(r =>
        (r.SKU_ID || '').toLowerCase().includes(q)
      );
    }

    return result;
  }, [data, searchQuery, selectedCategory]);

  // ── Summary stats (on full data, not filtered) ────────────
  const totalProducts  = data.length;
  const optimizedCount = data.filter(r => r.ExtraProfitPct > 0).length;
  const floorCount     = totalProducts - optimizedCount;

  return (
    <div className="min-h-screen bg-[#0f1117] font-sans">

      {/* ── Header ── */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-[1600px] mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-violet-600 flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div>
              <h1 className="text-lg font-bold text-white tracking-tight">
                TPS Price Intelligence
              </h1>
              <p className="text-xs text-slate-500">Price Recommendation Engine — Prototype</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {lastRefreshed && (
              <span className="text-xs text-slate-500">
                Last updated: {lastRefreshed.toLocaleTimeString()}
              </span>
            )}
            <button
              onClick={loadData}
              disabled={loading}
              className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg
                bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed
                text-white transition-colors"
            >
              <svg className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto px-6 py-8">

        {/* ── Stats cards ── */}
        {!loading && !error && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
            <StatCard label="Total Products" value={totalProducts} color="violet" />
            <StatCard label="Optimized Prices" value={optimizedCount} sub="99% of competitor" color="emerald" />
            <StatCard label="At Floor Price" value={floorCount} sub="PP × 1.30" color="sky" />
          </div>
        )}

        {/* ── States ── */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-slate-400 text-sm">Fetching recommendations from database...</p>
          </div>
        )}

        {error && (
          <div className="p-4 rounded-xl bg-red-900/30 border border-red-700/50 text-red-400 text-sm">
            {error}
          </div>
        )}

        {!loading && !error && data.length === 0 && (
          <div className="text-center py-24 text-slate-500">
            No recommendations found. Run the recommendation engine first.
          </div>
        )}

        {/* ── Search + Filter toolbar + Table ── */}
        {!loading && !error && data.length > 0 && (
          <>
            {/* Toolbar */}
            <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
              <div className="flex items-center gap-3">
                <SearchBar onSearch={setSearchQuery} value={searchQuery} />
                <CategoryFilter
                  categories={categories}
                  value={selectedCategory}
                  onChange={setSelectedCategory}
                />
              </div>

              {/* Result count */}
              <div className="flex items-center gap-2">
                {(searchQuery || selectedCategory) && (
                  <button
                    onClick={() => { setSearchQuery(''); setSelectedCategory(''); }}
                    className="text-xs text-slate-500 hover:text-slate-300 underline underline-offset-2 transition-colors"
                  >
                    Clear filters
                  </button>
                )}
                <span className="text-xs text-slate-500">
                  {filteredData.length === data.length
                    ? `${data.length} products`
                    : `${filteredData.length} of ${data.length} products`}
                </span>
              </div>
            </div>

            {/* No results state */}
            {filteredData.length === 0 ? (
              <div className="text-center py-20 text-slate-500">
                <svg className="w-8 h-8 mx-auto mb-3 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <p className="text-sm">No products match your search.</p>
                <button
                  onClick={() => { setSearchQuery(''); setSelectedCategory(''); }}
                  className="mt-2 text-xs text-violet-400 hover:text-violet-300 transition-colors"
                >
                  Clear filters
                </button>
              </div>
            ) : (
              <PriceTable data={filteredData} />
            )}
          </>
        )}
      </main>
    </div>
  );
}

// ── Stat card ─────────────────────────────────────────────────
function StatCard({ label, value, sub, color }) {
  const colors = {
    violet: 'text-violet-400 bg-violet-900/30 border-violet-700/40',
    emerald: 'text-emerald-400 bg-emerald-900/30 border-emerald-700/40',
    sky    : 'text-sky-400     bg-sky-900/30     border-sky-700/40',
    amber  : 'text-amber-400   bg-amber-900/30   border-amber-700/40',
  };

  return (
    <div className={`rounded-xl border p-4 ${colors[color]}`}>
      <p className="text-xs text-slate-500 mb-1">{label}</p>
      <p className={`text-2xl font-bold ${colors[color].split(' ')[0]}`}>{value}</p>
      {sub && <p className="text-xs text-slate-500 mt-0.5">{sub}</p>}
    </div>
  );
}