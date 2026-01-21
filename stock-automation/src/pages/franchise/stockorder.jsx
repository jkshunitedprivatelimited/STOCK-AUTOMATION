import { useEffect, useState } from "react";
import { supabase } from "../../supabase/supabaseClient";
import { useNavigate } from "react-router-dom";
import { ShoppingCart, Search, Minus, Plus, X } from "lucide-react";

/* 
 * SHARED HELPER
 */
const SEPARATOR = " |METADATA|";
const parseItemName = (fullName) => {
  if (!fullName || !fullName.includes(SEPARATOR)) {
    return { name: fullName, meta: { u: "pcs", t: 0, gst: 0, sgst: 0 } };
  }
  const [name, metaStr] = fullName.split(SEPARATOR);
  try {
    const meta = JSON.parse(metaStr);
    return { name, meta };
  } catch (e) {
    return { name, meta: { u: "pcs", t: 0, gst: 0, sgst: 0 } };
  }
};

const UNIT_MAP = {
  g: { base: "kg", factor: 0.001 },
  kg: { base: "kg", factor: 1 },
  ml: { base: "litre", factor: 0.001 },
  litre: { base: "litre", factor: 1 },
  pcs: { base: "pcs", factor: 1 },
};

function StockOrder() {
  const navigate = useNavigate();

  const [stocks, setStocks] = useState([]);
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(false);

  const [isCartOpen, setIsCartOpen] = useState(false);
  const [showBill, setShowBill] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const [localQty, setLocalQty] = useState({});

  useEffect(() => {
    fetchStocks();
  }, []);

  const fetchStocks = async () => {
    const { data } = await supabase
      .from("stocks")
      .select("*")
      .order("created_at", { ascending: false });

    const parsedData = (data || []).map(item => {
      const { name, meta } = parseItemName(item.item_name);
      return {
        ...item,
        display_name: name,
        meta_unit: meta.u || item.unit || 'pcs',
        meta_gst: Number(meta.gst) || 0,
        meta_sgst: Number(meta.sgst) || 0
      };
    });

    setStocks(parsedData);
  };

  /* CART LOGIC */
  const addToCart = (item) => {
    const inputQ = localQty[item.id] || 0;
    if (inputQ <= 0) return;

    const itemStock = item.quantity;
    const factor = UNIT_MAP[item.meta_unit]?.factor || 1;
    const desiredTotal = inputQ * factor;

    const existing = cart.find(c => c.id === item.id);
    const currentCartQty = existing ? existing.qty : 0;

    if (desiredTotal + currentCartQty > itemStock) {
      alert(`Insufficient stock. Available: ${itemStock} ${item.meta_unit}`);
      return;
    }

    if (existing) {
      setCart(cart.map(c => c.id === item.id ? { ...c, qty: c.qty + desiredTotal } : c));
    } else {
      setCart([...cart, { ...item, qty: desiredTotal }]);
    }

    setLocalQty({ ...localQty, [item.id]: 0 });
  };

  const updateCartQty = (id, delta) => {
    setCart(prev => prev.map(item => {
      if (item.id !== id) return item;

      const factor = UNIT_MAP[item.meta_unit]?.factor || 1;
      const newQty = item.qty + (delta * factor);

      if (newQty <= 0) return null;

      if (newQty > item.quantity) {
        alert(`Max stock reached (${item.quantity} ${item.meta_unit})`);
        return item;
      }

      return { ...item, qty: newQty };
    }).filter(Boolean));
  };

  // CALCULATION (Base + Tax)
  const calculateTotal = (items) => {
    return items.reduce((sum, item) => {
      const basePrice = item.price * item.qty;
      const taxRate = item.meta_gst + item.meta_sgst;
      const taxAmount = basePrice * (taxRate / 100);
      return sum + basePrice + taxAmount;
    }, 0);
  };

  const totalAmount = calculateTotal(cart);

  /* BILL & CHECKOUT */
  const handlePlaceOrder = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();

    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    const { data: invoice, error } = await supabase
      .from("invoices")
      .insert([{
        total_amount: totalAmount,
        created_by: user.id,
        customer_name: profile.name,
        customer_address: profile.address,
      }])
      .select()
      .single();

    if (error) {
      alert("Order failed: " + error.message);
      setLoading(false);
      return;
    }

    // Save RAW item_name to preserve tax metadata
    const invoiceItems = cart.map(item => ({
      invoice_id: invoice.id,
      stock_id: item.id,
      item_name: item.item_name, // RAW NAME
      quantity: item.qty,
      unit: item.meta_unit,
      price: item.price
    }));

    await supabase.from("invoice_items").insert(invoiceItems);

    for (const item of cart) {
      await supabase.rpc('decrement_stock', {
        row_id: item.id,
        amount: item.qty
      });
    }

    // Fallback if RPC missing
    await Promise.all(cart.map(item =>
      supabase.from('stocks').update({ quantity: item.quantity - item.qty }).eq('id', item.id)
    ));

    setCart([]);
    setShowBill(false);
    setIsCartOpen(false);
    setShowSuccess(true);
    fetchStocks();
    setLoading(false);
  };

  const filtered = stocks.filter(s => s.display_name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="min-h-screen bg-gray-50 font-sans pb-20">

      {/* HEADER */}
      <div className="fixed top-0 left-0 right-0 bg-white shadow-sm z-30 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-full transition">←</button>
          <h1 className="text-xl font-bold text-gray-800">New Stock Order</h1>
        </div>

        <button
          onClick={() => setIsCartOpen(true)}
          className="relative flex items-center gap-2 bg-emerald-600 text-white px-5 py-2.5 rounded-full font-bold shadow-emerald-200 shadow-lg hover:shadow-xl hover:bg-emerald-700 transition"
        >
          <ShoppingCart size={20} />
          <span className="hidden sm:inline">View Cart</span>
          {cart.length > 0 && (
            <span className="bg-white text-emerald-700 text-xs w-6 h-6 flex items-center justify-center rounded-full font-extrabold shadow-sm">
              {cart.length}
            </span>
          )}
        </button>
      </div>

      <div className="mt-24 px-6 max-w-7xl mx-auto mb-8">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search inventory..."
            className="w-full pl-12 pr-4 py-4 rounded-xl border-none shadow-sm bg-white text-gray-700 placeholder-gray-400 focus:ring-2 focus:ring-emerald-500/20 text-lg outline-none"
          />
        </div>
      </div>

      <div className="px-6 max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filtered.map(item => {
          const val = localQty[item.id] === undefined ? "" : localQty[item.id];

          return (
            <div key={item.id} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-bold text-gray-800 text-lg leading-tight">{item.display_name}</h3>
                  <span className="bg-emerald-50 text-emerald-700 text-xs font-bold px-2 py-1 rounded-md uppercase tracking-wider">
                    {item.meta_unit}
                  </span>
                </div>

                {/* HIGHLIGHT: STOCK HIDDEN */}

                <div className="text-2xl font-extrabold text-gray-900 mb-6">
                  ₹{item.price} <span className="text-xs font-medium text-gray-400">/unit</span>
                  <div className="text-[10px] font-normal text-gray-400 mt-1">
                    + {item.meta_gst + item.meta_sgst}% Tax
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="relative flex-1">
                  <input
                    type="number"
                    placeholder="0"
                    value={val}
                    onChange={e => {
                      const v = e.target.value;
                      setLocalQty({ ...localQty, [item.id]: v === "" ? "" : Number(v) });
                    }}
                    className="w-full bg-gray-50 border border-gray-200 text-center rounded-xl h-12 font-bold text-gray-700 focus:bg-white focus:border-emerald-500 transition outline-none placeholder:text-gray-300"
                  />
                </div>

                <button
                  onClick={() => addToCart(item)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white w-12 h-12 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-600/20 transition active:scale-95"
                >
                  <Plus size={24} strokeWidth={3} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* CART MODAL */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={() => setIsCartOpen(false)}></div>
          <div className="relative bg-white w-full max-w-md h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
            <div className="p-6 border-b flex items-center justify-between">
              <h2 className="text-2xl font-extrabold text-gray-900">Your Cart</h2>
              <button onClick={() => setIsCartOpen(false)} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200"><X size={20} /></button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {cart.map((item) => (
                <div key={item.id} className="flex gap-4 items-center">
                  <div className="flex-1">
                    <h4 className="font-bold text-gray-800">{item.display_name}</h4>
                    <p className="text-sm text-gray-500">₹{item.price} × {item.qty} {item.meta_unit}</p>
                  </div>
                  <div className="flex items-center gap-3 bg-gray-50 rounded-lg p-1">
                    <button onClick={() => updateCartQty(item.id, -1)} className="w-8 h-8 flex items-center justify-center bg-white shadow-sm rounded-md text-gray-600 hover:text-red-500">
                      <Minus size={14} strokeWidth={3} />
                    </button>
                    <span className="font-bold text-sm min-w-[20px] text-center">{item.qty}</span>
                    <button onClick={() => updateCartQty(item.id, 1)} className="w-8 h-8 flex items-center justify-center bg-white shadow-sm rounded-md text-emerald-600 hover:bg-emerald-50">
                      <Plus size={14} strokeWidth={3} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {cart.length > 0 && (
              <div className="p-6 bg-gray-50 border-t">
                <div className="flex justify-between items-center mb-6">
                  <span className="text-gray-500 font-medium">Total (Inc. Tax)</span>
                  <span className="text-3xl font-extrabold text-gray-900">₹{totalAmount.toLocaleString()}</span>
                </div>
                <button
                  onClick={() => setShowBill(true)}
                  className="w-full py-4 bg-black text-white rounded-xl font-bold text-lg hover:bg-gray-900 transition shadow-xl"
                >
                  Proceed to Checkout
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* BILL SUMMARY MODAL */}
      {showBill && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm"></div>
          <div className="relative bg-white w-full max-w-2xl rounded-3xl p-8 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <h2 className="text-2xl font-bold text-center mb-1">Bill Summary</h2>

            <div className="bg-gray-50 rounded-xl p-4 mb-6 max-h-[50vh] overflow-y-auto mt-6">
              {/* DESKTOP TABLE */}
              <table className="w-full text-sm hidden md:table">
                <thead>
                  <tr className="text-left text-gray-400 border-b border-gray-200">
                    <th className="pb-2 font-medium">Item</th>
                    <th className="pb-2 text-center">Qty</th>
                    <th className="pb-2 text-right">Base</th>
                    <th className="pb-2 text-right">Tax (G+S)</th>
                    <th className="pb-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {cart.map((item, i) => {
                    const base = item.price * item.qty;
                    const tax = base * ((item.meta_gst + item.meta_sgst) / 100);
                    return (
                      <tr key={i}>
                        <td className="py-3 font-medium text-gray-800">{item.display_name}</td>
                        <td className="py-3 text-center text-gray-500">{item.qty} {item.meta_unit}</td>
                        <td className="py-3 text-right">₹{base.toFixed(2)}</td>
                        <td className="py-3 text-right text-gray-500">₹{tax.toFixed(2)}</td>
                        <td className="py-3 text-right font-bold">₹{(base + tax).toFixed(2)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* MOBILE LIST VIEW */}
              <div className="md:hidden space-y-4">
                {cart.map((item, i) => {
                  const base = item.price * item.qty;
                  const tax = base * ((item.meta_gst + item.meta_sgst) / 100);
                  return (
                    <div key={i} className="flex flex-col gap-1 border-b border-gray-200 pb-3 last:border-0 last:pb-0">
                      <div className="flex justify-between items-start">
                        <span className="font-bold text-gray-800">{item.display_name}</span>
                        <span className="font-bold text-gray-900">₹{(base + tax).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-xs text-gray-500">
                        <span>{item.qty} {item.meta_unit} × ₹{item.price}</span>
                        <span>Tax: ₹{tax.toFixed(2)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-between items-center mb-8 pt-4 border-t border-dashed">
              <span className="font-bold text-gray-600">Grand Total</span>
              <span className="text-2xl font-black text-emerald-600">₹{totalAmount.toLocaleString()}</span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <button onClick={() => setShowBill(false)} className="py-3 rounded-xl border-2 border-gray-100 font-bold text-gray-600 hover:bg-gray-50 transition">Back to Cart</button>
              <button onClick={handlePlaceOrder} className="py-3 rounded-xl bg-emerald-600 text-white font-bold shadow-lg shadow-emerald-200 hover:bg-emerald-700 transition" disabled={loading}>
                {loading ? "Processing..." : "Confirm & Pay"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showSuccess && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-white/90 backdrop-blur-md"></div>
          <div className="relative text-center animate-in zoom-in-50 duration-300">
            <div className="w-24 h-24 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-12 h-12 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
            </div>
            <h2 className="text-3xl font-black text-gray-900 mb-2">Order Confirmed!</h2>
            <p className="text-gray-500 mb-8 max-w-xs mx-auto">Your stock request has been sent to the Central Warehouse.</p>
            <button onClick={() => { setShowSuccess(false); setCart([]); }} className="px-8 py-3 bg-black text-white rounded-full font-bold shadow-xl hover:scale-105 transition">Continue Ordering</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default StockOrder;
