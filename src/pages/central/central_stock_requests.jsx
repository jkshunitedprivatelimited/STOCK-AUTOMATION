import React, { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { supabase } from "../../frontend_supabase/supabaseClient";
import { useNavigate } from "react-router-dom";
import {
  FiArrowLeft, FiSearch, FiX, FiCheck, FiPackage, FiTruck,
  FiRefreshCw, FiAlertCircle, FiBox, FiClock, FiPhone,
  FiChevronDown, FiInbox, FiFilter, FiMessageSquare,
  FiCalendar, FiPrinter, FiXCircle, FiTrash2, FiRotateCcw
} from "react-icons/fi";
import { FaWhatsapp } from "react-icons/fa";
import { headerStyles } from "../../utils/headerStyles";
import { amountToWords, formatCurrency } from "../../utils/formatters";

const BRAND_GREEN = "rgb(0, 100, 55)";
const ITEMS_PER_INVOICE_PAGE = 15;

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
  received:   { label: "Received",   color: "bg-amber-100 text-amber-700 border-amber-200",     icon: <FiClock size={12} /> },
  packed:     { label: "Accepted",   color: "bg-emerald-100 text-emerald-700 border-emerald-200", icon: <FiCheck size={12} /> },
  cancelled:  { label: "Rejected",   color: "bg-red-100 text-red-600 border-red-200",             icon: <FiX size={12} /> },
};

// --- HELPER FUNCTIONS ---

