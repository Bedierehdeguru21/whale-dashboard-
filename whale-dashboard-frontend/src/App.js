// ============================================================
// WHALE TRACKER DASHBOARD — App.js
// Single-file React component for monitoring large ETH transactions.
//
// Setup:
//   npx create-react-app whale-dashboard-frontend
//   npm install axios chart.js react-chartjs-2
//
// Then replace src/App.js with this file and add Tailwind CSS.
// Tailwind setup: https://tailwindcss.com/docs/guides/create-react-app
// ============================================================

// ─── IMPORTS ────────────────────────────────────────────────
import { useState, useEffect, useRef, useCallback } from "react";
import axios from "axios";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Bar } from "react-chartjs-2";

// Register Chart.js components (required by react-chartjs-2 v4+)
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

// ─── CONSTANTS ──────────────────────────────────────────────
const API_URL = "http://localhost:3000/whales";
const HIGHLIGHT_THRESHOLD = 50;   // ETH — rows above this are highlighted
const ALERT_THRESHOLD = 100;      // ETH — transactions above this trigger live alert
const CHART_MAX_BARS = 10;        // Only show last N transactions in the bar chart

// Shorten a wallet or hash string for display: "0x1234…abcd"
const shorten = (str, head = 6, tail = 4) =>
  str ? `${str.slice(0, head)}…${str.slice(-tail)}` : "—";

// Format an ISO timestamp to a readable local string
const formatTime = (iso) => {
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    return iso;
  }
};

// ─── MOCK DATA (used when backend is unreachable, for development) ──
// Remove or comment out MOCK_DATA and the fallback in fetchWhales()
// when your real backend is running.
const MOCK_DATA = [
  { wallet: "0xDeadBeef1234567890AbCdEf1234567890AbCdEf", amount: 120.5, hash: "0xabc123def456abc123def456abc123def456abc123def456abc123def456abc1", time: new Date(Date.now() - 60000).toISOString() },
  { wallet: "0x1A2B3C4D5E6F7A8B9C0D1E2F3A4B5C6D7E8F9A0B", amount: 45.0,  hash: "0xbcd234ef5678bcd234ef5678bcd234ef5678bcd234ef5678bcd234ef5678bcd2", time: new Date(Date.now() - 180000).toISOString() },
  { wallet: "0x9F8E7D6C5B4A39281726354453627180FaFbFcFd", amount: 200.0, hash: "0xcde345fg6789cde345fg6789cde345fg6789cde345fg6789cde345fg6789cde3", time: new Date(Date.now() - 300000).toISOString() },
  { wallet: "0xCafeBabe0000111122223333444455556666DEAD", amount: 12.3,  hash: "0xdef456gh789adef456gh789adef456gh789adef456gh789adef456gh789adef4", time: new Date(Date.now() - 600000).toISOString() },
  { wallet: "0x0101010102020202030303030404040405050505", amount: 75.9,  hash: "0xef5678hi89abef5678hi89abef5678hi89abef5678hi89abef5678hi89abef56", time: new Date(Date.now() - 900000).toISOString() },
  { wallet: "0xDeadBeef1234567890AbCdEf1234567890AbCdEf", amount: 33.1,  hash: "0xf6789ij9abcdf6789ij9abcdf6789ij9abcdf6789ij9abcdf6789ij9abcdf678", time: new Date(Date.now() - 1200000).toISOString() },
  { wallet: "0xFeedFace9876543210FeedFace9876543210Feed", amount: 88.0,  hash: "0xa1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2", time: new Date(Date.now() - 1500000).toISOString() },
  { wallet: "0x2222333344445555666677778888999900001111", amount: 155.0, hash: "0xb2c3d4e5f6a7b2c3d4e5f6a7b2c3d4e5f6a7b2c3d4e5f6a7b2c3d4e5f6a7b2c3", time: new Date(Date.now() - 1800000).toISOString() },
  { wallet: "0xAaBbCcDdEeFf00112233445566778899AaBbCcDd", amount: 9.99,  hash: "0xc3d4e5f6a7b8c3d4e5f6a7b8c3d4e5f6a7b8c3d4e5f6a7b8c3d4e5f6a7b8c3d4", time: new Date(Date.now() - 2100000).toISOString() },
  { wallet: "0x1234ABCD1234ABCD1234ABCD1234ABCD1234ABCD", amount: 310.0, hash: "0xd4e5f6a7b8c9d4e5f6a7b8c9d4e5f6a7b8c9d4e5f6a7b8c9d4e5f6a7b8c9d4e5", time: new Date(Date.now() - 2400000).toISOString() },
];

