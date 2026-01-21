import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../supabase/supabaseClient";

/* 
 * HELPER: Parse Item Name (Shared Logic)
 * Separates generic name from metadata stored in suffix.
 */
const SEPARATOR = " |METADATA|";

const parseItemName = (fullName) => {
  if (!fullName || !fullName.includes(SEPARATOR)) {
    return {
      name: fullName,
      meta: { u: "kg", t: 0, gst: 0, sgst: 0 }
    };
  }
  const [name, metaStr] = fullName.split(SEPARATOR);
  try {
    const meta = JSON.parse(metaStr);
    return { name, meta };
  } catch (e) {
    return { name, meta: { u: "kg", t: 0, gst: 0, sgst: 0 } };
  }
};

const serializeItemName = (name, meta) => {
  return `${name}${SEPARATOR}${JSON.stringify(meta)}`;
};

function StockUpdate() {
  const [items, setItems] = useState([]);
  const [sortLowStock, setSortLowStock] = useState(false);
  const navigate = useNavigate();

  const fetchItems = async () => {
    const { data } = await supabase
      .from("stocks")
      .select("*")
      .order("created_at", { ascending: false });

    setItems(data || []);
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const updateItem = async (id, newQty, meta, originalName) => {
    // meta contains { u, t, gst, sgst }
    // We update 'quantity' directly.
    // We update 'item_name' to persist the changed metadata (e.g. Unit or Threshold).

    // Check Threshold for Alert (Optional Logic)
    if (Number(newQty) <= meta.t) {
      // Alert logic here
    }

    const fullName = serializeItemName(originalName, meta);

    await supabase
      .from("stocks")
      .update({
        quantity: Number(newQty),
        item_name: fullName, // Save metadata back to name
      })
      .eq("id", id);

    fetchItems();
  };

  // Filter / Sort Logic
  const sortedItems = [...items].sort((a, b) => {
    if (!sortLowStock) return 0; // Default order

    const { meta: metaA } = parseItemName(a.item_name);
    const { meta: metaB } = parseItemName(b.item_name);

    const isLowA = a.quantity <= metaA.t;
    const isLowB = b.quantity <= metaB.t;

    if (isLowA && !isLowB) return -1;
    if (!isLowA && isLowB) return 1;
    return 0;
  });

  return (
    <div className="min-h-screen bg-gray-50 p-6 md:p-10 font-sans">
      {/* HEADER */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate("/dashboard/stockmanager")}
            className="text-gray-500 hover:text-black transition flex items-center gap-2"
          >
            ← Back
          </button>
          <h1 className="text-2xl font-bold text-gray-900">
            Stock Management
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 bg-white px-3 py-2 rounded-lg border shadow-sm cursor-pointer select-none">
            <input
              type="checkbox"
              checked={sortLowStock}
              onChange={e => setSortLowStock(e.target.checked)}
              className="accent-red-600 w-4 h-4"
            />
            Show Low Stock First
          </label>
        </div>
      </div>

      {/* TABLE / CARDS CONTAINER */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">

        {/* DESKTOP TABLE */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="p-4 text-left font-semibold text-gray-500">Item</th>
                <th className="p-4 text-center font-semibold text-gray-500">Current Qty</th>
                <th className="p-4 text-center font-semibold text-gray-500">Threshold</th>
                <th className="p-4 text-center font-semibold text-gray-500">Unit</th>
                <th className="p-4 text-center font-semibold text-gray-500">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100">
              {sortedItems.map((item) => (
                <StockRow
                  key={item.id}
                  item={item}
                  onUpdate={updateItem}
                />
              ))}
            </tbody>
          </table>
        </div>

        {/* MOBILE CARD VIEW */}
        <div className="md:hidden p-4 space-y-4">
          {sortedItems.map((item) => (
            <StockCard
              key={item.id}
              item={item}
              onUpdate={updateItem}
            />
          ))}
        </div>

        {items.length === 0 && (
          <div className="p-10 text-center text-gray-400">
            No stock items found.
          </div>
        )}
      </div>
    </div>
  );
}

/* ROW */
function StockRow({ item, onUpdate }) {
  const [edit, setEdit] = useState(false);

  // Local state for editing
  const [qty, setQty] = useState(item.quantity);

  // Parse Name + Meta
  const { name, meta } = parseItemName(item.item_name);

  const [threshold, setThreshold] = useState(meta.t);
  const [unit, setUnit] = useState(meta.u);

  const isLowStock = item.quantity <= (meta.t || 0);

  // Standard Red logic as requested
  // "low stock should be of red in color not maroon color" -> bg-red-600
  const rowBg = isLowStock && !edit ? "bg-red-600 text-white" : "hover:bg-gray-50 text-gray-700";
  const inputBg = isLowStock && !edit ? "bg-white/10 border-white/20 text-white placeholder-white/50" : "bg-white border-gray-200 text-gray-900";

  return (
    <tr className={`transition-colors duration-200 ${rowBg}`}>
      <td className="p-4">
        <div className="font-semibold text-base">
          {name}
        </div>
        {isLowStock && !edit && (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-white text-red-600 uppercase tracking-wide mt-1 animate-pulse">
            Low Stock
          </span>
        )}
      </td>

      <td className="p-4 text-center">
        {edit ? (
          <input
            type="number"
            className="border-2 border-emerald-500 rounded-lg h-10 px-2 text-base font-bold w-24 text-center shadow-sm focus:outline-none"
            value={qty}
            onChange={(e) => setQty(e.target.value)}
            autoFocus
          />
        ) : (
          <span className={`font-bold text-lg ${isLowStock ? 'text-white' : 'text-emerald-700'}`}>
            {qty}
          </span>
        )}
      </td>

      <td className="p-4 text-center">
        {edit ? (
          <div className="relative inline-block w-24">
            <input
              type="number"
              className="border-2 border-blue-400 rounded-lg h-10 px-2 text-sm w-full text-center focus:outline-none"
              value={threshold}
              onChange={(e) => setThreshold(e.target.value)}
            />
          </div>
        ) : (
          <span className="opacity-80">≤ {threshold}</span>
        )}
      </td>

      <td className="p-4 text-center">
        {edit ? (
          <select
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            className="border-2 border-gray-300 rounded-lg h-10 px-2 text-sm focus:outline-none bg-white"
          >
            <option value="kg">kg</option>
            <option value="g">g</option>
            <option value="litre">litre</option>
            <option value="ml">ml</option>
            <option value="pcs">pcs</option>
          </select>
        ) : (
          <span className={`px-2 py-1 rounded text-xs font-medium ${isLowStock && !edit ? 'bg-white/20' : 'bg-gray-100 text-gray-600'}`}>
            {unit}
          </span>
        )}
      </td>

      <td className="p-4 flex justify-center gap-3">
        {edit ? (
          <button
            onClick={() => {
              // Update using new values
              // Preserve GST/SGST from original meta
              onUpdate(item.id, qty, { ...meta, t: threshold, u: unit }, name);
              setEdit(false);
            }}
            className="h-9 px-5 rounded-lg text-sm font-bold shadow-sm bg-emerald-600 text-white hover:bg-emerald-700 active:scale-[0.97] transition"
          >
            Save
          </button>
        ) : (
          <button
            onClick={() => setEdit(true)}
            className={`h-9 px-5 rounded-lg text-sm font-medium border transition ${isLowStock ? 'bg-white text-red-600 border-white hover:bg-gray-100' : 'bg-white border-gray-300 text-gray-700 hover:border-black'}`}
          >
            Update
          </button>
        )}
      </td>
    </tr>
  );
}


function StockCard({ item, onUpdate }) {
  const [edit, setEdit] = useState(false);
  const [qty, setQty] = useState(item.quantity);
  const { name, meta } = parseItemName(item.item_name);
  const [threshold, setThreshold] = useState(meta.t || 0);
  const [unit, setUnit] = useState(meta.u || 'pcs');

  const isLowStock = item.quantity <= (meta.t || 0);

  return (
    <div className={`border rounded-xl p-4 shadow-sm transition-all ${isLowStock ? 'border-red-200 bg-red-50' : 'border-gray-100 bg-white'}`}>
      <div className="flex justify-between items-start mb-3">
        <div>
          <h3 className={`font-bold text-lg ${isLowStock ? 'text-red-800' : 'text-gray-800'}`}>{name}</h3>
          {isLowStock && <span className="inline-block mt-1 px-2 py-0.5 bg-red-100 text-red-600 text-xs font-bold rounded uppercase tracking-wide">Low Stock</span>}
        </div>
        <div className="text-right">
          {edit ? (
            <div className="flex flex-col items-end gap-1">
              <input
                type="number"
                value={qty}
                onChange={(e) => setQty(e.target.value)}
                className="w-20 p-1 text-right border-2 border-emerald-500 rounded font-bold text-lg"
              />
              <span className="text-xs text-gray-400">qty</span>
            </div>
          ) : (
            <div className="flex flex-col items-end">
              <span className={`text-2xl font-black ${isLowStock ? 'text-red-600' : 'text-emerald-700'}`}>{qty}</span>
              <span className="text-xs font-medium text-gray-500 uppercase">{unit}</span>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <label className="text-[10px] uppercase font-bold text-gray-400 block mb-1">Threshold</label>
          {edit ? (
            <input
              type="number"
              value={threshold}
              onChange={(e) => setThreshold(e.target.value)}
              className="w-full p-2 border border-blue-300 rounded text-sm font-bold"
            />
          ) : (
            <span className="font-semibold text-gray-700">≤ {threshold}</span>
          )}
        </div>
        <div>
          <label className="text-[10px] uppercase font-bold text-gray-400 block mb-1">Unit</label>
          {edit ? (
            <select
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded text-sm bg-white"
            >
              <option value="kg">kg</option>
              <option value="g">g</option>
              <option value="litre">litre</option>
              <option value="ml">ml</option>
              <option value="pcs">pcs</option>
            </select>
          ) : (
            <span className="font-semibold text-gray-700 uppercase">{unit}</span>
          )}
        </div>
      </div>

      <div className="flex gap-2">
        {edit ? (
          <button
            onClick={() => {
              onUpdate(item.id, qty, { ...meta, t: threshold, u: unit }, name);
              setEdit(false);
            }}
            className="flex-1 py-2.5 bg-emerald-600 text-white rounded-lg font-bold shadow-sm active:scale-95 transition"
          >
            Save
          </button>
        ) : (
          <button
            onClick={() => setEdit(true)}
            className="flex-1 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-lg font-bold hover:bg-gray-50 transition"
          >
            Update
          </button>
        )}
      </div>
    </div>
  );
}

export default StockUpdate;
