import React, { useEffect, useState, useMemo, useCallback, useRef, useDeferredValue } from "react";
import { supabase, isNetworkError } from "../../frontend_supabase/supabaseClient";
import { useNavigate } from "react-router-dom";
import {
  FiArrowLeft, FiSearch, FiShoppingCart, FiAlertTriangle, FiX, FiCheck,
  FiMinus, FiPlus, FiTrash2, FiRefreshCw
} from "react-icons/fi";
import { Building2, User } from "lucide-react";
import { formatCurrency } from "../../utils/formatters";
import { BRAND_GREEN as BRAND_COLOR } from "../../utils/theme";

const PRIMARY = "rgb(0, 100, 55)";

const StockItemCard = React.memo(({ 
  item, unit, isInCart,
  displayPrice, currentMOQ, qtyValue, cartItemData,
  onUpdateCartQty, onManualInputCart, onQtyInputChange,
  onUnitChange, onAddToCart
}) => {
  const isOutOfStock = Number(item.quantity) <= 0;
  return (
    <div className={`group rounded-2xl sm:rounded-3xl border-2 p-3 sm:p-5 transition-all duration-300 flex flex-col relative min-h-[240px] sm:min-h-[280px] hover:shadow-2xl hover:-translate-y-1 ${isInCart ? 'border-emerald-500 ring-4 ring-emerald-500/10 bg-white' : (isOutOfStock ? 'border-red-300 bg-red-50/80' : 'border-slate-100 bg-white')}`}>
      {isInCart && <div className="absolute -top-2 left-1/2 -translate-x-1/2 bg-emerald-500 text-white px-3 py-1 text-[8px] font-black uppercase rounded-full shadow-lg flex items-center gap-1 z-10"><FiCheck size={10} /> In Cart</div>}
      <div className="flex justify-between items-start mb-2"><span className="text-[9px] sm:text-[10px] font-black text-slate-500 tracking-tight">{item.item_code || '---'}</span><span className={`text-[8px] font-black px-1.5 py-0.5 rounded-md ${Number(item.quantity) > 5 ? 'bg-slate-100 text-slate-500' : 'bg-red-50 text-red-600'}`}>{item.quantity} {item.unit}</span></div>
      <h3 className="font-black text-[11px] sm:text-[13px] uppercase leading-tight sm:leading-snug mb-1 group-hover:text-emerald-900 transition-colors line-clamp-1">{item.item_name}</h3>
      <p className="text-[10px] font-medium text-slate-400 leading-snug mb-2 line-clamp-2 min-h-[2.5em]">{item.description || "No description available"}</p>
      <div className="mb-4">
        <div className="flex items-baseline gap-1.5"><span className="text-base sm:text-lg font-black tracking-tighter text-black">{formatCurrency(displayPrice)}</span><span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">/ {unit}</span></div>
        <div className="mt-1"><span className="text-[9px] font-black text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-100">Minimum Order: {currentMOQ} {unit}</span></div>
      </div>
      <div className="mt-auto space-y-2 sm:space-y-3">
        <div className="flex flex-col gap-2">
          <div className="flex-1 flex items-center border border-slate-200 rounded-lg bg-slate-50 overflow-hidden focus-within:border-black transition-all">
            <button onClick={() => isInCart ? onUpdateCartQty(item.id, -1) : onQtyInputChange(item.id, null, true, -1)} className="px-3 sm:px-4 h-10 hover:bg-slate-200 text-slate-700 font-bold"><FiMinus size={14} /></button>
            <input type="number" value={qtyValue || ""} onChange={(e) => isInCart ? onManualInputCart(cartItemData, e.target.value) : onQtyInputChange(item.id, e.target.value)} className="w-full text-center font-black text-xs sm:text-[13px] bg-transparent outline-none p-0" placeholder={currentMOQ} />
            <button onClick={() => isInCart ? onUpdateCartQty(item.id, 1) : onQtyInputChange(item.id, null, true, 1)} className="px-3 sm:px-4 h-10 hover:bg-slate-200 text-slate-700 font-bold"><FiPlus size={14} /></button>
          </div>
          <div className="relative w-full">
            <select value={isInCart ? cartItemData?.cartUnit : unit} onChange={(e) => onUnitChange(item.id, e.target.value)} className={`w-full bg-white border border-slate-200 rounded-lg text-[10px] font-black uppercase py-2 pl-3 pr-8 text-left outline-none appearance-none hover:border-slate-400 focus:border-black cursor-pointer transition-colors`}>
              <option value={item.unit}>{item.unit}</option>
              {item.alt_unit && item.alt_unit !== item.unit && item.alt_unit !== "None" && <option value={item.alt_unit}>{item.alt_unit}</option>}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-500"><svg className="h-4 w-4 fill-current" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" /></svg></div>
          </div>
        </div>
        <button onClick={() => onAddToCart(item.id)} className="w-full py-3.5 sm:py-4 rounded-lg text-[10px] font-black uppercase tracking-[0.1em] text-white transition-all shadow-md active:scale-95 mt-1" style={{ backgroundColor: BRAND_COLOR }}>{isInCart ? "Update Cart" : "Add to Cart"}</button>
      </div>
    </div>
  );
});

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

