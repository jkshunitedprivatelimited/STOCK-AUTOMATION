import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { supabase } from "../../frontend_supabase/supabaseClient";
import { useNavigate } from "react-router-dom";
import {
  FiArrowLeft, FiSearch, FiShoppingCart, FiX, FiCheck,
  FiMinus, FiPlus, FiTrash2, FiPackage, FiTruck,
  FiRefreshCw, FiAlertCircle, FiBox, FiClock, FiCheckCircle,
  FiSend, FiList, FiChevronDown
} from "react-icons/fi";
import { formatCurrency } from "../../utils/formatters";
import { headerStyles } from "../../utils/headerStyles";
import { BRAND_GREEN } from "../../utils/theme";

const getPriceMultiplier = (baseUnit, selectedUnit) => {
  if (!baseUnit || !selectedUnit || baseUnit === selectedUnit) return 1;
  const b = baseUnit.toLowerCase().trim();
  const s = selectedUnit.toLowerCase().trim();
  const isKg = (u) => u === 'kg' || u === 'kilogram';
  const isG = (u) => ['g', 'gm', 'gms', 'gram', 'grams'].includes(u);
  const isL = (u) => u === 'l' || u === 'ltr' || u === 'liter';
  const isMl = (u) => ['ml', 'milliliter'].includes(u);
  if (isKg(b) && isG(s)) return 0.001;
  if (isG(b) && isKg(s)) return 1000;
  if (isL(b) && isMl(s)) return 0.001;
  if (isMl(b) && isL(s)) return 1000;
  return 1;
};

const STATUS_CONFIG = {
  received: { label: "Received", color: "bg-amber-100 text-amber-700 border-amber-200", icon: <FiClock size={12} /> },
  packed:   { label: "Packed",   color: "bg-blue-100 text-blue-700 border-blue-200",   icon: <FiBox size={12} /> },
  dispatched: { label: "Dispatched", color: "bg-emerald-100 text-emerald-700 border-emerald-200", icon: <FiTruck size={12} /> },
  cancelled:  { label: "Cancelled",  color: "bg-red-100 text-red-600 border-red-200",    icon: <FiX size={12} /> },
};

const STATUS_STEPS = ["received", "packed", "dispatched"];

