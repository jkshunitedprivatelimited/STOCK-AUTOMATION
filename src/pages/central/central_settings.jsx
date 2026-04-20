import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../frontend_supabase/supabaseClient";
import { useAuth } from "../../context/AuthContext";
import {
  ArrowLeft, Lock, LogOut, Eye, EyeOff, CreditCard, MessageCircle
} from "lucide-react";

const BRAND_GREEN = "rgb(0, 100, 55)";
const SOFT_BORDER = "rgba(0, 100, 55, 0.15)";

function CentralSettings() {
  const navigate = useNavigate();
  const { logout, user: authUser } = useAuth();

  const [franchiseId, setFranchiseId] = useState("...");
  const newPasswordRef = React.useRef(null);
  const confirmPasswordRef = React.useRef(null);
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [onlinePayments, setOnlinePayments] = useState(false);
  const [chatSupport, setChatSupport] = useState(false);
  const [settingsLoading, setSettingsLoading] = useState(true);

  // FIX: Define fetchProfile BEFORE calling it in useEffect
  useEffect(() => {
    const fetchProfile = async () => {
      if (!authUser?.id) return;
      const { data, error } = await supabase
        .from("profiles")
        .select("franchise_id")
        .eq("id", authUser.id)
        .single();

      if (!error && data?.franchise_id) {
        setFranchiseId(data.franchise_id);
      }
    };

    fetchProfile();
  }, [authUser]);

  // Fetch central settings (online payments, chat support)
  useEffect(() => {
    const fetchSettings = async () => {
      setSettingsLoading(true);
      const { data, error } = await supabase
        .from("central_settings")
        .select("key, enabled")
        .in("key", ["online_payments", "chat_support"]);

      if (!error && data) {
        data.forEach((s) => {
          if (s.key === "online_payments") setOnlinePayments(s.enabled);
          if (s.key === "chat_support") setChatSupport(s.enabled);
        });
      }
      setSettingsLoading(false);
    };
    fetchSettings();
  }, []);

  const handleToggle = async (key, currentValue, setter) => {
    const newValue = !currentValue;
    setter(newValue);

    const { error } = await supabase
      .from("central_settings")
      .upsert({ key, enabled: newValue }, { onConflict: "key" });

    if (error) {
      setter(currentValue);
      console.error("Failed to update setting:", error);
    }
  };

  const handleChangePassword = async () => {
    setMsg("");
    
    const newPassword = newPasswordRef.current?.value;
    const confirmPassword = confirmPasswordRef.current?.value;

    // Basic validations
    if (!newPassword || !confirmPassword) {
      setMsg("Please fill in both fields");
      return;
    }
    if (newPassword !== confirmPassword) {
      setMsg("Passwords do not match");
      return;
    }
    if (newPassword.length < 6) {
      setMsg("Minimum 6 characters required");
      return;
    }

    setLoading(true);

    // Supabase v2 method for updating a logged-in user's password
    const { error } = await supabase.auth.updateUser({
      password: newPassword
    });

    setLoading(false);

    if (error) {
      setMsg(`Error: ${error.message}`);
    } else {
      setMsg("Password updated successfully!");
      if (newPasswordRef.current) newPasswordRef.current.value = "";
      if (confirmPasswordRef.current) confirmPasswordRef.current.value = "";
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    logout();
    navigate("/");
  };

  return (
    <div className="min-h-screen w-full bg-slate-50 font-sans antialiased text-black overflow-x-hidden pb-10">

      {/* --- NEW STICKY HEADER --- */}
      <div className="sticky top-0 z-30 bg-white border-b border-slate-200 px-4 md:px-8 py-4 flex flex-col md:flex-row md:items-center justify-between shadow-sm gap-4">
        <div className="flex items-center justify-between w-full md:w-auto">
          {/* Back Button */}
          <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-black font-black uppercase text-xs tracking-widest hover:text-black/70 transition-colors">
            <ArrowLeft size={18} /> <span>Back</span>
          </button>

          {/* Mobile Title */}
          <h1 className="text-base md:text-xl font-black uppercase tracking-widest text-center md:hidden text-black">Settings</h1>

          {/* Mobile ID Box */}
          <div className="flex items-center gap-2 md:hidden">
            <div className="bg-slate-100 border border-slate-200 rounded-md px-3 py-1.5 flex items-center gap-2">
              <span className="text-[11px] font-black text-slate-700 uppercase tracking-wide">ID:</span>
              <span className="text-[11px] font-black text-slate-900 uppercase tracking-wide">{franchiseId}</span>
            </div>
          </div>
        </div>

        {/* Desktop Title */}
        <h1 className="text-xl font-black uppercase tracking-widest text-center hidden md:block absolute left-1/2 -translate-x-1/2 text-black">Settings</h1>

        {/* Desktop ID Box */}
        <div className="hidden md:flex items-center gap-3">
          <div className="bg-slate-100 border border-slate-200 rounded-md px-3 py-1.5 flex items-center gap-2">
            <span className="text-[11px] font-black text-slate-700 uppercase tracking-wide">ID :</span>
            <span className="text-[11px] font-black text-slate-900 uppercase tracking-wide">{franchiseId}</span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-8 mt-8">
        {/* --- CONTENT GRID --- */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">

          {/* 1. CHANGE PASSWORD CARD */}
          <div className="bg-white rounded-[24px] md:rounded-[32px] border p-6 md:p-8 shadow-sm flex flex-col h-full min-h-[320px]" style={{ borderColor: SOFT_BORDER }}>
            <div className="flex items-center gap-4 mb-6">
              <div className="p-3 rounded-xl bg-emerald-50" style={{ color: BRAND_GREEN }}>
                <Lock className="w-6 h-6" strokeWidth={2.5} />
              </div>
              <h3 className="text-lg font-black uppercase tracking-tight text-black">Change Password</h3>
            </div>

            <div className="space-y-4 flex-1">
              <div className="relative">
                <input
                  type={showPass ? "text" : "password"}
                  ref={newPasswordRef}
                  className="w-full px-5 py-3.5 rounded-xl bg-slate-50 border outline-none font-black text-xs transition-all focus:bg-white text-black focus:border-emerald-500"
                  style={{ borderColor: SOFT_BORDER }}
                  placeholder="NEW PASSWORD"
                />
                <button onClick={() => setShowPass(!showPass)} className="absolute right-4 top-1/2 -translate-y-1/2 opacity-30 hover:opacity-100 text-black">
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              <input
                type={showPass ? "text" : "password"}
                ref={confirmPasswordRef}
                className="w-full px-5 py-3.5 rounded-xl bg-slate-50 border outline-none font-black text-xs transition-all focus:bg-white text-black focus:border-emerald-500"
                style={{ borderColor: SOFT_BORDER }}
                placeholder="CONFIRM PASSWORD"
              />

              {msg && (
                <div className={`text-[10px] font-black uppercase tracking-widest text-center py-2 rounded-lg ${msg.includes("success") ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-600"}`}>
                  {msg}
                </div>
              )}
            </div>

            <button
              onClick={handleChangePassword}
              disabled={loading}
              className="w-full mt-6 text-white py-4 rounded-xl font-black text-[10px] uppercase tracking-[0.3em] transition-all hover:brightness-110 active:scale-95 shadow-md shadow-emerald-100 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ backgroundColor: BRAND_GREEN }}
            >
              {loading ? "UPDATING..." : "UPDATE PASSWORD"}
            </button>
          </div>

          {/* 2. ONLINE PAYMENTS CARD */}
          <div className="bg-white rounded-[24px] md:rounded-[32px] border p-6 md:p-8 shadow-sm flex flex-col h-full min-h-[320px]" style={{ borderColor: SOFT_BORDER }}>
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 rounded-xl bg-emerald-50" style={{ color: BRAND_GREEN }}>
                <CreditCard className="w-6 h-6" strokeWidth={2.5} />
              </div>
              <h3 className="text-lg font-black uppercase tracking-tight text-black">Online Payments</h3>
            </div>

            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed mb-6">
              Enable or disable the online stock ordering gateway for all franchise outlets.
            </p>

            <div className="flex-1 flex flex-col justify-center items-center gap-4">
              <button
                onClick={() => !settingsLoading && handleToggle("online_payments", onlinePayments, setOnlinePayments)}
                disabled={settingsLoading}
                className="relative outline-none border-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  width: 72,
                  height: 38,
                  borderRadius: 19,
                  backgroundColor: onlinePayments ? BRAND_GREEN : "#d1d5db",
                  transition: "background-color 0.3s ease",
                  padding: 0,
                }}
              >
                <span style={{
                  position: "absolute",
                  top: 4,
                  left: onlinePayments ? 38 : 4,
                  width: 30,
                  height: 30,
                  borderRadius: 15,
                  backgroundColor: "white",
                  boxShadow: "0 2px 6px rgba(0,0,0,0.18)",
                  transition: "left 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                  display: "block",
                }} />
              </button>
              <span className="text-[10px] font-black uppercase tracking-[0.3em]" style={{ color: onlinePayments ? BRAND_GREEN : "#9ca3af" }}>
                {settingsLoading ? "Loading..." : onlinePayments ? "Enabled" : "Disabled"}
              </span>
            </div>
          </div>

          {/* 3. CHAT SUPPORT CARD */}
          <div className="bg-white rounded-[24px] md:rounded-[32px] border p-6 md:p-8 shadow-sm flex flex-col h-full min-h-[320px]" style={{ borderColor: SOFT_BORDER }}>
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 rounded-xl bg-emerald-50" style={{ color: BRAND_GREEN }}>
                <MessageCircle className="w-6 h-6" strokeWidth={2.5} />
              </div>
              <h3 className="text-lg font-black uppercase tracking-tight text-black">Chat Support</h3>
            </div>

            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed mb-6">
              Enable or disable the live chat support feature for all franchise outlets.
            </p>

            <div className="flex-1 flex flex-col justify-center items-center gap-4">
              <button
                onClick={() => !settingsLoading && handleToggle("chat_support", chatSupport, setChatSupport)}
                disabled={settingsLoading}
                className="relative outline-none border-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  width: 72,
                  height: 38,
                  borderRadius: 19,
                  backgroundColor: chatSupport ? BRAND_GREEN : "#d1d5db",
                  transition: "background-color 0.3s ease",
                  padding: 0,
                }}
              >
                <span style={{
                  position: "absolute",
                  top: 4,
                  left: chatSupport ? 38 : 4,
                  width: 30,
                  height: 30,
                  borderRadius: 15,
                  backgroundColor: "white",
                  boxShadow: "0 2px 6px rgba(0,0,0,0.18)",
                  transition: "left 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                  display: "block",
                }} />
              </button>
              <span className="text-[10px] font-black uppercase tracking-[0.3em]" style={{ color: chatSupport ? BRAND_GREEN : "#9ca3af" }}>
                {settingsLoading ? "Loading..." : chatSupport ? "Enabled" : "Disabled"}
              </span>
            </div>
          </div>

          {/* 4. LOGOUT CARD */}
          <div className="bg-white rounded-[24px] md:rounded-[32px] border p-6 md:p-10 shadow-sm flex flex-col justify-center items-center text-center h-full min-h-[320px]" style={{ borderColor: "rgba(225, 29, 72, 0.15)" }}>
            <div className="p-6 rounded-2xl bg-rose-50 text-rose-600 mb-6 transition-transform hover:scale-110">
              <LogOut className="w-10 h-10" strokeWidth={2.5} />
            </div>

            <h3 className="text-xl font-black uppercase tracking-tight text-black mb-2">Sign Out</h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-8 px-8 leading-relaxed">
              End your current session securely. You will be redirected to the login screen.
            </p>

            <button
              onClick={handleLogout}
              className="w-full text-white py-4 rounded-xl font-black text-[10px] uppercase tracking-[0.3em] transition-all bg-rose-600 hover:bg-rose-700 active:scale-95 shadow-lg shadow-rose-100"
            >
              LOGOUT
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}

export default CentralSettings;