// ─── THEME DEFINITIONS ──────────────────────────────────────
// All colour values live here so toggling dark/light just swaps the object.
const THEMES = {
  dark: {
    bg: "bg-gray-950",
    surface: "bg-gray-900",
    surfaceAlt: "bg-gray-800",
    border: "border-gray-700",
    text: "text-gray-100",
    textMuted: "text-gray-400",
    textAccent: "text-cyan-400",
    inputBg: "bg-gray-800",
    inputBorder: "border-gray-600",
    rowHighlight: "bg-amber-900/40 border-l-4 border-amber-400",
    rowNormal: "hover:bg-gray-800/60",
    rowAlt: "bg-gray-900/60",
    alertBg: "bg-red-950 border border-red-700",
    alertText: "text-red-300",
    alertAccent: "text-red-400",
    badge: "bg-cyan-900 text-cyan-300",
    btnPrimary: "bg-cyan-600 hover:bg-cyan-500 text-white",
    btnSecondary: "bg-gray-700 hover:bg-gray-600 text-gray-200",
    chartGrid: "rgba(255,255,255,0.08)",
    chartBar: "rgba(6,182,212,0.8)",
    chartBarHighlight: "rgba(251,191,36,0.9)",
    chartBarBorder: "rgba(6,182,212,1)",
    chartText: "#9ca3af",
  },
  light: {
    bg: "bg-slate-100",
    surface: "bg-white",
    surfaceAlt: "bg-slate-50",
    border: "border-slate-200",
    text: "text-slate-800",
    textMuted: "text-slate-500",
    textAccent: "text-cyan-600",
    inputBg: "bg-white",
    inputBorder: "border-slate-300",
    rowHighlight: "bg-amber-50 border-l-4 border-amber-400",
    rowNormal: "hover:bg-slate-50",
    rowAlt: "bg-slate-50/60",
    alertBg: "bg-red-50 border border-red-300",
    alertText: "text-red-700",
    alertAccent: "text-red-500",
    badge: "bg-cyan-100 text-cyan-700",
    btnPrimary: "bg-cyan-600 hover:bg-cyan-700 text-white",
    btnSecondary: "bg-slate-200 hover:bg-slate-300 text-slate-700",
    chartGrid: "rgba(0,0,0,0.07)",
    chartBar: "rgba(8,145,178,0.75)",
    chartBarHighlight: "rgba(217,119,6,0.85)",
    chartBarBorder: "rgba(8,145,178,1)",
    chartText: "#64748b",
  },
};

// ─── SUBCOMPONENTS ──────────────────────────────────────────

/**
 * LiveAlertPanel — shows the most recent transaction above ALERT_THRESHOLD.
 * Dismissed automatically after 8 s, or manually via the × button.
 */
function LiveAlertPanel({ tx, t, onDismiss }) {
  if (!tx) return null;
  return (
    <div
      role="alert"
      className={`
        flex items-start gap-3 rounded-xl p-4 mb-6 animate-pulse-once
        ${t.alertBg}
      `}
    >
      {/* Whale emoji icon */}
      <span className="text-2xl leading-none select-none" aria-hidden>🐋</span>

      <div className="flex-1 min-w-0">
        <p className={`font-bold text-sm mb-0.5 ${t.alertAccent}`}>
          WHALE ALERT — {tx.amount.toFixed(2)} ETH
        </p>
        <p className={`text-xs truncate ${t.alertText}`}>
          <span className="font-mono">{shorten(tx.wallet, 8, 6)}</span>
          {" · "}
          <a
            href={`https://etherscan.io/tx/${tx.hash}`}
            target="_blank"
            rel="noreferrer"
            className="underline underline-offset-2"
          >
            {shorten(tx.hash)}
          </a>
          {" · "}
          {formatTime(tx.time)}
        </p>
      </div>

      <button
        onClick={onDismiss}
        aria-label="Dismiss alert"
        className={`text-lg leading-none mt-0.5 opacity-60 hover:opacity-100 transition-opacity ${t.alertText}`}
      >
        ×
      </button>
    </div>
  );
}