const RequestPortal = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [stocks, setStocks] = useState([]);
  const [loadingStocks, setLoadingStocks] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");

  // Cart
  const [cart, setCart] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);

  // Tab state
  const [activeTab, setActiveTab] = useState("browse"); // "browse" | "orders"

  // My Orders
  const [myOrders, setMyOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [expandedOrder, setExpandedOrder] = useState(null);
  const [orderFilter, setOrderFilter] = useState("requested"); // "requested" | "accepted" | "rejected"

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

  // Lock body scroll when cart is open
  useEffect(() => {
    document.body.style.overflow = (isCartOpen || orderSuccess) ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [isCartOpen, orderSuccess]);

  // Fetch profile
  useEffect(() => {
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
          setProfile(data);
        }
      } catch (e) { console.error(e); }
    })();
  }, []);

  // Fetch out-of-stock items
  const fetchStocks = useCallback(async () => {
    setLoadingStocks(true);
    try {
      const { data } = await supabase
        .from("stocks")
        .select("*")
        .eq("online_store", true)
        .lte("quantity", 0)
        .order("item_name");

      // Filter by company_availability
      const userCompany = profile?.company?.trim()?.toLowerCase();
      const isCentral = profile?.role === "central" || profile?.franchise_id === "CENTRAL";

      const visible = (data || []).filter(item => {
        if (isCentral) return true;
        const avail = (item.company_availability || "").trim();
        if (!avail || avail === "All") return true;
        const companies = avail.split(",").map(c => c.trim().toLowerCase());
        return userCompany && companies.includes(userCompany);
      });

      setStocks(visible);
    } catch {
      addToast("error", "Failed to load items.");
    } finally {
      setLoadingStocks(false);
    }
  }, [profile, addToast]);

  useEffect(() => {
    if (profile) fetchStocks();
  }, [profile, fetchStocks]);

  // Fetch my orders
  const fetchMyOrders = useCallback(async () => {
    if (!profile?.franchise_id) return;
    setLoadingOrders(true);
    try {
      const { data, error } = await supabase
        .from("stock_request_orders")
        .select("*")
        .eq("franchise_id", profile.franchise_id)
        .in("status", ["received", "cancelled"])
        .order("created_at", { ascending: false });
      if (error) throw error;
      setMyOrders(data || []);
    } catch (e) {
      console.error("Error fetching orders:", e);
    } finally {
      setLoadingOrders(false);
    }
  }, [profile]);

  useEffect(() => {
    fetchMyOrders();

    // Real-time subscription for status updates
    const channel = supabase
      .channel("franchise-stock-request-orders-updates")
      .on("postgres_changes", { event: "*", schema: "public", table: "stock_request_orders" }, () => {
        fetchMyOrders();
      })
      .subscribe();

    // Re-fetch when user switches back to this tab (catches missed realtime events)
    const handleVisibility = () => {
      if (document.visibilityState === "visible") fetchMyOrders();
    };
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      supabase.removeChannel(channel);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [fetchMyOrders]);

  // Also subscribe to stocks changes so out-of-stock list stays updated
  useEffect(() => {
    if (!profile) return;
    const channel = supabase
      .channel("franchise-stocks-oos-updates")
      .on("postgres_changes", { event: "*", schema: "public", table: "stocks" }, () => {
        fetchStocks();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [profile, fetchStocks]);

  // Categories
  const categories = useMemo(() => {
    const cats = stocks.map(s => s.category?.trim().toUpperCase()).filter(Boolean);
    return ["All", ...new Set(cats)];
  }, [stocks]);

  // Filtered stocks
  const filteredStocks = useMemo(() => {
    return stocks.filter(item => {
      const q = search.toLowerCase();
      const matchesSearch = item.item_name.toLowerCase().includes(q) || item.item_code?.toLowerCase().includes(q);
      const cat = item.category?.trim().toUpperCase() || "";
      const matchesCat = selectedCategory === "All" || cat === selectedCategory;
      return matchesSearch && matchesCat;
    });
  }, [stocks, search, selectedCategory]);

  // Get minimum order quantity based on selected unit
  const getMOQ = useCallback((item, currentUnit) => {
    if (!item) return 1;
    if (item.alt_unit && item.alt_unit !== "None" && currentUnit === item.alt_unit) {
      return Number(item.min_order_quantity_alt) || 1;
    }
    return Number(item.min_order_quantity) || 1;
  }, []);

  // Cart operations
  const addToCart = useCallback((item) => {
    setCart(prev => {
      const existing = prev.find(c => c.id === item.id);
      if (existing) return prev;
      const unit = item.requestUnit || item.unit;
      const moq = getMOQ(item, unit);
      return [...prev, { ...item, requestQty: item.requestQty || moq, requestUnit: unit }];
    });
    addToast("success", `${item.item_name} added to cart`);
  }, [addToast, getMOQ]);

  const removeFromCart = useCallback((id) => {
    setCart(prev => prev.filter(c => c.id !== id));
  }, []);

  const updateCartQty = useCallback((id, val) => {
    const numVal = val === "" ? 0 : Math.max(0, Number(val));
    if (numVal === 0) {
      setCart(prev => prev.filter(c => c.id !== id));
      return;
    }
    setCart(prev => prev.map(c => {
      if (c.id !== id) return c;
      const moq = getMOQ(c, c.requestUnit);
      return { ...c, requestQty: Math.max(numVal, moq) };
    }));
  }, [getMOQ]);

  const updateCartUnit = useCallback((id, unit) => {
    setCart(prev => prev.map(c => {
      if (c.id !== id) return c;
      const moq = getMOQ(c, unit);
      return { ...c, requestUnit: unit, requestQty: Math.max(c.requestQty, moq) };
    }));
  }, [getMOQ]);

  // Place request
  const handlePlaceRequest = async () => {
    if (cart.length === 0 || submitting) return;
    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !profile) throw new Error("Please log in again.");

      const items = cart.map(c => {
        const multiplier = getPriceMultiplier(c.unit, c.requestUnit);
        const effectivePrice = (Number(c.price) || 0) * multiplier;
        return {
          stock_id: c.id,
          item_name: c.item_name,
          item_code: c.item_code || "",
          quantity: c.requestQty,
          unit: c.requestUnit,
          price: effectivePrice,
          gst_rate: c.gst_rate || 0
        };
      });

      const { error } = await supabase.from("stock_request_orders").insert([{
        franchise_id: profile.franchise_id || "N/A",
        user_id: user.id,
        user_name: profile.name || "",
        user_phone: profile.phone || "",
        company: profile.company || "",
        items,
        status: "received"
      }]);

      if (error) throw error;

      setCart([]);
      setIsCartOpen(false);
      setOrderSuccess(true);
      fetchMyOrders();
      addToast("success", "Stock request placed successfully!");
    } catch (e) {
      addToast("error", e.message || "Failed to place request.");
    } finally {
      setSubmitting(false);
    }
  };

  // Cancel order (Deletes the order entirely)
  const handleCancelOrder = async (orderId) => {
    try {
      const { data, error } = await supabase
        .from("stock_request_orders")
        .delete()
        .eq("id", orderId)
        .select();
        
      if (error) throw error;
      
      if (!data || data.length === 0) {
        throw new Error("Cannot cancel orders placed by Central Admin directly. Please ask Central to cancel it.");
      }
      
      addToast("success", "Request cancelled and removed.");
      fetchMyOrders();
    } catch (e) {
      addToast("error", e.message || "Failed to cancel request.");
    }
  };

  // Delete individual item from an order
  const handleDeleteItem = async (orderId, itemIdx) => {
    const order = myOrders.find(o => o.id === orderId);
    if (!order) return;
    const items = [...(order.items || [])];
    const itemName = items[itemIdx]?.item_name || 'this item';
    if (!window.confirm(`Remove "${itemName}" from this order?`)) return;
    items.splice(itemIdx, 1);
    try {
      if (items.length === 0) {
        // If no items left, delete the entire order
        const { data: delData, error } = await supabase.from("stock_request_orders").delete().eq("id", orderId).select();
        if (error) throw error;
        if (!delData || delData.length === 0) {
          throw new Error("Delete blocked by RLS or record not found.");
        }
        addToast("success", "Order removed (no items left).");
      } else {
        const { error } = await supabase.from("stock_request_orders").update({ items }).eq("id", orderId);
        if (error) throw error;
        addToast("success", `"${itemName}" removed from order.`);
      }
      fetchMyOrders();
    } catch {
      addToast("error", "Failed to remove item.");
    }
  };

  const isInCart = (id) => cart.some(c => c.id === id);

  return (
    <div className="min-h-screen bg-[#F3F4F6] font-sans text-black relative pb-20">
      {/* Toasts */}
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-2 w-full max-w-xs pointer-events-none">
        {toasts.map(t => (
          <div key={t.id} className={`pointer-events-auto p-3 rounded-xl shadow-xl border flex items-center gap-2 bg-white ${t.type === "error" ? "border-red-100 text-red-600" : "border-emerald-100 text-emerald-600"}`}>
            {t.type === "error" ? <FiAlertCircle className="shrink-0" /> : <FiCheck className="shrink-0" />}
            <p className="text-[11px] font-black uppercase tracking-tight flex-1">{t.message}</p>
          </div>
        ))}
      </div>

      {/* Success Modal */}
      {orderSuccess && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-white rounded-[2.5rem] p-8 max-w-sm w-full text-center shadow-2xl animate-in zoom-in-95">
            <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6"><FiCheck size={40} /></div>
            <h2 className="text-2xl font-black uppercase mb-2">Request Sent!</h2>
            <p className="text-slate-500 font-bold text-xs mb-8">Your stock request has been submitted. Central will process it and update you on the status.</p>
            <div className="space-y-3">
              <button onClick={() => { setOrderSuccess(false); setActiveTab("orders"); }} className="w-full py-4 bg-black text-white rounded-2xl font-black uppercase text-[11px] tracking-widest flex items-center justify-center gap-2">
                <FiList /> View My Orders
              </button>
              <button onClick={() => setOrderSuccess(false)} className="w-full py-4 bg-slate-100 text-slate-600 rounded-2xl font-black uppercase text-[11px]">Continue Browsing</button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header style={styles.header}>
        <div style={styles.headerInner}>
          <button onClick={() => window.history.length > 1 ? navigate(-1) : navigate("/")} style={styles.backBtn}>
            <FiArrowLeft size={18} /> <span>Back</span>
          </button>
          <h1 style={styles.heading}>STOCK <span style={{ color: BRAND_GREEN }}>REQUEST</span></h1>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", flexShrink: 0 }}>
            <div style={styles.idBox}>ID : {profile?.franchise_id || "---"}</div>
            {activeTab === "browse" && (
              <button onClick={() => setIsCartOpen(true)} className="relative p-2 bg-white border border-slate-200 rounded-md hover:border-black transition-all shadow-sm group cursor-pointer">
                <FiShoppingCart size={18} className="group-hover:scale-110 transition-transform text-black" />
                {cart.length > 0 && <span className="absolute -top-2 -right-2 text-white text-[10px] font-black h-5 w-5 flex items-center justify-center rounded-full shadow-lg border-2 border-white" style={{ backgroundColor: BRAND_GREEN }}>{cart.length}</span>}
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Tab Bar */}
      <div className="w-full px-4 sm:px-6 mb-4">
        <div className="bg-white rounded-2xl p-1.5 flex gap-1 border border-slate-200 shadow-sm max-w-md">
          <button
            onClick={() => setActiveTab("browse")}
            className={`flex-1 py-3 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${activeTab === "browse" ? "text-white shadow-md" : "text-slate-400 hover:text-black"}`}
            style={activeTab === "browse" ? { backgroundColor: BRAND_GREEN } : {}}
          >
            <FiPackage size={14} /> Browse Items
          </button>
          <button
            onClick={() => setActiveTab("orders")}
            className={`flex-1 py-3 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${activeTab === "orders" ? "text-white shadow-md" : "text-slate-400 hover:text-black"}`}
            style={activeTab === "orders" ? { backgroundColor: BRAND_GREEN } : {}}
          >
            <FiList size={14} /> My Orders
            {myOrders.filter(o => o.status === "received").length > 0 && (
              <span className="bg-white/30 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full">{myOrders.filter(o => o.status === "received").length}</span>
            )}
          </button>
        </div>
      </div>

      {/* ========== BROWSE TAB ========== */}
      {activeTab === "browse" && (
        <div className="w-full px-4 sm:px-6">
          {/* Search + Category Filter */}
          <div className="flex flex-col gap-3 mb-5">
            <div className="relative">
              <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                placeholder="SEARCH ITEMS..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full h-11 sm:h-12 pl-12 pr-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-black uppercase outline-none focus:border-black focus:bg-white transition-all shadow-sm"
              />
            </div>
            <div className="overflow-x-auto pb-3 scrollbar-thin">
              <div className="flex gap-2 min-w-max py-1">
                {categories.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`flex-shrink-0 px-5 sm:px-6 py-2.5 rounded-xl text-xs sm:text-sm font-black uppercase border-2 transition-all active:scale-95 ${selectedCategory === cat ? "text-white border-transparent shadow-lg" : "bg-white text-black border-slate-200 hover:border-black"}`}
                    style={selectedCategory === cat ? { backgroundColor: BRAND_GREEN } : {}}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Process Info Banner */}
          <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 sm:px-5 sm:py-4 mb-6 flex flex-col sm:flex-row gap-3 sm:items-center shadow-sm">
            <div className="bg-amber-100 p-2 rounded-full shrink-0 self-start sm:self-auto text-amber-600">
              <FiAlertCircle size={20} />
            </div>
            <p className="text-[11px] sm:text-xs font-bold text-amber-800 leading-relaxed">
              These items are out of stock. Add them to your cart to request from Central. 
              Once your request is received and prepared, you will get an invoice on WhatsApp. 
              <span className="font-black"> The order will be dispatched only after the invoice is paid.</span>
            </p>
          </div>

          {/* Items Grid */}
          {loadingStocks ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-white p-4 rounded-2xl border-2 border-slate-100 flex flex-col gap-3 animate-pulse">
                  <div className="h-3 w-1/3 bg-slate-100 rounded-md"></div>
                  <div className="h-4 w-3/4 bg-slate-100 rounded-md"></div>
                  <div className="h-20 w-full bg-slate-50 rounded-xl mt-2"></div>
                </div>
              ))}
            </div>
          ) : filteredStocks.length === 0 ? (
            <div className="text-center py-24 sm:py-32 bg-white rounded-[2rem] border-2 border-dashed border-slate-200">
              <FiSearch size={48} className="mx-auto text-slate-200 mb-4" />
              <p className="uppercase font-black text-sm text-slate-400 tracking-widest">No matching items found</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-6">
              {filteredStocks.map(item => {
                const cartItem = cart.find(c => c.id === item.id);
                const inCart = !!cartItem;
                const currentUnit = inCart ? cartItem.requestUnit : item.unit;
                const currentMOQ = getMOQ(item, currentUnit);
                const multiplier = getPriceMultiplier(item.unit, currentUnit);
                const displayPrice = item.price * multiplier;
                return (
                  <div key={item.id} className={`group bg-white rounded-2xl sm:rounded-3xl border-2 p-3 sm:p-5 transition-all duration-300 flex flex-col relative min-h-[240px] sm:min-h-[280px] hover:shadow-2xl hover:-translate-y-1 ${inCart ? "border-emerald-500 ring-4 ring-emerald-500/10" : "border-slate-100"}`}>
                    {inCart && (
                      <div className="absolute -top-2 left-1/2 -translate-x-1/2 bg-emerald-500 text-white px-3 py-1 text-[8px] font-black uppercase rounded-full shadow-lg flex items-center gap-1 z-10">
                        <FiCheck size={10} /> In Cart
                      </div>
                    )}
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-[9px] sm:text-[10px] font-black text-slate-500 tracking-tight">{item.item_code || "---"}</span>
                    </div>
                    <h3 className="font-black text-[11px] sm:text-[13px] uppercase leading-tight sm:leading-snug mb-1 group-hover:text-emerald-900 transition-colors line-clamp-1">{item.item_name}</h3>
                    <p className="text-[10px] font-medium text-slate-400 leading-snug mb-2 line-clamp-2 min-h-[2.5em]">{item.description || "No description available"}</p>
                    <div className="mb-4">
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-base sm:text-lg font-black tracking-tighter text-black">{formatCurrency(displayPrice)}</span>
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">/ {currentUnit}</span>
                      </div>
                      <div className="mt-1">
                        <span className="text-[9px] font-black text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-100">Minimum Order: {currentMOQ} {currentUnit}</span>
                      </div>
                    </div>
                    <div className="mt-auto space-y-2 sm:space-y-3">
                      <div className="flex flex-col gap-2">
                        <div className="flex-1 flex items-center border border-slate-200 rounded-lg bg-slate-50 overflow-hidden focus-within:border-black transition-all">
                          <button
                            onClick={() => {
                              if (inCart && cartItem.requestQty <= currentMOQ) { removeFromCart(item.id); }
                              else if (inCart) { updateCartQty(item.id, cartItem.requestQty - 1); }
                            }}
                            className="px-3 sm:px-4 h-10 hover:bg-slate-200 text-slate-700 font-bold"
                          >
                            <FiMinus size={14} />
                          </button>
                          <input
                            type="number"
                            value={inCart ? cartItem.requestQty : 0}
                            onChange={e => {
                              const val = Number(e.target.value);
                              if (val <= 0) { removeFromCart(item.id); }
                              else if (!inCart) { addToCart({ ...item, requestQty: Math.max(val, currentMOQ) }); }
                              else { updateCartQty(item.id, val); }
                            }}
                            className="w-full text-center font-black text-xs sm:text-[13px] bg-transparent outline-none p-0"
                            placeholder={currentMOQ}
                          />
                          <button
                            onClick={() => {
                              if (!inCart) { addToCart(item); }
                              else { updateCartQty(item.id, cartItem.requestQty + 1); }
                            }}
                            className="px-3 sm:px-4 h-10 hover:bg-slate-200 text-slate-700 font-bold"
                          >
                            <FiPlus size={14} />
                          </button>
                        </div>
                        <div className="relative w-full">
                          <select
                            value={currentUnit}
                            onChange={e => {
                              if (!inCart) { addToCart({ ...item, requestUnit: e.target.value }); }
                              else { updateCartUnit(item.id, e.target.value); }
                            }}
                            className="w-full bg-white border border-slate-200 rounded-lg text-[10px] font-black uppercase py-2 pl-3 pr-8 text-left outline-none appearance-none hover:border-slate-400 focus:border-black cursor-pointer transition-colors"
                          >
                            <option value={item.unit}>{item.unit}</option>
                            {item.alt_unit && item.alt_unit !== "None" && item.alt_unit !== item.unit && (
                              <option value={item.alt_unit}>{item.alt_unit}</option>
                            )}
                          </select>
                          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-500">
                            <svg className="h-4 w-4 fill-current" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" /></svg>
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          if (!inCart) { addToCart(item); }
                          else { updateCartQty(item.id, cartItem.requestQty + 1); }
                        }}
                        className="w-full py-3.5 sm:py-4 rounded-lg text-[10px] font-black uppercase tracking-[0.1em] text-white transition-all shadow-md active:scale-95 mt-1"
                        style={{ backgroundColor: BRAND_GREEN }}
                      >
                        {inCart ? "Update Cart" : "Add to Cart"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========== MY ORDERS TAB ========== */}
      {activeTab === "orders" && (
        <div className="w-full px-4 sm:px-6">
          <div className="flex gap-2 mb-4 overflow-x-auto pb-2 scrollbar-thin">
            <button
              onClick={() => setOrderFilter("requested")}
              className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-colors ${orderFilter === "requested" ? "bg-amber-100 text-amber-700 border border-amber-200" : "bg-white text-slate-400 border border-slate-200 hover:border-slate-300"}`}
            >
              Requested
            </button>
            <button
              onClick={() => setOrderFilter("accepted")}
              className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-colors ${orderFilter === "accepted" ? "bg-emerald-100 text-emerald-700 border border-emerald-200" : "bg-white text-slate-400 border border-slate-200 hover:border-slate-300"}`}
            >
              Accepted
            </button>
            <button
              onClick={() => setOrderFilter("rejected")}
              className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-colors ${orderFilter === "rejected" ? "bg-red-100 text-red-600 border border-red-200" : "bg-white text-slate-400 border border-slate-200 hover:border-slate-300"}`}
            >
              Rejected
            </button>
          </div>

          {orderFilter === "accepted" ? (
            <div className="text-center py-20 bg-emerald-50 rounded-[2rem] border-2 border-dashed border-emerald-200">
              <FiCheckCircle size={48} className="mx-auto text-emerald-300 mb-4" />
              <p className="uppercase font-black text-sm text-emerald-700 tracking-widest px-4">Accepted Orders go into Invoice History</p>
              <p className="text-xs text-emerald-600 mt-2 font-bold px-4">You can view and pay your invoices from the Invoice History section.</p>
            </div>
          ) : loadingOrders ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-4">
              <FiRefreshCw className="animate-spin" size={28} />
              <p className="text-[10px] font-black uppercase tracking-widest">Loading Orders...</p>
            </div>
          ) : (() => {
              const displayOrders = myOrders.filter(o => orderFilter === "requested" ? o.status === "received" : o.status === "cancelled");
              if (displayOrders.length === 0) {
                return (
                  <div className="text-center py-20 bg-white rounded-[2rem] border-2 border-dashed border-slate-200">
                    <FiSend size={48} className="mx-auto text-slate-200 mb-4" />
                    <p className="uppercase font-black text-sm text-slate-400 tracking-widest px-4">No {orderFilter} requests</p>
                    {orderFilter === "requested" && (
                      <button onClick={() => setActiveTab("browse")} className="mt-6 px-6 py-3 rounded-xl text-white text-[11px] font-black uppercase tracking-widest" style={{ backgroundColor: BRAND_GREEN }}>
                        Browse Items
                      </button>
                    )}
                  </div>
                )
              }
              return (
                <div className="space-y-4">
                  {displayOrders.map(order => {
                    const statusCfg = STATUS_CONFIG[order.status] || STATUS_CONFIG.received;
                    const currentStep = STATUS_STEPS.indexOf(order.status);
                    const isExpanded = expandedOrder === order.id;
                    const canCancel = order.status === "received";
                    const items = order.items || [];

                    return (
                      <div key={order.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    {/* Order Header */}
                    <button
                      onClick={() => setExpandedOrder(isExpanded ? null : order.id)}
                      className="w-full p-4 sm:p-5 flex items-center justify-between gap-3 hover:bg-slate-50 transition-colors text-left"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase inline-flex items-center gap-1.5 border ${statusCfg.color}`}>
                            {statusCfg.icon} {statusCfg.label}
                          </span>
                          <span className="text-[10px] font-bold text-slate-400">
                            {new Date(order.created_at).toLocaleDateString("en-GB", { day: '2-digit', month: 'short', year: 'numeric' })}
                            {' • '}
                            {new Date(order.created_at).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true })}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 shrink-0">
                            <FiPackage size={18} className="text-emerald-500" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[12px] font-black text-slate-800">
                              {items.length} {items.length === 1 ? 'Item' : 'Items'}
                            </p>
                            <p className="text-[10px] font-bold text-slate-400 truncate">
                              {items.slice(0, 3).map(i => i.item_name).join(', ')}{items.length > 3 ? ` +${items.length - 3} more` : ''}
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        {(() => {
                          let est = 0;
                          items.forEach(i => {
                            const r = Number(i.price) || 0;
                            const q = Number(i.quantity) || 0;
                            const g = Number(i.gst_rate) || 0;
                            est += (r * q) * (1 + g / 100);
                          });
                          const trans = Number(profile?.transportation_charge) || 0;
                          est += trans;
                          return <span className="text-[14px] font-black text-emerald-600">₹{Math.ceil(est).toLocaleString('en-IN')}</span>;
                        })()}
                        <FiChevronDown size={16} className={`text-slate-400 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                      </div>
                    </button>

                    {/* Expanded Details */}
                    {isExpanded && (
                      <div className="border-t border-slate-100">
                        {/* Detailed Items List & Summary */}
                        <div className="px-5 pb-3">
                          <div className="space-y-3">
                            {(() => {
                                let totalSub = 0, totalGst = 0;
                                const renderedItems = items.map((item, idx) => {
                                    const rate = Number(item.price) || 0;
                                    const qty = Number(item.quantity) || 0;
                                    const basePrice = rate * qty;
                                    const gstRate = Number(item.gst_rate) || 0;
                                    const taxAmount = basePrice * (gstRate / 100);
                                    const finalAmount = basePrice + taxAmount;
                                    
                                    totalSub += basePrice;
                                    totalGst += taxAmount;

                                    return (
                                        <div key={idx} className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex flex-wrap sm:flex-nowrap items-center justify-between gap-4 shadow-sm hover:bg-white transition-colors group/item">
                                            <div className="flex-1 min-w-[120px]">
                                                <p className="text-[11px] font-black uppercase text-slate-800 truncate">{item.item_name}</p>
                                                <p className="text-[9px] font-bold text-slate-400">SKU: {item.item_code || 'N/A'}</p>
                                            </div>
                                            <div className="flex items-center gap-4 sm:gap-6 text-right shrink-0">
                                                <div className="w-16">
                                                    <p className="text-[11px] font-black text-slate-800">{qty} {item.unit}</p>
                                                    <p className="text-[9px] font-bold text-slate-500">₹{rate.toFixed(2)}</p>
                                                </div>
                                                <div className="w-16">
                                                    <p className="text-[9px] font-black uppercase text-slate-400">Tax</p>
                                                    <p className="text-[10px] font-bold text-slate-600">{gstRate}% <span className="text-[8px]">(+₹{taxAmount.toFixed(0)})</span></p>
                                                </div>
                                                <div className="w-20">
                                                    <p className="text-[9px] font-black uppercase text-slate-400">Total</p>
                                                    <p className="text-[11px] font-black text-emerald-600">₹{finalAmount.toFixed(2)}</p>
                                                </div>
                                                {canCancel && (
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleDeleteItem(order.id, idx); }}
                                                        className="p-1.5 rounded-lg bg-red-50 text-red-400 hover:bg-red-100 hover:text-red-600 transition-colors active:scale-90 opacity-60 group-hover/item:opacity-100"
                                                        title="Remove item"
                                                    >
                                                        <FiTrash2 size={12} />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                });

                                const exactBill = parseFloat((totalSub + totalGst).toFixed(2));
                                const trans = Number(profile?.transportation_charge) || 0;
                                const exactBillWithTrans = exactBill + trans;
                                const roundedBill = Math.ceil(exactBillWithTrans);
                                const roundOff = roundedBill - exactBillWithTrans;

                                return (
                                    <div className="flex flex-col md:flex-row gap-4">
                                        <div className="flex-1 max-h-60 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                                            {renderedItems}
                                        </div>
                                        <div className="w-full md:w-64 shrink-0 bg-emerald-50 border border-emerald-200 rounded-xl overflow-hidden shadow-sm flex flex-col h-fit">
                                            <div className="p-4 flex flex-col gap-2 border-b border-emerald-200/60">
                                                <div className="flex justify-between items-center text-[10px] font-bold text-emerald-800">
                                                    <span>Subtotal</span>
                                                    <span>₹{totalSub.toFixed(2)}</span>
                                                </div>
                                                <div className="flex justify-between items-center text-[10px] font-bold text-emerald-800">
                                                    <span>Total GST</span>
                                                    <span>+₹{totalGst.toFixed(2)}</span>
                                                </div>
                                                {trans > 0 && (
                                                    <div className="flex justify-between items-center text-[10px] font-bold text-emerald-800">
                                                        <span>Transportation</span>
                                                        <span>+₹{trans.toFixed(2)}</span>
                                                    </div>
                                                )}
                                                <div className="flex justify-between items-center text-[10px] font-bold text-emerald-800">
                                                    <span>Round Off</span>
                                                    <span>{roundOff >= 0 ? '+' : '-'}₹{Math.abs(roundOff).toFixed(2)}</span>
                                                </div>
                                            </div>
                                            <div className="p-4 flex flex-col gap-1 bg-emerald-100 mt-auto">
                                                <div className="flex justify-between items-end">
                                                    <span className="text-[10px] font-black uppercase tracking-widest text-emerald-900">Total Estimate</span>
                                                    <span className="text-lg font-black text-emerald-700">₹{roundedBill.toLocaleString('en-IN')}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })()}
                          </div>
                        </div>

                        {/* Notes from Central */}
                        {order.notes && (
                          <div className="px-5 pb-3">
                            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
                              <p className="text-[9px] font-black uppercase text-blue-500 mb-1">Note from Central</p>
                              <p className="text-[11px] font-bold text-blue-800">{order.notes}</p>
                            </div>
                          </div>
                        )}

                        {/* Cancel Button */}
                        {canCancel && (
                          <div className="px-5 pb-4">
                            <button
                              onClick={() => handleCancelOrder(order.id)}
                              className="w-full py-3 bg-red-50 text-red-600 border border-red-200 rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-red-100 transition-all active:scale-95 flex items-center justify-center gap-2"
                            >
                              <FiX size={14} /> Cancel Request
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          );
          })()}
        </div>
      )}

      {/* ========== FLOATING CART BUTTON (Mobile) ========== */}
      {activeTab === "browse" && cart.length > 0 && (
        <button
          onClick={() => setIsCartOpen(true)}
          className="sm:hidden fixed bottom-6 right-6 z-[45] w-14 h-14 bg-black rounded-full shadow-2xl flex items-center justify-center text-white transition-all active:scale-90 hover:scale-105"
        >
          <FiShoppingCart size={24} />
          <span className="absolute -top-1 -right-1 bg-white text-black text-xs font-black h-6 w-6 rounded-full flex items-center justify-center shadow-md">{cart.length}</span>
        </button>
      )}

      {/* ========== CART DRAWER ========== */}
      {isCartOpen && (
        <>
          <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm" onClick={() => setIsCartOpen(false)} />
          <div className="fixed inset-y-0 right-0 z-[70] w-full max-w-md bg-white shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-sm font-black uppercase tracking-widest flex items-center gap-2"><FiShoppingCart /> Request Cart ({cart.length})</h2>
              <button onClick={() => setIsCartOpen(false)} className="p-2 hover:bg-slate-50 rounded-full transition-colors"><FiX size={24} /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {cart.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-300 gap-3">
                  <FiShoppingCart size={48} />
                  <p className="text-[11px] font-black uppercase tracking-widest">Cart is empty</p>
                </div>
              ) : cart.map(item => {
                const multiplier = getPriceMultiplier(item.unit, item.requestUnit);
                const displayPrice = (Number(item.price) || 0) * multiplier;
                const currentMOQ = getMOQ(item, item.requestUnit);
                const lineTotal = displayPrice * item.requestQty;
                const gstRate = Number(item.gst_rate) || 0;
                const gstAmt = lineTotal * (gstRate / 100);
                const finalAmount = lineTotal + gstAmt;
                return (
                  <div key={item.id} className="flex gap-4 p-4 border border-slate-200 rounded-2xl bg-white shadow-sm items-center">
                    <div className="flex-1">
                      <h4 className="text-[12px] font-black uppercase leading-tight mb-1">{item.item_name}</h4>
                      <p className="text-[10px] font-bold text-slate-400 mb-2">@ {currentMOQ} {item.requestUnit} = {formatCurrency(displayPrice * currentMOQ)}</p>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center border border-slate-200 rounded-xl bg-slate-50 h-9 flex-1">
                          <button onClick={() => {
                            if (item.requestQty <= currentMOQ) { removeFromCart(item.id); }
                            else { updateCartQty(item.id, item.requestQty - 1); }
                          }} className="px-3 h-full hover:bg-slate-200 rounded-l-xl"><FiMinus size={12} /></button>
                          <input
                            type="number"
                            value={item.requestQty || ""}
                            onChange={e => updateCartQty(item.id, e.target.value)}
                            className="w-full text-center font-black text-xs bg-transparent outline-none"
                          />
                          <button onClick={() => updateCartQty(item.id, item.requestQty + 1)} className="px-3 h-full hover:bg-slate-200 rounded-r-xl"><FiPlus size={12} /></button>
                        </div>
                        <select
                          value={item.requestUnit}
                          onChange={e => updateCartUnit(item.id, e.target.value)}
                          className="bg-white border border-slate-200 rounded-xl text-[10px] font-black uppercase py-2 px-3 outline-none appearance-none hover:border-slate-400 cursor-pointer"
                        >
                          <option value={item.unit}>{item.unit}</option>
                          {item.alt_unit && item.alt_unit !== "None" && item.alt_unit !== item.unit && (
                            <option value={item.alt_unit}>{item.alt_unit}</option>
                          )}
                        </select>
                      </div>
                      <div className="flex justify-between items-center mt-2 pt-2 border-t border-slate-100">
                        <div className="flex flex-col">
                          <span className="text-[10px] font-bold text-slate-400">{formatCurrency(displayPrice)} × {item.requestQty}</span>
                          <span className="text-[9px] font-black text-slate-400 mt-0.5">+ {gstRate}% GST ({formatCurrency(gstAmt)})</span>
                        </div>
                        <span className="text-sm font-black text-emerald-600">{formatCurrency(finalAmount)}</span>
                      </div>
                    </div>
                    <button onClick={() => removeFromCart(item.id)} className="p-3 text-rose-500 hover:bg-rose-50 rounded-xl transition-colors"><FiTrash2 size={20} /></button>
                  </div>
                );
              })}
            </div>
            {cart.length > 0 && (() => {
              const details = cart.map(item => {
                const multiplier = getPriceMultiplier(item.unit, item.requestUnit);
                const effectivePrice = (Number(item.price) || 0) * multiplier;
                const subtotal = effectivePrice * item.requestQty;
                const gstAmt = subtotal * ((Number(item.gst_rate) || 0) / 100);
                return { subtotal, gstAmt };
              });
              const totalSub = details.reduce((acc, c) => acc + c.subtotal, 0);
              const totalGst = details.reduce((acc, c) => acc + c.gstAmt, 0);
              const transportationCharge = Number(profile?.transportation_charge) || 0;
              const exactBill = parseFloat((totalSub + totalGst + transportationCharge).toFixed(2));
              const roundedBill = Math.ceil(exactBill);
              const roundOff = roundedBill - exactBill;
              return (
                <div className="p-6 border-t border-slate-100 bg-white shadow-inner">
                  <div className="space-y-2 mb-6 p-4 bg-slate-50 rounded-2xl text-[11px] font-black uppercase">
                    <div className="flex justify-between text-slate-400"><span>Subtotal</span><span>{formatCurrency(totalSub)}</span></div>
                    <div className="flex justify-between text-slate-400"><span>Total GST</span><span>{formatCurrency(totalGst)}</span></div>
                    {transportationCharge > 0 && <div className="flex justify-between text-slate-400"><span>Transportation</span><span>{formatCurrency(transportationCharge)}</span></div>}
                    <div className="flex justify-between text-slate-400 border-b border-slate-100 pb-2 mb-2"><span>Round Off</span><span>{formatCurrency(roundOff)}</span></div>
                    <div className="flex justify-between text-lg pt-1"><span>Total Bill</span><span>{formatCurrency(roundedBill)}</span></div>
                  </div>
                  <button
                    onClick={handlePlaceRequest}
                    disabled={submitting}
                    className="w-full py-5 bg-black text-white rounded-2xl font-black uppercase text-[11px] tracking-widest flex items-center justify-center gap-2 hover:bg-slate-800 transition-all active:scale-95 disabled:opacity-50"
                  >
                    {submitting ? <FiRefreshCw className="animate-spin" /> : <FiSend size={16} />}
                    {submitting ? "Submitting..." : "Place Request"}
                  </button>
                  <p className="text-[9px] text-slate-400 text-center mt-3 italic">No payment required now. Invoice will be sent after Central accepts your request.</p>
                </div>
              );
            })()}
          </div>
        </>
      )}

      <style>{`
        .scrollbar-thin { scrollbar-width: thin; scrollbar-color: #cbd5e1 #f1f5f9; }
        .scrollbar-thin::-webkit-scrollbar { height: 6px; }
        .scrollbar-thin::-webkit-scrollbar-track { background: #f1f5f9; border-radius: 10px; }
        .scrollbar-thin::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
        input[type="number"]::-webkit-inner-spin-button, input[type="number"]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
      `}</style>
    </div>
  );
};

const styles = headerStyles;

export default RequestPortal;