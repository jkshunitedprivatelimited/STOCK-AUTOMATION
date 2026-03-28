import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../frontend_supabase/supabaseClient";
import {
  ArrowLeft, Calendar, ChevronRight, ChevronDown,
  Hash, Clock, Download, AlertTriangle, AlertOctagon, CheckCircle2, RefreshCw,
  ArrowUp, ArrowDown, ArrowUpDown, Trash2
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell
} from "recharts";
import { headerStyles } from "../../utils/headerStyles";
import { BRAND_GREEN } from "../../utils/theme";

// --- CONSTANTS ---
const PRIMARY = BRAND_GREEN;
const EXCEL_GREEN = "#107c41";
const COLORS = [BRAND_GREEN, "#0ea5e9", "#f59e0b", "#be185d", "#8b5cf6", "#10b981", "#f43f5e", "#6366f1", "#d946ef", "#047857"];

// --- UTILITY: Safe Session Storage Setter ---
// Prevents the app from crashing if browser storage limit is reached
const ANALYTICS_STORAGE_PREFIX = "analytics_";
const safeSetSessionStorage = (key, value) => {
  try {
    sessionStorage.setItem(key, value);
  } catch (e) {
    console.warn("Session storage full. Clearing analytics cache...");
    // Only clear our own analytics keys, not other features' data
    const keysToRemove = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const k = sessionStorage.key(i);
      if (k && k.startsWith(ANALYTICS_STORAGE_PREFIX)) keysToRemove.push(k);
    }
    keysToRemove.forEach(k => sessionStorage.removeItem(k));
    try {
      sessionStorage.setItem(key, value); // Try saving again
    } catch (err) {
      console.error("Failed to save to session storage after clearing.");
    }
  }
};

