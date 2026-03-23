import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, Search, Truck, RefreshCw, Check, Users, IndianRupee,
  ChevronDown, ChevronUp, Filter, X, CheckSquare, Square
} from "lucide-react";
import { supabase } from "../../frontend_supabase/supabaseClient";
import { useAuth } from "../../context/AuthContext";
import { BRAND_GREEN } from "../../utils/theme";

const BRAND_COLOR = BRAND_GREEN;

const CustomStyles = () => (
  <style>{`
    .no-scrollbar::-webkit-scrollbar { display: none; }
    .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
  `}</style>
);

const CentralTransportationService = () => {
  const navigate = useNavigate();
  const { profile: authProfile } = useAuth();

  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  // Filters
  const [filterState, setFilterState] = useState("");
  const [filterCity, setFilterCity] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  // Sorting
  const [sortKey, setSortKey] = useState("name");
  const [sortDir, setSortDir] = useState("asc");

  // Inline edits
  const [editingCharges, setEditingCharges] = useState({});
  const [savingIds, setSavingIds] = useState(new Set());
  const [successIds, setSuccessIds] = useState(new Set());

  // Bulk select
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [bulkCharge, setBulkCharge] = useState("");
  const [bulkSaving, setBulkSaving] = useState(false);

  useEffect(() => { fetchProfiles(); }, []);

  const fetchProfiles = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, name, franchise_id, role, phone, address, city, state, branch_location, transportation_charge")
        .in("role", ["franchise", "central"])
        .order("name", { ascending: true });
      if (error) throw error;
      setProfiles(data || []);
    } catch (err) {
      console.error("Failed to fetch profiles:", err);
    } finally { setLoading(false); }
  };

  // Derived filter options
  const stateOptions = useMemo(() => [...new Set(profiles.map(p => p.state).filter(Boolean))].sort(), [profiles]);
  const cityOptions = useMemo(() => {
    const filtered = filterState ? profiles.filter(p => p.state === filterState) : profiles;
    return [...new Set(filtered.map(p => p.city).filter(Boolean))].sort();
  }, [profiles, filterState]);

  // Sort handler
  const handleSort = (key) => {
    if (sortKey === key) { setSortDir(d => d === "asc" ? "desc" : "asc"); }
    else { setSortKey(key); setSortDir("asc"); }
  };
  const SortIcon = ({ col }) => {
    if (sortKey !== col) return <ChevronDown size={12} className="text-slate-300" />;
    return sortDir === "asc" ? <ChevronUp size={12} /> : <ChevronDown size={12} />;
  };

  // Filtered + sorted
  const displayProfiles = useMemo(() => {
    let list = [...profiles];
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      list = list.filter(p =>
        (p.name && p.name.toLowerCase().includes(q)) ||
        (p.franchise_id && p.franchise_id.toLowerCase().includes(q)) ||
        (p.city && p.city.toLowerCase().includes(q)) ||
        (p.state && p.state.toLowerCase().includes(q))
      );
    }
    if (filterState) list = list.filter(p => p.state === filterState);
    if (filterCity) list = list.filter(p => p.city === filterCity);
    list.sort((a, b) => {
      const aVal = (a[sortKey] || "").toString().toLowerCase();
      const bVal = (b[sortKey] || "").toString().toLowerCase();
      if (sortKey === "transportation_charge") {
        return sortDir === "asc" ? (Number(a[sortKey]) || 0) - (Number(b[sortKey]) || 0) : (Number(b[sortKey]) || 0) - (Number(a[sortKey]) || 0);
      }
      return sortDir === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    });
    return list;
  }, [profiles, searchTerm, filterState, filterCity, sortKey, sortDir]);

  // Inline edit
  const handleChargeChange = (id, val) => {
    setEditingCharges(prev => ({ ...prev, [id]: val.replace(/[^0-9.]/g, "") }));
  };

  const handleSave = async (id) => {
    const charge = parseFloat(editingCharges[id]);
    if (isNaN(charge) || charge < 0) return;
    setSavingIds(prev => new Set(prev).add(id));
    try {
      const { error } = await supabase.from("profiles").update({ transportation_charge: charge }).eq("id", id);
      if (error) throw error;
      setProfiles(prev => prev.map(p => p.id === id ? { ...p, transportation_charge: charge } : p));
      setEditingCharges(prev => { const n = { ...prev }; delete n[id]; return n; });
      setSuccessIds(prev => new Set(prev).add(id));
      setTimeout(() => setSuccessIds(prev => { const n = new Set(prev); n.delete(id); return n; }), 2000);
    } catch (err) {
      alert(`Save failed: ${err.message}`);
    } finally {
      setSavingIds(prev => { const n = new Set(prev); n.delete(id); return n; });
    }
  };

  const getDisplayCharge = (p) => editingCharges[p.id] !== undefined ? editingCharges[p.id] : (p.transportation_charge || 0);
  const hasUnsaved = (p) => editingCharges[p.id] !== undefined && parseFloat(editingCharges[p.id]) !== (p.transportation_charge || 0);

  // Bulk selection
  const toggleSelect = (id) => {
    setSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };
  const toggleSelectAll = () => {
    const visibleIds = displayProfiles.map(p => p.id);
    const allSelected = visibleIds.every(id => selectedIds.has(id));
    if (allSelected) { setSelectedIds(prev => { const n = new Set(prev); visibleIds.forEach(id => n.delete(id)); return n; }); }
    else { setSelectedIds(prev => { const n = new Set(prev); visibleIds.forEach(id => n.add(id)); return n; }); }
  };
  const handleBulkApply = async () => {
    const charge = parseFloat(bulkCharge);
    if (isNaN(charge) || charge < 0 || selectedIds.size === 0) return;
    if (!window.confirm(`Set ₹${charge} transportation charge for ${selectedIds.size} franchise(s)?`)) return;
    setBulkSaving(true);
    try {
      const ids = [...selectedIds];
      const { error } = await supabase.from("profiles").update({ transportation_charge: charge }).in("id", ids);
      if (error) throw error;
      setProfiles(prev => prev.map(p => ids.includes(p.id) ? { ...p, transportation_charge: charge } : p));
      setSelectedIds(new Set());
      setBulkCharge("");
      setSuccessIds(prev => { const n = new Set(prev); ids.forEach(id => n.add(id)); return n; });
      setTimeout(() => setSuccessIds(new Set()), 2000);
    } catch (err) {
      alert(`Bulk update failed: ${err.message}`);
    } finally { setBulkSaving(false); }
  };

  const clearFilters = () => { setFilterState(""); setFilterCity(""); setSearchTerm(""); };
  const hasActiveFilters = filterState || filterCity || searchTerm;

  const visibleIds = displayProfiles.map(p => p.id);
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every(id => selectedIds.has(id));

  return (
    <div className="h-[100dvh] w-full flex flex-col bg-slate-50 font-sans text-black overflow-hidden relative">
      <CustomStyles />

      {/* HEADER */}
      <div className="flex-none bg-white shadow-sm z-30 pt-safe-top">
        <div className="border-b border-slate-200 px-4 md:px-6 py-3 md:py-4">
          <div className="w-full flex items-center justify-between gap-2">
            <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-black hover:opacity-70 font-bold transition text-xs md:text-base flex-shrink-0">
              <ArrowLeft size={18} /> <span>Back</span>
            </button>
            <h1 className="text-xs md:text-2xl font-black uppercase text-black text-center flex-1 truncate px-2">
              Transportation <span style={{ color: BRAND_COLOR }}>Service</span>
            </h1>
            <div className="flex items-center flex-shrink-0">
              <div className="bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm flex items-center gap-2">
                <span className="text-[10px] md:text-xs text-slate-400 font-black uppercase tracking-wider">ID :</span>
                <span className="text-[10px] md:text-sm font-bold text-slate-700 font-mono">
                  {authProfile?.franchise_id || authProfile?.staff_id || "---"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* SEARCH + FILTER BAR */}
        <div className="w-full px-4 md:px-6 py-3 space-y-3">
          <div className="flex flex-col md:flex-row items-stretch gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                type="text" placeholder="Search name, franchise ID, city, state..."
                value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-[#065f46] text-sm font-semibold shadow-sm transition-all"
              />
            </div>
            <div className="flex gap-2 flex-shrink-0">
              <button onClick={() => setShowFilters(f => !f)}
                className={`h-[42px] px-4 rounded-xl font-bold uppercase text-[10px] flex items-center gap-1.5 border transition-all ${showFilters ? "bg-black text-white border-black" : "bg-white text-slate-600 border-slate-200 hover:border-slate-400"}`}>
                <Filter size={14} /> Filters {hasActiveFilters && <span className="w-2 h-2 rounded-full bg-red-500 ml-1"></span>}
              </button>
              <button onClick={fetchProfiles}
                className="h-[42px] px-4 rounded-xl font-bold uppercase text-[10px] flex items-center gap-1.5 text-white shadow-md transition-all active:scale-95"
                style={{ backgroundColor: BRAND_COLOR }}>
                <RefreshCw size={14} /> Refresh
              </button>
            </div>
          </div>

          {/* Filter dropdowns */}
          {showFilters && (
            <div className="flex flex-col md:flex-row gap-2 p-3 bg-slate-100 rounded-xl border border-slate-200 animate-in slide-in-from-top-2 duration-200">
              <div className="relative flex-1">
                <select value={filterState} onChange={(e) => { setFilterState(e.target.value); setFilterCity(""); }}
                  className="w-full appearance-none bg-white border border-slate-200 rounded-lg px-3 py-2.5 text-sm font-bold text-slate-700 outline-none focus:border-[#065f46] cursor-pointer pr-8">
                  <option value="">All States</option>
                  {stateOptions.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
              <div className="relative flex-1">
                <select value={filterCity} onChange={(e) => setFilterCity(e.target.value)}
                  className="w-full appearance-none bg-white border border-slate-200 rounded-lg px-3 py-2.5 text-sm font-bold text-slate-700 outline-none focus:border-[#065f46] cursor-pointer pr-8">
                  <option value="">All Cities</option>
                  {cityOptions.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
              {hasActiveFilters && (
                <button onClick={clearFilters} className="h-[42px] px-4 rounded-lg text-red-500 font-bold text-[10px] uppercase flex items-center gap-1 border border-red-200 bg-red-50 hover:bg-red-100 transition-all">
                  <X size={14} /> Clear
                </button>
              )}
            </div>
          )}

          {/* Bulk Action Bar */}
          {selectedIds.size > 0 && (
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 p-3 rounded-xl border-2 animate-in slide-in-from-top-2 duration-200" style={{ backgroundColor: BRAND_COLOR + "10", borderColor: BRAND_COLOR + "40" }}>
              <div className="flex items-center gap-2 text-sm font-black flex-shrink-0" style={{ color: BRAND_COLOR }}>
                <CheckSquare size={16} />
                <span>{selectedIds.size} selected</span>
              </div>
              <div className="flex items-center gap-2 flex-1">
                <div className="relative flex-1 max-w-[200px]">
                  <IndianRupee size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input type="text" inputMode="decimal" value={bulkCharge}
                    onChange={(e) => setBulkCharge(e.target.value.replace(/[^0-9.]/g, ""))}
                    placeholder="Enter charge" className="w-full pl-8 pr-3 py-2 bg-white border border-slate-200 rounded-lg outline-none text-sm font-bold focus:border-[#065f46]" />
                </div>
                <button onClick={handleBulkApply} disabled={!bulkCharge || bulkSaving}
                  className="h-[38px] px-4 rounded-lg font-black uppercase text-[10px] text-white flex items-center gap-1.5 shadow-md transition-all active:scale-95 disabled:opacity-50"
                  style={{ backgroundColor: BRAND_COLOR }}>
                  {bulkSaving ? <RefreshCw size={14} className="animate-spin" /> : <Check size={14} />}
                  Apply to All
                </button>
                <button onClick={() => setSelectedIds(new Set())} className="h-[38px] px-3 rounded-lg text-slate-500 hover:bg-slate-100 text-[10px] font-bold uppercase transition-all">
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Summary */}
          <div className="flex items-center gap-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            <Users size={12} />
            <span>{displayProfiles.length} franchise{displayProfiles.length !== 1 ? "s" : ""}</span>
          </div>
        </div>
      </div>

      {/* TABLE CONTENT */}
      <div className="flex-grow overflow-hidden relative bg-slate-50">
        <div className="absolute inset-0 overflow-auto no-scrollbar">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-64 text-slate-400 gap-3 animate-pulse">
              <RefreshCw className="animate-spin" size={32} />
              <span className="text-xs font-bold uppercase tracking-wider">Loading...</span>
            </div>
          ) : displayProfiles.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-slate-400 gap-3">
              <div className="bg-slate-100 p-4 rounded-full"><Truck size={32} /></div>
              <span className="text-xs font-bold uppercase tracking-wider">No franchises found</span>
            </div>
          ) : (
            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead className="sticky top-0 z-10 bg-white shadow-sm">
                <tr className="text-[10px] font-black uppercase tracking-wider text-slate-500 border-b-2 border-slate-200">
                  <th className="px-4 py-3 w-10">
                    <button onClick={toggleSelectAll} className="hover:opacity-70 transition-opacity">
                      {allVisibleSelected ? <CheckSquare size={16} style={{ color: BRAND_COLOR }} /> : <Square size={16} className="text-slate-300" />}
                    </button>
                  </th>
                  <th className="px-2 py-3 w-12">S.No</th>
                  <th className="px-3 py-3 cursor-pointer hover:text-black transition-colors" onClick={() => handleSort("franchise_id")}>
                    <span className="flex items-center gap-1">Franchise ID <SortIcon col="franchise_id" /></span>
                  </th>
                  <th className="px-3 py-3 cursor-pointer hover:text-black transition-colors" onClick={() => handleSort("name")}>
                    <span className="flex items-center gap-1">Name <SortIcon col="name" /></span>
                  </th>
                  <th className="px-3 py-3 cursor-pointer hover:text-black transition-colors" onClick={() => handleSort("city")}>
                    <span className="flex items-center gap-1">City <SortIcon col="city" /></span>
                  </th>
                  <th className="px-3 py-3 cursor-pointer hover:text-black transition-colors" onClick={() => handleSort("state")}>
                    <span className="flex items-center gap-1">State <SortIcon col="state" /></span>
                  </th>
                  <th className="px-3 py-3 cursor-pointer hover:text-black transition-colors" onClick={() => handleSort("role")}>
                    <span className="flex items-center gap-1">Role <SortIcon col="role" /></span>
                  </th>
                  <th className="px-3 py-3 cursor-pointer hover:text-black transition-colors" onClick={() => handleSort("transportation_charge")}>
                    <span className="flex items-center gap-1">Charge (₹) <SortIcon col="transportation_charge" /></span>
                  </th>
                  <th className="px-3 py-3 w-24 text-center">Action</th>
                </tr>
              </thead>
              <tbody>
                {displayProfiles.map((p, idx) => {
                  const isSelected = selectedIds.has(p.id);
                  const isSaving = savingIds.has(p.id);
                  const isSuccess = successIds.has(p.id);
                  const edited = hasUnsaved(p);

                  return (
                    <tr key={p.id}
                      className={`border-b border-slate-100 text-sm transition-colors ${isSelected ? "bg-emerald-50/50" : isSuccess ? "bg-green-50" : "hover:bg-slate-50"}`}>
                      <td className="px-4 py-3">
                        <button onClick={() => toggleSelect(p.id)} className="hover:opacity-70 transition-opacity">
                          {isSelected ? <CheckSquare size={16} style={{ color: BRAND_COLOR }} /> : <Square size={16} className="text-slate-300" />}
                        </button>
                      </td>
                      <td className="px-2 py-3 text-slate-400 font-bold text-xs">{idx + 1}</td>
                      <td className="px-3 py-3">
                        <span className="font-mono font-bold text-xs bg-slate-100 px-2 py-1 rounded">{p.franchise_id || "N/A"}</span>
                      </td>
                      <td className="px-3 py-3 font-bold text-sm truncate max-w-[180px]" title={p.name}>{p.name || "—"}</td>
                      <td className="px-3 py-3 text-slate-600 text-xs font-semibold">{p.city || "—"}</td>
                      <td className="px-3 py-3 text-slate-600 text-xs font-semibold">{p.state || "—"}</td>
                      <td className="px-3 py-3">
                        <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${p.role === "central" ? "bg-purple-100 text-purple-600" : "bg-blue-100 text-blue-600"}`}>
                          {p.role || "—"}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <div className="relative w-28">
                          <IndianRupee size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                          <input type="text" inputMode="decimal"
                            value={getDisplayCharge(p)}
                            onChange={(e) => handleChargeChange(p.id, e.target.value)}
                            className={`w-full pl-7 pr-2 py-2 border rounded-lg outline-none text-sm font-bold transition-all ${edited ? "border-amber-300 bg-amber-50/50" : "border-slate-200 bg-slate-50 focus:border-[#065f46]"}`}
                          />
                        </div>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <button onClick={() => handleSave(p.id)} disabled={!edited || isSaving}
                          className={`h-[32px] px-3 rounded-lg font-bold uppercase text-[9px] inline-flex items-center gap-1 transition-all active:scale-95 ${
                            isSuccess ? "bg-emerald-500 text-white"
                            : edited ? "text-white shadow-sm" : "bg-slate-100 text-slate-300 cursor-not-allowed"
                          }`}
                          style={edited && !isSuccess ? { backgroundColor: BRAND_COLOR } : {}}>
                          {isSaving ? <RefreshCw size={12} className="animate-spin" /> : isSuccess ? <><Check size={12} /> Saved</> : "Save"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default CentralTransportationService;
