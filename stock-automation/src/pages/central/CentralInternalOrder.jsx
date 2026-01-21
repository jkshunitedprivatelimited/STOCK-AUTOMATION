import { useEffect, useState } from "react";
import { supabase } from "../../supabase/supabaseClient";
import { useNavigate } from "react-router-dom";
import { ShoppingCart, Search, Minus, Plus, X, Package } from "lucide-react";

/* SHARED HELPER */
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

function CentralInternalOrder() {
    const navigate = useNavigate();

    const [stocks, setStocks] = useState([]);
    const [search, setSearch] = useState("");
    const [cart, setCart] = useState([]);
    const [loading, setLoading] = useState(false);

    const [isCartOpen, setIsCartOpen] = useState(false);
    const [showBill, setShowBill] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const [reason, setReason] = useState(""); // Internal Order Reason

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

        const itemStock = item.quantity; // Central Owner CAN SEE stock
        const factor = UNIT_MAP[item.meta_unit]?.factor || 1;
        const desiredTotal = inputQ * factor;

        const existing = cart.find(c => c.id === item.id);
        const currentCartQty = existing ? existing.qty : 0;

        // Check stock availability
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
        if (!reason.trim()) {
            alert("Please provide a reason for this internal order.");
            return;
        }

        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();

        // Create Invoice with REASON in address field
        const { data: invoice, error } = await supabase
            .from("invoices")
            .insert([{
                total_amount: totalAmount,
                created_by: user.id,
                customer_name: "INTERNAL ORDER",
                customer_address: `Reason: ${reason}`, // Storing reason here
                status: 'dispatched' // Auto-dispatch internal orders? Or pending? Let's keep default or pending. 
                // Actually, for internal use, maybe auto-approve? Let's stick to default flow but labelled INTERNAL.
            }])
            .select()
            .single();

        if (error) {
            alert("Order failed: " + error.message);
            setLoading(false);
            return;
        }

        const invoiceItems = cart.map(item => ({
            invoice_id: invoice.id,
            stock_id: item.id,
            item_name: item.item_name,
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

        // Fallback
        await Promise.all(cart.map(item =>
            supabase.from('stocks').update({ quantity: item.quantity - item.qty }).eq('id', item.id)
        ));

        setCart([]);
        setShowBill(false);
        setIsCartOpen(false);
        setReason("");
        setShowSuccess(true);
        fetchStocks();
        setLoading(false);
    };

    const filtered = stocks.filter(s => s.display_name.toLowerCase().includes(search.toLowerCase()));

    return (
        <div className="min-h-screen bg-indigo-50 font-sans pb-20">

            {/* HEADER */}
            <div className="fixed top-0 left-0 right-0 bg-white shadow-sm z-30 px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-full transition">←</button>
                    <h1 className="text-xl font-bold text-indigo-900">Internal Order</h1>
                    <span className="bg-indigo-100 text-indigo-700 text-xs px-2 py-1 rounded-md font-bold uppercase">Central Office</span>
                </div>

                <button
                    onClick={() => setIsCartOpen(true)}
                    className="relative flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-full font-bold shadow-indigo-200 shadow-lg hover:shadow-xl hover:bg-indigo-700 transition"
                >
                    <ShoppingCart size={20} />
                    <span className="hidden sm:inline">Cart</span>
                    {cart.length > 0 && (
                        <span className="bg-white text-indigo-700 text-xs w-6 h-6 flex items-center justify-center rounded-full font-extrabold shadow-sm">
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
                        placeholder="Search internal inventory..."
                        className="w-full pl-12 pr-4 py-4 rounded-xl border-none shadow-sm bg-white text-gray-700 placeholder-gray-400 focus:ring-2 focus:ring-indigo-500/20 text-lg outline-none"
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
                                    <span className="bg-indigo-50 text-indigo-700 text-xs font-bold px-2 py-1 rounded-md uppercase tracking-wider">
                                        {item.meta_unit}
                                    </span>
                                </div>

                                {/* SHOW AVAILABLE STOCK FOR CENTRAL OWNER */}
                                <div className="flex items-center gap-2 mb-4">
                                    <Package size={14} className="text-gray-400" />
                                    <span className="text-sm font-bold text-gray-600">Available: {item.quantity}</span>
                                </div>

                                <div className="text-2xl font-extrabold text-gray-900 mb-6">
                                    ₹{item.price} <span className="text-xs font-medium text-gray-400">/unit</span>
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
                                        className="w-full bg-gray-50 border border-gray-200 text-center rounded-xl h-12 font-bold text-gray-700 focus:bg-white focus:border-indigo-500 transition outline-none placeholder:text-gray-300"
                                    />
                                </div>

                                <button
                                    onClick={() => addToCart(item)}
                                    className="bg-indigo-600 hover:bg-indigo-700 text-white w-12 h-12 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-600/20 transition active:scale-95"
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
                            <h2 className="text-2xl font-extrabold text-indigo-900">Internal Cart</h2>
                            <button onClick={() => setIsCartOpen(false)} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200"><X size={20} /></button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 space-y-6">
                            {cart.map((item) => (
                                <div key={item.id} className="flex gap-4 items-center">
                                    <div className="flex-1">
                                        <h4 className="font-bold text-gray-800">{item.display_name}</h4>
                                        <p className="text-sm text-gray-500">Available: {item.quantity}</p>
                                    </div>
                                    <div className="flex items-center gap-3 bg-gray-50 rounded-lg p-1">
                                        <button onClick={() => updateCartQty(item.id, -1)} className="w-8 h-8 flex items-center justify-center bg-white shadow-sm rounded-md text-gray-600 hover:text-red-500">
                                            <Minus size={14} strokeWidth={3} />
                                        </button>
                                        <span className="font-bold text-sm min-w-[20px] text-center">{item.qty}</span>
                                        <button onClick={() => updateCartQty(item.id, 1)} className="w-8 h-8 flex items-center justify-center bg-white shadow-sm rounded-md text-indigo-600 hover:bg-indigo-50">
                                            <Plus size={14} strokeWidth={3} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {cart.length > 0 && (
                            <div className="p-6 bg-gray-50 border-t">
                                <div className="flex justify-between items-center mb-6">
                                    <span className="text-gray-500 font-medium">Internal Total</span>
                                    <span className="text-3xl font-extrabold text-indigo-900">₹{totalAmount.toLocaleString()}</span>
                                </div>
                                <button
                                    onClick={() => setShowBill(true)}
                                    className="w-full py-4 bg-indigo-900 text-white rounded-xl font-bold text-lg hover:bg-indigo-800 transition shadow-xl"
                                >
                                    Proceed
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* CONFIRMATION / REASON MODAL */}
            {showBill && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-indigo-900/40 backdrop-blur-sm"></div>
                    <div className="relative bg-white w-full max-w-lg rounded-3xl p-8 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                        <h2 className="text-2xl font-bold text-center mb-6 text-indigo-900">Order Reason</h2>

                        <div className="mb-6">
                            <label className="block text-sm font-bold text-gray-500 mb-2 uppercase tracking-wider">Reason / Comment</label>
                            <textarea
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                placeholder="e.g., Office Testing, Staff Consumption, Quality Check..."
                                className="w-full p-4 bg-gray-50 rounded-xl border border-gray-200 h-32 outline-none focus:ring-2 focus:ring-indigo-500/20 font-medium resize-none"
                            />
                        </div>

                        <div className="bg-indigo-50 rounded-xl p-4 mb-8 flex justify-between items-center">
                            <span className="font-bold text-indigo-800">Total Value</span>
                            <span className="font-black text-2xl text-indigo-900">₹{totalAmount.toLocaleString()}</span>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <button onClick={() => setShowBill(false)} className="py-3 rounded-xl border-2 border-gray-100 font-bold text-gray-600 hover:bg-gray-50 transition">Cancel</button>
                            <button onClick={handlePlaceOrder} className="py-3 rounded-xl bg-indigo-600 text-white font-bold shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition" disabled={loading}>
                                {loading ? "Processing..." : "Confirm Internal Order"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showSuccess && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-white/95 backdrop-blur-md"></div>
                    <div className="relative text-center animate-in zoom-in-50 duration-300">
                        <div className="w-24 h-24 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-6">
                            <CheckCircle2 className="w-12 h-12 text-indigo-600" />
                        </div>
                        <h2 className="text-3xl font-black text-indigo-900 mb-2">Internal Order Placed!</h2>
                        <button onClick={() => { setShowSuccess(false); setCart([]); }} className="px-8 py-3 bg-indigo-900 text-white rounded-full font-bold shadow-xl hover:scale-105 transition">Done</button>
                    </div>
                </div>
            )}
        </div>
    );
}

import { CheckCircle2 } from "lucide-react";

export default CentralInternalOrder;