const getMOQ = (item, currentUnit) => {
  if (!item) return 1;
  if (item.alt_unit && item.alt_unit !== "None" && currentUnit === item.alt_unit) {
    return Number(item.min_order_quantity_alt) || 1;
  }
  return Number(item.min_order_quantity) || 1;
};

const validateAndClampQty = (item, requestedQty, inputUnit) => {
  // Central admin is allowed to add out-of-stock items, so we bypass limits.
  return { valid: true, clamped: requestedQty, msg: "" };
};

const ToastContainer = ({ toasts, removeToast }) => (
  <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-2 w-full max-w-xs pointer-events-none print:hidden">
    {toasts.map((toast) => (
      <div
        key={toast.id}
        className={`pointer-events-auto p-4 rounded-2xl shadow-xl border flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-300 bg-white ${toast.type === 'error' ? 'border-red-100 text-red-600' : 'border-emerald-100 text-emerald-600'}`}
      >
        {toast.type === 'error' ? <FiAlertTriangle className="shrink-0" /> : <FiCheck className="shrink-0" />}
        <p className="text-[11px] font-black uppercase tracking-tight flex-1">{toast.message}</p>
        <button onClick={() => removeToast(toast.id)} className="text-slate-400 hover:text-black transition-colors"><FiX /></button>
      </div>
    ))}
  </div>
);

const StockSkeleton = () => (
  <div className="bg-white p-4 rounded-2xl border-2 border-slate-100 flex flex-col gap-3 animate-pulse">
    <div className="h-3 w-1/3 bg-slate-100 rounded-md"></div>
    <div className="h-4 w-3/4 bg-slate-100 rounded-md"></div>
    <div className="h-20 w-full bg-slate-50 rounded-xl mt-2"></div>
  </div>
);