function FranchiseAnalytics() {
  const navigate = useNavigate();

  // --- STATE ---
  const [activeTab, setActiveTab] = useState(() => sessionStorage.getItem("analytics_activeTab") || "store");
  const [dateRangeMode, setDateRangeMode] = useState(() => sessionStorage.getItem("analytics_dateRangeMode") || "single");
  // Always default to TODAY — never restore stale dates from sessionStorage
  const TODAY = new Date().toISOString().split("T")[0];
  const [startDate, setStartDate] = useState(TODAY);
  const [endDate, setEndDate] = useState(TODAY);

  const [graphData, setGraphData] = useState([]);
  const [topItems, setTopItems] = useState([]);
  const [bills, setBills] = useState([]);
  const [expandedBill, setExpandedBill] = useState(null);

  // --- DELETE STATE ---
  const [billToDelete, setBillToDelete] = useState(null); // bill object for full deletion confirm
  const [itemDeleteContext, setItemDeleteContext] = useState(null); // { bill, item, items } for discount re-eval
  const [deleting, setDeleting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sortConfig, setSortConfig] = useState({ key: 'created_at', direction: 'desc' });

  const [franchiseId, setFranchiseId] = useState(() => sessionStorage.getItem("analytics_franchiseId") || "");

  const [oldestRecordDate, setOldestRecordDate] = useState(null);
  const [daysUntilDeletion, setDaysUntilDeletion] = useState(null);

  const [feature1Enabled, setFeature1Enabled] = useState(false);

  // --- DATA FETCHING (defined before effects that use them) ---
  const fetchFranchiseProfile = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase.from("profiles").select("franchise_id").eq("id", user.id).single();
        if (data) {
          setFranchiseId(data.franchise_id);
          safeSetSessionStorage("analytics_franchiseId", data.franchise_id);
        }
      }
    } catch (e) { console.error("Profile Fetch Error", e); }
  }, []);

  const fetchOldestRecord = useCallback(async (forceRefresh = false) => {
    const cacheKey = `analytics_oldest_${franchiseId}`;

    if (!forceRefresh) {
      const cachedData = sessionStorage.getItem(cacheKey);

      if (cachedData) {
        const parsed = JSON.parse(cachedData);
        setOldestRecordDate(parsed.date ? new Date(parsed.date) : null);
        setDaysUntilDeletion(parsed.days);
        return;
      }
    }

    try {
      const { data, error } = await supabase
        .from("bills_generated")
        .select("created_at")
        .eq("franchise_id", franchiseId)
        .order("created_at", { ascending: true })
        .limit(1);

      let oDate = null;
      let dUntil = 45;

      if (data && data.length > 0) {
        oDate = new Date(data[0].created_at);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const oldestDay = new Date(oDate);
        oldestDay.setHours(0, 0, 0, 0);

        const ageInMs = today.getTime() - oldestDay.getTime();
        const ageInDays = Math.floor(ageInMs / (1000 * 60 * 60 * 24));
        dUntil = 45 - ageInDays;
      }

      setOldestRecordDate(oDate);
      setDaysUntilDeletion(dUntil);
      safeSetSessionStorage(cacheKey, JSON.stringify({ date: oDate, days: dUntil }));

    } catch (err) { console.error("Error fetching oldest record:", err); }
  }, [franchiseId]);

  const fetchData = useCallback(async (forceRefresh = false) => {
    if (!franchiseId) return;

    // Cache key includes the date so yesterday's cached data is NEVER served today
    const cacheKey = `analytics_data_${franchiseId}_${activeTab}_${dateRangeMode}_${startDate}_${endDate}`;

    // Serve from cache unless forcing a refresh
    if (!forceRefresh) {
      const cachedData = sessionStorage.getItem(cacheKey);
      if (cachedData) {
        try {
          const parsed = JSON.parse(cachedData);
          setBills(parsed.bills || []);
          setGraphData(parsed.graphData || []);
          setTopItems(parsed.topItems || []);
          return;
        } catch { /* bad cache — fall through to network */ }
      }
    }

    setLoading(true);
    try {
      const isStore = activeTab === "store";
      const table = isStore ? "bills_generated" : "invoices";

      let query = isStore
        ? supabase.from(table).select("*").eq("franchise_id", franchiseId)
        : supabase.from(table).select("*, profiles:created_by(franchise_id)");

      if (dateRangeMode === "single") {
        query = query
          .gte("created_at", `${startDate}T00:00:00`)
          .lte("created_at", `${startDate}T23:59:59`);
      } else {
        const finalEndDate = endDate || startDate;
        query = query
          .gte("created_at", `${startDate}T00:00:00`)
          .lte("created_at", `${finalEndDate}T23:59:59`);
      }

      const { data, error } = await query.order("created_at", { ascending: false });
      if (error) throw error;

      const fetchedBills = data || [];
      const generatedGraph = processChartData(fetchedBills);
      const ids = fetchedBills.map(d => d.id);
      const generatedTopItems = ids.length > 0 ? await fetchTopItems(ids) : [];

      setBills(fetchedBills);
      setGraphData(generatedGraph);
      setTopItems(generatedTopItems);

      safeSetSessionStorage(cacheKey, JSON.stringify({
        bills: fetchedBills,
        graphData: generatedGraph,
        topItems: generatedTopItems
      }));

    } catch (err) {
      console.error("Fetch Error:", err.message);
      alert("Failed to load data. Please check your connection.");
    } finally {
      setLoading(false);
    }
  }, [franchiseId, activeTab, dateRangeMode, startDate, endDate]);

  // --- NEW: FORCE REFRESH FUNCTION ---
  const handleRefresh = useCallback(() => {
    fetchData(true);
    fetchOldestRecord(true);
  }, [fetchData, fetchOldestRecord]);

  // --- CACHE INVALIDATION HELPER ---
  const clearAnalyticsCaches = useCallback(() => {
    const keysToRemove = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const k = sessionStorage.key(i);
      if (k && (k.startsWith(ANALYTICS_STORAGE_PREFIX) || k.startsWith("bill_items_"))) keysToRemove.push(k);
    }
    keysToRemove.forEach(k => sessionStorage.removeItem(k));
  }, []);

  // --- DELETE ENTIRE BILL ---
  const handleDeleteBill = useCallback(async (bill) => {
    // Optimistic UI: remove from list immediately
    setBills(prev => prev.filter(b => b.id !== bill.id));
    if (expandedBill === bill.id) setExpandedBill(null);
    setBillToDelete(null);

    setDeleting(true);
    try {
      // Delete child items first, then the bill itself
      const { error: itemsError } = await supabase
        .from("bills_items_generated")
        .delete()
        .eq("bill_id", bill.id);
      if (itemsError) throw itemsError;

      const { error: billError } = await supabase
        .from("bills_generated")
        .delete()
        .eq("id", bill.id);
      if (billError) throw billError;

      clearAnalyticsCaches();
      fetchOldestRecord(true);
    } catch (err) {
      console.error("Delete bill error:", err);
      // Rollback: re-fetch to restore the bill if DB delete failed
      fetchData(true);
      alert("Failed to delete bill from database. Please try again.");
    } finally {
      setDeleting(false);
    }
  }, [expandedBill, clearAnalyticsCaches, fetchOldestRecord, fetchData]);

  // --- DELETE SINGLE ITEM (no discount or zero discount) ---
  const handleDeleteItemDirect = useCallback(async (bill, item, allItems) => {
    // If it's the last item, delete the entire bill
    if (allItems.length <= 1) {
      setBillToDelete(bill);
      return;
    }

    setDeleting(true);
    try {
      // Delete the item
      const { error: delError } = await supabase
        .from("bills_items_generated")
        .delete()
        .eq("id", item.id);
      if (delError) throw delError;

      // Recalculate bill totals
      const itemTotal = item.total ? Number(item.total) : (Number(item.qty ?? 0) * Number(item.price ?? 0));
      const newSubtotal = Number(bill.subtotal ?? 0) - itemTotal;
      const newTotal = newSubtotal - Number(bill.discount ?? 0);

      const { error: updateError } = await supabase
        .from("bills_generated")
        .update({ subtotal: newSubtotal, total: newTotal })
        .eq("id", bill.id);
      if (updateError) throw updateError;

      // Update local bills state
      setBills(prev => prev.map(b => b.id === bill.id ? { ...b, subtotal: newSubtotal, total: newTotal } : b));
      clearAnalyticsCaches();
      fetchOldestRecord(true);
    } catch (err) {
      console.error("Delete item error:", err);
      alert("Failed to delete item. Please try again.");
    } finally {
      setDeleting(false);
    }
  }, [clearAnalyticsCaches, fetchOldestRecord]);

  // --- ITEM DELETE ENTRY POINT (decides modal vs direct) ---
  const handleItemDeleteRequest = useCallback((bill, item, allItems) => {
    // Last item -> confirm full bill deletion
    if (allItems.length <= 1) {
      setBillToDelete(bill);
      return;
    }
    // Bill has discount -> show discount re-evaluation modal
    if (Number(bill.discount ?? 0) > 0) {
      setItemDeleteContext({ bill, item, items: allItems });
      return;
    }
    // No discount -> delete directly
    handleDeleteItemDirect(bill, item, allItems);
  }, [handleDeleteItemDirect]);

  // --- CONFIRM ITEM DELETE WITH NEW DISCOUNT ---
  const handleConfirmItemDeleteWithDiscount = useCallback(async (newDiscount) => {
    if (!itemDeleteContext) return;
    const { bill, item } = itemDeleteContext;

    setDeleting(true);
    try {
      const { error: delError } = await supabase
        .from("bills_items_generated")
        .delete()
        .eq("id", item.id);
      if (delError) throw delError;

      const itemTotal = item.total ? Number(item.total) : (Number(item.qty ?? 0) * Number(item.price ?? 0));
      const newSubtotal = Number(bill.subtotal ?? 0) - itemTotal;
      const finalDiscount = Math.min(newDiscount, newSubtotal);
      const newTotal = newSubtotal - finalDiscount;

      const { error: updateError } = await supabase
        .from("bills_generated")
        .update({ subtotal: newSubtotal, discount: finalDiscount, total: newTotal })
        .eq("id", bill.id);
      if (updateError) throw updateError;

      setBills(prev => prev.map(b => b.id === bill.id ? { ...b, subtotal: newSubtotal, discount: finalDiscount, total: newTotal } : b));
      setItemDeleteContext(null);
      clearAnalyticsCaches();
      fetchOldestRecord(true);
    } catch (err) {
      console.error("Delete item with discount error:", err);
      alert("Failed to delete item. Please try again.");
    } finally {
      setDeleting(false);
    }
  }, [itemDeleteContext, clearAnalyticsCaches, fetchOldestRecord]);

  // --- EFFECTS ---
  useEffect(() => {
    // Only persist tab and date mode — never persist dates (always reset to today on load)
    safeSetSessionStorage("analytics_activeTab", activeTab);
    safeSetSessionStorage("analytics_dateRangeMode", dateRangeMode);
  }, [activeTab, dateRangeMode]);

  useEffect(() => {
    if (!franchiseId) fetchFranchiseProfile();
  }, [franchiseId, fetchFranchiseProfile]);

  useEffect(() => {
    if (franchiseId) fetchOldestRecord();
  }, [franchiseId, fetchOldestRecord]);

  // Fetch data only when franchiseId is ready AND any filter changes
  useEffect(() => {
    if (franchiseId) fetchData();
  }, [activeTab, startDate, endDate, dateRangeMode, franchiseId, fetchData]);

  const stats = useMemo(() => {
    const totalSales = bills.reduce((sum, b) => sum + Number(b.total ?? b.total_amount ?? 0), 0);
    const upiSales = bills.reduce((sum, b) => (b.payment_mode === "UPI" ? sum + Number(b.total ?? b.total_amount ?? 0) : sum), 0);
    const cashSales = bills.reduce((sum, b) => (b.payment_mode === "CASH" ? sum + Number(b.total ?? b.total_amount ?? 0) : sum), 0);
    const totalDiscount = bills.reduce((sum, b) => sum + Number(b.discount ?? 0), 0);
    const totalOrders = bills.length;
    return { totalSales, upiSales, cashSales, totalDiscount, totalOrders };
  }, [bills]);

  const handleSort = useCallback((key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'desc' ? 'asc' : 'desc'
    }));
  }, []);

  const sortedBills = useMemo(() => {
    const sorted = [...bills];
    sorted.sort((a, b) => {
      let aVal, bVal;
      if (sortConfig.key === 'created_at') {
        aVal = new Date(a.created_at).getTime();
        bVal = new Date(b.created_at).getTime();
      } else if (sortConfig.key === 'amount') {
        aVal = Number(a.total ?? a.total_amount ?? 0);
        bVal = Number(b.total ?? b.total_amount ?? 0);
      } else if (sortConfig.key === 'payment_mode') {
        aVal = (a.payment_mode || '').toLowerCase();
        bVal = (b.payment_mode || '').toLowerCase();
      } else {
        aVal = a[sortConfig.key];
        bVal = b[sortConfig.key];
      }
      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
    return sorted;
  }, [bills, sortConfig]);

  const SortIcon = ({ columnKey }) => {
    if (sortConfig.key !== columnKey) return <ArrowUpDown size={10} style={{ opacity: 0.4 }} />;
    return sortConfig.direction === 'asc' ? <ArrowUp size={10} color={PRIMARY} /> : <ArrowDown size={10} color={PRIMARY} />;
  };

  const processChartData = (data) => {
    const map = {};
    data.forEach(r => {
      const amt = Number(r.total ?? r.total_amount ?? 0);
      const dateKey = new Date(r.created_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
      map[dateKey] = (map[dateKey] || 0) + amt;
    });
    return Object.entries(map).map(([date, sales]) => ({ date, sales })).reverse();
  };

  const fetchTopItems = async (ids) => {
    const table = activeTab === "store" ? "bills_items_generated" : "invoice_items";
    const key = activeTab === "store" ? "bill_id" : "invoice_id";
    const { data } = await supabase.from(table).select("*").in(key, ids);

    const agg = {};
    (data || []).forEach(i => {
      const q = Number(i.qty ?? i.quantity ?? 0);
      const name = i.item_name || "Unknown Item";
      agg[name] = (agg[name] || 0) + q;
    });

    return Object.entries(agg).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 10);
  };

  const handleExportExcel = () => {
    if (bills.length === 0) {
      alert("No data available to export for the selected dates.");
      return;
    }
    const isStore = activeTab === "store";
    const dateLabel = dateRangeMode === "single" ? startDate : `${startDate}_to_${endDate}`;

    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += `${isStore ? "Store Sales" : "Orders"} Report - ${dateLabel}\n\n`;

    // --- SUMMARY SECTION ---
    csvContent += "=== SUMMARY ===\n";
    csvContent += `Total ${isStore ? "Bills" : "Orders"},${bills.length}\n`;
    csvContent += `Total Amount (INR),${stats.totalSales.toFixed(2)}\n`;
    if (isStore) {
      csvContent += `UPI Amount (INR),${stats.upiSales.toFixed(2)}\n`;
      csvContent += `Cash Amount (INR),${stats.cashSales.toFixed(2)}\n`;
      csvContent += `Total Discount (INR),${stats.totalDiscount.toFixed(2)}\n`;
    }
    csvContent += "\n";

    // --- TOP ITEMS SECTION ---
    if (topItems.length > 0) {
      csvContent += "=== TOP SELLING ITEMS ===\n";
      csvContent += "S.No,Item Name,Qty Sold\n";
      topItems.forEach((item, idx) => {
        const safeName = String(item.name).replace(/"/g, '""');
        csvContent += `${idx + 1},"${safeName}",${item.value}\n`;
      });
      csvContent += "\n";
    }

    // --- DETAILED TRANSACTIONS ---
    csvContent += `=== DETAILED ${isStore ? "TRANSACTIONS" : "ORDERS"} ===\n`;
    if (isStore) {
      csvContent += "S.No,Transaction ID,Date,Time,Payment Mode,Subtotal (INR),Discount (INR),Total Amount (INR)\n";
      bills.forEach((bill, index) => {
        const dateObj = new Date(bill.created_at);
        const dateStr = dateObj.toLocaleDateString("en-IN", { day: '2-digit', month: 'short', year: 'numeric' });
        const timeStr = dateObj.toLocaleTimeString("en-US", { hour: '2-digit', minute: '2-digit', hour12: true });
        const amount = Number(bill.total ?? 0).toFixed(2);
        const subtotal = Number(bill.subtotal ?? 0).toFixed(2);
        const discount = Number(bill.discount ?? 0).toFixed(2);
        const mode = bill.payment_mode || "N/A";
        const transactionId = bill.franchise_id || bill.id;
        const safeId = String(transactionId).replace(/"/g, '""');
        csvContent += `${index + 1},"${safeId}",${dateStr},${timeStr},${mode},${subtotal},${discount},${amount}\n`;
      });
    } else {
      csvContent += "S.No,Invoice ID,Date,Time,Customer,Status,Total Amount (INR)\n";
      bills.forEach((bill, index) => {
        const dateObj = new Date(bill.created_at);
        const dateStr = dateObj.toLocaleDateString("en-IN", { day: '2-digit', month: 'short', year: 'numeric' });
        const timeStr = dateObj.toLocaleTimeString("en-US", { hour: '2-digit', minute: '2-digit', hour12: true });
        const amount = Number(bill.total_amount ?? 0).toFixed(2);
        const customer = bill.customer_name || "N/A";
        const status = bill.status || "N/A";
        const invoiceId = String(bill.id).slice(-8).toUpperCase();
        csvContent += `${index + 1},"${invoiceId}",${dateStr},${timeStr},"${customer}",${status},${amount}\n`;
      });
    }

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Franchise_${isStore ? "Sales" : "Orders"}_${dateLabel}.csv`);

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const renderBanner = () => {
    if (activeTab !== "store") return null;

    if (!oldestRecordDate && !loading) {
      return (
        <div className="warning-banner banner-success">
          <div className="warning-icon"><CheckCircle2 size={20} /></div>
          <div className="warning-text">
            <strong>🎉 Day 1!</strong> You don't have any bills yet. Your system is perfectly clean. You have <strong>45 days to go</strong> before any old data is deleted!
          </div>
        </div>
      );
    }

    if (oldestRecordDate && daysUntilDeletion !== null) {
      const formattedDate = oldestRecordDate.toLocaleDateString("en-IN", { day: 'numeric', month: 'short', year: 'numeric' });

      if (daysUntilDeletion <= 0) {
        return (
          <div className="warning-banner banner-urgent">
            <div className="warning-icon"><AlertOctagon size={20} /></div>
            <div className="warning-text">
              <strong>🚨 ACTION NEEDED:</strong> Your bills from <span>{formattedDate}</span> are 45 days old. They will be deleted <strong>TONIGHT</strong>. Click 'Export' to save them right now!
            </div>
          </div>
        );
      }

      if (daysUntilDeletion <= 5) {
        return (
          <div className="warning-banner banner-warning">
            <div className="warning-icon"><AlertTriangle size={20} /></div>
            <div className="warning-text">
              <strong>⚠️ Heads Up:</strong> Your oldest bill is from <span>{formattedDate}</span>. It will be deleted in exactly <strong>{daysUntilDeletion} days</strong>. Click 'Export' to save a copy.
            </div>
          </div>
        );
      }

      return (
        <div className="warning-banner banner-success">
          <div className="warning-icon"><CheckCircle2 size={20} /></div>
          <div className="warning-text">
            <strong>✅ Safe Zone:</strong> Your oldest bill is from <span>{formattedDate}</span>. You still have <strong>{daysUntilDeletion} days to go</strong> before it gets deleted.
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="analytics-page">
      <header style={styles.header}>
        <div style={styles.headerInner}>
          <button onClick={() => navigate(-1)} style={styles.backBtn}>
            <ArrowLeft size={18} /> <span>Back</span>
          </button>
          <h1 style={styles.heading}>
            Franchise <span style={{ color: PRIMARY }}>Analytics</span>
          </h1>
          <div style={styles.idBox}>ID : {franchiseId || "---"}</div>
        </div>
      </header>

      <div className="main-container">
        {renderBanner()}

        <div className="controls-wrapper">
          <div className="tab-group">
            <button onClick={() => setActiveTab("store")} className={`tab-btn ${activeTab === "store" ? "active" : ""}`}>Store Sales</button>
            <button onClick={() => setActiveTab("invoice")} className={`tab-btn ${activeTab === "invoice" ? "active" : ""}`}>Orders</button>
          </div>

          <div className="right-controls">
            <div className="date-group">
              <div className="range-toggle">
                <button onClick={() => setDateRangeMode("single")} className={dateRangeMode === "single" ? "active" : ""}>Day</button>
                <button onClick={() => setDateRangeMode("range")} className={dateRangeMode === "range" ? "active" : ""}>Range</button>
              </div>
              <div className="date-picker-box">
                <Calendar size={14} className="cal-icon" />
                <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                {dateRangeMode === "range" && (
                  <>
                    <span className="sep">-</span>
                    <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                  </>
                )}
              </div>
            </div>

            {/* --- NEW REFRESH BUTTON COMPONENT --- */}
            <div className="action-buttons">
              <button onClick={handleRefresh} className="icon-btn" disabled={loading} title="Refresh Live Data">
                <RefreshCw size={16} className={loading ? "spin-icon" : ""} />
              </button>

              <button onClick={handleExportExcel} className="export-btn" disabled={loading || bills.length === 0}>
                <Download size={16} />
                <span>Export</span>
              </button>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="loader-container">
            <div className="spinner"></div>
            <p>Syncing Data...</p>
          </div>
        ) : (
          <div className="dashboard-grid">
            <div className="card chart-card revenue-area">
              <div className="card-header">
                <h3>Revenue Trend</h3>
                <span className="badge">₹{graphData.reduce((a, b) => a + b.sales, 0).toLocaleString('en-IN')} Total</span>
              </div>
              <div className="chart-wrapper">
                {graphData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={graphData}>
                      <defs>
                        <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={PRIMARY} stopOpacity={0.2} />
                          <stop offset="95%" stopColor={PRIMARY} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="date" fontSize={10} tickLine={false} axisLine={false} tickMargin={10} />
                      <YAxis fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => `₹${v}`} width={40} />
                      <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                      <Area type="monotone" dataKey="sales" stroke={PRIMARY} strokeWidth={2} fill="url(#colorSales)" animationDuration={1000} />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="no-data">No sales data for selected period</div>
                )}
              </div>
            </div>

            <div className="card chart-card pie-area">
              <div className="card-header">
                <h3>Top 10 Items</h3>
                <span className="count-badge">{topItems.length} Items</span>
              </div>
              <div className="pie-content">
                <div className="pie-wrapper">
                  {topItems.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={topItems} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={35} outerRadius={60} paddingAngle={3}>
                          {topItems.map((_, index) => <Cell key={index} fill={COLORS[index % COLORS.length]} />)}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="no-data small">No Items</div>
                  )}
                </div>
                <div className="top-items-table">
                  <div className="ti-header">
                    <span className="ti-sno">#</span>
                    <span className="ti-name">Item Name</span>
                    <span className="ti-qty">Qty Sold</span>
                  </div>
                  <div className="ti-body">
                    {topItems.length === 0 && <div className="no-data small">No items found</div>}
                    {topItems.map((item, index) => (
                      <div key={index} className="ti-row">
                        <span className="ti-sno">
                          <span className="ti-rank" style={{ background: COLORS[index % COLORS.length], color: '#fff' }}>{index + 1}</span>
                        </span>
                        <span className="ti-name">
                          <span className="ti-color-dot" style={{ background: COLORS[index % COLORS.length] }}></span>
                          {item.name}
                        </span>
                        <span className="ti-qty"><strong>{item.value}</strong></span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="stats-row">
              <div className="stat-card">
                <span className="sc-label">TOTAL {activeTab === "store" ? "SALES" : "AMOUNT"}</span>
                <span className="sc-value">₹{stats.totalSales.toLocaleString('en-IN')}</span>
              </div>
              <div className="stat-card">
                <span className="sc-label">TOTAL {activeTab === "store" ? "BILLS" : "ORDERS"}</span>
                <span className="sc-value" style={{ color: '#6366f1' }}>{stats.totalOrders}</span>
              </div>
              {activeTab === "store" && (
                <>
                  <div className="stat-card">
                    <span className="sc-label">UPI</span>
                    <span className="sc-value" style={{ color: '#2563eb' }}>₹{stats.upiSales.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="stat-card">
                    <span className="sc-label">CASH</span>
                    <span className="sc-value" style={{ color: '#059669' }}>₹{stats.cashSales.toLocaleString('en-IN')}</span>
                  </div>
                </>
              )}
            </div>


            <div className="card list-area">
              <div className="card-header">
                <h3>{activeTab === "store" ? "Transactions" : "Invoices"}</h3>
                <span className="count-badge">{bills.length} Records</span>
              </div>

              <div className="table-header-row">
                <span className="th-sno">#</span>
                <span className="th-id">ID</span>
                <span className="th-date th-sortable" onClick={() => handleSort('created_at')}>Date & Time <SortIcon columnKey="created_at" /></span>
                {activeTab === "store" && (
                  <span className="th-mode th-sortable" onClick={() => handleSort('payment_mode')}>Mode <SortIcon columnKey="payment_mode" /></span>
                )}
                <span className="th-amt th-sortable" onClick={() => handleSort('amount')}>Amount <SortIcon columnKey="amount" /></span>
                <span className="th-disc th-sortable" onClick={() => handleSort('discount')}>Discount <SortIcon columnKey="discount" /></span>
                {activeTab === "store" && (
                  <span className="th-action">Action</span>
                )}
                <span className="th-icon"></span>
              </div>

              <div className="list-scroll">
                {sortedBills.length === 0 && <div className="no-data">No records found.</div>}
                {sortedBills.map((bill, index) => (
                  <div key={bill.id} className={`list-item ${expandedBill === bill.id ? 'expanded' : ''}`}>
                    <div className="item-summary" onClick={() => setExpandedBill(expandedBill === bill.id ? null : bill.id)}>
                      <div className="col sno-col">{index + 1}</div>
                      <div className="col id-col">
                        <div className="icon-box"><Hash size={12} /></div>
                        <span className="id-text">{bill.profiles?.franchise_id || bill.franchise_id || "..."}</span>
                      </div>
                      <div className="col date-col">
                        <span className="d-date">{new Date(bill.created_at).toLocaleDateString("en-IN", { day: '2-digit', month: 'short' })}</span>
                        <span className="d-time"><Clock size={10} /> {new Date(bill.created_at).toLocaleTimeString("en-US", { hour: '2-digit', minute: '2-digit', hour12: true })}</span>
                      </div>
                      {activeTab === "store" && (
                        <div className="col mode-col">
                          <span className={`mode-badge ${(bill.payment_mode || '').toLowerCase()}`}>{bill.payment_mode || 'N/A'}</span>
                        </div>
                      )}
                      <div className="col amt-col">₹{Number(bill.total ?? bill.total_amount ?? 0).toLocaleString('en-IN')}</div>
                      <div className="col disc-col">
                        {Number(bill.discount ?? 0) > 0 ? <span style={{color: '#ef4444'}}>-₹{Number(bill.discount).toLocaleString('en-IN')}</span> : <span style={{color: '#94a3b8'}}>₹0</span>}
                      </div>
                      {activeTab === "store" && (
                        <div className="col action-col">
                          <button
                            className="delete-icon-btn"
                            title="Delete this bill"
                            onClick={(e) => { e.stopPropagation(); setBillToDelete(bill); }}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      )}
                      <div className="col arrow-col">{expandedBill === bill.id ? <ChevronDown size={16} /> : <ChevronRight size={16} />}</div>
                    </div>

                    {expandedBill === bill.id && (
                      <div className="item-details">
                        <BillItems
                          billId={bill.id}
                          type={activeTab}
                          bill={bill}
                          onDeleteItem={activeTab === "store" ? handleItemDeleteRequest : undefined}
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}
      </div>

      {/* --- CONFIRMATION MODAL: Delete Entire Bill --- */}
      {billToDelete && (
        <ConfirmDeleteModal
          title="Delete Bill"
          message="This will permanently delete this bill and all its items. This action cannot be undone."
          loading={deleting}
          onConfirm={() => handleDeleteBill(billToDelete)}
          onCancel={() => setBillToDelete(null)}
        />
      )}

      {/* --- DISCOUNT RE-EVALUATION MODAL --- */}
      {itemDeleteContext && (
        <DiscountReEvalModal
          context={itemDeleteContext}
          loading={deleting}
          onConfirm={handleConfirmItemDeleteWithDiscount}
          onCancel={() => setItemDeleteContext(null)}
        />
      )}

      <style>{`
        :root { --primary: ${PRIMARY}; --excel: ${EXCEL_GREEN}; --bg: #f8fafc; --card-bg: #ffffff; --text-main: #0f172a; --text-sub: #64748b; --border: #e2e8f0; }
        .analytics-page { background: var(--bg); min-height: 100vh; font-family: 'Inter', sans-serif; color: var(--text-main); padding-bottom: 40px; }
        .main-container { max-width: 1200px; margin: 0 auto; padding: 16px; }
        .warning-banner { padding: 12px 16px; border-radius: 8px; display: flex; align-items: flex-start; gap: 12px; margin-bottom: 20px; box-shadow: 0 1px 2px rgba(0,0,0,0.05); border: 1px solid; border-left: 4px solid; transition: all 0.3s ease; }
        .warning-text { font-size: 13px; line-height: 1.5; }
        .warning-text span { font-weight: 800; padding: 2px 6px; border-radius: 4px; }
        .banner-success { background: #ecfdf5; border-color: #a7f3d0; border-left-color: #10b981; }
        .banner-success .warning-icon { color: #059669; margin-top: 2px; }
        .banner-success .warning-text { color: #065f46; }
        .banner-success .warning-text strong { color: #064e3b; }
        .banner-success .warning-text span { background: #d1fae5; }
        .banner-warning { background: #fffbeb; border-color: #fde68a; border-left-color: #f59e0b; }
        .banner-warning .warning-icon { color: #d97706; margin-top: 2px; }
        .banner-warning .warning-text { color: #92400e; }
        .banner-warning .warning-text strong { color: #b45309; }
        .banner-warning .warning-text span { background: #fef3c7; }
        .banner-urgent { background: #fef2f2; border-color: #fecaca; border-left-color: #ef4444; }
        .banner-urgent .warning-icon { color: #dc2626; margin-top: 2px; }
        .banner-urgent .warning-text { color: #991b1b; }
        .banner-urgent .warning-text strong { color: #7f1d1d; }
        .banner-urgent .warning-text span { background: #fee2e2; }
        .controls-wrapper { display: flex; flex-direction: column; gap: 12px; margin-bottom: 20px; }
        .right-controls { display: flex; flex-direction: column; gap: 12px; }
        .tab-group { background: #e2e8f0; padding: 2px; border-radius: 8px; display: inline-flex; width: fit-content; }
        .tab-btn { border: none; background: none; padding: 6px 16px; border-radius: 6px; font-size: 11px; font-weight: 600; color: var(--text-sub); cursor: pointer; transition: 0.2s; text-transform: uppercase; letter-spacing: 0.5px; }
        .tab-btn.active { background: #fff; color: var(--text-main); box-shadow: 0 1px 2px rgba(0,0,0,0.1); font-weight: 800; }
        .date-group { display: flex; gap: 10px; align-items: center; }
        .range-toggle { display: flex; background: #e2e8f0; padding: 2px; border-radius: 8px; }
        .range-toggle button { border: none; background: none; padding: 6px 12px; font-size: 11px; font-weight: 600; color: var(--text-sub); border-radius: 6px; cursor: pointer; text-transform: uppercase; }
        .range-toggle button.active { background: #fff; color: var(--text-main); box-shadow: 0 1px 2px rgba(0,0,0,0.1); font-weight: 800; }
        .date-picker-box { flex: 1; display: flex; align-items: center; background: #fff; border: 1px solid var(--border); padding: 0 10px; border-radius: 8px; height: 32px; }
        .date-picker-box input { border: none; background: transparent; font-size: 12px; font-weight: 600; outline: none; width: 100%; color: var(--text-main); }
        .cal-icon { margin-right: 8px; color: var(--text-sub); }
        .sep { margin: 0 8px; font-weight: 700; color: var(--border); }
        
        /* NEW STYLES FOR REFRESH BUTTON */
        .action-buttons { display: flex; gap: 8px; align-items: center; }
        .icon-btn { display: flex; align-items: center; justify-content: center; background: #fff; border: 1px solid var(--border); color: var(--text-sub); width: 32px; height: 32px; border-radius: 8px; cursor: pointer; transition: 0.2s; box-shadow: 0 1px 2px rgba(0,0,0,0.02); }
        .icon-btn:hover:not(:disabled) { border-color: var(--primary); color: var(--primary); }
        .icon-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .spin-icon { animation: spin 1s linear infinite; }
        
        .export-btn { display: flex; align-items: center; justify-content: center; gap: 8px; background: var(--excel); color: white; border: none; padding: 0 16px; height: 32px; border-radius: 8px; font-size: 12px; font-weight: 700; cursor: pointer; transition: background 0.2s, opacity 0.2s; box-shadow: 0 2px 4px rgba(16, 124, 65, 0.2); text-transform: uppercase; letter-spacing: 0.5px; }
        .export-btn:hover { background: #0c5e31; }
        .export-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .dashboard-grid { display: grid; grid-template-columns: 1fr; gap: 16px; }
        .card { background: var(--card-bg); border-radius: 16px; border: 1px solid var(--border); overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.02); }
        .card-header { padding: 16px; border-bottom: 1px solid #f8fafc; display: flex; justify-content: space-between; align-items: center; }
        .card-header h3 { margin: 0; font-size: 14px; font-weight: 700; color: var(--text-main); }
        .badge { font-size: 12px; font-weight: 700; color: var(--primary); background: #ecfdf5; padding: 4px 8px; border-radius: 20px; }
        .count-badge { font-size: 10px; font-weight: 600; color: var(--text-sub); background: #f1f5f9; padding: 3px 8px; border-radius: 4px; }
        .chart-wrapper { height: 250px; padding: 10px; }
        .pie-content { display: flex; flex-direction: column; padding: 16px; }
        .pie-wrapper { height: 180px; width: 100%; }
        .top-items-table { margin-top: 12px; border: 1px solid var(--border); border-radius: 10px; overflow: hidden; }
        .ti-header { display: flex; padding: 8px 12px; background: #f8fafc; border-bottom: 1px solid var(--border); position: sticky; top: 0; z-index: 1; }
        .ti-header span { font-size: 10px; font-weight: 800; color: var(--text-sub); text-transform: uppercase; }
        .ti-sno { width: 36px; text-align: center; display: flex; align-items: center; justify-content: center; }
        .ti-name { flex: 1; display: flex; align-items: center; gap: 6px; }
        .ti-qty { width: 60px; text-align: right; }
        .ti-body { max-height: 300px; overflow-y: auto; scrollbar-width: thin; scrollbar-color: var(--border) transparent; }
        .ti-body::-webkit-scrollbar { width: 6px; }
        .ti-body::-webkit-scrollbar-track { background: transparent; }
        .ti-body::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 3px; }
        .ti-body::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
        .ti-row { display: flex; padding: 8px 12px; border-bottom: 1px solid #f1f5f9; align-items: center; transition: background 0.15s; }
        .ti-row:last-child { border-bottom: none; }
        .ti-row:hover { background: #f8fafc; }
        .ti-row .ti-name { font-size: 12px; font-weight: 600; color: var(--text-main); display: flex; align-items: center; gap: 6px; }
        .ti-row .ti-qty { font-size: 12px; color: var(--primary); }
        .ti-rank { display: inline-flex; align-items: center; justify-content: center; width: 22px; height: 22px; border-radius: 6px; font-size: 10px; font-weight: 800; }
        .ti-color-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
        .toggle-card { grid-column: 1 / -1; margin-bottom: 0; }
        .list-area { display: flex; flex-direction: column; height: 100%; min-height: 400px; }
        /* === TABLE HEADER & ROW LAYOUT === */
        .table-header-row { display: flex; align-items: center; padding: 10px 16px; background: #f8fafc; border-bottom: 1px solid var(--border); gap: 8px; }
        .table-header-row span { font-size: 10px; font-weight: 700; color: var(--text-sub); text-transform: uppercase; white-space: nowrap; }
        .th-sortable { cursor: pointer; display: flex; align-items: center; gap: 4px; user-select: none; transition: color 0.15s; }
        .th-sortable:hover { color: var(--text-main); }
        .list-scroll { overflow-y: auto; max-height: 600px; overflow-x: hidden; }
        .list-item { border-bottom: 1px solid var(--border); transition: background 0.2s; }
        .list-item:active { background: #f8fafc; }
        .item-summary { display: flex; padding: 12px 16px; align-items: center; cursor: pointer; gap: 8px; }
        .col { display: flex; align-items: center; min-width: 0; }

        /* === MOBILE DEFAULTS (hidden: #, ID, Discount) === */
        .th-sno, .sno-col { display: none; }
        .th-id, .id-col { display: none; }
        .icon-box { display: none; }
        .th-disc, .disc-col { display: none; }
        .id-text { font-size: 12px; font-weight: 700; color: var(--text-main); }

        /* Mobile visible columns */
        .th-date { flex: 1; display: flex; justify-content: flex-start; }
        .date-col { flex: 1; flex-direction: column; align-items: flex-start; justify-content: center; min-width: 0; }
        .d-date { font-size: 12px; font-weight: 600; color: var(--text-main); }
        .d-time { font-size: 10px; color: var(--text-sub); display: flex; align-items: center; gap: 3px; }

        .th-mode { width: 60px; flex-shrink: 0; display: flex; justify-content: center; }
        .mode-col { width: 60px; flex-shrink: 0; display: flex; justify-content: center; }
        .mode-badge { font-size: 9px; font-weight: 800; padding: 3px 6px; border-radius: 6px; text-transform: uppercase; white-space: nowrap; }
        .mode-badge.upi { background: #eff6ff; color: #2563eb; }
        .mode-badge.cash { background: #f0fdf4; color: #059669; }

        .th-amt { width: 60px; flex-shrink: 0; display: flex; justify-content: flex-end; }
        .amt-col { width: 60px; flex-shrink: 0; display: flex; justify-content: flex-end; font-size: 13px; font-weight: 700; color: var(--primary); white-space: nowrap; }

        .th-action { width: 32px; flex-shrink: 0; display: flex; justify-content: center; }
        .action-col { width: 32px; flex-shrink: 0; display: flex; justify-content: center; }
        .delete-icon-btn { display: flex; align-items: center; justify-content: center; background: none; border: 1px solid transparent; color: #ef4444; width: 28px; height: 28px; border-radius: 6px; cursor: pointer; transition: all 0.2s; }
        .delete-icon-btn:hover { color: #dc2626; background: #fef2f2; border-color: #fecaca; }

        .th-icon { width: 24px; flex-shrink: 0; }
        .arrow-col { width: 24px; flex-shrink: 0; display: flex; justify-content: center; color: #cbd5e1; }
        .item-details { background: #f8fafc; padding: 12px 16px; border-top: 1px solid var(--border); }
        .no-data { text-align: center; padding: 20px; font-size: 12px; color: var(--text-sub); font-style: italic; }
        .loader-container { padding: 40px; text-align: center; color: var(--text-sub); font-weight: 500; font-size: 14px; }
        
        .stats-row { grid-column: 1 / -1; display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .stat-card { background: var(--card-bg); border: 1px solid var(--border); padding: 16px; border-radius: 12px; flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; box-shadow: 0 1px 2px rgba(0,0,0,0.02); margin-top: 4px; }
        .sc-label { font-size: 11px; font-weight: 800; color: var(--text-sub); margin-bottom: 4px; }
        .sc-value { font-size: 20px; font-weight: 900; color: var(--text-main); }
        @media (max-width: 767px) {
          .stats-row { flex-direction: column; gap: 12px; }
          .stat-card { flex-direction: row; justify-content: space-between; padding: 12px 16px; margin-top: 0; }
          .sc-label { margin-bottom: 0; }
          .sc-value { font-size: 16px; }
        }

        .spinner { width: 24px; height: 24px; border: 3px solid #e2e8f0; border-top-color: var(--primary); border-radius: 50%; margin: 0 auto 10px; animation: spin 1s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @media (min-width: 768px) {
          .controls-wrapper { flex-direction: row; justify-content: space-between; align-items: center; }
          .right-controls { flex-direction: row; align-items: center; }
          .tab-group, .date-group { width: auto; }
          .dashboard-grid { grid-template-columns: 2fr 1fr; grid-template-rows: auto auto auto auto; }
          .revenue-area { grid-column: 1 / 2; grid-row: 1 / 2; }
          .stats-row { grid-column: 1 / 2; grid-row: 2 / 3; }
          .pie-area { grid-column: 2 / 3; grid-row: 1 / 3; }
          .toggle-card { grid-column: 1 / -1; grid-row: 3 / 4; }
          .list-area { grid-column: 1 / -1; }
          .icon-box { display: flex; align-items: center; justify-content: center; background: #e0f2fe; color: #0284c7; width: 24px; height: 24px; border-radius: 6px; }

          /* Show hidden columns on desktop */
          .th-sno, .sno-col { display: flex; width: 36px; flex-shrink: 0; justify-content: center; font-size: 12px; font-weight: 700; color: #94a3b8; }
          .th-id, .id-col { display: flex; width: 100px; flex-shrink: 0; gap: 6px; }
          .th-disc, .disc-col { display: flex; flex: 1; justify-content: flex-end; font-size: 12px; font-weight: 600; }

          /* Adjust proportions for desktop — fixed date, flex for rest */
          .th-date, .date-col { width: 180px; flex: none; flex-shrink: 0; flex-direction: row; gap: 10px; align-items: center; justify-content: flex-start; }

          .th-mode, .mode-col { flex: 1; width: auto; }
          .th-amt, .amt-col { flex: 1; width: auto; }
          .th-action, .action-col { width: 44px; }
          .th-icon, .arrow-col { width: 30px; }

          .item-summary { padding: 14px 16px; }
          .mode-badge { font-size: 10px; padding: 3px 8px; }
        }
        @media (min-width: 1024px) {
           .main-container { padding: 24px; }
           .dashboard-grid { grid-template-columns: 3fr 1.5fr; gap: 24px; }
           .chart-wrapper { height: 300px; }
           .pie-wrapper { height: 200px; }
        }

        /* --- DELETE MODALS --- */
        .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; backdrop-filter: blur(4px); animation: fadeIn 0.15s ease; }
        .modal-box { background: #fff; border-radius: 16px; padding: 24px; width: 90%; max-width: 400px; box-shadow: 0 20px 60px rgba(0,0,0,0.2); animation: slideUp 0.2s ease; }
        .modal-title { margin: 0 0 8px; font-size: 16px; font-weight: 800; color: var(--text-main); }
        .modal-msg { font-size: 13px; color: var(--text-sub); line-height: 1.6; margin: 0 0 20px; }
        .modal-actions { display: flex; gap: 10px; justify-content: flex-end; }
        .modal-btn { padding: 8px 18px; border-radius: 8px; font-size: 12px; font-weight: 700; cursor: pointer; border: none; transition: all 0.2s; }
        .modal-btn.cancel { background: #f1f5f9; color: var(--text-sub); }
        .modal-btn.cancel:hover { background: #e2e8f0; }
        .modal-btn.danger { background: #ef4444; color: #fff; }
        .modal-btn.danger:hover { background: #dc2626; }
        .modal-btn.confirm { background: var(--primary); color: #fff; }
        .modal-btn.confirm:hover { opacity: 0.9; }
        .modal-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }

        /* --- DISCOUNT RE-EVAL MODAL --- */
        .discount-modal-box { background: #fff; border-radius: 16px; padding: 24px; width: 90%; max-width: 440px; box-shadow: 0 20px 60px rgba(0,0,0,0.2); animation: slideUp 0.2s ease; }
        .dm-item-info { background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 10px 12px; margin-bottom: 16px; display: flex; align-items: center; gap: 8px; }
        .dm-item-info .dm-trash-icon { color: #ef4444; }
        .dm-item-info span { font-size: 12px; color: #991b1b; font-weight: 600; }
        .dm-row { display: flex; justify-content: space-between; align-items: center; padding: 6px 0; font-size: 13px; }
        .dm-label { color: var(--text-sub); font-weight: 600; }
        .dm-value { font-weight: 700; color: var(--text-main); }
        .dm-divider { height: 1px; background: var(--border); margin: 12px 0; }
        .dm-discount-section { margin: 12px 0; }
        .dm-discount-header { font-size: 12px; font-weight: 700; color: var(--text-main); margin-bottom: 8px; }
        .dm-toggle-group { display: flex; background: #f1f5f9; padding: 2px; border-radius: 8px; margin-bottom: 10px; }
        .dm-toggle-btn { flex: 1; border: none; background: none; padding: 6px; font-size: 11px; font-weight: 700; color: var(--text-sub); border-radius: 6px; cursor: pointer; transition: 0.2s; }
        .dm-toggle-btn.active { background: #fff; color: var(--text-main); box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
        .dm-input-row { display: flex; align-items: center; gap: 8px; }
        .dm-input { flex: 1; border: 1px solid var(--border); border-radius: 8px; padding: 8px 12px; font-size: 14px; font-weight: 600; outline: none; transition: border-color 0.2s; }
        .dm-input:focus { border-color: var(--primary); }
        .dm-input-prefix { font-size: 14px; font-weight: 700; color: var(--text-sub); }
        .dm-preview { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 10px 12px; margin-top: 12px; }
        .dm-preview-row { display: flex; justify-content: space-between; font-size: 13px; padding: 2px 0; }
        .dm-preview-total { font-weight: 800; color: var(--primary); font-size: 15px; }
        .dm-error { color: #ef4444; font-size: 11px; font-weight: 600; margin-top: 6px; }

        /* --- BILL ITEMS DELETE BUTTON --- */
        .bi-delete-btn { display: flex; align-items: center; justify-content: center; background: none; border: none; color: #cbd5e1; cursor: pointer; padding: 2px; border-radius: 4px; transition: all 0.2s; }
        .bi-delete-btn:hover { color: #ef4444; background: #fef2f2; }
      `}</style>
    </div>
  );
}

function BillItems({ billId, type, bill, onDeleteItem }) {
  const [items, setItems] = useState([]);
  const [fetchKey, setFetchKey] = useState(0);

  useEffect(() => {
    let mounted = true;
    const doFetch = async () => {
      const table = type === "store" ? "bills_items_generated" : "invoice_items";
      const key = type === "store" ? "bill_id" : "invoice_id";

      // Always fetch fresh if fetchKey > 0 (means item was deleted)
      if (fetchKey === 0) {
        const cacheKey = `bill_items_${billId}`;
        const cachedItems = sessionStorage.getItem(cacheKey);
        if (cachedItems) {
          if (mounted) setItems(JSON.parse(cachedItems));
          return;
        }
      }

      const { data } = await supabase.from(table).select("*").eq(key, billId);

      if (mounted) {
        const fetchedData = data || [];
        setItems(fetchedData);
        safeSetSessionStorage(`bill_items_${billId}`, JSON.stringify(fetchedData));
      }
    };
    doFetch();
    return () => { mounted = false; };
  }, [billId, type, fetchKey]);

  // Re-fetch items when the bill's subtotal changes (means an item was deleted)
  useEffect(() => {
    if (bill) setFetchKey(k => k + 1);
  }, [bill?.subtotal]);

  const isStore = type === "store";

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '250px', overflowY: 'auto', paddingRight: '4px' }}>
      <div style={{ display: 'flex', fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700, paddingBottom: 4, borderBottom: '1px solid #e2e8f0', position: 'sticky', top: 0, background: '#f8fafc' }}>
        <span style={{ flex: 2 }}>Item Name</span>
        <span style={{ flex: 1, textAlign: 'center' }}>Qty</span>
        <span style={{ flex: 1, textAlign: 'right' }}>Subtotal</span>
        <span style={{ width: 28 }}></span>
      </div>
      {items.map((i, idx) => {
        const qty = Number(i.qty ?? i.quantity ?? 0);
        const price = Number(i.price ?? 0);
        const lineTotal = i.total ? Number(i.total) : (qty * price);

        return (
          <div key={i.id || idx} style={{ display: 'flex', fontSize: '12px', alignItems: 'center', padding: '4px 0' }}>
            <span style={{ flex: 2, fontWeight: 600, color: '#334155' }}>{i.item_name}</span>
            <span style={{ flex: 1, textAlign: 'center', color: '#64748b' }}>{qty}</span>
            <span style={{ flex: 1, textAlign: 'right', fontWeight: 700, color: '#0f172a' }}>₹{lineTotal.toLocaleString('en-IN')}</span>
            {isStore && onDeleteItem ? (
              <span style={{ width: 28, display: 'flex', justifyContent: 'center' }}>
                <button
                  className="bi-delete-btn"
                  title="Delete this item"
                  onClick={() => onDeleteItem(bill, i, items)}
                >
                  <Trash2 size={12} />
                </button>
              </span>
            ) : (
              <span style={{ width: 28 }}></span>
            )}
          </div>
        )
      })}

      {/* --- BILL SUMMARY FOOTER --- */}
      {bill && (
        <div style={{
          marginTop: '8px', 
          paddingTop: '8px', 
          borderTop: '1px dashed #cbd5e1', 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '4px',
          fontSize: '12px'
        }}>
          {Number(bill.discount || 0) > 0 ? (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b' }}>
                <span>Subtotal:</span>
                <span style={{ fontWeight: 600 }}>₹{Number(bill.subtotal || 0).toLocaleString('en-IN')}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#ef4444' }}>
                <span>Discount:</span>
                <span style={{ fontWeight: 600 }}>- ₹{Number(bill.discount || 0).toLocaleString('en-IN')}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#0f172a', fontSize: '13px', paddingTop: '4px' }}>
                <span style={{ fontWeight: 700 }}>Total:</span>
                <span style={{ fontWeight: 800, color: PRIMARY }}>₹{Number(bill.total || 0).toLocaleString('en-IN')}</span>
              </div>
            </>
          ) : (
             <div style={{ display: 'flex', justifyContent: 'space-between', color: '#0f172a', fontSize: '13px' }}>
               <span style={{ fontWeight: 700 }}>Total:</span>
               <span style={{ fontWeight: 800, color: PRIMARY }}>₹{Number(bill.total || 0).toLocaleString('en-IN')}</span>
             </div>
          )}
        </div>
      )}
    </div>
  );
}

// --- CONFIRM DELETE MODAL ---
function ConfirmDeleteModal({ title, message, loading, onConfirm, onCancel }) {
  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <h3 className="modal-title">🗑️ {title}</h3>
        <p className="modal-msg">{message}</p>
        <div className="modal-actions">
          <button className="modal-btn cancel" onClick={onCancel} disabled={loading}>Cancel</button>
          <button className="modal-btn danger" onClick={onConfirm} disabled={loading}>
            {loading ? "Deleting..." : "Yes, Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

// --- DISCOUNT RE-EVALUATION MODAL ---
function DiscountReEvalModal({ context, loading, onConfirm, onCancel }) {
  const { bill, item } = context;
  const itemTotal = item.total ? Number(item.total) : (Number(item.qty ?? 0) * Number(item.price ?? 0));
  const newSubtotal = Number(bill.subtotal ?? 0) - itemTotal;
  const oldDiscount = Number(bill.discount ?? 0);

  const [discountType, setDiscountType] = useState('fixed'); // 'fixed' or 'percent'
  const [discountInput, setDiscountInput] = useState(String(oldDiscount));

  const computedDiscount = discountType === 'percent'
    ? Math.round((Number(discountInput || 0) / 100) * newSubtotal * 100) / 100
    : Number(discountInput || 0);

  const isValid = computedDiscount >= 0 && computedDiscount <= newSubtotal;
  const newTotal = isValid ? (newSubtotal - computedDiscount) : newSubtotal;

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="discount-modal-box" onClick={e => e.stopPropagation()}>
        <h3 className="modal-title">Re-evaluate Discount</h3>

        <div className="dm-item-info">
          <Trash2 size={14} className="dm-trash-icon" />
          <span>Deleting: <strong>{item.item_name}</strong> (₹{itemTotal.toLocaleString('en-IN')})</span>
        </div>

        <div className="dm-row">
          <span className="dm-label">Old Subtotal</span>
          <span className="dm-value">₹{Number(bill.subtotal ?? 0).toLocaleString('en-IN')}</span>
        </div>
        <div className="dm-row">
          <span className="dm-label">New Subtotal</span>
          <span className="dm-value" style={{ color: PRIMARY }}>₹{newSubtotal.toLocaleString('en-IN')}</span>
        </div>
        <div className="dm-row">
          <span className="dm-label">Old Discount</span>
          <span className="dm-value" style={{ color: '#ef4444' }}>₹{oldDiscount.toLocaleString('en-IN')}</span>
        </div>

        <div className="dm-divider" />

        <div className="dm-discount-section">
          <div className="dm-discount-header">Set New Discount</div>
          <div className="dm-toggle-group">
            <button className={`dm-toggle-btn ${discountType === 'fixed' ? 'active' : ''}`} onClick={() => { setDiscountType('fixed'); setDiscountInput(String(oldDiscount)); }}>₹ Fixed</button>
            <button className={`dm-toggle-btn ${discountType === 'percent' ? 'active' : ''}`} onClick={() => { setDiscountType('percent'); setDiscountInput(''); }}>% Percent</button>
          </div>
          <div className="dm-input-row">
            <span className="dm-input-prefix">{discountType === 'fixed' ? '₹' : '%'}</span>
            <input
              className="dm-input"
              type="number"
              min="0"
              max={discountType === 'percent' ? 100 : newSubtotal}
              value={discountInput}
              onChange={e => setDiscountInput(e.target.value)}
              placeholder={discountType === 'fixed' ? 'Enter amount' : 'Enter percentage'}
            />
          </div>
          {!isValid && discountInput !== '' && (
            <div className="dm-error">Discount cannot exceed the new subtotal (₹{newSubtotal.toLocaleString('en-IN')})</div>
          )}
        </div>

        <div className="dm-preview">
          <div className="dm-preview-row">
            <span className="dm-label">New Subtotal</span>
            <span className="dm-value">₹{newSubtotal.toLocaleString('en-IN')}</span>
          </div>
          <div className="dm-preview-row">
            <span className="dm-label">New Discount</span>
            <span className="dm-value" style={{ color: '#ef4444' }}>- ₹{(isValid ? computedDiscount : 0).toLocaleString('en-IN')}</span>
          </div>
          <div className="dm-preview-row" style={{ marginTop: 4, borderTop: '1px dashed #bbf7d0', paddingTop: 6 }}>
            <span className="dm-label" style={{ fontWeight: 800 }}>New Total</span>
            <span className="dm-preview-total">₹{newTotal.toLocaleString('en-IN')}</span>
          </div>
        </div>

        <div className="modal-actions" style={{ marginTop: 16 }}>
          <button className="modal-btn cancel" onClick={onCancel} disabled={loading}>Cancel</button>
          <button className="modal-btn danger" onClick={() => onConfirm(computedDiscount)} disabled={loading || !isValid}>
            {loading ? "Deleting..." : "Delete & Update"}
          </button>
        </div>
      </div>
    </div>
  );
}

const styles = headerStyles;

export default FranchiseAnalytics;