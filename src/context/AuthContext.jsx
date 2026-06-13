import { createContext, useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase, fetchWithRetry } from "../frontend_supabase/supabaseClient";

const AuthContext = createContext({
  user: null,
  role: null,
  profile: null,
  loading: true,
  login: async () => { },
  logout: async () => { },
});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const hydrate = async (supabaseUser) => {
    try {
      if (!supabaseUser) {
        setUser(null);
        setRole(null);
        setProfile(null);
        setLoading(false);
        return null;
      }

    let finalProfile = null;

    let { data: ownerProfile } = await fetchWithRetry(() =>
      supabase
          .from("profiles")
          .select("*")
          .eq("id", supabaseUser.id)
          .maybeSingle()
      );

      if (ownerProfile && ownerProfile.role !== null && ownerProfile.role !== '') {
        finalProfile = { ...ownerProfile, role: ownerProfile.role };
      } else {
        const { data: staffProfile } = await fetchWithRetry(() =>
          supabase
            .from("staff_profiles")
            .select("*")
            .eq("id", supabaseUser.id)
            .maybeSingle()
        );

        if (staffProfile) {
          const { data: storeInfo } = await fetchWithRetry(() =>
            supabase
              .from("profiles")
              .select("company, address, city, state, pincode, phone, is_active")
              .eq("franchise_id", staffProfile.franchise_id)
              .limit(1)
              .maybeSingle()
          );

          finalProfile = { ...staffProfile, role: "staff", staff_profile_id: staffProfile.id, ...storeInfo };
        }
      }

    if (!finalProfile) {
      setUser(null);
      setRole(null);
      setProfile(null);
      setLoading(false);
      return null;
    } else if (finalProfile.is_active === false) {
      if (window.location.pathname !== '/login') {
        await supabase.auth.signOut();
        navigate('/login', { replace: true });
      }
      setUser(null);
      setRole(null);
      setProfile(null);
      setLoading(false);
      return null;
    } else {
      setUser({
        ...supabaseUser,
        franchise_id: finalProfile.franchise_id,
        staff_profile_id: finalProfile.role === "staff" ? (finalProfile.staff_profile_id || finalProfile.id) : null,
        owner_profile_id: finalProfile.role !== "staff" ? finalProfile.id : null,
      });

      setProfile(finalProfile);
      setRole(finalProfile.role);
      setLoading(false);
      return finalProfile;
    }
    } catch (err) {
      console.error("[AUTH] Hydration error:", err);
      setUser(null);
      setRole(null);
      setProfile(null);
      setLoading(false);
      return null;
    }
  };

  useEffect(() => {
    let isInitialized = false;

    supabase.auth.getSession().then(({ data }) => {
      isInitialized = true;
      hydrate(data?.session?.user ?? null);
    }).catch((err) => {
      isInitialized = true;
      console.error("[AUTH] Failed to get initial session (network issue):", err);
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        // Skip INITIAL_SESSION — getSession() already handles it
        if (event === "INITIAL_SESSION") return;

        if (event === "SIGNED_OUT") {
          setUser(null);
          setRole(null);
          setProfile(null);
          setLoading(false);
        } else if (event === "SIGNED_IN" && isInitialized) {
          // Only re-hydrate on explicit sign-in AFTER initial load
          // (hot-login from another tab, etc.)
          hydrate(session?.user);
        }
      }
    );

    return () => { listener?.subscription?.unsubscribe(); };
  }, []);

  /* ================= EXPLICIT LOGIN FUNCTION ================= */
  const login = async (supabaseUser, profileData, chosenMode) => {
    // 1. Update React State
    setUser({
      ...supabaseUser,
      franchise_id: profileData.franchise_id,
      staff_profile_id: profileData.role === "staff" ? (profileData.staff_profile_id || profileData.id) : null,
      owner_profile_id: profileData.role !== "staff" ? profileData.id : null,
    });
    setProfile(profileData);
    setRole(profileData.role);

    // 2. Record the physical login to the DB (fire-and-forget — don't block login)
    (async () => {
      try {
        const isStaff = profileData.role === "staff";
        const finalMode = isStaff ? "STORE" : chosenMode.toUpperCase();
        const staffProfId = isStaff ? (profileData.staff_profile_id || profileData.id) : null;
        const ownerProfId = !isStaff ? profileData.id : null;

        // Close any stuck sessions first
        const { data: activeSessions } = await supabase
          .from('login_logs')
          .select('id')
          .eq('staff_id', supabaseUser.id)
          .is('logout_at', null);

        if (activeSessions && activeSessions.length > 0) {
          const idsToClose = activeSessions.map(s => s.id);
          await supabase.from('login_logs').update({ logout_at: new Date().toISOString() }).in('id', idsToClose);
        }

        // Insert the perfect record
        await supabase.from('login_logs').insert([{
          staff_id: supabaseUser.id,
          staff_profile_id: staffProfId,
          owner_profile_id: ownerProfId,
          franchise_id: profileData.franchise_id,
          login_mode: finalMode
        }]);
      } catch (err) {
        console.error("Login Log Error:", err);
      }
    })();
  };

  const logout = async () => {
    try {
      if (user?.id) {
        const { data: activeLog } = await supabase
          .from('login_logs')
          .select('id')
          .eq('staff_id', user.id)
          .is('logout_at', null)
          .order('login_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (activeLog) {
          await supabase.from('login_logs').update({ logout_at: new Date().toISOString() }).eq('id', activeLog.id);
        }
      }
    } catch (err) {
      console.error("Logout Logic Error:", err);
    }

    await supabase.auth.signOut();

    setUser(null);
    setRole(null);
    setProfile(null);
    navigate('/');
  };

  return (
    <AuthContext.Provider value={{ user, role, profile, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}