/**
 * StatsBar — quick summary counts above the table.
 */
function StatsBar({ data, t }) {
  const total = data.length;
  const bigWhales = data.filter((tx) => tx.amount > ALERT_THRESHOLD).length;
  const totalEth = data.reduce((s, tx) => s + tx.amount, 0);

  return (
    <div className="grid grid-cols-3 gap-3 mb-6">
      {[
        { label: "Total Txns", value: total },
        { label: `>${ALERT_THRESHOLD} ETH`, value: bigWhales },
        { label: "Total ETH", value: totalEth.toLocaleString(undefined, { maximumFractionDigits: 1 }) },
      ].map(({ label, value }) => (
        <div
          key={label}
          className={`rounded-xl p-3 text-center ${t.surface} border ${t.border}`}
        >
          <p className={`text-xl font-bold font-mono ${t.textAccent}`}>{value}</p>
          <p className={`text-xs mt-0.5 ${t.textMuted}`}>{label}</p>
        </div>
      ))}
    </div>
  );
}

/**
 * WhaleTable — sortable, filterable table of whale transactions.
 */
function WhaleTable({ data, searchTerm, t }) {
  // ── Local sort state ──────────────────────────────────────
  const [sortKey, setSortKey] = useState("time");
  const [sortDir, setSortDir] = useState("desc"); // "asc" | "desc"

  const handleSort = (key) => {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  // ── Filter by search term ─────────────────────────────────
  const filtered = data.filter((tx) =>
    tx.wallet.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // ── Sort ──────────────────────────────────────────────────
  const sorted = [...filtered].sort((a, b) => {
    let va = a[sortKey];
    let vb = b[sortKey];
    if (sortKey === "time") {
      va = new Date(va).getTime();
      vb = new Date(vb).getTime();
    }
    if (va < vb) return sortDir === "asc" ? -1 : 1;
    if (va > vb) return sortDir === "asc" ? 1 : -1;
    return 0;
  });

  // Tiny sort arrow indicator
  const arrow = (key) =>
    sortKey === key ? (sortDir === "asc" ? " ↑" : " ↓") : "";

  const thClass = `
    px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider
    select-none cursor-pointer whitespace-nowrap
    ${t.textMuted} hover:${t.textAccent} transition-colors
  `;

  return (
    <div className={`rounded-xl border ${t.border} overflow-hidden`}>
      {/* Scrollable wrapper for mobile */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          {/* ── Table head ── */}
          <thead className={`${t.surfaceAlt} border-b ${t.border}`}>
            <tr>
              <th className={thClass} onClick={() => handleSort("wallet")}>
                Wallet{arrow("wallet")}
              </th>
              <th className={thClass} onClick={() => handleSort("amount")}>
                Amount (ETH){arrow("amount")}
              </th>
              <th className={`${thClass} hidden sm:table-cell`}>
                Tx Hash
              </th>
              <th className={thClass} onClick={() => handleSort("time")}>
                Time{arrow("time")}
              </th>
            </tr>
          </thead>

          {/* ── Table body ── */}
          <tbody>
            {sorted.length === 0 ? (
              <tr>
                <td
                  colSpan={4}
                  className={`text-center py-12 ${t.textMuted} italic`}
                >
                  No whale transactions found
                </td>
              </tr>
            ) : (
              sorted.map((tx, i) => {
                const isWhale = tx.amount > HIGHLIGHT_THRESHOLD;
                const rowClass = [
                  "transition-colors",
                  isWhale ? t.rowHighlight : i % 2 === 1 ? t.rowAlt : "",
                  !isWhale ? t.rowNormal : "",
                ].join(" ");

                return (
                  <tr key={tx.hash} className={rowClass}>
                    {/* Wallet — truncated on mobile */}
                    <td className={`px-3 py-3 font-mono ${t.text}`}>
                      <span
                        className="hidden md:inline"
                        title={tx.wallet}
                      >
                        {tx.wallet}
                      </span>
                      <span
                        className="md:hidden"
                        title={tx.wallet}
                      >
                        {shorten(tx.wallet, 8, 6)}
                      </span>
                    </td>

                    {/* Amount — badge for >50 ETH */}
                    <td className={`px-3 py-3 font-mono font-semibold ${t.text}`}>
                      {isWhale ? (
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold ${t.badge}`}
                        >
                          🐋 {tx.amount.toFixed(4)}
                        </span>
                      ) : (
                        tx.amount.toFixed(4)
                      )}
                    </td>

                    {/* Hash — hidden on small screens */}
                    <td className={`px-3 py-3 hidden sm:table-cell`}>
                      <a
                        href={`https://etherscan.io/tx/${tx.hash}`}
                        target="_blank"
                        rel="noreferrer"
                        className={`font-mono text-xs underline underline-offset-2 ${t.textAccent} hover:opacity-80 transition-opacity`}
                        title={tx.hash}
                      >
                        {shorten(tx.hash, 10, 6)}
                      </a>
                    </td>

                    {/* Time */}
                    <td className={`px-3 py-3 text-xs whitespace-nowrap ${t.textMuted}`}>
                      {formatTime(tx.time)}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Row count footer */}
      {sorted.length > 0 && (
        <div
          className={`px-4 py-2 text-xs border-t ${t.border} ${t.surfaceAlt} ${t.textMuted}`}
        >
          Showing {sorted.length} of {data.length} transaction
          {data.length !== 1 ? "s" : ""}
          {searchTerm && ` matching "${searchTerm}"`}
        </div>
      )}
    </div>
  );
}

/**
 * EthBarChart — Bar chart of ETH amounts for the last CHART_MAX_BARS txns.
 * Bars above HIGHLIGHT_THRESHOLD are coloured amber, others cyan.
 */
function EthBarChart({ data, t, isDark }) {
  const recent = [...data]
    .sort((a, b) => new Date(a.time) - new Date(b.time))
    .slice(-CHART_MAX_BARS);

  const labels = recent.map((tx) => shorten(tx.hash, 6, 4));
  const amounts = recent.map((tx) => tx.amount);
  const barColors = amounts.map((amt) =>
    amt > HIGHLIGHT_THRESHOLD ? t.chartBarHighlight : t.chartBar
  );

  const chartData = {
    labels,
    datasets: [
      {
        label: "ETH Amount",
        data: amounts,
        backgroundColor: barColors,
        borderColor: barColors.map((c) =>
          c === t.chartBarHighlight ? "rgba(251,191,36,1)" : t.chartBarBorder
        ),
        borderWidth: 1.5,
        borderRadius: 6,
        borderSkipped: false,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 400 },
    plugins: {
      legend: { display: false },
      title: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx) => ` ${ctx.parsed.y.toFixed(4)} ETH`,
          title: (items) => {
            const idx = items[0].dataIndex;
            return `Tx: ${recent[idx]?.hash?.slice(0, 18)}…`;
          },
        },
        backgroundColor: isDark ? "#1f2937" : "#fff",
        titleColor: isDark ? "#e5e7eb" : "#1e293b",
        bodyColor: isDark ? "#9ca3af" : "#64748b",
        borderColor: isDark ? "#374151" : "#e2e8f0",
        borderWidth: 1,
      },
    },
    scales: {
      x: {
        grid: { color: t.chartGrid, drawBorder: false },
        ticks: { color: t.chartText, font: { family: "monospace", size: 10 } },
      },
      y: {
        grid: { color: t.chartGrid, drawBorder: false },
        ticks: { color: t.chartText },
        title: {
          display: true,
          text: "ETH",
          color: t.chartText,
        },
      },
    },
  };

  return (
    <div style={{ height: 260 }}>
      <Bar data={chartData} options={options} />
    </div>
  );
}

// ─── MAIN APP ───────────────────────────────────────────────
export default function App() {
  // ── State ────────────────────────────────────────────────
  const [whales, setWhales] = useState([]);          // All fetched transactions
  const [loading, setLoading] = useState(false);     // Fetch in-progress
  const [error, setError] = useState(null);          // Fetch error message
  const [searchTerm, setSearchTerm] = useState("");  // Wallet filter
  const [isDark, setIsDark] = useState(true);        // Dark/light mode toggle
  const [lastUpdated, setLastUpdated] = useState(null);
  const [alert, setAlert] = useState(null);          // Live alert tx (>100 ETH)

  // ── Theme object ─────────────────────────────────────────
  const t = THEMES[isDark ? "dark" : "light"];

  // ── Ref to prevent alert spam on re-renders ──────────────
  const alertDismissTimer = useRef(null);

  // ── Data fetching ────────────────────────────────────────
  const fetchWhales = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get(API_URL, { timeout: 8000 });
      const data = Array.isArray(res.data) ? res.data : [];
      setWhales(data);
      setLastUpdated(new Date());

      // Check if most recent transaction triggers the live alert
      const sorted = [...data].sort(
        (a, b) => new Date(b.time) - new Date(a.time)
      );
      const newest = sorted[0];
      if (newest && newest.amount > ALERT_THRESHOLD) {
        setAlert(newest);
        // Auto-dismiss after 8 seconds
        clearTimeout(alertDismissTimer.current);
        alertDismissTimer.current = setTimeout(() => setAlert(null), 8000);
      }
    } catch (err) {
      // ── DEVELOPMENT FALLBACK: use mock data when backend is down ──
      // Remove the next three lines (setWhales, setLastUpdated, console.warn)
      // in production; keep only setError.
      console.warn("Backend unreachable — using mock data:", err.message);
      setWhales(MOCK_DATA);
      setLastUpdated(new Date());
      // setError(`Could not reach backend: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch on mount
  useEffect(() => {
    fetchWhales();
    return () => clearTimeout(alertDismissTimer.current);
  }, [fetchWhales]);

  // ── Render ───────────────────────────────────────────────
  return (
    <div
      className={`min-h-screen transition-colors duration-300 ${t.bg} ${t.text}`}
      style={{ fontFamily: "'DM Mono', 'Courier New', monospace" }}
    >
      {/* ── Google Font import via <style> (avoids index.html edits) ── */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Syne:wght@700;800&display=swap');
        .font-display { font-family: 'Syne', sans-serif; }
        @keyframes pulse-once {
          0%,100% { opacity: 1; }
          50% { opacity: 0.7; }
        }
        .animate-pulse-once { animation: pulse-once 1.5s ease-in-out 2; }
      `}</style>

      {/* ══════════════════════════════════════════════════════
          HEADER
      ══════════════════════════════════════════════════════ */}
      <header
        className={`sticky top-0 z-20 border-b ${t.border} ${t.surface} backdrop-blur-sm bg-opacity-90`}
      >
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          {/* Logo / title */}
          <div className="flex items-center gap-2">
            <span className="text-2xl leading-none select-none">🐋</span>
            <h1
              className={`font-display text-xl font-extrabold tracking-tight ${t.textAccent}`}
            >
              WhaleWatch
            </h1>
            <span
              className={`hidden sm:inline-block text-xs rounded px-1.5 py-0.5 ${t.badge}`}
            >
              ETH
            </span>
          </div>

          {/* Right controls: last-updated + dark mode toggle */}
          <div className="flex items-center gap-3">
            {lastUpdated && (
              <span className={`hidden md:block