// ========== INVOICE COMPONENT (same design as central_invoices.jsx) ==========
const RequestInvoice = ({ order, companyDetails, franchiseProfile, logoBase64, pageIndex, totalPages, itemsChunk, stocksData }) => {
    if (!order) return null;
    const companyName = companyDetails?.company_name || "";
    const currentLogo = logoBase64 || companyDetails?.logo_url || null;

    const invDate = new Date(order.created_at).toLocaleDateString('en-GB', {
        day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'Asia/Kolkata'
    });

    // Calculate totals across all items in the order
    let totalTaxableAmount = 0;
    let totalTaxAmount = 0;

    const fullItems = order.items || [];
    fullItems.forEach(item => {
        const qty = Number(item.quantity) || 0;
        const stock = stocksData?.find(s => s.id === item.stock_id);
        
        // Use historical effective price from the order; fallback: convert stock base price
        let rate;
        if (item.price !== undefined && item.price !== null) {
            rate = Number(item.price);
        } else if (stock) {
            const multiplier = getPriceMultiplier(stock.unit, item.unit);
            rate = Number(stock.price) * multiplier;
        } else {
            rate = 0;
        }
        const gstRate = item.gst_rate !== undefined ? Number(item.gst_rate) : (stock ? Number(stock.gst_rate) : 0);
        
        const subtotal = qty * rate;
        const gstAmt = subtotal * (gstRate / 100);
        totalTaxableAmount += subtotal;
        totalTaxAmount += gstAmt;
    });

    const transportationCharge = Number(franchiseProfile?.transportation_charge) || 0;
    const calculatedTotal = totalTaxableAmount + totalTaxAmount + transportationCharge;
    const roundedBill = Math.round(calculatedTotal);
    const roundOff = roundedBill - calculatedTotal;

    const taxableAmount = totalTaxableAmount;
    const totalGst = totalTaxAmount;
    const cgst = totalGst / 2;
    const sgst = totalGst / 2;
    const orderId = order.id ? order.id.substring(0, 8).toUpperCase() : 'PENDING';

    const termsList = companyDetails?.terms
        ? companyDetails.terms.split('\n').filter(t => t.trim() !== '')
        : [
            "Goods once sold will not be taken back or exchanged",
            "Payments terms : 100% advance payments",
            "All legal matters subject to Hyderabad jurisdiction",
        ];

    const emptyRowsCount = Math.max(0, ITEMS_PER_INVOICE_PAGE - itemsChunk.length);

    return (
        <div className="a4-page flex flex-col bg-white text-black font-sans text-xs leading-normal relative">
            <div className="w-full border-2 border-black flex flex-col relative flex-1">
                <div className="p-3 border-b-2 border-black relative">
                    <div className="absolute top-2 left-0 w-full text-center pointer-events-none">
                        <h1 className="text-xl font-black uppercase tracking-widest bg-white inline-block px-4 underline decoration-2 underline-offset-4 text-black">TAX INVOICE</h1>
                    </div>
                    <div className="flex justify-between items-center mt-5 pt-3">
                        <div className="text-left z-10 w-[55%]">
                            <div className="font-bold leading-relaxed text-[10px]">
                                <span className="uppercase underline mb-1 block text-black font-black">Registered Office:</span>
                                <p className="whitespace-pre-wrap break-words text-black leading-tight">{companyDetails?.company_address || ""}</p>
                                <div className="mt-1 space-y-0.5">
                                    {companyDetails?.company_gst && <p className="text-black">GSTIN: <span className="font-black">{companyDetails.company_gst}</span></p>}
                                    {companyDetails?.company_email && <p className="text-black">Email: {companyDetails.company_email}</p>}
                                </div>
                            </div>
                        </div>
                        <div className="z-10 flex flex-col items-center text-center max-w-[40%]">
                            {currentLogo ? (
                                <img
                                    src={currentLogo}
                                    alt="Logo"
                                    crossOrigin="anonymous"
                                    className="h-12 w-auto object-contain mb-1"
                                />
                            ) : (
                                <div className="h-10 w-24 border border-dashed border-gray-400 flex items-center justify-center text-[9px] text-black mb-1">NO LOGO</div>
                            )}
                            <h2 className="text-base font-black uppercase text-black break-words text-center leading-tight">{companyName}</h2>
                        </div>
                    </div>
                </div>

                <div className="flex border-b-2 border-black bg-slate-50 print:bg-transparent text-black">
                    <div className="w-1/2 border-r-2 border-black py-1 px-3">
                        <span className="font-bold text-black uppercase text-[9px]">Invoice No:</span>
                        <p className="font-black text-sm text-black">#{orderId}</p>
                    </div>
                    <div className="w-1/2 py-1 px-3">
                        <span className="font-bold text-black uppercase text-[9px]">Invoice Date:</span>
                        <p className="font-black text-sm text-black">{invDate}</p>
                    </div>
                </div>

                <div className="flex border-b-2 border-black text-black">
                    <div className="w-[70%] p-2 border-r-2 border-black">
                        <span className="font-black uppercase underline text-[10px] tracking-widest text-black mb-1 block">Bill To:</span>
                        <h3 className="text-sm font-black uppercase leading-tight text-black">{order?.user_name || ""}</h3>
                        <p className="font-bold text-[10px] mt-0.5 uppercase leading-snug whitespace-pre-wrap break-words text-black">
                            {franchiseProfile?.address || ""}<br />
                            {franchiseProfile?.city ? `${franchiseProfile.city}` : ''}{franchiseProfile?.state ? `, ${franchiseProfile.state}` : ''}{franchiseProfile?.pincode ? ` - ${franchiseProfile.pincode}` : ''}
                        </p>
                    </div>
                    <div className="w-[30%] p-2 flex flex-col justify-center pl-4 text-black">
                        <div className="mb-1.5"><span className="text-[10px] font-bold block mb-0.5">ID: </span><span className="text-sm font-black block text-black leading-none">{order?.franchise_id || ""}</span></div>
                        {order?.user_phone && (<div><span className="text-[10px] font-bold block mb-0.5">Ph: </span><span className="text-sm font-black block text-black leading-none">{order.user_phone}</span></div>)}
                    </div>
                </div>

                <div className="flex-1 border-b-2 border-black relative">
                    <table className="w-full text-left border-collapse text-black">
                        <thead className="bg-slate-100 text-[10px] border-b-2 border-black text-black">
                            <tr>
                                <th className="py-1 px-2 border-r-2 border-black w-10 text-center">S.No</th>
                                <th className="py-1 px-2 border-r-2 border-black">Item Description</th>
                                <th className="py-1 px-2 border-r-2 border-black w-14 text-center">Qty</th>
                                <th className="py-1 px-2 border-r-2 border-black w-20 text-right">Rate</th>
                                <th className="py-1 px-2 border-r-2 border-black w-12 text-center">GST%</th>
                                <th className="py-1 px-2 border-r-2 border-black w-16 text-right">GST Amt</th>
                                <th className="py-1 px-2 w-24 text-right">Amount</th>
                            </tr>
                        </thead>
                        <tbody className="text-[10px] font-bold text-black">
                            {itemsChunk.map((item, idx) => {
                                const stock = stocksData?.find(s => s.id === item.stock_id);
                                
                                // Use historical effective price from the order; fallback: convert stock base price
                                let rate;
                                if (item.price !== undefined && item.price !== null) {
                                    rate = Number(item.price);
                                } else if (stock) {
                                    const multiplier = getPriceMultiplier(stock.unit, item.unit);
                                    rate = Number(stock.price) * multiplier;
                                } else {
                                    rate = 0;
                                }
                                const gstRate = item.gst_rate !== undefined ? Number(item.gst_rate) : (stock ? Number(stock.gst_rate) : 0);
                                
                                const qty = Number(item.quantity) || 0;
                                const subtotal = qty * rate;
                                const gstAmt = subtotal * (gstRate / 100);
                                const finalAmount = subtotal + gstAmt;
                                const hsnText = stock?.hsn_code ? ` (Code: ${stock.hsn_code})` : (item.item_code ? ` (Code: ${item.item_code})` : '');

                                return (
                                    <tr key={idx} className="h-[26px] overflow-hidden">
                                        <td className="py-0.5 px-2 border-r-2 border-b border-black text-center text-black">{(pageIndex * ITEMS_PER_INVOICE_PAGE) + idx + 1}</td>
                                        <td className="py-0.5 px-2 border-r-2 border-b border-black uppercase truncate max-w-[150px] text-black overflow-hidden whitespace-nowrap">
                                            {item.item_name}{hsnText}
                                        </td>
                                        <td className="py-0.5 px-2 border-r-2 border-b border-black text-center text-black">{qty} {item.unit}</td>
                                        <td className="py-0.5 px-2 border-r-2 border-b border-black text-right text-black">{formatCurrency(rate)}</td>
                                        <td className="py-0.5 px-2 border-r-2 border-b border-black text-center text-black">{gstRate}%</td>
                                        <td className="py-0.5 px-2 border-r-2 border-b border-black text-right text-black">{formatCurrency(gstAmt)}</td>
                                        <td className="py-0.5 px-2 border-b border-black text-right text-black">{formatCurrency(finalAmount)}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                <div className="flex mt-auto text-black">
                    <div className="w-[60%] border-r-2 border-black flex flex-col">
                        <div className="py-1.5 px-2 border-b-2 border-black min-h-[30px] flex flex-col justify-center bg-slate-50">
                            <span className="font-bold text-[9px] text-black uppercase">Total Amount in Words:</span>
                            <p className="font-black italic capitalize text-[10px] mt-0.5 text-black leading-tight">{amountToWords(roundedBill)}</p>
                        </div>
                        <div className="p-2 flex-1 flex flex-col justify-between">
                            <div>
                                <p className="font-black uppercase underline text-[11px] mb-1.5 text-black">Bank Details</p>
                                <div className="grid grid-cols-[50px_1fr] gap-y-0.5 text-[10px] font-bold uppercase text-black leading-tight">
                                    <span>Bank:</span> <span className="text-black">{companyDetails?.bank_name || ""}</span>
                                    <span>A/c No:</span> <span className="text-black">{companyDetails?.bank_acc_no || ""}</span>
                                    <span>IFSC:</span> <span className="text-black">{companyDetails?.bank_ifsc || ""}</span>
                                </div>
                            </div>
                            <div className="mt-2 pt-1.5 border-t border-slate-300">
                                <p className="font-black uppercase underline text-[10px] mb-1 text-black">Terms & Conditions:</p>
                                <p className="text-[8px] text-black whitespace-pre-wrap leading-tight">{companyDetails?.terms || termsList.join(' | ')}</p>
                            </div>
                        </div>
                    </div>

                    <div className="w-[40%] flex flex-col text-[10px] text-black">
                        <div className="flex justify-between py-1 px-1.5 border-b border-black text-black"><span>Taxable</span><span>{formatCurrency(taxableAmount)}</span></div>
                        <div className="flex justify-between py-1 px-1.5 border-b border-slate-300 text-black"><span>Total GST</span><span>{formatCurrency(totalGst)}</span></div>
                        <div className="flex justify-between py-0.5 px-2 border-b border-slate-300 text-black text-[9px] bg-slate-50 pl-4"><span>CGST</span><span>{formatCurrency(cgst)}</span></div>
                        <div className="flex justify-between py-0.5 px-2 border-b border-black text-black text-[9px] bg-slate-50 pl-4"><span>SGST</span><span>{formatCurrency(sgst)}</span></div>
                        <div className="flex justify-between py-1 px-1.5 border-b border-slate-300 text-black"><span>Transportation</span><span>{formatCurrency(transportationCharge)}</span></div>
                        <div className="flex justify-between py-1 px-1.5 border-b border-black text-black"><span>Round Off</span><span>{formatCurrency(roundOff)}</span></div>
                        <div className="flex justify-between py-1.5 px-2 border-b-2 border-black bg-slate-200 text-black"><span className="font-black uppercase text-black">Total</span><span className="font-black text-black">{formatCurrency(roundedBill)}</span></div>
                        <div className="flex-1 flex flex-col justify-end p-2 text-center">
                            {pageIndex < totalPages - 1 && <p className="text-[8px] mb-1 font-bold italic text-slate-500">Continued on next page...</p>}
                            <p className="font-black border-t border-black pt-1 uppercase text-[8px] text-black">Authorized Signature</p>
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
  const [stocksData, setStocksData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [expandedOrder, setExpandedOrder] = useState(null);

  const [updatingId, setUpdatingId] = useState(null);
  const [printOrder, setPrintOrder] = useState(null);
  const [printCompanyDetails, setPrintCompanyDetails] = useState(null);
  const [printLogoBase64, setPrintLogoBase64] = useState(null);

  // Franchise profiles cache for invoice "Bill To" section
  const [franchiseProfiles, setFranchiseProfiles] = useState({});

  const [dateMode, setDateMode] = useState("date");
  const [singleDate, setSingleDate] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // WhatsApp tracking
  const [clickedWaOrders, setClickedWaOrders] = useState(() => JSON.parse(localStorage.getItem('clickedWaOrders') || '{}'));

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
      // Also fetch stocks if not already populated
      const { data: stocksRes } = await supabase.from('stocks').select('*');
      if (stocksRes) setStocksData(stocksRes);

      const { data, error } = await supabase
        .from("stock_request_orders")
        .select("*")
        .in("status", ["received", "packed", "cancelled"])
        .order("created_at", { ascending: false });
      if (error) throw error;
      setOrders(data || []);

      // Batch-fetch franchise profiles for transportation charges
      if (data && data.length > 0) {
        const uniqueUserIds = [...new Set(data.map(o => o.user_id).filter(Boolean))];
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("*")
          .in("id", uniqueUserIds);
        if (profilesData) {
          setFranchiseProfiles(prev => {
            const updated = { ...prev };
            profilesData.forEach(p => { updated[p.id] = p; });
            return updated;
          });
        }
      }
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
      let matchesDate = true;
      if (dateMode === "date" && singleDate) matchesDate = orderDate === singleDate;
      else if (dateMode === "range" && startDate && endDate) matchesDate = orderDate >= startDate && orderDate <= endDate;
      return matchesSearch && matchesStatus && matchesDate;
    });
  }, [orders, search, statusFilter, dateMode, singleDate, startDate, endDate]);

  // Status counts (respects date + search filters so badges match the displayed list)
  const statusCounts = useMemo(() => {
    const q = search.toLowerCase();
    const dateAndSearchFiltered = orders.filter(order => {
      const matchesSearch = !q ||
        order.franchise_id?.toLowerCase().includes(q) ||
        order.user_name?.toLowerCase().includes(q) ||
        order.user_phone?.includes(q) ||
        (order.items || []).some(i => i.item_name?.toLowerCase().includes(q));
      const orderDate = new Date(order.created_at).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
      let matchesDate = true;
      if (dateMode === "date" && singleDate) matchesDate = orderDate === singleDate;
      else if (dateMode === "range" && startDate && endDate) matchesDate = orderDate >= startDate && orderDate <= endDate;
      return matchesSearch && matchesDate;
    });
    const counts = { all: dateAndSearchFiltered.length, received: 0, packed: 0, cancelled: 0 };
    dateAndSearchFiltered.forEach(o => { if (counts[o.status] !== undefined) counts[o.status]++; });
    return counts;
  }, [orders, search, dateMode, singleDate, startDate, endDate]);

  // WhatsApp Helpers
  const getWhatsAppMessage = (status) => {
    switch (status) {
      case "received":
        return "Your order has been received. We are currently reviewing it and will confirm availability shortly.";
      case "packed":
        return "Your order has been accepted and sent to the stock room. Our management team will follow up with you shortly.";
      case "cancelled":
        return "Your order has been rejected due to the following reason: ";
      default:
        return "";
    }
  };

  const handleWaClick = (order) => {
    const key = `${order.id}_${order.status}`;
    const newObj = { ...clickedWaOrders, [key]: true };
    setClickedWaOrders(newObj);
    localStorage.setItem('clickedWaOrders', JSON.stringify(newObj));
  };

  // Reject order
  const rejectOrder = async (orderId) => {
    setUpdatingId(orderId);
    try {
      const { error } = await supabase.from("stock_request_orders").update({ status: "cancelled" }).eq("id", orderId);
      if (error) throw error;
      addToast("success", "Order rejected.");
      fetchOrders(true);
    } catch { addToast("error", "Failed to reject order."); }
    finally { setUpdatingId(null); }
  };

  // Delete order permanently
  const deleteOrder = async (orderId) => {
    const order = orders.find(o => o.id === orderId);
    if (order?.status === "packed") {
      if (!window.confirm("This order is already accepted. Deleting this request WILL NOT delete the generated invoice or restore stocks. Continue?")) return;
    } else {
      if (!window.confirm("Are you sure you want to permanently delete this request?")) return;
    }
    setUpdatingId(orderId);
    try {
      const { data, error } = await supabase.from("stock_request_orders").delete().eq("id", orderId).select();
      if (error) throw error;
      if (!data || data.length === 0) throw new Error("Delete blocked by RLS.");
      addToast("success", "Order permanently deleted.");
      fetchOrders(true);
    } catch { addToast("error", "Failed to delete order."); }
    finally { setUpdatingId(null); }
  };

  // Undo order (move back to received)
  const undoOrder = async (orderId) => {
    const order = orders.find(o => o.id === orderId);
    if (order?.status === "packed") {
      addToast("error", "Cannot undo an accepted order because an invoice has already been generated and stocks deducted.");
      return;
    }
    console.log("[UNDO] Button clicked. orderId:", orderId);
    console.log("[UNDO] Current profile role:", profile?.role);
    if (!window.confirm("Move this order back to Received?")) {
      console.log("[UNDO] User cancelled confirm dialog");
      return;
    }
    console.log("[UNDO] User confirmed. Attempting update...");
    setUpdatingId(orderId);
    try {
      const { data, error } = await supabase
        .from("stock_request_orders")
        .update({ status: "received" })
        .eq("id", orderId)
        .select();
      console.log("[UNDO] Supabase response - data:", data, "error:", error);
      if (error) throw error;
      if (!data || data.length === 0) {
        console.warn("[UNDO] No rows updated! Possible RLS issue or orderId not found.");
        addToast("error", "No rows updated — check RLS or order ID.");
      } else {
        console.log("[UNDO] Success! Updated row:", data[0]);
        addToast("success", "Order moved back to Received.");
      }
      fetchOrders(true);
    } catch (err) {
      console.error("[UNDO] Error:", err);
      addToast("error", `Failed to undo: ${err.message || err}`);
    }
    finally { setUpdatingId(null); }
  };

  // Accept order
  const acceptOrder = async (orderId) => {
    setUpdatingId(orderId);
    try {
      // Ensure the order is still "received" before processing to prevent race conditions
      const { data: checkOrder, error: checkErr } = await supabase.from("stock_request_orders").select("status").eq("id", orderId).single();
      if (checkErr) throw checkErr;
      if (checkOrder.status !== "received") {
        throw new Error("Order has already been processed or cancelled by another user.");
      }

      const order = orders.find(o => o.id === orderId);
      if (!order) throw new Error("Order not found.");

      // Fetch current stock prices/gst if not available locally, though we have stocksData
      let currentStocks = stocksData;
      if (currentStocks.length === 0) {
        const { data: fetchStocks, error: stocksError } = await supabase.from('stocks').select('*');
        if (stocksError) throw stocksError;
        currentStocks = fetchStocks;
      }

      // Fetch franchise profile for details
      const franchiseProfile = await fetchFranchiseProfile(order.user_id) || {};

      let subtotal = 0;
      let tax_amount = 0;
      const invoiceItemsToInsert = [];
      const stockUpdates = [];

      for (const reqItem of (order.items || [])) {
        const stock = currentStocks.find(s => s.id === reqItem.stock_id);
        if (!stock) continue;

        const qty = Number(reqItem.quantity) || 0;
        
        // Use historical effective price from the order; fallback: convert stock base price
        let price;
        if (reqItem.price !== undefined && reqItem.price !== null) {
            price = Number(reqItem.price);
        } else {
            const multiplier = getPriceMultiplier(stock.unit, reqItem.unit);
            price = (Number(stock.price) || 0) * multiplier;
        }
        const gstRate = reqItem.gst_rate !== undefined ? Number(reqItem.gst_rate) : (Number(stock.gst_rate) || 0);
        
        const lineSubtotal = qty * price;
        const lineGst = lineSubtotal * (gstRate / 100);
        const lineTotal = lineSubtotal + lineGst;

        subtotal += lineSubtotal;
        tax_amount += lineGst;

        invoiceItemsToInsert.push({
          stock_id: stock.id,
          item_name: stock.item_name,
          quantity: qty,
          unit: reqItem.unit,
          price: price,
          total: lineTotal,
          gst_rate: gstRate
        });
        
        stockUpdates.push({ id: stock.id, newQuantity: Number(stock.quantity) - qty });
      }

      const transportationCharge = Number(order.transportation_charge) || Number(franchiseProfile?.transportation_charge) || 0;
      const exactBill = parseFloat((subtotal + tax_amount + transportationCharge).toFixed(2));
      const roundedBill = Math.ceil(exactBill);
      const round_off = roundedBill - exactBill;
      const total_amount = roundedBill;

      let comp = companyDetails || {};
      if (order.company) {
        const { data: orderComp } = await supabase.from('companies').select('*').eq('company_name', order.company).single();
        if (orderComp) comp = orderComp;
      }

      // Insert invoice (use current stock manager's ID to satisfy RLS for insertion)
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      const { data: invData, error: invError } = await supabase.from('invoices').insert({
        created_by: currentUser.id,
        total_amount,
        subtotal,
        tax_amount,
        round_off: round_off,
        status: 'incoming', // This pushes it to stock_orders.jsx incoming tab
        franchise_id: franchiseProfile?.franchise_id || order.franchise_id || "N/A",
        customer_name: franchiseProfile?.name || order.user_name || "Unknown",
        customer_phone: franchiseProfile?.phone || order.user_phone || "",
        customer_email: franchiseProfile?.email || "",
        customer_address: franchiseProfile?.address || "",
        branch_location: franchiseProfile?.branch_location || "",
        order_time_text: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
        snapshot_company_name: comp.company_name || "",
        snapshot_company_address: comp.company_address || "",
        snapshot_company_gst: comp.company_gst || "",
        snapshot_bank_details: { bank_name: comp.bank_name, bank_acc_no: comp.bank_acc_no, bank_ifsc: comp.bank_ifsc },
        snapshot_terms: comp.terms || "",
        transportation_charge: transportationCharge
      }).select().single();

      if (invError) throw invError;

      // Insert invoice items
      const mappedItems = invoiceItemsToInsert.map(item => ({ ...item, invoice_id: invData.id }));
      if (mappedItems.length > 0) {
        const { error: itemsError } = await supabase.from('invoice_items').insert(mappedItems);
        if (itemsError) throw itemsError;
      }

      // Deduct stocks
      for (const update of stockUpdates) {
        await supabase.from('stocks').update({ quantity: update.newQuantity }).eq('id', update.id);
      }

      // Mark the original request as accepted (packed)
      const { error } = await supabase.from("stock_request_orders").update({ status: "packed" }).eq("id", orderId);
      if (error) throw error;

      addToast("success", "Order accepted and pushed to Incoming Orders!");
      fetchOrders(true);
    } catch (e) {
      console.error(e);
      addToast("error", "Failed to accept order: " + (e.message || "Unknown error"));
    } finally {
      setUpdatingId(null);
    }
  };

  // Delete item from order
  const deleteOrderItem = async (orderId, itemIndex) => {
    setUpdatingId(orderId);
    try {
      const order = orders.find(o => o.id === orderId);
      if (!order || !order.items) return;
      
      const newItems = [...order.items];
      newItems.splice(itemIndex, 1);
      
      const { error } = await supabase.from("stock_request_orders").update({ items: newItems }).eq("id", orderId);
      if (error) throw error;
      
      addToast("success", "Item removed from order.");
      fetchOrders(true);
    } catch { addToast("error", "Failed to remove item."); }
    finally { setUpdatingId(null); }
  };

  // Print handler
  const handlePrint = async (order) => {
    await fetchFranchiseProfile(order.user_id);
    
    // Fetch correct company details for this order
    let printComp = companyDetails;
    let printLogo = cachedLogoBase64;
    
    if (order.company) {
      const { data: orderComp } = await supabase.from('companies').select('*').eq('company_name', order.company).single();
      if (orderComp) {
        printComp = orderComp;
        if (orderComp.logo_url) {
          printLogo = await loadImageAsBase64(orderComp.logo_url);
        } else {
          printLogo = null;
        }
      }
    }
    
    setPrintCompanyDetails(printComp);
    setPrintLogoBase64(printLogo);
    setPrintOrder(order);
    setTimeout(() => window.print(), 500);
  };

  const resetFilters = () => {
    setSearch("");
    setStatusFilter("all");
    setSingleDate("");
    setStartDate("");
    setEndDate("");
    setDateMode("date");
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
            companyDetails={printCompanyDetails || companyDetails}
            franchiseProfile={franchiseProfiles[printOrder.user_id] || null}
            logoBase64={printLogoBase64 || cachedLogoBase64}
            itemsChunk={chunk}
            pageIndex={index}
            totalPages={printChunks.length}
            stocksData={stocksData}
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
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 bg-white border border-slate-200 rounded-2xl px-4 py-2 hover:border-black transition-colors shadow-sm w-full md:w-auto">
              <div className="flex w-full sm:w-auto bg-slate-100 p-1 rounded-lg shrink-0 justify-center">
                <button onClick={() => setDateMode('date')} className={`flex-1 sm:flex-none px-4 py-1.5 rounded-md text-[9px] font-black uppercase transition-all ${dateMode === 'date' ? 'bg-white text-black shadow-sm' : 'text-slate-500'}`}>Date</button>
                <button onClick={() => setDateMode('range')} className={`flex-1 sm:flex-none px-4 py-1.5 rounded-md text-[9px] font-black uppercase transition-all ${dateMode === 'range' ? 'bg-white text-black shadow-sm' : 'text-slate-500'}`}>Range</button>
              </div>
              <div className="w-full sm:w-auto flex justify-center sm:justify-start">
                {dateMode === "date" ? (
                  <div className="flex items-center gap-2">
                    <FiCalendar size={16} className="text-slate-500 shrink-0" />
                    <input type="date" value={singleDate} onChange={e => setSingleDate(e.target.value)} className="bg-transparent text-xs font-black outline-none cursor-pointer uppercase text-center w-full sm:w-auto" />
                    {singleDate && <button onClick={() => setSingleDate("")} className="text-slate-400 hover:text-red-500 ml-1"><FiX size={14} /></button>}
                  </div>
                ) : (
                  <div className="flex items-center justify-center sm:justify-start gap-2 w-full sm:w-auto">
                    <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="bg-transparent text-xs font-black outline-none w-[110px] text-center" />
                    <span className="text-slate-400 font-bold">-</span>
                    <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="bg-transparent text-xs font-black outline-none w-[110px] text-center" />
                    {(startDate || endDate) && <button onClick={() => { setStartDate(""); setEndDate(""); }} className="text-slate-400 hover:text-red-500 ml-1"><FiX size={14} /></button>}
                  </div>
                )}
              </div>
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
                { key: "packed", label: "Accepted", icon: <FiCheck size={12} /> },
                { key: "cancelled", label: "Rejected", icon: <FiXCircle size={12} /> }
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
                      const isFinal = order.status === "packed" || order.status === "cancelled";

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
                                {!isFinal ? (
                                  <>
                                    {profile?.role === 'central' && (
                                      <button
                                        onClick={() => acceptOrder(order.id)}
                                        disabled={isUpdating}
                                        className="px-4 py-2 bg-emerald-50 hover:bg-emerald-600 hover:text-white text-emerald-600 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all inline-flex items-center gap-1.5 active:scale-95 disabled:opacity-50"
                                      >
                                        <FiCheck size={13} /> Accept
                                      </button>
                                    )}
                                    <button
                                      onClick={() => rejectOrder(order.id)}
                                      disabled={isUpdating}
                                      className="px-4 py-2 bg-rose-50 hover:bg-rose-600 hover:text-white text-rose-600 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all inline-flex items-center gap-1.5 active:scale-95 disabled:opacity-50"
                                    >
                                      <FiXCircle size={13} /> Reject
                                    </button>
                                  </>
                                ) : (
                                  <>
                                    {(profile?.role === 'central' || profile?.role === 'stock') && (
                                      <button
                                        onClick={() => undoOrder(order.id)}
                                        disabled={isUpdating}
                                        className="px-4 py-2 bg-amber-50 hover:bg-amber-600 hover:text-white text-amber-700 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all inline-flex items-center gap-1.5 active:scale-95 disabled:opacity-50"
                                      >
                                        <FiRotateCcw size={13} /> Undo
                                      </button>
                                    )}
                                    {profile?.role === 'central' && (
                                      <button
                                        onClick={() => deleteOrder(order.id)}
                                        disabled={isUpdating}
                                        className="px-4 py-2 bg-red-100 hover:bg-red-700 hover:text-white text-red-700 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all inline-flex items-center gap-1.5 active:scale-95 disabled:opacity-50"
                                      >
                                        <FiTrash2 size={13} /> Delete
                                      </button>
                                    )}
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                          {/* Expanded Row */}
                          {isExpanded && (() => {
                            let totalSub = 0, totalGst = 0;
                            const itemDetails = items.map(item => {
                              const stock = stocksData?.find(s => s.id === item.stock_id);
                              let rate;
                              if (item.price !== undefined && item.price !== null) { rate = Number(item.price); }
                              else if (stock) { rate = Number(stock.price) * getPriceMultiplier(stock.unit, item.unit); }
                              else { rate = 0; }
                              const gstRate = item.gst_rate !== undefined ? Number(item.gst_rate) : (stock ? Number(stock.gst_rate) : 0);
                              const qty = Number(item.quantity) || 0;
                              const sub = qty * rate;
                              const gst = sub * (gstRate / 100);
                              totalSub += sub;
                              totalGst += gst;
                              return { ...item, rate, gstRate, qty, sub, gst, lineTotal: sub + gst };
                            });
                            const transportationCharge = Number(order.transportation_charge) || Number(franchiseProfiles[order.user_id]?.transportation_charge) || 0;
                            const exactBill = parseFloat((totalSub + totalGst + transportationCharge).toFixed(2));
                            const roundedBill = Math.ceil(exactBill);
                            const roundOff = roundedBill - exactBill;
                            return (
                              <tr>
                                <td colSpan={7} className="p-0">
                                  <div className="bg-slate-50 border-t border-slate-200 p-6">
                                    <div className="flex gap-4">
                                      {/* Items Table */}
                                      <div className="flex-1 min-w-0">
                                        <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-2">Items Requested</p>
                                        <div className="max-h-[300px] overflow-y-auto rounded-xl border border-slate-200 bg-white">
                                          <table className="w-full text-left text-[10px]">
                                            <thead className="bg-slate-100 sticky top-0 z-10">
                                              <tr className="text-[9px] font-black uppercase text-slate-500">
                                                <th className="py-2 px-3">Item</th>
                                                <th className="py-2 px-2 text-center">Qty</th>
                                                <th className="py-2 px-2 text-right">Rate</th>
                                                <th className="py-2 px-2 text-center">GST%</th>
                                                <th className="py-2 px-2 text-right">GST Amt</th>
                                                <th className="py-2 px-2 text-right">Total</th>
                                                <th className="py-2 px-2 w-8"></th>
                                              </tr>
                                            </thead>
                                            <tbody>
                                              {itemDetails.map((item, idx) => (
                                                <tr key={idx} className="border-t border-slate-50 hover:bg-slate-50">
                                                  <td className="py-2 px-3">
                                                    <p className="font-black uppercase truncate max-w-[180px]">{item.item_name}</p>
                                                    {item.item_code && <p className="text-[8px] text-slate-400 font-bold">{item.item_code}</p>}
                                                  </td>
                                                  <td className="py-2 px-2 text-center font-black">{item.qty} {item.unit}</td>
                                                  <td className="py-2 px-2 text-right font-bold">{formatCurrency(item.rate)}</td>
                                                  <td className="py-2 px-2 text-center font-bold">{item.gstRate}%</td>
                                                  <td className="py-2 px-2 text-right font-bold">{formatCurrency(item.gst)}</td>
                                                  <td className="py-2 px-2 text-right font-black">{formatCurrency(item.lineTotal)}</td>
                                                  <td className="py-2 px-2">
                                                    {!isFinal && (profile?.role === 'central' || profile?.role === 'stock') && (
                                                      <button onClick={() => deleteOrderItem(order.id, idx)} disabled={isUpdating} className="p-1 bg-red-50 text-red-600 rounded hover:bg-red-100 transition-colors disabled:opacity-50" title="Delete Item">
                                                        <FiX size={10} />
                                                      </button>
                                                    )}
                                                  </td>
                                                </tr>
                                              ))}
                                            </tbody>
                                          </table>
                                        </div>
                                      </div>

                                      {/* Summary + Contact */}
                                      <div className="w-80 shrink-0 space-y-3">
                                        <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-2">Order Summary</p>
                                        <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-2 text-[10px] font-black uppercase">
                                          <div className="flex justify-between text-slate-500"><span>Subtotal</span><span>{formatCurrency(totalSub)}</span></div>
                                          <div className="flex justify-between text-slate-500"><span>Total GST</span><span>{formatCurrency(totalGst)}</span></div>
                                          {transportationCharge > 0 && <div className="flex justify-between text-slate-500"><span>Transportation</span><span>{formatCurrency(transportationCharge)}</span></div>}
                                          <div className="flex justify-between text-slate-500 border-b border-slate-100 pb-2"><span>Round Off</span><span>{formatCurrency(roundOff)}</span></div>
                                          <div className="flex justify-between text-sm pt-1"><span>Grand Total</span><span>{formatCurrency(roundedBill)}</span></div>
                                        </div>

                                        {/* Contact buttons */}
                                        {order.user_phone && (
                                          <div className="flex gap-2">
                                            <a href={`tel:${order.user_phone}`} className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-white border border-slate-200 rounded-xl text-[10px] font-black uppercase hover:bg-slate-100 transition-colors">
                                              <FiPhone size={14} /> Call {order.user_phone}
                                            </a>
                                            <a 
                                              href={`https://wa.me/91${order.user_phone.replace(/\D/g, "").slice(-10)}?text=${encodeURIComponent(getWhatsAppMessage(order.status))}`} 
                                              target="_blank" 
                                              rel="noopener noreferrer" 
                                              onClick={() => handleWaClick(order)}
                                              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[10px] font-black uppercase transition-colors ${clickedWaOrders[`${order.id}_${order.status}`] ? "bg-green-100 text-green-700 border border-green-200 hover:bg-green-200" : "bg-red-100 text-red-700 border border-red-200 hover:bg-red-200"}`}
                                            >
                                              <FaWhatsapp size={14} /> WhatsApp
                                            </a>
                                          </div>
                                        )}

                                        {isFinal && (
                                          <div className="flex flex-col gap-2">
                                            <div className={`p-3 rounded-xl text-center text-[10px] font-black uppercase tracking-widest ${order.status === "packed" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-red-50 text-red-600 border border-red-200"}`}>
                                              {order.status === "packed" ? "✅ Accepted" : "❌ Rejected"}
                                            </div>
                                            {(profile?.role === 'central' || profile?.role === 'stock') && (
                                              <button onClick={() => undoOrder(order.id)} disabled={isUpdating} className="w-full py-2.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-xl text-[10px] font-black uppercase flex items-center justify-center gap-2 active:scale-95 transition-all hover:bg-amber-100 disabled:opacity-50"><FiRotateCcw size={14} /> Undo to Received</button>
                                            )}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            );
                          })()}
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
                  const isFinal = order.status === "packed" || order.status === "cancelled";

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

                      {isExpanded && (() => {
                        let totalSub = 0, totalGst = 0;
                        const itemDetails = items.map(item => {
                          const stock = stocksData?.find(s => s.id === item.stock_id);
                          let rate;
                          if (item.price !== undefined && item.price !== null) { rate = Number(item.price); }
                          else if (stock) { rate = Number(stock.price) * getPriceMultiplier(stock.unit, item.unit); }
                          else { rate = 0; }
                          const gstRate = item.gst_rate !== undefined ? Number(item.gst_rate) : (stock ? Number(stock.gst_rate) : 0);
                          const qty = Number(item.quantity) || 0;
                          const sub = qty * rate;
                          const gst = sub * (gstRate / 100);
                          totalSub += sub;
                          totalGst += gst;
                          return { ...item, rate, gstRate, qty, sub, gst, lineTotal: sub + gst };
                        });
                        const transportationCharge = Number(order.transportation_charge) || Number(franchiseProfiles[order.user_id]?.transportation_charge) || 0;
                        const exactBill = parseFloat((totalSub + totalGst + transportationCharge).toFixed(2));
                        const roundedBill = Math.ceil(exactBill);
                        const roundOff = roundedBill - exactBill;
                        return (
                          <div className="border-t border-slate-100 p-4">
                            <div className="flex flex-col md:flex-row gap-4">
                              {/* Left Side: Items */}
                              <div className="flex-1 min-w-0">
                                <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-2">Items Requested</p>
                                <div className="max-h-[280px] overflow-y-auto space-y-2 pr-1 scrollbar-thin">
                                  {itemDetails.map((item, idx) => (
                                    <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                                      <div className="flex items-center justify-between mb-1.5">
                                        <div className="flex items-center gap-2 min-w-0">
                                          <FiPackage className="text-slate-400 shrink-0" size={14} />
                                          <p className="text-[11px] font-black uppercase truncate">{item.item_name}</p>
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0 ml-2">
                                          <span className="text-[11px] font-black">{item.qty} {item.unit}</span>
                                          {!isFinal && (profile?.role === 'central' || profile?.role === 'stock') && (
                                            <button onClick={() => deleteOrderItem(order.id, idx)} disabled={isUpdating} className="p-1.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors disabled:opacity-50" title="Delete Item">
                                              <FiX size={12} />
                                            </button>
                                          )}
                                        </div>
                                      </div>
                                      <div className="flex items-center justify-between text-[9px] font-bold text-slate-400 bg-white rounded-lg px-2.5 py-1.5 border border-slate-100">
                                        <span>Rate: {formatCurrency(item.rate)}</span>
                                        <span>GST: {item.gstRate}% ({formatCurrency(item.gst)})</span>
                                        <span className="font-black text-black">{formatCurrency(item.lineTotal)}</span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>

                              {/* Right Side: Calculation & Actions */}
                              <div className="w-full md:w-64 shrink-0 flex flex-col gap-3">
                                {/* Order Summary */}
                                <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 space-y-2 text-[10px] font-black uppercase">
                                  <div className="flex justify-between text-slate-500"><span>Subtotal</span><span>{formatCurrency(totalSub)}</span></div>
                                  <div className="flex justify-between text-slate-500"><span>Total GST</span><span>{formatCurrency(totalGst)}</span></div>
                                  {transportationCharge > 0 && <div className="flex justify-between text-slate-500"><span>Transportation</span><span>{formatCurrency(transportationCharge)}</span></div>}
                                  <div className="flex justify-between text-slate-500 border-b border-slate-200 pb-2"><span>Round Off</span><span>{formatCurrency(roundOff)}</span></div>
                                  <div className="flex justify-between text-[13px] pt-1 text-emerald-700"><span>Grand Total</span><span>{formatCurrency(roundedBill)}</span></div>
                                </div>

                                {/* Contact */}
                                {order.user_phone && (
                                  <div className="flex gap-2">
                                    <a href={`tel:${order.user_phone}`} className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-slate-100 rounded-xl text-[10px] font-black uppercase"><FiPhone size={14} /> Call</a>
                                    <a 
                                      href={`https://wa.me/91${order.user_phone.replace(/\D/g, "").slice(-10)}?text=${encodeURIComponent(getWhatsAppMessage(order.status))}`} 
                                      target="_blank" 
                                      rel="noopener noreferrer" 
                                      onClick={() => handleWaClick(order)}
                                      className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[10px] font-black uppercase transition-colors ${clickedWaOrders[`${order.id}_${order.status}`] ? "bg-green-100 text-green-700 border border-green-200 hover:bg-green-200" : "bg-red-100 text-red-700 border border-red-200 hover:bg-red-200"}`}
                                    >
                                      <FaWhatsapp size={14} /> WhatsApp
                                    </a>
                                  </div>
                                )}

                                {/* Actions */}
                                <div className="flex flex-col gap-2">
                                  <button onClick={() => handlePrint(order)} className="w-full py-3 bg-slate-100 rounded-xl text-[10px] font-black uppercase flex items-center justify-center gap-2 active:scale-95 transition-all"><FiPrinter size={14} /> Print Invoice</button>
                                  {!isFinal && (
                                    <div className={`grid ${profile?.role === 'central' ? 'grid-cols-2' : 'grid-cols-1'} gap-2`}>
                                      {profile?.role === 'central' && (
                                        <button onClick={() => acceptOrder(order.id)} disabled={isUpdating} className="w-full py-3 bg-emerald-50 text-emerald-600 rounded-xl text-[10px] font-black uppercase flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-50"><FiCheck size={14} /> Accept</button>
                                      )}
                                      <button onClick={() => rejectOrder(order.id)} disabled={isUpdating} className="w-full py-3 bg-rose-50 text-rose-600 rounded-xl text-[10px] font-black uppercase flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-50"><FiXCircle size={14} /> Reject</button>
                                    </div>
                                  )}
                                  {profile?.role === 'central' && (
                                      <button onClick={() => deleteOrder(order.id)} disabled={isUpdating} className="w-full py-2.5 mt-1 bg-red-100 text-red-700 rounded-xl text-[10px] font-black uppercase flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-50"><FiTrash2 size={14} /> Delete Request</button>
                                  )}
                                </div>

                                {isFinal && (
                                  <div className="flex flex-col gap-2">
                                    <div className={`p-3 rounded-xl text-center text-[10px] font-black uppercase ${order.status === "packed" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-red-50 text-red-600 border border-red-200"}`}>
                                      {order.status === "packed" ? "✅ Accepted" : "❌ Rejected"}
                                    </div>
                                    {(profile?.role === 'central' || profile?.role === 'stock') && (
                                      <button onClick={() => undoOrder(order.id)} disabled={isUpdating} className="w-full py-2.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-xl text-[10px] font-black uppercase flex items-center justify-center gap-2 active:scale-95 transition-all hover:bg-amber-100 disabled:opacity-50"><FiRotateCcw size={14} /> Undo to Received</button>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })()}
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