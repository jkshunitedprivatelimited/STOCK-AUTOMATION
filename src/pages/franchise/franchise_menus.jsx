import React, { useState, useEffect } from "react";
import { supabase, fetchWithRetry } from "../../frontend_supabase/supabaseClient";
import {
  ArrowLeft, Plus, Trash2, Edit2,
  Search, Calendar, X, Filter, ChevronDown, ChevronUp, CheckCircle, XCircle, MoreVertical, RefreshCw, Layers, Trash, RotateCcw
} from "lucide-react";
import { useNavigate } from "react-router-dom";

function FranchiseMenu() {
  const navigate = useNavigate();
  const brandGreen = "rgb(0, 100, 55)";

  // State
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [franchiseId, setFranchiseId] = useState("Loading...");

  // Track which item is expanded on mobile
  const [expandedId, setExpandedId] = useState(null);

  // Initialize category from Session Storage or default to ALL
  const [selectedCategory, setSelectedCategory] = useState(() => {
    return sessionStorage.getItem("franchise_menu_category") || "ALL";
  });

  const [selectedItems, setSelectedItems] = useState([]);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    item_name: "",
    price: "",
    category: "GENERAL",
    is_active: true
  });

  // Custom Confirm/Prompt Modal State (replaces window.confirm/window.prompt)
  const [confirmState, setConfirmState] = useState({ open: false, message: "", onConfirm: null });
  const [promptState, setPromptState] = useState({ open: false, message: "", defaultValue: "", onSubmit: null });
  const [promptValue, setPromptValue] = useState("");

  const showConfirm = (message) => new Promise((resolve) => {
    setConfirmState({ open: true, message, onConfirm: resolve });
  });
  const showPrompt = (message, defaultValue = "") => new Promise((resolve) => {
    setPromptValue(defaultValue);
    setPromptState({ open: true, message, defaultValue, onSubmit: resolve });
  });

  // Derived & Sorted Categories
  const dynamicCategories = ["ALL", ...[...new Set(menuItems.map(item => item.category.toUpperCase()))].sort()];

  // Filter Logic
  const filteredItems = menuItems.filter(item => {
    const matchesSearch = item.item_name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === "ALL" || item.category.toUpperCase() === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // --- Effects ---

  useEffect(() => {
    fetchMenu();
  }, []);

  useEffect(() => {
    sessionStorage.setItem("franchise_menu_category", selectedCategory);
    setSelectedItems([]); // Clear selections when category changes
  }, [selectedCategory]);

  // --- Handlers ---

  const fetchMenu = async () => {
    setLoading(true);
    console.log("[fetchMenu] Starting fetch...");
    try {
      const { data: { user } } = await supabase.auth.getUser();
      console.log("[fetchMenu] Auth User ID:", user?.id);
      
      const { data: profile, error: profileError } = await supabase.from("profiles").select("franchise_id").eq("id", user.id).single();
      if (profileError) console.error("[fetchMenu] Profile fetch error:", profileError);
      console.log("[fetchMenu] Profile found:", profile);

      if (profile?.franchise_id) {
        setFranchiseId(profile.franchise_id);
        const { data, error } = await supabase
          .from("menus")
          .select("*")
          .eq("franchise_id", profile.franchise_id)
          .order("created_at", { ascending: false });

        if (error) {
          console.error("[fetchMenu] Menu fetch error:", error);
          throw error;
        }
        console.log("[fetchMenu] Menu items fetched:", data?.length || 0);
        setMenuItems(data || []);
      } else {
        console.warn("[fetchMenu] No franchise_id found in profile.");
      }
    } catch (err) {
      console.error("[fetchMenu] Catch block error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (item = null) => {
    if (item) {
      setEditingId(item.id);
      setFormData({
        item_name: item.item_name,
        price: item.price,
        category: item.category,
        is_active: item.is_active
      });
    } else {
      setEditingId(null);
      setFormData({ item_name: "", price: "", category: "GENERAL", is_active: true });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log("[handleSubmit] Starting submission. editingId:", editingId);
    try {
      const payload = {
        item_name: formData.item_name,
        price: parseFloat(formData.price),
        category: formData.category.toUpperCase().trim(),
        is_active: formData.is_active,
        franchise_id: franchiseId
      };
      console.log("[handleSubmit] Payload:", payload);

      if (editingId) {
        const { data, error } = await fetchWithRetry(() => 
          supabase.from("menus").update(payload).eq("id", editingId).select()
        );
        console.log("[handleSubmit] Update response - Data:", data, "Error:", error);
        if (error) throw error;
        if (!data || data.length === 0) {
          alert("Update failed: Action blocked by RLS policies. Your role may not have permission to update this item.");
        }
      } else {
        const { data, error } = await fetchWithRetry(() => 
          supabase.from("menus").insert([payload]).select()
        );
        console.log("[handleSubmit] Insert response - Data:", data, "Error:", error);
        if (error) throw error;
        if (!data || data.length === 0) {
          alert("Insert failed: Action blocked by RLS policies. Your role may not have permission to create items.");
        }
      }

      setIsModalOpen(false);
      fetchMenu();
    } catch (err) {
      console.error("[handleSubmit] Catch block error:", err);
      alert("Error saving: " + err.message);
    }
  };

  const handleDelete = async (id) => {
    console.log("[handleDelete] Attempting to delete item ID:", id);
    const shouldConfirm = await showConfirm("Are you sure you want to delete this item? This cannot be undone.");
    console.log("[handleDelete] User confirmed:", shouldConfirm);
    
    if (!shouldConfirm) return;

    try {
      console.log("[handleDelete] Calling supabase.delete()...");
      const { data, error, status, statusText } = await supabase
        .from("menus")
        .delete()
        .eq("id", id)
        .select();

      console.log("[handleDelete] Response - status:", status, statusText, "Data:", data, "Error:", error);

      if (error) {
        console.error("[handleDelete] Supabase Error:", error);
        alert("Error deleting item: " + (error.message || JSON.stringify(error)));
        return;
      }
      
      if (!data || data.length === 0) {
        console.warn("[handleDelete] Delete returned no data. status:", status);
        alert("Delete failed: The server returned no data. This usually means a Row Level Security (RLS) policy is blocking the delete. Check Supabase RLS policies for the 'menus' table.");
        return;
      }

      console.log("[handleDelete] Successfully deleted:", data);
      setMenuItems(prev => prev.filter(item => item.id !== id));
    } catch (err) {
      console.error("[handleDelete] Unexpected error:", err);
      alert("Unexpected error deleting item: " + (err?.message || String(err)));
    }
  };

  const handleDeleteCategory = async () => {
    console.log("[handleDeleteCategory] Clicked. franchiseId:", franchiseId, "selectedCategory:", selectedCategory);
    if (!franchiseId || selectedCategory === "ALL") {
      console.warn("[handleDeleteCategory] Early return: missing franchiseId or ALL selected.");
      return;
    }
    const confirmed = await showConfirm(`Are you sure you want to delete all items in category "${selectedCategory}"? This cannot be undone.`);
    if (!confirmed) return;

    try {
      const searchCat = selectedCategory.trim().toUpperCase();
      const itemsToDelete = menuItems.filter(item => 
        (item.category || "").trim().toUpperCase() === searchCat
      );
      const itemIds = itemsToDelete.map(item => item.id);
      console.log(`[handleDeleteCategory] Deleting category "${selectedCategory}". Matching items:`, itemsToDelete.length, "IDs:", itemIds);
      
      if (itemIds.length === 0) {
        alert(`No items matched the category "${selectedCategory}".`);
        console.warn(`[handleDeleteCategory] No items found for category: ${selectedCategory}`);
        return;
      }

      const { data, error, status } = await supabase
        .from("menus")
        .delete()
        .in("id", itemIds)
        .select();

      console.log("[handleDeleteCategory] Response - status:", status, "Data:", data, "Error:", error);

      if (error) {
        console.error("[handleDeleteCategory] Supabase Error:", error);
        alert("Error deleting category: " + (error.message || JSON.stringify(error)));
        return;
      }
      
      if (!data || data.length === 0) {
        alert("Delete failed: Blocked by RLS. Check Supabase RLS policies for DELETE on the 'menus' table.");
        return;
      }

      console.log("[handleDeleteCategory] Successfully deleted items:", data.length);
      alert(`Success! Deleted ${data.length} items in category "${selectedCategory}".`);
      setSelectedCategory("ALL");
      fetchMenu();
    } catch (err) {
      console.error("[handleDeleteCategory] Catch block error:", err);
      alert("Unexpected error deleting category: " + (err?.message || String(err)));
    }
  };

  const handleDeleteWholeMenu = async () => {
    console.log("[handleDeleteWholeMenu] Clicked. franchiseId:", franchiseId);
    if (!franchiseId || franchiseId === "Loading...") {
      console.warn("[handleDeleteWholeMenu] Early return: franchiseId is missing or loading.");
      return;
    }
    const confirmed = await showConfirm("Are you sure you want to delete the ENTIRE menu? This action cannot be undone and will remove all items.");
    if (!confirmed) return;

    try {
      const { data, error, status } = await supabase
        .from("menus")
        .delete()
        .eq("franchise_id", franchiseId)
        .select();

      console.log("[handleDeleteWholeMenu] Response - status:", status, "Data:", data, "Error:", error);

      if (error) {
        console.error("[handleDeleteWholeMenu] Error:", error);
        alert("Error deleting whole menu: " + (error.message || JSON.stringify(error)));
        return;
      }
      
      if (!data || data.length === 0) {
        alert("Delete failed: Blocked by RLS. Check Supabase RLS policies for DELETE on the 'menus' table.");
        return;
      }

      alert(`Successfully deleted ${data.length} menu items.`);
      setSelectedCategory("ALL");
      setSelectedItems([]);
      fetchMenu();
    } catch (err) {
      console.error("[handleDeleteWholeMenu] Catch block error:", err);
      alert("Error deleting whole menu: " + (err?.message || String(err)));
    }
  };

  const handleRenameCategory = async () => {
    console.log("[handleRenameCategory] Clicked. franchiseId:", franchiseId, "selectedCategory:", selectedCategory);
    if (!franchiseId || selectedCategory === "ALL") {
      console.warn("[handleRenameCategory] Early return: missing franchiseId or ALL selected.");
      return;
    }
    const newName = await showPrompt(`Enter new name for category "${selectedCategory}":`, selectedCategory);
    if (!newName || newName.trim() === "" || newName.trim().toUpperCase() === selectedCategory?.trim().toUpperCase()) return;

    const finalName = newName.trim().toUpperCase();
    try {
      const itemsToRename = menuItems.filter(item => 
        (item.category || "").trim().toUpperCase() === selectedCategory.trim().toUpperCase()
      );
      const itemIds = itemsToRename.map(item => item.id);
      console.log(`[handleRenameCategory] Renaming from "${selectedCategory}" to "${finalName}". Items found:`, itemsToRename.length);
      
      if (itemIds.length === 0) {
        alert(`No items found in category "${selectedCategory}" to rename.`);
        console.warn(`[handleRenameCategory] No items found for category: ${selectedCategory}`);
        return;
      }

      const { data, error, status } = await supabase
        .from("menus")
        .update({ category: finalName })
        .in("id", itemIds)
        .select();

      console.log("[handleRenameCategory] Response - status:", status, "Data:", data, "Error:", error);

      if (error) {
        console.error("[handleRenameCategory] Supabase Error:", error);
        alert("Error renaming category: " + (error.message || JSON.stringify(error)));
        return;
      }
      
      if (!data || data.length === 0) {
        alert("Rename failed: Blocked by RLS. Check Supabase RLS policies for UPDATE on the 'menus' table.");
        return;
      }

      alert(`Success! Renamed ${data.length} items from "${selectedCategory}" to "${finalName}".`);
      setSelectedCategory(finalName);
      fetchMenu();
    } catch (err) {
      console.error("[handleRenameCategory] Catch block error:", err);
      alert("Unexpected error renaming category: " + (err?.message || String(err)));
    }
  };

  const handleDeleteSelectedItems = async () => {
    if (selectedItems.length === 0) return;
    console.log("[handleDeleteSelectedItems] IDs to delete:", selectedItems);
    const confirmed = await showConfirm(`Are you sure you want to delete ${selectedItems.length} selected items? This cannot be undone.`);
    if (!confirmed) return;

    try {
      const { data, error, status } = await supabase
        .from("menus")
        .delete()
        .in("id", selectedItems)
        .select();

      console.log("[handleDeleteSelectedItems] Response - status:", status, "Data:", data, "Error:", error);

      if (error) {
        console.error("[handleDeleteSelectedItems] Supabase Error:", error);
        alert("Error deleting selected items: " + (error.message || JSON.stringify(error)));
        return;
      }
      
      if (!data || data.length === 0) {
        alert("Delete failed: Blocked by RLS. Check Supabase RLS policies for DELETE on the 'menus' table.");
        return;
      }

      alert(`Successfully deleted ${data.length} items.`);
      setSelectedItems([]);
      fetchMenu();
    } catch (err) {
      console.error("[handleDeleteSelectedItems] Catch block error:", err);
      alert("Error deleting selected items: " + (err?.message || String(err)));
    }
  };
  
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedItems(filteredItems.map(item => item.id));
    } else {
      setSelectedItems([]);
    }
  };

  const handleSelectItem = (id) => {
    setSelectedItems(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  // Toggle function for mobile expansion
  const toggleItem = (id) => {
    if (expandedId === id) {
      setExpandedId(null); // Collapse if already open
    } else {
      setExpandedId(id); // Expand clicked item
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 text-black font-sans pb-10">

      {/* --- NEW HEADER INTEGRATED FROM SETTINGS PAGE --- */}
      <header style={styles.header}>
        <div style={styles.headerInner}>
          <button onClick={() => navigate(-1)} style={styles.backBtn}>
            <ArrowLeft size={18} /> <span>Back</span>
          </button>

          <h1 style={styles.heading}>
            Manage <span style={{ color: brandGreen }}>Menu</span>
          </h1>

          <div style={styles.idBox}>
            ID : {franchiseId || "---"}
          </div>
        </div>
      </header>

      {/* --- MAIN CONTENT WITH PADDING --- */}
      <main className="max-w-[1600px] mx-auto px-4 md:px-8 space-y-4 md:space-y-6">

        {/* --- CONTROLS --- */}
        <div className="flex flex-col md:flex-row gap-3 md:gap-4 items-stretch">
          <div className="flex-1 relative group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Search className="text-black group-focus-within:text-emerald-600 transition-colors" size={18} />
            </div>
            <input
              type="text"
              placeholder="Search items..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-12 md:h-14 pl-10 md:pl-12 pr-4 bg-white border border-black/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600 transition-all font-medium text-black shadow-sm placeholder:text-black/40 uppercase tracking-wide text-sm md:text-base"
            />
          </div>

          <div className="hidden md:flex items-center gap-3 bg-white border border-black/10 px-6 rounded-xl shadow-sm min-w-fit">
            <Calendar className="text-black" size={20} />
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-black uppercase tracking-widest">Today</span>
              <span className="font-bold text-black text-sm">
                {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
              </span>
            </div>
          </div>

          <button
            onClick={() => handleOpenModal()}
            className="h-12 md:h-14 px-6 md:px-8 rounded-xl text-white font-bold uppercase tracking-widest text-[10px] md:text-xs shadow-md hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center justify-center gap-2"
            style={{ backgroundColor: brandGreen }}
          >
            <Plus size={18} strokeWidth={3} /> Add Item
          </button>
        </div>

        {/* --- CATEGORIES --- */}
        <div className="w-full overflow-hidden">
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {dynamicCategories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-5 py-2 md:px-6 md:py-2.5 rounded-full text-[10px] md:text-xs font-bold uppercase tracking-wider whitespace-nowrap border transition-all ${selectedCategory === cat
                  ? 'text-white border-transparent shadow-md'
                  : 'bg-white text-black border-black/10 hover:border-black hover:text-black'
                  }`}
                style={{ backgroundColor: selectedCategory === cat ? brandGreen : 'white' }}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* --- ACTION BUTTONS & TOTAL ITEMS --- */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 w-full">
          <div className="flex flex-wrap gap-3">
            {selectedCategory === 'ALL' ? (
              filteredItems.length > 0 && (
                <button onClick={handleDeleteWholeMenu} className="px-4 py-2 bg-red-50 text-red-600 rounded-lg font-bold text-xs uppercase tracking-wider border border-red-100 hover:bg-red-100 transition-colors">
                  Delete Whole Menu
                </button>
              )
            ) : (
              <>
                <button onClick={handleDeleteCategory} className="px-4 py-2 bg-red-50 text-red-600 rounded-lg font-bold text-xs uppercase tracking-wider border border-red-100 hover:bg-red-100 transition-colors">
                  Delete Category
                </button>
                <button onClick={handleRenameCategory} className="px-4 py-2 bg-blue-50 text-blue-600 rounded-lg font-bold text-xs uppercase tracking-wider border border-blue-100 hover:bg-blue-100 transition-colors">
                  Rename Category
                </button>
              </>
            )}
            {selectedItems.length > 0 && (
              <button onClick={handleDeleteSelectedItems} className="px-4 py-2 bg-red-600 text-white rounded-lg font-bold text-xs uppercase tracking-wider hover:bg-red-700 transition-colors shadow-sm">
                Delete items selected
              </button>
            )}
          </div>

          <div className="inline-flex items-center gap-3 bg-white border border-black/10 rounded-lg px-4 py-2 shadow-sm whitespace-nowrap">
            <span className="text-[10px] font-black text-black/50 uppercase tracking-widest">
              {selectedCategory === 'ALL' ? 'Total Inventory' : `${selectedCategory}`}
            </span>
            <div className="w-px h-3 bg-black/10"></div>
            <span className="font-mono text-sm font-black text-black">
              {filteredItems.length.toString().padStart(2, '0')}
            </span>
          </div>
        </div>

        {/* --- DATA DISPLAY --- */}
        <div className="bg-transparent md:bg-white md:rounded-xl md:border md:border-black/10 md:shadow-sm overflow-hidden flex flex-col">

          {/* DESKTOP VIEW: TABLE (Hidden on Mobile) */}
          <div className="hidden md:block w-full">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="text-white" style={{ backgroundColor: brandGreen }}>
                  <th className="px-4 py-4 w-12 text-center border-r border-white/10">
                    <input 
                      type="checkbox" 
                      className="w-4 h-4 rounded border-white/20 text-emerald-600 focus:ring-emerald-600 cursor-pointer"
                      checked={filteredItems.length > 0 && selectedItems.length === filteredItems.length}
                      onChange={handleSelectAll}
                    />
                  </th>
                  <th className="px-6 py-4 text-xs font-black uppercase tracking-[0.2em] w-24 text-center border-r border-white/10">S/N</th>
                  <th className="px-6 py-4 text-xs font-black uppercase tracking-[0.2em] border-r border-white/10">Item Description</th>
                  <th className="px-6 py-4 text-xs font-black uppercase tracking-[0.2em] w-48 border-r border-white/10">Price (₹)</th>
                  <th className="px-6 py-4 text-xs font-black uppercase tracking-[0.2em] w-48 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5">
                {loading ? (
                  <tr><td colSpan="5" className="py-20 text-center text-black font-medium animate-pulse uppercase tracking-widest">Loading...</td></tr>
                ) : filteredItems.length > 0 ? (
                  filteredItems.map((item, index) => (
                    <tr key={item.id} className="group hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-5 text-center border-r border-black/5">
                        <input 
                          type="checkbox" 
                          className="w-4 h-4 rounded border-black/20 text-emerald-600 focus:ring-emerald-600 cursor-pointer"
                          checked={selectedItems.includes(item.id)}
                          onChange={() => handleSelectItem(item.id)}
                        />
                      </td>
                      <td className="px-6 py-5 text-sm font-bold text-black text-center border-r border-black/5">{(index + 1).toString().padStart(2, '0')}</td>
                      <td className="px-6 py-5 border-r border-black/5">
                        <div className="flex flex-col">
                          <span className="font-bold text-black uppercase tracking-tight text-base">{item.item_name}</span>
                          <span className="text-[10px] font-bold text-black uppercase tracking-wider mt-1 bg-black/5 self-start px-2 py-0.5 rounded">{item.category}</span>
                        </div>
                      </td>
                      <td className="px-6 py-5 border-r border-black/5 font-mono font-bold text-black text-lg">₹{parseFloat(item.price).toFixed(2)}</td>
                      <td className="px-6 py-5 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button onClick={() => handleOpenModal(item)} className="p-2 rounded-lg text-green-600 hover:bg-green-50"><Edit2 size={18} /></button>
                          <div className="w-px h-4 bg-black/10"></div>
                          <button onClick={() => handleDelete(item.id)} className="p-2 rounded-lg text-red-600 hover:bg-red-50"><Trash2 size={18} /></button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr><td colSpan="5" className="py-24 text-center text-black font-bold uppercase tracking-widest opacity-50">No Items Found</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {/* MOBILE VIEW: EXPANDABLE LIST (Visible on Mobile) */}
          <div className="md:hidden flex flex-col gap-3">
            {loading ? (
              <div className="py-20 text-center text-black font-medium animate-pulse uppercase tracking-widest">Loading...</div>
            ) : filteredItems.length > 0 ? (
              filteredItems.map((item, index) => {
                const isExpanded = expandedId === item.id;

                return (
                  <div
                    key={item.id}
                    onClick={() => toggleItem(item.id)}
                    className={`bg-white border border-black/10 rounded-xl overflow-hidden transition-all duration-300 ${isExpanded ? 'shadow-md ring-1 ring-black/5' : 'shadow-sm'}`}
                  >
                    {/* Header Row (Always Visible) */}
                    <div className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {/* Checkbox */}
                        <div className="flex items-center justify-center mr-1" onClick={(e) => e.stopPropagation()}>
                          <input 
                            type="checkbox" 
                            className="w-5 h-5 rounded border-black/20 text-emerald-600 focus:ring-emerald-600 cursor-pointer"
                            checked={selectedItems.includes(item.id)}
                            onChange={() => handleSelectItem(item.id)}
                          />
                        </div>

                        {/* S/N Badge */}
                        <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-black/5 text-[10px] font-black text-black/60">
                          {(index + 1).toString().padStart(2, '0')}
                        </span>

                        {/* Item Details */}
                        <div className="flex flex-col">
                          <span className="font-black text-black uppercase text-sm leading-tight">{item.item_name}</span>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] font-bold text-black/40 uppercase tracking-wider">{item.category}</span>
                            <span className="w-1 h-1 rounded-full bg-black/20"></span>
                            <span className="font-mono font-bold text-black text-xs">₹{parseFloat(item.price).toFixed(2)}</span>
                          </div>
                        </div>
                      </div>

                      {/* Chevron Indicator */}
                      <div className="text-black/30">
                        {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                      </div>
                    </div>

                    {/* Expandable Action Row */}
                    {isExpanded && (
                      <div className="px-4 pb-4 pt-0 flex gap-2 animate-in slide-in-from-top-2 duration-200">
                        <button
                          onClick={(e) => { e.stopPropagation(); handleOpenModal(item); }}
                          className="flex-1 flex items-center justify-center gap-2 p-3 bg-green-50 text-green-700 rounded-xl font-bold text-xs uppercase tracking-wider active:scale-95 transition-transform"
                        >
                          <Edit2 size={16} /> Edit
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDelete(item.id); }}
                          className="flex-1 flex items-center justify-center gap-2 p-3 bg-red-50 text-red-600 rounded-xl font-bold text-xs uppercase tracking-wider active:scale-95 transition-transform"
                        >
                          <Trash2 size={16} /> Delete
                        </button>
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="py-20 text-center text-black font-bold uppercase tracking-widest opacity-50">No Items Found</div>
            )}
          </div>

        </div>

      </main>

      {/* --- MODAL (Overlay) --- */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl border border-black/10 overflow-hidden transform transition-all scale-100">
            <div className="px-6 py-5 md:px-8 md:py-6 border-b border-black/10 flex justify-between items-center" style={{ backgroundColor: brandGreen }}>
              <h2 className="text-lg md:text-xl font-black uppercase tracking-widest text-white">
                {editingId ? 'Edit Item' : 'New Item'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-white/60 hover:text-white transition-colors">
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-5 md:space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-black">Item Name</label>
                <input required type="text" value={formData.item_name} onChange={(e) => setFormData({ ...formData, item_name: e.target.value })} className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-black/10 focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600 outline-none font-bold text-black uppercase" placeholder="e.g. Cheese Burger" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-black">Price (₹)</label>
                  <input required type="number" step="0.01" value={formData.price} onChange={(e) => setFormData({ ...formData, price: e.target.value })} className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-black/10 focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600 outline-none font-bold text-black" placeholder="0.00" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-black">Category</label>
                  <input required type="text" value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })} className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-black/10 focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600 outline-none font-bold text-black uppercase" placeholder="e.g. Sides" />
                </div>
              </div>

              <div className="pt-2">
                <button type="submit" className="w-full py-3.5 md:py-4 rounded-xl text-white font-black text-xs uppercase tracking-[0.2em] hover:brightness-110 active:scale-[0.98] transition-all shadow-lg" style={{ backgroundColor: brandGreen }}>
                  {editingId ? 'Save Changes' : 'Create Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- CUSTOM CONFIRM MODAL (replaces window.confirm) --- */}
      {confirmState.open && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl border border-black/10 overflow-hidden">
            <div className="px-6 py-5 border-b border-black/10">
              <h3 className="text-base font-black uppercase tracking-wider text-black">Confirm Action</h3>
            </div>
            <div className="px-6 py-5">
              <p className="text-sm text-black/80 font-medium">{confirmState.message}</p>
            </div>
            <div className="px-6 py-4 border-t border-black/10 flex gap-3 justify-end">
              <button
                onClick={() => { setConfirmState({ open: false, message: "", onConfirm: null }); confirmState.onConfirm?.(false); }}
                className="px-5 py-2.5 rounded-xl bg-gray-100 text-black font-bold text-xs uppercase tracking-wider hover:bg-gray-200 transition-colors"
              >Cancel</button>
              <button
                onClick={() => { setConfirmState({ open: false, message: "", onConfirm: null }); confirmState.onConfirm?.(true); }}
                className="px-5 py-2.5 rounded-xl text-white font-bold text-xs uppercase tracking-wider hover:brightness-110 transition-all"
                style={{ backgroundColor: '#dc2626' }}
              >Confirm</button>
            </div>
          </div>
        </div>
      )}

      {/* --- CUSTOM PROMPT MODAL (replaces window.prompt) --- */}
      {promptState.open && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl border border-black/10 overflow-hidden">
            <div className="px-6 py-5 border-b border-black/10">
              <h3 className="text-base font-black uppercase tracking-wider text-black">Enter Value</h3>
            </div>
            <div className="px-6 py-5 space-y-3">
              <p className="text-sm text-black/80 font-medium">{promptState.message}</p>
              <input
                type="text"
                value={promptValue}
                onChange={(e) => setPromptValue(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-black/10 focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600 outline-none font-bold text-black uppercase"
                autoFocus
                onKeyDown={(e) => { if (e.key === 'Enter') { setPromptState({ open: false, message: "", defaultValue: "", onSubmit: null }); promptState.onSubmit?.(promptValue); } }}
              />
            </div>
            <div className="px-6 py-4 border-t border-black/10 flex gap-3 justify-end">
              <button
                onClick={() => { setPromptState({ open: false, message: "", defaultValue: "", onSubmit: null }); promptState.onSubmit?.(null); }}
                className="px-5 py-2.5 rounded-xl bg-gray-100 text-black font-bold text-xs uppercase tracking-wider hover:bg-gray-200 transition-colors"
              >Cancel</button>
              <button
                onClick={() => { setPromptState({ open: false, message: "", defaultValue: "", onSubmit: null }); promptState.onSubmit?.(promptValue); }}
                className="px-5 py-2.5 rounded-xl text-white font-bold text-xs uppercase tracking-wider hover:brightness-110 transition-all"
                style={{ backgroundColor: brandGreen }}
              >Submit</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// --- STYLES ---
const styles = {
  // --- INTEGRATED HEADER STYLES ---
  header: { background: '#fff', borderBottom: '1px solid #e2e8f0', position: 'relative', zIndex: 30, width: '100%', marginBottom: '24px', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' },
  headerInner: { padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', gap: '12px', boxSizing: 'border-box' },
  backBtn: { background: "none", border: "none", color: "#000", fontSize: "14px", fontWeight: "700", cursor: "pointer", padding: 0, display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 },
  heading: { fontWeight: "900", color: "#000", textTransform: 'uppercase', letterSpacing: "-0.5px", margin: 0, fontSize: '20px', textAlign: 'center', flex: 1, lineHeight: 1.2 },
  idBox: { background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '6px 12px', color: '#334155', fontSize: '11px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap', flexShrink: 0 }
};

export default FranchiseMenu;