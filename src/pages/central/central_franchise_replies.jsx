import React, { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { supabase } from "../../frontend_supabase/supabaseClient";
import { useNavigate } from "react-router-dom";
import {
  FiArrowLeft, FiSearch, FiX, FiCheck, FiPackage, FiTruck,
  FiRefreshCw, FiAlertCircle, FiBox, FiClock, FiPhone,
  FiChevronDown, FiInbox, FiFilter, FiMessageSquare,
  FiCalendar, FiPrinter, FiXCircle
} from "react-icons/fi";
import { headerStyles } from "../../utils/headerStyles";

const BRAND_GREEN = "rgb(0, 100, 55)";
const ITEMS_PER_INVOICE_PAGE = 15;

const STATUS_CONFIG = {
  received:   { label: "Received",   color: "bg-amber-100 text-amber-700 border-amber-200",     icon: <FiClock size={12} />,   next: "packed",     nextLabel: "Mark as Packed" },
  packed:     { label: "Packed",     color: "bg-blue-100 text-blue-700 border-blue-200",         icon: <FiBox size={12} />,     next: "dispatched", nextLabel: "Mark as Dispatched" },
  dispatched: { label: "Dispatched", color: "bg-emerald-100 text-emerald-700 border-emerald-200", icon: <FiTruck size={12} />,   next: null,         nextLabel: null },
  cancelled:  { label: "Cancelled",  color: "bg-red-100 text-red-600 border-red-200",             icon: <FiX size={12} />,       next: null,         nextLabel: null },
};

const STATUS_STEPS = ["received", "packed", "dispatched"];

// ========== INVOICE COMPONENT (same design as stock order page) ==========
const RequestInvoice = ({ order, companyDetails, franchiseProfile, logoBase64, pageIndex, totalPages, itemsChunk }) => {
  if (!order) return null;
  const companyName = companyDetails?.company_name || "";
  const currentLogo = logoBase64 || companyDetails?.logo_url || null;
  const invDate = new Date(order.created_at).toLocaleDateString('en-GB');

  return (
    <div className="a4-page flex flex-col bg-white text-black font-sans text-xs leading-normal relative">
      <div className="w-full border-2 border-black flex flex-col relative flex-1">
        <div className="text-center py-2 border-b-2 border-black bg-white">
          <h1 className="text-xl font-black uppercase tracking-widest text-black underline underline-offset-4">STOCK REQUEST</h1>
        </div>
        <div className="flex justify-between items-start p-3 border-b-2 border-black bg-white">
          <div className="w-[60%] text-left">
            <span className="uppercase font-black text-[10px] underline mb-1 block text-black">Registered Office:</span>
            <p className="whitespace-pre-wrap text-[10px] leading-tight pr-4 text-black">{companyDetails?.company_address || ""}</p>
            <div className="mt-1 space-y-0.5 text-[10px]">
              {companyDetails?.company_gst && <p className="text-black">GSTIN: <span className="font-black">{companyDetails.company_gst}</span></p>}
              {companyDetails?.company_email && <p className="text-black">Email: {companyDetails.company_email}</p>}
            </div>
          </div>
          <div className="w-[40%] flex flex-col items-end text-right justify-center">
            {currentLogo ? (
              <img loading="lazy" src={currentLogo} alt="Logo" crossOrigin="anonymous" className="h-12 w-auto object-contain mb-1" />
            ) : (
              <div className="h-10 w-24 border border-dashed border-gray-400 flex items-center justify-center text-[9px] mb-1">NO LOGO</div>
            )}
            <h2 className="text-[14px] font-black uppercase leading-tight text-black">{companyName}</h2>
          </div>
        </div>
        <div className="flex border-b-2 border-black bg-slate-50 text-black">
          <div className="w-1/2 border-r-2 border-black py-1.5 px-3">
            <span className="font-bold uppercase text-[9px]">Request ID:</span>
            <p className="font-black text-sm">#{(order.id || '').slice(0, 8).toUpperCase()}</p>
          </div>
          <div className="w-1/2 py-1.5 px-3">
            <span className="font-bold uppercase text-[9px]">Request Date:</span>
            <p className="font-black text-sm">{invDate}</p>
          </div>
        </div>
        <div className="flex border-b-2 border-black bg-white text-black">
          <div className="w-[70%] p-3 border-r-2 border-black">
            <span className="font-black uppercase underline text-[10px] tracking-widest mb-1 block">Requested By:</span>
            <h3 className="text-sm font-black uppercase leading-tight">{order.user_name || ""}</h3>
            <p className="font-bold text-[10px] mt-0.5 uppercase leading-snug whitespace-pre-wrap pr-2">
              {franchiseProfile?.address || ""}<br />
              {franchiseProfile?.city ? `${franchiseProfile.city}` : ''}{franchiseProfile?.state ? `, ${franchiseProfile.state}` : ''}{franchiseProfile?.pincode ? ` - ${franchiseProfile.pincode}` : ''}
            </p>
          </div>
          <div className="w-[30%] p-3 flex flex-col justify-center text-black">
            <div className="mb-1.5"><span className="text-[10px] font-bold block mb-0.5">ID: </span><span className="text-sm font-black block leading-none">{order.franchise_id || ""}</span></div>
            {order.user_phone && (<div><span className="text-[10px] font-bold block mb-0.5">Ph: </span><span className="text-sm font-black block leading-none">{order.user_phone}</span></div>)}
          </div>
        </div>
        <div className="flex-1 border-b-2 border-black flex flex-col bg-white">
          <table className="w-full text-left bg-white border-collapse text-black border-b-2 border-black">
            <thead className="bg-slate-100 text-[10px] border-b-2 border-black">
              <tr>
                <th className="py-1.5 px-2 border-r-2 border-black w-10 text-center">S.No</th>
                <th className="py-1.5 px-2 border-r-2 border-black">Item Description</th>
                <th className="py-1.5 px-2 border-r-2 border-black w-20 text-center">Item Code</th>
                <th className="py-1.5 px-2 w-20 text-center">Qty</th>
              </tr>
            </thead>
            <tbody className="text-[10px] font-bold">
              {itemsChunk.map((item, idx) => (
                <tr key={idx} className="h-[26px] overflow-hidden border-b border-black">
                  <td className="py-0.5 px-2 border-r-2 border-black text-center">{(pageIndex * ITEMS_PER_INVOICE_PAGE) + idx + 1}</td>
                  <td className="py-0.5 px-2 border-r-2 border-black uppercase truncate whitespace-nowrap overflow-hidden">{item.item_name}</td>
                  <td className="py-0.5 px-2 border-r-2 border-black text-center uppercase">{item.item_code || "—"}</td>
                  <td className="py-0.5 px-2 text-center">{item.quantity} {item.unit}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex mt-auto bg-white text-black">
          <div className="w-[60%] border-r-2 border-black flex flex-col">
            <div className="py-1.5 px-3 border-b-2 border-black bg-slate-50 min-h-[30px] flex flex-col justify-center">
              <span className="font-bold text-[9px] uppercase">Total Items:</span>
              <p className="font-black text-[10px] mt-0.5 leading-tight">{(order.items || []).length} items requested</p>
            </div>
            <div className="p-3 flex-1 flex flex-col justify-between">
              <div>
                <p className="font-black uppercase underline text-[10px] mb-1.5">Status</p>
                <p className="text-[10px] font-bold uppercase">{STATUS_CONFIG[order.status]?.label || order.status}</p>
              </div>
              {order.notes && (
                <div className="mt-2 pt-1.5 border-t border-slate-300">
                  <p className="font-black uppercase underline text-[10px] mb-1">Notes:</p>
                  <p className="text-[8px] whitespace-pre-wrap leading-tight">{order.notes}</p>
                </div>
              )}
            </div>
          </div>
          <div className="w-[40%] flex flex-col text-[10px]">
            <div className="flex justify-between py-1 px-2 border-b border-black"><span>Total Items</span><span className="font-black">{(order.items || []).length}</span></div>
            <div className="flex justify-between py-1 px-2 border-b border-black"><span>Total Quantity</span><span className="font-black">{(order.items || []).reduce((a, i) => a + Number(i.quantity || 0), 0)}</span></div>
            <div className="flex justify-between py-1.5 px-2 border-b-2 border-black bg-slate-200"><span className="font-black uppercase">Status</span><span className="font-black uppercase">{STATUS_CONFIG[order.status]?.label || order.status}</span></div>
            <div className="flex-1 flex flex-col justify-end p-2 text-center min-h-[50px]">
              {pageIndex < totalPages - 1 && <p className="text-[8px] mb-1 font-bold italic text-slate-500">Continued on next page...</p>}
              <p className="font-black border-t border-black pt-1 uppercase text-[8px]">Authorized Signature</p>
            </div>
          </div>
        </div>
      </div>
      <div className="absolute bottom-1 right-2 print:bottom-1.5 print:right-2 text-[9px] font-black text-black">
        Page {pageIndex + 1} of {totalPages}
      </div>
    </div>
  );
};

// ========== MAIN COMPONENT ==========
const CentralStockRequests = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [companyDetails, setCompanyDetails] = useState(null);
  const [cachedLogoBase64, setCachedLogoBase64] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [expandedOrder, setExpandedOrder] = useState(null);
  const [noteInput, setNoteInput] = useState({});
  const [updatingId, setUpdatingId] = useState(null);
  const [printOrder, setPrintOrder] = useState(null);

  // Franchise profiles cache for invoice "Bill To" section
  const [franchiseProfiles, setFranchiseProfiles] = useState({});

  // Date filter
  const [singleDate, setSingleDate] = useState(new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }));

  // Toast
  const [toasts, setToasts] = useState([]);
  const toastTimeoutsRef = useRef(new Map());

  useEffect(() => {
    const timeouts = toastTimeoutsRef.current;
    return () => { timeouts.forEach(id => clearTimeout(id)); timeouts.clear(); };
  }, []);

  const addToast = useCallback((type, message, duration = 4000) => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, type, message }]);
    const timeoutId = setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
      toastTimeoutsRef.current.delete(id);
    }, duration);
    toastTimeoutsRef.current.set(id, timeoutId);
  }, []);

  // Load image as base64 for print/PDF
  const loadImageAsBase64 = useCallback((url) => {
    return new Promise((resolve) => {
      if (!url) return resolve(null);
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        canvas.getContext("2d").drawImage(img, 0, 0);
        resolve(canvas.toDataURL("image/png"));
      };
      img.onerror = () => resolve(null);
      img.src = url;
    });
  }, []);

  // Fetch profile + company details
  useEffect(() => {
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: p } = await supabase.from("profiles").select("*").eq("id", user.id).single();
          setProfile(p);
          if (p?.company) {
            const { data: cd } = await supabase.from("companies").select("*").eq("company_name", p.company).single();
            if (cd) {
              setCompanyDetails(cd);
              if (cd.logo_url) {
                loadImageAsBase64(cd.logo_url).then(b64 => setCachedLogoBase64(b64));
              }
            }
          }
        }
      } catch (e) { console.error(e); }
    })();
  }, [loadImageAsBase64]);

  // Fetch all orders
  const fetchOrders = useCallback(async (isBackground = false) => {
    if (!isBackground) setLoading(true);
    try {
      const { data, error } = await supabase
        .from("stock_request_orders")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      setOrders(data || []);
    } catch (e) {
      console.error("Error fetching orders:", e);
      if (!isBackground) addToast("error", "Failed to load orders.");
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    fetchOrders();
    const channel = supabase
      .channel("central-stock-request-orders")
      .on("postgres_changes", { event: "*", schema: "public", table: "stock_request_orders" }, () => { fetchOrders(true); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchOrders]);

  // Fetch franchise profile for invoice when needed
  const fetchFranchiseProfile = useCallback(async (userId) => {
    if (franchiseProfiles[userId]) return franchiseProfiles[userId];
    try {
      const { data } = await supabase.from("profiles").select("*").eq("id", userId).single();
      if (data) setFranchiseProfiles(prev => ({ ...prev, [userId]: data }));
      return data;
    } catch { return null; }
  }, [franchiseProfiles]);

  // Filtered orders
  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      const q = search.toLowerCase();
      const matchesSearch = !q ||
        order.franchise_id?.toLowerCase().includes(q) ||
        order.user_name?.toLowerCase().includes(q) ||
        order.user_phone?.includes(q) ||
        (order.items || []).some(i => i.item_name?.toLowerCase().includes(q));
      const matchesStatus = statusFilter === "all" || order.status === statusFilter;
      const orderDate = new Date(order.created_at).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
      const matchesDate = !singleDate || orderDate === singleDate;
      return matchesSearch && matchesStatus && matchesDate;
    });
  }, [orders, search, statusFilter, singleDate]);

  // Status counts
  const statusCounts = useMemo(() => {
    const counts = { all: orders.length, received: 0, packed: 0, dispatched: 0, cancelled: 0 };
    orders.forEach(o => { if (counts[o.status] !== undefined) counts[o.status]++; });
    return counts;
  }, [orders]);

  // Update order status
  const updateStatus = async (orderId, newStatus) => {
    setUpdatingId(orderId);
    try {
      const updateData = { status: newStatus };
      if (noteInput[orderId]?.trim()) updateData.notes = noteInput[orderId].trim();
      const { error } = await supabase.from("stock_request_orders").update(updateData).eq("id", orderId);
      if (error) throw error;
      addToast("success", `Order marked as ${newStatus}`);
      setNoteInput(prev => ({ ...prev, [orderId]: "" }));
      fetchOrders(true);
    } catch { addToast("error", "Failed to update status."); }
    finally { setUpdatingId(null); }
  };

  // Reject order
  const rejectOrder = async (orderId) => {
    setUpdatingId(orderId);
    try {
      const updateData = { status: "cancelled" };
      if (noteInput[orderId]?.trim()) updateData.notes = noteInput[orderId].trim();
      const { error } = await supabase.from("stock_request_orders").update(updateData).eq("id", orderId);
      if (error) throw error;
      addToast("success", "Order rejected.");
      setNoteInput(prev => ({ ...prev, [orderId]: "" }));
      fetchOrders(true);
    } catch { addToast("error", "Failed to reject order."); }
    finally { setUpdatingId(null); }
  };

  // Save note
  const saveNote = async (orderId) => {
    if (!noteInput[orderId]?.trim()) return;
    setUpdatingId(orderId);
    try {
      const { error } = await supabase.from("stock_request_orders").update({ notes: noteInput[orderId].trim() }).eq("id", orderId);
      if (error) throw error;
      addToast("success", "Note saved.");
      fetchOrders(true);
    } catch { addToast("error", "Failed to save note."); }
    finally { setUpdatingId(null); }
  };

  // Print handler
  const handlePrint = async (order) => {
    await fetchFranchiseProfile(order.user_id);
    setPrintOrder(order);
    setTimeout(() => window.print(), 300);
  };

  const resetFilters = () => {
    setSearch("");
    setStatusFilter("all");
    setSingleDate(new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }));
    fetchOrders();
  };

  // Print chunks for current print order
  const printChunks = useMemo(() => {
    if (!printOrder || !printOrder.items) return [];
    const chunks = [];
    for (let i = 0; i < printOrder.items.length; i += ITEMS_PER_INVOICE_PAGE) {
      chunks.push(printOrder.items.slice(i, i + ITEMS_PER_INVOICE_PAGE));
    }
    return chunks;
  }, [printOrder]);

  return (
    <div className="min-h-screen bg-[#F3F4F6] font-sans text-black relative pb-20">
      {/* Print-only invoice pages */}
      <div className="print-only hidden print:block bg-white">
        {printOrder && printChunks.map((chunk, index) => (
          <RequestInvoice
            key={index}
            order={printOrder}
            companyDetails={companyDetails}
            franchiseProfile={franchiseProfiles[printOrder.user_id] || null}
            logoBase64={cachedLogoBase64}
            itemsChunk={chunk}
            pageIndex={index}
            totalPages={printChunks.length}
          />
        ))}
      </div>

      {/* Screen content — hidden when printing */}
      <div className="print:hidden">
        {/* Toasts */}
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-2 w-full max-w-xs pointer-events-none">
          {toasts.map(t => (
            <div key={t.id} className={`pointer-events-auto p-3 rounded-xl shadow-xl border flex items-center gap-2 bg-white ${t.type === "error" ? "border-red-100 text-red-600" : "border-emerald-100 text-emerald-600"}`}>
              {t.type === "error" ? <FiAlertCircle className="shrink-0" /> : <FiCheck className="shrink-0" />}
              <p className="text-[11px] font-black uppercase tracking-tight flex-1">{t.message}</p>
            </div>
          ))}
        </div>

        {/* Header */}
        <header style={styles.header}>
          <div style={styles.headerInner}>
            <button onClick={() => window.history.length > 1 ? navigate(-1) : navigate("/")} style={styles.backBtn}>
              <FiArrowLeft size={18} /> <span>Back</span>
            </button>
            <h1 style={styles.heading}>STOCK <span style={{ color: BRAND_GREEN }}>REQUESTS</span></h1>
            <div style={styles.idBox}>ID : {profile?.franchise_id || "CENTRAL"}</div>
          </div>
        </header>

        <div className="max-w-[1400px] mx-auto px-4 sm:px-6">
          {/* Toolbar */}
          <div className="flex flex-col lg:flex-row gap-3 mb-6">
            <div className="relative flex-1">
              <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                placeholder="SEARCH BY FRANCHISE, NAME, PHONE, OR ITEM..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full h-12 pl-12 pr-4 bg-white border border-slate-200 rounded-2xl text-sm font-black uppercase outline-none focus:border-black transition-all shadow-sm"
              />
            </div>
            <div className="flex items-center gap-2 h-12 bg-white border border-slate-200 rounded-2xl px-4 hover:border-black transition-colors shadow-sm">
              <FiCalendar size={16} className="text-slate-500 shrink-0" />
              <input type="date" value={singleDate} onChange={e => setSingleDate(e.target.value)} className="bg-transparent text-xs font-black outline-none cursor-pointer uppercase text-center" />
            </div>
            <button onClick={resetFilters} className="h-12 w-12 flex items-center justify-center bg-white border border-slate-200 text-slate-500 rounded-2xl hover:border-black hover:text-black transition-all active:scale-95 shadow-sm shrink-0">
              <FiRefreshCw size={18} className={loading ? "animate-spin" : ""} />
            </button>
          </div>

          {/* Status Filter Tabs */}
          <div className="overflow-x-auto pb-3 scrollbar-thin mb-4">
            <div className="flex gap-2 min-w-max">
              {[
                { key: "all", label: "All", icon: <FiFilter size={12} /> },
                { key: "received", label: "Received", icon: <FiClock size={12} /> },
                { key: "packed", label: "Packed", icon: <FiBox size={12} /> },
                { key: "dispatched", label: "Dispatched", icon: <FiTruck size={12} /> },
                { key: "cancelled", label: "Rejected", icon: <FiX size={12} /> },
              ].map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setStatusFilter(tab.key)}
                  className={`flex-shrink-0 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase border-2 transition-all active:scale-95 flex items-center gap-2 ${statusFilter === tab.key ? "text-white border-transparent shadow-lg" : "bg-white text-slate-600 border-slate-200 hover:border-black"}`}
                  style={statusFilter === tab.key ? { backgroundColor: BRAND_GREEN } : {}}
                >
                  {tab.icon} {tab.label}
                  <span className={`px-1.5 py-0.5 rounded-full text-[8px] ${statusFilter === tab.key ? "bg-white/30 text-white" : "bg-slate-100 text-slate-500"}`}>{statusCounts[tab.key]}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Orders */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-4">
              <FiRefreshCw className="animate-spin" size={28} />
              <p className="text-[10px] font-black uppercase tracking-widest">Loading Orders...</p>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-[2rem] border-2 border-dashed border-slate-200">
              <FiInbox size={48} className="mx-auto text-slate-200 mb-4" />
              <p className="uppercase font-black text-sm text-slate-400 tracking-widest">No orders found</p>
              <button onClick={resetFilters} className="mt-4 text-black underline text-[10px] font-bold uppercase">Clear Filters</button>
            </div>
          ) : (
            <>
              {/* ========== DESKTOP TABLE ========== */}
              <div className="hidden lg:block border border-slate-200 rounded-[2rem] overflow-hidden bg-white shadow-sm mb-10">
                <table className="w-full text-left border-separate border-spacing-0">
                  <thead>
                    <tr style={{ backgroundColor: BRAND_GREEN }} className="text-white">
                      <th className="p-5 text-[10px] font-black uppercase tracking-widest w-16">Sr.No</th>
                      <th className="p-5 text-[10px] font-black uppercase tracking-widest w-32">Date</th>
                      <th className="p-5 text-[10px] font-black uppercase tracking-widest">Franchise ID</th>
                      <th className="p-5 text-[10px] font-black uppercase tracking-widest">Owner Name</th>
                      <th className="p-5 text-[10px] font-black uppercase tracking-widest text-center">Status</th>
                      <th className="p-5 text-[10px] font-black uppercase tracking-widest text-center">Items</th>
                      <th className="p-5 text-[10px] font-black uppercase tracking-widest text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-black">
                    {filteredOrders.map((order, index) => {
                      const statusCfg = STATUS_CONFIG[order.status] || STATUS_CONFIG.received;
                      const isExpanded = expandedOrder === order.id;
                      const items = order.items || [];
                      const isUpdating = updatingId === order.id;
                      const currentStep = STATUS_STEPS.indexOf(order.status);
                      const isFinal = order.status === "dispatched" || order.status === "cancelled";

                      return (
                        <React.Fragment key={order.id}>
                          <tr
                            className={`hover:bg-slate-50/50 transition-colors cursor-pointer ${isExpanded ? "bg-slate-50" : ""}`}
                            onClick={() => setExpandedOrder(isExpanded ? null : order.id)}
                          >
                            <td className="p-5 text-[11px] font-black text-slate-400">{(index + 1).toString().padStart(2, '0')}</td>
                            <td className="p-5">
                              <div className="flex flex-col">
                                <span className="text-[11px] font-black uppercase">{new Date(order.created_at).toLocaleDateString("en-GB")}</span>
                                <span className="text-[10px] font-bold text-slate-400">{new Date(order.created_at).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true })}</span>
                              </div>
                            </td>
                            <td className="p-5"><span className="bg-slate-100 px-3 py-1 rounded-lg text-[10px] font-black uppercase text-slate-700 border border-slate-200">{order.franchise_id}</span></td>
                            <td className="p-5 text-[12px] font-black uppercase">{order.user_name || "—"}</td>
                            <td className="p-5 text-center">
                              <span className={`px-3 py-1.5 rounded-full text-[9px] font-black uppercase inline-flex items-center gap-1.5 border ${statusCfg.color}`}>
                                {statusCfg.icon} {statusCfg.label}
                              </span>
                            </td>
                            <td className="p-5 text-center">
                              <span className="bg-slate-100 px-3 py-1 rounded-lg text-[10px] font-black uppercase text-slate-700 border border-slate-200 inline-flex items-center gap-1.5">
                                <FiPackage size={12} /> {items.length}
                              </span>
                            </td>
                            <td className="p-5 text-right" onClick={e => e.stopPropagation()}>
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => handlePrint(order)}
                                  className="px-4 py-2 bg-slate-100 hover:bg-black hover:text-white rounded-xl text-[9px] font-black uppercase tracking-widest transition-all inline-flex items-center gap-1.5 active:scale-95"
                                >
                                  <FiPrinter size={13} /> Print
                                </button>
                                {!isFinal && (
                                  <button
                                    onClick={() => rejectOrder(order.id)}
                                    disabled={isUpdating}
                                    className="px-4 py-2 bg-red-50 hover:bg-red-600 hover:text-white text-red-600 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all inline-flex items-center gap-1.5 active:scale-95 disabled:opacity-50"
                                  >
                                    <FiXCircle size={13} /> Reject
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                          {/* Expanded Row */}
                          {isExpanded && (
                            <tr>
                              <td colSpan={7} className="p-0">
                                <div className="bg-slate-50 border-t border-slate-200 p-6">
                                  {/* Status Pipeline */}
                                  <div className="mb-4">
                                    <div className="flex items-center gap-1 max-w-lg">
                                      {STATUS_STEPS.map((step, idx) => {
                                        const isActive = idx <= currentStep;
                                        const cfg = STATUS_CONFIG[step];
                                        return (
                                          <div key={step} className="flex items-center flex-1">
                                            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[9px] font-black uppercase ${isActive ? cfg.color : "bg-slate-100 text-slate-300 border border-slate-100"}`}>
                                              {cfg.icon} {cfg.label}
                                            </div>
                                            {idx < STATUS_STEPS.length - 1 && <div className={`flex-1 h-0.5 mx-1 rounded ${idx < currentStep ? "bg-emerald-300" : "bg-slate-200"}`} />}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>

                                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                                    {/* Items */}
                                    <div>
                                      <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-2">Items Requested</p>
                                      <div className="space-y-2">
                                        {items.map((item, idx) => (
                                          <div key={idx} className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-100">
                                            <div className="flex items-center gap-2.5 min-w-0">
                                              <FiPackage className="text-slate-400 shrink-0" size={14} />
                                              <div className="min-w-0">
                                                <p className="text-[11px] font-black uppercase truncate">{item.item_name}</p>
                                                {item.item_code && <p className="text-[9px] font-bold text-slate-400">{item.item_code}</p>}
                                              </div>
                                            </div>
                                            <span className="text-[11px] font-black text-black shrink-0 ml-2">{item.quantity} {item.unit}</span>
                                          </div>
                                        ))}
                                      </div>
                                    </div>

                                    {/* Contact + Actions */}
                                    <div className="space-y-3">
                                      {/* Contact buttons */}
                                      {order.user_phone && (
                                        <div className="flex gap-2">
                                          <a href={`tel:${order.user_phone}`} className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-white border border-slate-200 rounded-xl text-[10px] font-black uppercase hover:bg-slate-100 transition-colors">
                                            <FiPhone size={14} /> Call {order.user_phone}
                                          </a>
                                          <a href={`https://wa.me/91${order.user_phone.replace(/\D/g, "").slice(-10)}`} target="_blank" rel="noopener noreferrer" className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-green-100 text-green-700 border border-green-200 rounded-xl text-[10px] font-black uppercase hover:bg-green-200 transition-colors">
                                            <FiMessageSquare size={14} /> WhatsApp
                                          </a>
                                        </div>
                                      )}

                                      {/* Notes */}
                                      {order.notes && (
                                        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
                                          <p className="text-[9px] font-black uppercase text-blue-500 mb-1">Your Note</p>
                                          <p className="text-[11px] font-bold text-blue-800">{order.notes}</p>
                                        </div>
                                      )}

                                      {/* Note input + status buttons */}
                                      {!isFinal && (
                                        <>
                                          <div className="flex gap-2">
                                            <input
                                              placeholder="Add a note..."
                                              value={noteInput[order.id] || ""}
                                              onChange={e => setNoteInput(prev => ({ ...prev, [order.id]: e.target.value }))}
                                              className="flex-1 h-10 px-4 bg-white border border-slate-200 rounded-xl text-[11px] font-bold outline-none focus:border-black transition-all"
                                            />
                                            {noteInput[order.id]?.trim() && (
                                              <button onClick={() => saveNote(order.id)} disabled={isUpdating} className="px-4 h-10 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase hover:bg-blue-700 transition-all active:scale-95 disabled:opacity-50 shrink-0">Save</button>
                                            )}
                                          </div>
                                          {statusCfg.next && (
                                            <button
                                              onClick={() => updateStatus(order.id, statusCfg.next)}
                                              disabled={isUpdating}
                                              className="w-full py-4 bg-black text-white rounded-xl font-black uppercase text-[11px] tracking-widest flex items-center justify-center gap-2 hover:bg-slate-800 transition-all active:scale-95 disabled:opacity-50 shadow-lg"
                                            >
                                              {isUpdating ? <FiRefreshCw className="animate-spin" size={16} /> : statusCfg.next === "packed" ? <FiBox size={16} /> : <FiTruck size={16} />}
                                              {isUpdating ? "Updating..." : statusCfg.nextLabel}
                                            </button>
                                          )}
                                        </>
                                      )}

                                      {isFinal && (
                                        <div className={`p-3 rounded-xl text-center text-[10px] font-black uppercase tracking-widest ${order.status === "dispatched" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-red-50 text-red-600 border border-red-200"}`}>
                                          {order.status === "dispatched" ? "✅ Dispatched" : "❌ Rejected"}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* ========== MOBILE CARD VIEW ========== */}
              <div className="lg:hidden flex flex-col gap-4 mb-20">
                {filteredOrders.map((order, index) => {
                  const statusCfg = STATUS_CONFIG[order.status] || STATUS_CONFIG.received;
                  const isExpanded = expandedOrder === order.id;
                  const items = order.items || [];
                  const isUpdating = updatingId === order.id;
                  const currentStep = STATUS_STEPS.indexOf(order.status);
                  const isFinal = order.status === "dispatched" || order.status === "cancelled";

                  return (
                    <div key={order.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                      <button
                        onClick={() => setExpandedOrder(isExpanded ? null : order.id)}
                        className="w-full p-4 flex items-center justify-between gap-3 hover:bg-slate-50 transition-colors text-left"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1.5">
                            <span className="text-[10px] font-black text-slate-400">#{(index + 1).toString().padStart(2, '0')}</span>
                            <span className="bg-slate-100 px-2 py-0.5 rounded text-[10px] font-black uppercase text-slate-700">{order.franchise_id}</span>
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase inline-flex items-center gap-1 border ${statusCfg.color}`}>
                              {statusCfg.icon} {statusCfg.label}
                            </span>
                          </div>
                          <p className="text-[11px] font-black uppercase truncate">{order.user_name || "—"}</p>
                          <p className="text-[10px] font-bold text-slate-400 mt-0.5">
                            {new Date(order.created_at).toLocaleDateString("en-GB")} • {items.length} items
                          </p>
                        </div>
                        <FiChevronDown size={18} className={`text-slate-400 transition-transform shrink-0 ${isExpanded ? "rotate-180" : ""}`} />
                      </button>

                      {isExpanded && (
                        <div className="border-t border-slate-100 p-4 space-y-3">
                          {/* Status Pipeline */}
                          <div className="flex items-center gap-1">
                            {STATUS_STEPS.map((step, idx) => {
                              const isActive = idx <= currentStep;
                              const cfg = STATUS_CONFIG[step];
                              return (
                                <div key={step} className="flex items-center flex-1">
                                  <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-[8px] font-black uppercase ${isActive ? cfg.color : "bg-slate-100 text-slate-300 border border-slate-100"}`}>
                                    {cfg.icon} {cfg.label}
                                  </div>
                                  {idx < STATUS_STEPS.length - 1 && <div className={`flex-1 h-0.5 mx-1 rounded ${idx < currentStep ? "bg-emerald-300" : "bg-slate-200"}`} />}
                                </div>
                              );
                            })}
                          </div>

                          {/* Items */}
                          {items.map((item, idx) => (
                            <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                              <div className="flex items-center gap-2 min-w-0">
                                <FiPackage className="text-slate-400 shrink-0" size={14} />
                                <div className="min-w-0">
                                  <p className="text-[11px] font-black uppercase truncate">{item.item_name}</p>
                                  {item.item_code && <p className="text-[9px] font-bold text-slate-400">{item.item_code}</p>}
                                </div>
                              </div>
                              <span className="text-[11px] font-black shrink-0">{item.quantity} {item.unit}</span>
                            </div>
                          ))}

                          {/* Contact */}
                          {order.user_phone && (
                            <div className="flex gap-2">
                              <a href={`tel:${order.user_phone}`} className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-slate-100 rounded-xl text-[10px] font-black uppercase"><FiPhone size={14} /> Call</a>
                              <a href={`https://wa.me/91${order.user_phone.replace(/\D/g, "").slice(-10)}`} target="_blank" rel="noopener noreferrer" className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-green-100 text-green-700 rounded-xl text-[10px] font-black uppercase"><FiMessageSquare size={14} /> WhatsApp</a>
                            </div>
                          )}

                          {/* Actions */}
                          <div className="flex gap-2">
                            <button onClick={() => handlePrint(order)} className="flex-1 py-3 bg-slate-100 rounded-xl text-[10px] font-black uppercase flex items-center justify-center gap-2 active:scale-95 transition-all"><FiPrinter size={14} /> Print</button>
                            {!isFinal && (
                              <button onClick={() => rejectOrder(order.id)} disabled={isUpdating} className="flex-1 py-3 bg-red-50 text-red-600 rounded-xl text-[10px] font-black uppercase flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-50"><FiXCircle size={14} /> Reject</button>
                            )}
                          </div>

                          {order.notes && (
                            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
                              <p className="text-[9px] font-black uppercase text-blue-500 mb-1">Note</p>
                              <p className="text-[11px] font-bold text-blue-800">{order.notes}</p>
                            </div>
                          )}

                          {!isFinal && (
                            <>
                              <div className="flex gap-2">
                                <input
                                  placeholder="Add a note..."
                                  value={noteInput[order.id] || ""}
                                  onChange={e => setNoteInput(prev => ({ ...prev, [order.id]: e.target.value }))}
                                  className="flex-1 h-10 px-4 bg-white border border-slate-200 rounded-xl text-[11px] font-bold outline-none focus:border-black"
                                />
                                {noteInput[order.id]?.trim() && (
                                  <button onClick={() => saveNote(order.id)} disabled={isUpdating} className="px-4 h-10 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase disabled:opacity-50">Save</button>
                                )}
                              </div>
                              {statusCfg.next && (
                                <button
                                  onClick={() => updateStatus(order.id, statusCfg.next)}
                                  disabled={isUpdating}
                                  className="w-full py-4 bg-black text-white rounded-xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 shadow-lg"
                                >
                                  {isUpdating ? <FiRefreshCw className="animate-spin" size={16} /> : statusCfg.next === "packed" ? <FiBox size={16} /> : <FiTruck size={16} />}
                                  {isUpdating ? "Updating..." : statusCfg.nextLabel}
                                </button>
                              )}
                            </>
                          )}

                          {isFinal && (
                            <div className={`p-3 rounded-xl text-center text-[10px] font-black uppercase ${order.status === "dispatched" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-red-50 text-red-600 border border-red-200"}`}>
                              {order.status === "dispatched" ? "✅ Dispatched" : "❌ Rejected"}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>

      <style>{`
        .scrollbar-thin { scrollbar-width: thin; scrollbar-color: #cbd5e1 #f1f5f9; }
        .scrollbar-thin::-webkit-scrollbar { height: 6px; }
        .scrollbar-thin::-webkit-scrollbar-track { background: #f1f5f9; border-radius: 10px; }
        .scrollbar-thin::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
        @media print { body { background: white; margin: 0; padding: 0; } .print\\:hidden { display: none !important; } .print-only { display: block !important; width: 100%; } @page { size: A4; margin: 0; } .a4-page { width: 210mm; height: 296.5mm; padding: 5mm; margin: 0 auto; page-break-after: always; box-sizing: border-box; overflow: hidden; } .a4-page:last-child { page-break-after: auto; } * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; } }
      `}</style>
    </div>
  );
};

const styles = headerStyles;

export default CentralStockRequests;