export default function CentralNewBills() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [companies, setCompanies] = useState([]);
  const [franchises, setFranchises] = useState([]);
  const [stocks, setStocks] = useState([]);
  
  const [selectedCompanyId, setSelectedCompanyId] = useState("");
  const [selectedFranchiseId, setSelectedFranchiseId] = useState("");
  const [isFranchiseDropdownOpen, setIsFranchiseDropdownOpen] = useState(false);

  const [loadingStocks, setLoadingStocks] = useState(true);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [processingOrder, setProcessingOrder] = useState(false);
  const [toasts, setToasts] = useState([]);
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [cart, setCart] = useState([]);
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [qtyInput, setQtyInput] = useState({});
  const [selectedUnit, setSelectedUnit] = useState({});

  useEffect(() => {
    document.body.style.overflow = (isCartOpen || orderSuccess) ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [isCartOpen, orderSuccess]);

  const toastTimeoutsRef = useRef(new Map());
  useEffect(() => {
    const timeouts = toastTimeoutsRef.current;
    return () => { timeouts.forEach(id => clearTimeout(id)); timeouts.clear(); };
  }, []);

  const addToast = useCallback((type, title, message, duration = 4000, customId = null) => {
    const id = customId || Date.now();
    setToasts(prev => {
      const others = prev.filter(t => t.id !== id);
      return [...others, { id, type, title, message }];
    });
    if (toastTimeoutsRef.current.has(id)) clearTimeout(toastTimeoutsRef.current.get(id));
    const timeoutId = setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
      toastTimeoutsRef.current.delete(id);
    }, duration);
    toastTimeoutsRef.current.set(id, timeoutId);
  }, []);

  const removeToast = useCallback((id) => setToasts(prev => prev.filter(t => t.id !== id)), []);

  const fetchData = useCallback(async () => {
    setLoadingStocks(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: pData } = await supabase.from("profiles").select("*").eq("id", user.id).single();
        setProfile(pData);
      }

      const { data: comps } = await supabase.from('companies').select('*').order('company_name');
      if (comps) setCompanies(comps);

      const { data: franchs } = await supabase.from('profiles').select('*').eq('role', 'franchise').order('name');
      if (franchs) setFranchises(franchs);

      const { data: stockData } = await supabase.from("stocks").select("*").eq('online_store', true).order("item_name");
      if (stockData) setStocks(stockData);
    } catch {
      addToast('error', 'Sync Failed', 'Could not refresh data.');
    } finally { setLoadingStocks(false); }
  }, [addToast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const availableFranchises = useMemo(() => {
    if (!selectedCompanyId || companies.length === 0) return [];
    const selectedCompany = companies.find(c => c.id === selectedCompanyId);
    if (!selectedCompany) return [];
    const targetCompanyName = selectedCompany.company_name ? String(selectedCompany.company_name).trim().toLowerCase() : "";
    return franchises
      .filter(f => {
        const fCompany = f.company ? String(f.company).trim().toLowerCase() : "";
        return fCompany === targetCompanyName;
      })
      .sort((a, b) => (a.franchise_id || "").toString().localeCompare((b.franchise_id || "").toString(), undefined, { numeric: true, sensitivity: 'base' }));
  }, [selectedCompanyId, companies, franchises]);

  const selectedFranchiseProfile = useMemo(() => {
    return franchises.find(f => f.franchise_id === selectedFranchiseId);
  }, [selectedFranchiseId, franchises]);

  // Adjust cart when stocks change
  useEffect(() => {
    if (stocks.length === 0) return;
    setCart(prevCart => {
      let hasChanges = false;
      const updatedCart = prevCart.map(cartItem => {
        const liveItem = stocks.find(s => s.id === cartItem.id);
        if (!liveItem) {
          hasChanges = true;
          return { ...cartItem, qty: 0 };
        }
        const check = validateAndClampQty(liveItem, cartItem.qty, cartItem.cartUnit);
        if (!check.valid && check.clamped !== cartItem.qty) {
          hasChanges = true;
          return { ...cartItem, qty: check.clamped, displayQty: check.clamped };
        }
        return cartItem;
      }).filter(item => item.qty > 0);
      return hasChanges ? updatedCart : prevCart;
    });
  }, [stocks]);

  const sortedCategories = useMemo(() => {
    const formattedCats = stocks
      .map(s => s.category ? s.category.trim().toUpperCase() : null)
      .filter(Boolean);
    const uniqueCats = [...new Set(formattedCats)].sort();
    return ["All", ...uniqueCats];
  }, [stocks]);

  const liveCart = useMemo(() => {
    return cart.map(cartItem => {
      const liveData = stocks.find(s => s.id === cartItem.id);
      return liveData ? { ...cartItem, ...liveData, qty: cartItem.qty, displayQty: cartItem.displayQty, cartUnit: cartItem.cartUnit } : cartItem;
    });
  }, [cart, stocks]);

  const calculations = useMemo(() => {
    const details = liveCart.map(item => {
      const multiplier = getPriceMultiplier(item.unit, item.cartUnit);
      const effectivePrice = item.price * multiplier;
      const subtotal = effectivePrice * item.qty;
      const gstAmt = subtotal * ((item.gst_rate || 0) / 100);
      return { ...item, effectivePrice, preciseSubtotal: subtotal, preciseGst: gstAmt };
    });
    const totalSub = details.reduce((acc, c) => acc + c.preciseSubtotal, 0);
    const totalGst = details.reduce((acc, c) => acc + c.preciseGst, 0);
    const transportationCharge = Number(selectedFranchiseProfile?.transportation_charge) || 0;
    const exactBill = parseFloat((totalSub + totalGst + transportationCharge).toFixed(2));
    const roundedBill = Math.ceil(exactBill);
    return { items: details, subtotal: totalSub, totalGst, transportationCharge, roundedBill, roundOff: roundedBill - exactBill };
  }, [liveCart, selectedFranchiseProfile]);

  const filteredStocks = useMemo(() => {
    const baseList = stocks.filter(item => {
      const query = deferredSearch.toLowerCase();
      const matchesSearch = item.item_name.toLowerCase().includes(query) || item.item_code?.toLowerCase().includes(query);
      const categoryName = item.category ? item.category.trim().toUpperCase() : '';
      const matchesCategory = selectedCategory === "All" || categoryName === selectedCategory;
      return matchesSearch && matchesCategory;
    });
    return baseList.sort((a, b) => (Number(a.quantity) > 0 && Number(b.quantity) <= 0) ? -1 : (Number(a.quantity) <= 0 && Number(b.quantity) > 0) ? 1 : 0);
  }, [stocks, deferredSearch, selectedCategory]);

  const stateRef = useRef({ cart, qtyInput, stocks, selectedUnit });
  useEffect(() => { stateRef.current = { cart, qtyInput, stocks, selectedUnit }; }, [cart, qtyInput, stocks, selectedUnit]);

  const handleUnitChange = useCallback((itemId, newUnit) => {
    const { stocks, cart } = stateRef.current;
    const item = stocks.find(s => s.id === itemId);
    if (!item) return;
    setSelectedUnit(prev => ({ ...prev, [itemId]: newUnit }));
    const newMOQ = getMOQ(item, newUnit);
    const cartItem = cart.find(c => c.id === itemId);
    if (cartItem) {
      let newQty = Math.max(cartItem.qty, newMOQ);
      const check = validateAndClampQty(item, newQty, newUnit);
      if (!check.valid) {
        addToast('error', 'Limit Reached', check.msg, 2000, `limit-${itemId}`);
        newQty = check.clamped;
      }
      if (newQty > 0) {
        setCart(prev => prev.map(c => c.id === itemId ? { ...c, cartUnit: newUnit, qty: newQty, displayQty: newQty } : c));
        setQtyInput(prev => ({ ...prev, [itemId]: newQty }));
      } else {
        setCart(prev => prev.filter(i => i.id !== itemId));
        setQtyInput(prev => ({ ...prev, [itemId]: 0 }));
      }
    } else {
      setQtyInput(prev => ({ ...prev, [itemId]: newMOQ }));
    }
  }, [addToast]);

  const handleQtyInputChange = useCallback((itemId, val, isStepButton = false, direction = 0) => {
    const { stocks, selectedUnit, qtyInput } = stateRef.current;
    const item = stocks.find(s => s.id === itemId);
    if (!item) return;
    const currentUnit = selectedUnit[itemId] || item.unit;
    const currentVal = qtyInput[itemId] || 0;
    const moq = getMOQ(item, currentUnit);
    const isGrams = ["g", "grams", "gram", "gm", "gms", "ml", "milliliter"].includes(currentUnit.toLowerCase().trim());
    const stepSize = isGrams ? 50 : 1;
    let numVal = isStepButton ? (direction === 1 ? (currentVal === 0 ? moq : currentVal + stepSize) : (currentVal <= moq ? 0 : Math.max(0, currentVal - stepSize))) : (val === "" ? 0 : Math.max(0, Number(val)));
    const check = validateAndClampQty(item, numVal, currentUnit);
    if (!check.valid) {
      addToast('error', 'Limit Reached', check.msg, 2000, `limit-${itemId}`);
      numVal = check.clamped;
    }
    setQtyInput(prev => ({ ...prev, [itemId]: numVal }));
  }, [addToast]);

  const updateCartQty = useCallback((itemId, delta) => {
    const { stocks } = stateRef.current;
    setCart(prev => {
      let updatedCart = prev.map(item => {
        if (item.id === itemId) {
          const isGrams = ["g", "grams", "gram", "gm", "gms", "ml", "milliliter"].includes(item.cartUnit.toLowerCase().trim());
          const step = isGrams ? 50 : 1;
          const stockItem = stocks.find(s => s.id === itemId);
          const moq = getMOQ(stockItem, item.cartUnit);
          let newQty = delta === 1 ? item.qty + step : (item.qty <= moq ? 0 : item.qty - step);
          if (newQty <= 0) return null;
          if (stockItem) {
            const check = validateAndClampQty(stockItem, newQty, item.cartUnit);
            if (!check.valid) {
              addToast('error', 'Limit Reached', check.msg);
              return { ...item, qty: check.clamped, displayQty: check.clamped };
            }
          }
          return { ...item, qty: newQty, displayQty: newQty };
        }
        return item;
      }).filter(Boolean);
      if (!updatedCart.find(i => i.id === itemId)) setQtyInput(qPrev => ({ ...qPrev, [itemId]: 0 }));
      return updatedCart;
    });
  }, [addToast]);

  const handleAddToCart = useCallback((itemId) => {
    const { stocks, cart, selectedUnit, qtyInput } = stateRef.current;
    const item = stocks.find(s => s.id === itemId);
    if (cart.some(c => c.id === itemId)) {
      updateCartQty(itemId, 1);
    } else {
      const unit = selectedUnit[itemId] || item.unit;
      const moq = getMOQ(item, unit);
      let qtyToAdd = Math.max(qtyInput[itemId] || 0, moq);
      const check = validateAndClampQty(item, qtyToAdd, unit);
      if (!check.valid) {
        addToast('error', 'Limit Reached', check.msg);
        qtyToAdd = check.clamped;
      }
      if (qtyToAdd > 0) {
        setCart(prev => [...prev, { ...item, qty: qtyToAdd, displayQty: qtyToAdd, cartUnit: unit }]);
        setQtyInput(prev => ({ ...prev, [itemId]: qtyToAdd }));
      }
    }
  }, [addToast, updateCartQty]);

  const removeFromCart = useCallback((id) => {
    setCart(prev => prev.filter(i => i.id !== id));
    setQtyInput(prev => ({ ...prev, [id]: 0 }));
  }, []);

  const handleManualInputCart = useCallback((item, val) => {
    const { stocks } = stateRef.current;
    const numVal = val === "" ? 0 : Math.max(0, Number(val));
    if (numVal === 0) {
      removeFromCart(item.id);
      return;
    }
    const stockItem = stocks.find(s => s.id === item.id);
    if (stockItem) {
      const check = validateAndClampQty(stockItem, numVal, item.cartUnit);
      if (!check.valid) {
        addToast('error', 'Limit Reached', check.msg, 2000, `limit-${item.id}`);
        setCart(prev => prev.map(c => c.id === item.id ? { ...c, qty: check.clamped, displayQty: check.clamped } : c));
        return;
      }
    }
    setCart(prev => prev.map(c => c.id === item.id ? { ...c, qty: numVal, displayQty: numVal } : c));
  }, [addToast, removeFromCart]);

  const handlePlaceOrder = async () => {
    if (cart.length === 0 || !selectedFranchiseId) return;
    setProcessingOrder(true);
    try {
      const orderItems = calculations.items.map(i => ({
        stock_id: i.id,
        item_name: i.item_name,
        item_code: i.item_code || null,
        quantity: i.qty,
        unit: i.cartUnit,
        price: i.effectivePrice,
        gst_rate: i.gst_rate,
        base_qty: i.qty * getPriceMultiplier(i.unit, i.cartUnit)
      }));

      const transportationCharge = calculations.transportationCharge;

      // Insert directly into stock_request_orders
      const { error } = await supabase.from('stock_request_orders').insert([{
        franchise_id: selectedFranchiseId,
        user_id: profile.id,
        user_name: selectedFranchiseProfile.name || "",
        user_phone: selectedFranchiseProfile.phone || "",
        company: selectedFranchiseProfile.company || "",
        items: orderItems,
        status: "received"
      }]);

      if (error) throw error;

      setOrderSuccess(true);
      setCart([]);
      setQtyInput({});
      setIsCartOpen(false);
      setSelectedFranchiseId("");
      addToast('success', 'Order Created', 'The bill has been successfully added to stock requests.');
    } catch (error) {
      addToast('error', 'Order Error', error.message);
    } finally {
      setProcessingOrder(false);
    }
  };

  return (
    <>
      <ToastContainer toasts={toasts} removeToast={removeToast} />
      <div className="min-h-[100dvh] bg-[#F3F4F6] pb-24 font-sans text-black relative">
        {orderSuccess && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <div className="bg-white rounded-[2.5rem] p-8 max-w-sm w-full text-center shadow-2xl animate-in zoom-in-95">
              <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6"><FiCheck size={40} /></div>
              <h2 className="text-2xl font-black uppercase mb-2">Success!</h2>
              <p className="text-slate-500 font-bold text-xs mb-8">Your order has been placed to Stock Requests.</p>
              <div className="space-y-3">
                <button onClick={() => { setOrderSuccess(false); navigate('/central/central_stock_requests'); }} className="w-full py-4 bg-black text-white rounded-2xl font-black uppercase text-[11px] tracking-widest flex items-center justify-center gap-2">View Stock Requests</button>
                <button onClick={() => setOrderSuccess(false)} className="w-full py-4 bg-slate-100 text-slate-600 rounded-2xl font-black uppercase text-[11px]">Continue Creating Bills</button>
              </div>
            </div>
          </div>
        )}
        
        {cart.length > 0 && selectedFranchiseId && (
          <button onClick={() => setIsCartOpen(true)} className="sm:hidden fixed bottom-6 right-6 z-[45] w-14 h-14 bg-black rounded-full shadow-2xl flex items-center justify-center text-white transition-all active:scale-90 hover:scale-105">
            <FiShoppingCart size={24} />
            <span className="absolute -top-1 -right-1 bg-white text-black text-xs font-black h-6 w-6 rounded-full flex items-center justify-center shadow-md border border-white">{cart.length}</span>
          </button>
        )}
        
        {isCartOpen && selectedFranchiseId && (
          <>
            <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm" onClick={() => setIsCartOpen(false)}></div>
            <div className="fixed inset-y-0 right-0 z-[70] w-full max-w-md bg-white shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <h2 className="text-sm font-black uppercase tracking-widest flex items-center gap-2"><FiShoppingCart /> Cart ({cart.length})</h2>
                <button onClick={() => setIsCartOpen(false)} className="p-2 hover:bg-slate-50 rounded-full transition-colors"><FiX size={24} /></button>
              </div>
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {cart.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-slate-300 gap-3">
                    <FiShoppingCart size={48} />
                    <p className="text-[11px] font-black uppercase tracking-widest">Cart is empty</p>
                  </div>
                ) : liveCart.map(item => {
                  const multiplier = getPriceMultiplier(item.unit, item.cartUnit);
                  const displayPrice = item.price * multiplier;
                  const cartItemMoq = getMOQ(item, item.cartUnit);
                  return (
                    <div key={item.id} className="flex gap-4 p-4 border border-slate-200 rounded-2xl bg-white shadow-sm items-center">
                      <div className="flex-1">
                        <h4 className="text-[12px] font-black uppercase leading-tight mb-1">{item.item_name}</h4>
                        <p className="text-[10px] font-bold text-slate-400 mb-2">@ {cartItemMoq} {item.cartUnit} = {formatCurrency(displayPrice * cartItemMoq)}</p>
                        <div className="flex items-center gap-4">
                          <div className="flex items-center border border-slate-200 rounded-xl bg-slate-50 h-8">
                            <button onClick={() => updateCartQty(item.id, -1)} className="px-3 h-full hover:bg-slate-200"><FiMinus size={12} /></button>
                            <span className="w-8 text-center text-[11px] font-black">{item.qty}</span>
                            <button onClick={() => updateCartQty(item.id, 1)} className="px-3 h-full hover:bg-slate-200"><FiPlus size={12} /></button>
                          </div>
                          <p className="text-sm font-black">{formatCurrency(displayPrice * item.qty)}</p>
                        </div>
                      </div>
                      <button onClick={() => removeFromCart(item.id)} className="p-3 text-rose-500 hover:bg-rose-50 rounded-xl transition-colors"><FiTrash2 size={20} /></button>
                    </div>
                  );
                })}
              </div>
              {cart.length > 0 && (
                <div className="p-6 border-t border-slate-100 bg-white shadow-inner">
                  <div className="space-y-2 mb-6 p-4 bg-slate-50 rounded-2xl text-[11px] font-black uppercase">
                    <div className="flex justify-between text-slate-400"><span>Subtotal</span><span>{formatCurrency(calculations.subtotal)}</span></div>
                    <div className="flex justify-between text-slate-400"><span>Total GST</span><span>{formatCurrency(calculations.totalGst)}</span></div>
                    {calculations.transportationCharge > 0 && <div className="flex justify-between text-slate-400"><span>Transportation</span><span>{formatCurrency(calculations.transportationCharge)}</span></div>}
                    <div className="flex justify-between text-slate-400 border-b border-slate-100 pb-2 mb-2"><span>Round Off</span><span>{formatCurrency(calculations.roundOff)}</span></div>
                    <div className="flex justify-between text-lg pt-1"><span>Total Bill</span><span>{formatCurrency(calculations.roundedBill)}</span></div>
                  </div>
                  <button onClick={handlePlaceOrder} disabled={processingOrder} className="w-full py-5 bg-black text-white rounded-2xl font-black uppercase text-[11px] tracking-widest flex items-center justify-center gap-2 hover:bg-slate-800 transition-all active:scale-95">
                    {processingOrder ? <FiRefreshCw className="animate-spin" /> : <FiCheck size={18} />}
                    {processingOrder ? "Creating..." : "Checkout To Stock Requests"}
                  </button>
                </div>
              )}
            </div>
          </>
        )}

        <header style={styles.header}>
          <div style={styles.headerInner}>
            <button onClick={() => window.history.length > 1 ? navigate(-1) : navigate('/')} style={styles.backBtn}><FiArrowLeft size={18} /> <span>Back</span></button>
            <h1 style={styles.heading}>CREATE <span style={{ color: BRAND_COLOR }}>BILL</span></h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
              <div style={styles.idBox}>ID : {profile?.franchise_id || '---'}</div>
              {selectedFranchiseId && (
                <button onClick={() => setIsCartOpen(true)} className="hidden sm:block relative p-2 bg-white border border-slate-200 rounded-md hover:border-black transition-all shadow-sm group cursor-pointer">
                  <FiShoppingCart size={18} className="group-hover:scale-110 transition-transform text-black" />
                  {cart.length > 0 && <span className="absolute -top-2 -right-2 text-white text-[10px] font-black h-5 w-5 flex items-center justify-center rounded-full shadow-lg border-2 border-white" style={{ backgroundColor: BRAND_COLOR }}>{cart.length}</span>}
                </button>
              )}
            </div>
          </div>
        </header>

        <div className="w-full px-4 sm:px-6 pt-4">
          <div className="flex flex-col md:flex-row gap-3 mb-6 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
            <div className="relative flex-1">
                <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <select value={selectedCompanyId} onChange={(e) => { setSelectedCompanyId(e.target.value); setSelectedFranchiseId(""); setCart([]); }} className="w-full pl-11 pr-4 py-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl outline-none focus:border-black font-bold text-sm shadow-sm cursor-pointer appearance-none transition-all">
                    <option value="" disabled>1. Select Billing Company</option>
                    {companies.map(c => <option key={c.id} value={c.id}>{c.company_name}</option>)}
                </select>
            </div>
            <div className="relative flex-1">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <div
                    className={`w-full pl-11 pr-4 py-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl outline-none focus:border-black font-bold text-sm shadow-sm flex items-center transition-all ${(!selectedCompanyId || availableFranchises.length === 0) ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                    onClick={() => {
                        if (selectedCompanyId && availableFranchises.length > 0) {
                            setIsFranchiseDropdownOpen(!isFranchiseDropdownOpen);
                        }
                    }}
                >
                    {selectedFranchiseId ? (
                        availableFranchises.find(f => f.franchise_id === selectedFranchiseId)
                            ? `${availableFranchises.find(f => f.franchise_id === selectedFranchiseId).name || "---"} - ${selectedFranchiseId}`
                            : selectedFranchiseId
                    ) : (
                        !selectedCompanyId ? "2. Select Target Franchise" : (availableFranchises.length === 0 ? "No franchises found" : "2. Select Target Franchise")
                    )}
                </div>
                
                {isFranchiseDropdownOpen && (
                    <>
                        <div
                            className="fixed inset-0 z-40"
                            onClick={() => setIsFranchiseDropdownOpen(false)}
                        />
                        <div
                            className="absolute top-[105%] left-0 w-full max-h-[300px] overflow-y-auto bg-white border border-slate-200 rounded-xl z-50 shadow-xl"
                        >
                            <table className="w-full border-collapse text-xs md:text-sm">
                                <tbody>
                                    {availableFranchises.map(f => (
                                        <tr
                                            key={f.id}
                                            className={`border-b border-slate-100 cursor-pointer ${selectedFranchiseId === f.franchise_id ? "bg-slate-50" : "bg-white"} hover:bg-slate-50`}
                                            onClick={() => {
                                                setSelectedFranchiseId(f.franchise_id);
                                                setCart([]);
                                                setIsFranchiseDropdownOpen(false);
                                            }}
                                        >
                                            <td className="p-3 border-r border-slate-100 text-slate-700 font-medium">
                                                {f.name || "---"}
                                            </td>
                                            <td className="p-3 text-slate-500 whitespace-nowrap w-[100px] text-right font-bold uppercase">
                                                {f.franchise_id}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}
            </div>
          </div>

          {selectedFranchiseId ? (
            <>
              <div className="flex flex-col gap-4">
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1">
                    <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input placeholder="SEARCH ITEMS..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full h-11 sm:h-12 pl-12 pr-4 bg-white border border-slate-200 rounded-2xl text-sm font-black uppercase outline-none focus:border-black transition-all shadow-sm" />
                  </div>
                </div>
                <div className="overflow-x-auto pb-3 scrollbar-thin">
                  <div className="flex gap-2 min-w-max py-1">
                    {sortedCategories.map((cat) => (
                      <button key={cat} onClick={() => setSelectedCategory(cat)} className={`flex-shrink-0 px-5 sm:px-6 py-2.5 rounded-xl text-xs sm:text-sm font-black uppercase border-2 transition-all active:scale-95 ${selectedCategory === cat ? "text-white border-transparent shadow-lg" : "bg-white text-black border-slate-200 hover:border-black"}`} style={selectedCategory === cat ? { backgroundColor: BRAND_COLOR } : {}}>{cat}</button>
                    ))}
                  </div>
                </div>
              </div>
            </>
          ) : (
             <div className="text-center py-24 sm:py-32 bg-white rounded-[2rem] border-2 border-dashed border-slate-200 mt-4">
               <FiShoppingCart size={48} className="mx-auto text-slate-200 mb-4" />
               <p className="uppercase font-black text-sm text-slate-400 tracking-widest">Select a company and franchise to start billing</p>
             </div>
          )}
        </div>

        {selectedFranchiseId && (
          <main className="w-full px-4 sm:px-6 mt-5 sm:mt-6 pb-20">
            {loadingStocks ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-6">{[...Array(5)].map((_, i) => <StockSkeleton key={i} />)}</div>
            ) : filteredStocks.length === 0 ? (
              <div className="text-center py-24 sm:py-32 bg-white rounded-[2rem] border-2 border-dashed border-slate-200"><FiSearch size={48} className="mx-auto text-slate-200 mb-4" /><p className="uppercase font-black text-sm text-slate-400 tracking-widest">No matching items found</p></div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-6">
                {filteredStocks.map((item) => {
                  const unit = selectedUnit[item.id] ?? item.unit ?? "pcs";
                  const cartItemData = liveCart.find(c => c.id === item.id);
                  const isInCart = !!cartItemData;
                  const multiplier = getPriceMultiplier(item.unit, unit);
                  const displayPrice = item.price * multiplier;
                  const currentMOQ = getMOQ(item, unit);
                  const qtyValue = isInCart ? cartItemData.qty : qtyInput[item.id];
                  return (
                    <StockItemCard
                      key={item.id}
                      item={item}
                      unit={unit}
                      isInCart={isInCart}
                      displayPrice={displayPrice}
                      currentMOQ={currentMOQ}
                      qtyValue={qtyValue}
                      cartItemData={cartItemData}
                      onUpdateCartQty={updateCartQty}
                      onManualInputCart={handleManualInputCart}
                      onQtyInputChange={handleQtyInputChange}
                      onUnitChange={handleUnitChange}
                      onAddToCart={handleAddToCart}
                    />
                  );
                })}
              </div>
            )}
          </main>
        )}
      </div>
      <style>{`
        .scrollbar-thin { scrollbar-width: thin; scrollbar-color: #cbd5e1 #f1f5f9; } .scrollbar-thin::-webkit-scrollbar { height: 6px; } .scrollbar-thin::-webkit-scrollbar-track { background: #f1f5f9; border-radius: 10px; } .scrollbar-thin::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; } .scrollbar-thin::-webkit-scrollbar-thumb:hover { background: #94a3b8; } input[type="number"]::-webkit-inner-spin-button, input[type="number"]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
      `}</style>
    </>
  );
}

const styles = {
  header: { background: 'rgba(255, 255, 255, 0.95)', backdropFilter: 'blur(12px)', borderBottom: '1px solid #e2e8f0', position: 'sticky', top: 0, zIndex: 50, width: '100%', marginBottom: '24px', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' },
  headerInner: { padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', gap: '12px', boxSizing: 'border-box' },
  backBtn: { background: "none", border: "none", color: "#000", fontSize: "14px", fontWeight: "700", cursor: "pointer", padding: 0, display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 },
  heading: { fontWeight: "900", color: "#000", textTransform: 'uppercase', letterSpacing: "-0.5px", margin: 0, fontSize: '20px', textAlign: 'center', flex: 1, lineHeight: 1.2 },
  idBox: { background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '6px 12px', color: '#334155', fontSize: '11px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap', flexShrink: 0 }
};
