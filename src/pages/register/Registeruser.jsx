import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../frontend_supabase/supabaseClient";
import {
  Eye, EyeOff, ArrowLeft, MapPin, Building2, User,
  Phone, Mail, KeyRound, Sparkles, Map, Loader2, RefreshCw
} from "lucide-react";
import { BRAND_GREEN, BRAND_GREEN_LIGHT } from "../../utils/theme";

// --- CONSTANTS ---
const PRIMARY = BRAND_GREEN;
const PRIMARY_LIGHT = BRAND_GREEN_LIGHT;
const BORDER = "#e2e8f0";
const TEXT_MAIN = "#1e293b";
const TEXT_MUTED = "#64748b";

const INDIAN_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat", "Haryana",
  "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur",
  "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana",
  "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal", "Delhi", "Puducherry", "Chandigarh", "Jammu and Kashmir", "Ladakh"
];

const InputGroup = ({ icon: Icon, children, isFocused, label, isMobile }) => (
  <div style={{ width: "100%" }}>
    {label && <label style={styles.inputLabel}>{label}</label>}
    <div style={{
      display: "flex",
      alignItems: "center",
      border: `1.5px solid ${isFocused ? PRIMARY : BORDER}`,
      borderRadius: "12px",
      padding: "0 14px",
      background: isFocused ? "#fff" : "#fcfcfd",
      transition: "all 0.2s ease",
      boxShadow: isFocused ? `0 0 0 4px ${PRIMARY_LIGHT}` : "none",
      height: isMobile ? "52px" : "48px"
    }}>
      {Icon && <Icon size={18} color={isFocused ? PRIMARY : TEXT_MUTED} style={{ minWidth: "18px", marginRight: "12px" }} />}
      <div style={{ flex: 1, display: "flex", alignItems: "center", width: "100%" }}>{children}</div>
    </div>
  </div>
);

function RegisterUser() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [focusedField, setFocusedField] = useState(null);
  const [adminId, setAdminId] = useState("...");
  const [suggestedId, setSuggestedId] = useState("");
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [companiesList, setCompaniesList] = useState([]);
  const [jkshLogo, setJkshLogo] = useState(null);
  const [syncMenu, setSyncMenu] = useState(false);

  const [selectedCompany, setSelectedCompany] = useState("");
  const [franchiseId, setFranchiseId] = useState("");

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);

    const initPage = async () => {
      getAdminProfile();
      fetchCompanies();
      fetchJkshLogo();
    };

    initPage();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const fetchJkshLogo = async () => {
    const { data } = await supabase
      .from('companies')
      .select('logo_url')
      .ilike('company_name', '%JKSH%')
      .maybeSingle();
    if (data?.logo_url) setJkshLogo(data.logo_url);
  };

  const getAdminProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase.from('profiles').select('franchise_id').eq('id', user.id).maybeSingle();
      if (data) setAdminId(data.franchise_id);
    }
  };

  const fetchCompanies = async () => {
    try {
      const { data, error } = await supabase.from('companies').select('company_name');
      if (error) throw error;
      if (data) setCompaniesList(data.map(c => c.company_name));
    } catch (err) {
      console.error("Error fetching companies:", err);
    }
  };

  useEffect(() => {
    const fetchNextId = async () => {
      if (!selectedCompany) { setSuggestedId(""); return; }
      const words = selectedCompany.trim().split(/\s+/);
      let prefix = words.length >= 2 ? (words[0][0] + words[1][0]).toUpperCase() + "-" : selectedCompany.substring(0, 2).toUpperCase() + "-";

      try {
        const { data } = await supabase.from('profiles').select('franchise_id').eq('company', selectedCompany);
        let maxNum = 0;
        if (data) {
          data.forEach(item => {
            const match = item.franchise_id.match(/\d+$/);
            if (match) {
              const num = parseInt(match[0], 10);
              if (num > maxNum) maxNum = num;
            }
          });
        }
        setSuggestedId(`${prefix}${maxNum + 1}`);
      } catch (err) { console.error(err); }
    };
    fetchNextId();
  }, [selectedCompany]);

  const applySuggestion = () => {
    setFranchiseId(suggestedId);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const form = e.target;
    const data = new FormData(form);
    
    // Extract standard native data
    const companyStr = data.get("company") || selectedCompany;
    const franchiseIdStr = data.get("franchise_id") || franchiseId;
    const emailStr = data.get("email");
    const passwordStr = data.get("password");

    // Strict Validation
    if (!companyStr) return alert("Please select a Brand.");
    if (!franchiseIdStr) return alert("Please confirm the Franchise ID.");
    if (!emailStr) return alert("Email is required.");
    if (!passwordStr) return alert("Password is required.");

    setLoading(true);
    try {
      // 1. Build the payload exactly matching the SQL Trigger
      const metadataPayload = {
        name: (data.get("name") || "").trim(),
        phone: (data.get("phone") || "").trim(),
        company: companyStr.trim(),
        franchise_id: franchiseIdStr.trim().toUpperCase(),
        branch_location: (data.get("branch_location") || "").trim(),
        address: (data.get("addressLine") || "").trim(),
        city: (data.get("city") || "").trim().toUpperCase(),
        state: data.get("state") || "",
        pincode: (data.get("pincode") || "").trim(),
        nearest_bus_stop: (data.get("nearestBusStop") || "").trim(),
        role: 'franchise'
      };

      // DEBUG: Verify the data is leaving React correctly
      console.log("🚀 SENDING PAYLOAD TO SUPABASE EDGE FUNCTION:", metadataPayload);

      const { data: resData, error } = await supabase.functions.invoke('register-user', {
        body: {
          email: emailStr.trim().toLowerCase(),
          password: passwordStr,
          metadata: metadataPayload
        }
      });

      if (error) {
        let msg = error.message || "Failed to communicate with Auth Edge Function.";
        try {
          if (error.context) {
            const body = await error.context.json();
            if (body?.error) msg = body.error;
          }
        } catch { /* ignore */ }
        throw new Error(msg);
      }

      // Check if the edge function returned its own internal error successfully parsed mapping
      if (resData?.error) {
        throw new Error(resData.error);
      }

      // --- Menu Sync: clone central menu to the new franchise if toggle is ON ---
      if (syncMenu) {
        try {
          const { error: syncError } = await supabase.rpc('clone_franchise_menu', {
            target_id: franchiseIdStr.trim().toUpperCase(),
            central_id: 'TV-1'
          });
          if (syncError) {
            console.error('Menu sync error:', syncError);
            alert(`✅ Franchise Created! But menu sync failed: ${syncError.message}\nYou can sync manually from Menu Management.`);
            navigate(-1);
            return;
          }
          alert(`✅ Franchise Created & Menu Synced! A verification email has been sent to ${emailStr}.`);
        } catch (syncErr) {
          alert(`✅ Franchise Created! But menu sync failed: ${syncErr.message}\nYou can sync manually from Menu Management.`);
        }
      } else {
        alert(`✅ Franchise Created! A verification email has been sent to ${emailStr}.`);
      }
      navigate(-1);

    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.pageContainer}>
      <div style={{ ...styles.headerBar, padding: isMobile ? "0 12px" : "0 24px" }}>
        <button type="button" onClick={() => navigate(-1)} style={styles.backButton}>
          <ArrowLeft size={isMobile ? 22 : 18} />
          <span style={{ marginLeft: "8px" }}>Back</span>
        </button>
        <h1 style={{ ...styles.title, fontSize: isMobile ? "17px" : "20px" }}>Create a New Franchise</h1>
        <div style={styles.idBoxWrapper}>
          <div style={{ ...styles.idBox, fontSize: isMobile ? "11px" : "13px" }}>
            ID : {adminId}
          </div>
        </div>
      </div>

      <div style={{ ...styles.mainContent, padding: isMobile ? "12px" : "32px" }}>
        <div style={{ ...styles.formCard, padding: isMobile ? "24px 16px" : "40px", borderRadius: isMobile ? "20px" : "16px" }}>

          <form onSubmit={handleSubmit}>
            <div style={styles.sectionHeader}>
              <Building2 size={18} color={PRIMARY} />
              <h2 style={styles.sectionTitle}>Brand Identity</h2>
            </div>

            <div style={isMobile ? styles.flexColumn : styles.gridRowThree}>
              <InputGroup isFocused={focusedField === "company"} label="Select Brand *" isMobile={isMobile}>
                <select name="company" required value={selectedCompany} onChange={(e) => setSelectedCompany(e.target.value)} style={styles.selectInput}
                  onFocus={() => setFocusedField("company")} onBlur={() => setFocusedField(null)}>
                  <option value="">Choose...</option>
                  {companiesList.map((compName, idx) => (
                    <option key={idx} value={compName}>{compName}</option>
                  ))}
                </select>
              </InputGroup>

              <div style={styles.suggestionWrapper}>
                <label style={styles.inputLabel}>Suggested ID</label>
                <div style={{ ...styles.suggestionBox, height: isMobile ? "52px" : "48px" }} onClick={applySuggestion}>
                  <Sparkles size={16} style={{ marginRight: '8px' }} />
                  {suggestedId || "Select Brand First"}
                </div>
              </div>

              <InputGroup isFocused={focusedField === "franchise_id"} label="Confirm ID *" isMobile={isMobile}>
                <input name="franchise_id" required value={franchiseId} placeholder="e.g. TV-10" onChange={(e) => setFranchiseId(e.target.value)} style={styles.cleanInput}
                  onFocus={() => setFocusedField("franchise_id")} onBlur={() => setFocusedField(null)} />
              </InputGroup>
            </div>

            <div style={styles.divider}></div>

            <div style={styles.sectionHeader}>
              <User size={18} color={PRIMARY} />
              <h2 style={styles.sectionTitle}>Owner Details</h2>
            </div>

            <div style={isMobile ? styles.flexColumn : styles.gridRowTwo}>
              <InputGroup icon={User} isFocused={focusedField === "name"} label="Full Name *" isMobile={isMobile}>
                <input name="name" required placeholder="Enter name" style={styles.cleanInput}
                  onFocus={() => setFocusedField("name")} onBlur={() => setFocusedField(null)} />
              </InputGroup>
              <InputGroup icon={Phone} isFocused={focusedField === "phone"} label="Phone *" isMobile={isMobile}>
                <input name="phone" required placeholder="+91" type="tel" style={styles.cleanInput}
                  onFocus={() => setFocusedField("phone")} onBlur={() => setFocusedField(null)} />
              </InputGroup>
            </div>

            <div style={isMobile ? styles.flexColumn : styles.gridRowTwo}>
              <InputGroup icon={Mail} isFocused={focusedField === "email"} label="Email *" isMobile={isMobile}>
                <input name="email" required type="email" placeholder="email@domain.com" style={styles.cleanInput}
                  onFocus={() => setFocusedField("email")} onBlur={() => setFocusedField(null)} />
              </InputGroup>
              <InputGroup icon={KeyRound} isFocused={focusedField === "password"} label="Password *" isMobile={isMobile}>
                <input name="password" required type={showPassword ? "text" : "password"} placeholder="••••••••" style={styles.cleanInput}
                  onFocus={() => setFocusedField("password")} onBlur={() => setFocusedField(null)} />
                <button type="button" onClick={() => setShowPassword(!showPassword)} style={styles.eyeButton}>
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </InputGroup>
            </div>

            <div style={styles.divider}></div>

            <div style={styles.sectionHeader}>
              <MapPin size={18} color={PRIMARY} />
              <h2 style={styles.sectionTitle}>Location</h2>
            </div>

            <div style={isMobile ? styles.flexColumn : styles.gridRowTwo}>
              <InputGroup isFocused={focusedField === "branch_location"} label="Branch Name *" isMobile={isMobile}>
                <input name="branch_location" required placeholder="e.g. Madhapur" style={styles.cleanInput}
                  onFocus={() => setFocusedField("branch_location")} onBlur={() => setFocusedField(null)} />
              </InputGroup>
              <InputGroup icon={Map} isFocused={focusedField === "addressLine"} label="Street Address *" isMobile={isMobile}>
                <input name="addressLine" required placeholder="Door No, Street..." style={styles.cleanInput}
                  onFocus={() => setFocusedField("addressLine")} onBlur={() => setFocusedField(null)} />
              </InputGroup>
            </div>

            <div style={isMobile ? styles.flexColumn : styles.gridRowThree}>
              <InputGroup isFocused={focusedField === "city"} label="City *" isMobile={isMobile}>
                <input name="city" required placeholder="City" style={styles.cleanInput}
                  onFocus={() => setFocusedField("city")} onBlur={() => setFocusedField(null)} />
              </InputGroup>
              <InputGroup isFocused={focusedField === "state"} label="State *" isMobile={isMobile}>
                <select name="state" required style={styles.selectInput}
                  onFocus={() => setFocusedField("state")} onBlur={() => setFocusedField(null)}>
                  <option value="">Select...</option>
                  {INDIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </InputGroup>
              <InputGroup isFocused={focusedField === "pincode"} label="Pincode *" isMobile={isMobile}>
                <input name="pincode" required placeholder="6 Digits" maxLength={6} type="number" style={styles.cleanInput}
                  onFocus={() => setFocusedField("pincode")} onBlur={() => setFocusedField(null)} />
              </InputGroup>
            </div>

            <div style={{ marginBottom: "24px" }}>
              <InputGroup icon={MapPin} isFocused={focusedField === "nearestBusStop"} label="Nearest Bus Stop *" isMobile={isMobile}>
                <input name="nearestBusStop" required placeholder="e.g. Jubilee Hills Checkpost" style={styles.cleanInput}
                  onFocus={() => setFocusedField("nearestBusStop")} onBlur={() => setFocusedField(null)} />
              </InputGroup>
            </div>

            <div style={styles.divider}></div>

            <div style={styles.sectionHeader}>
              <RefreshCw size={18} color={PRIMARY} />
              <h2 style={styles.sectionTitle}>Menu Sync</h2>
            </div>

            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "16px 20px", borderRadius: "12px", marginBottom: "24px",
              border: `1.5px solid ${syncMenu ? PRIMARY : BORDER}`,
              backgroundColor: syncMenu ? "#f0fdf4" : "#fcfcfd",
              transition: "all 0.25s ease",
              cursor: "pointer"
            }} onClick={() => setSyncMenu(!syncMenu)}>
              <div>
                <div style={{ fontSize: "15px", fontWeight: "700", color: TEXT_MAIN, marginBottom: "4px" }}>
                  {syncMenu ? "Sync Menu from Central (TV-1)" : "Don't Sync Menu"}
                </div>
                <div style={{ fontSize: "12px", color: TEXT_MUTED }}>
                  {syncMenu ? "The central menu will be cloned to this branch on creation" : "No menu will be copied — you can sync later from Menu Management"}
                </div>
              </div>
              <div style={{
                width: "50px", height: "28px", borderRadius: "14px",
                backgroundColor: syncMenu ? PRIMARY : "#cbd5e1",
                position: "relative", transition: "background-color 0.25s ease",
                flexShrink: 0, marginLeft: "16px"
              }}>
                <div style={{
                  width: "22px", height: "22px", borderRadius: "50%",
                  backgroundColor: "#fff", position: "absolute", top: "3px",
                  left: syncMenu ? "25px" : "3px",
                  transition: "left 0.25s ease",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.2)"
                }} />
              </div>
            </div>

            <button type="submit" disabled={loading} style={{ ...styles.button, padding: isMobile ? "18px" : "16px" }}>
              {loading ? <Loader2 className="animate-spin" size={20} /> : "Create Franchise Account"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

const styles = {
  pageContainer: { height: "100vh", backgroundColor: "#f8fafc", display: "flex", flexDirection: "column", fontFamily: '"Inter", sans-serif' },
  headerBar: { height: "70px", display: "flex", alignItems: "center", justifyContent: "space-between", backgroundColor: "#fff", borderBottom: `1px solid ${BORDER}`, position: "sticky", top: 0, zIndex: 100 },
  backButton: { background: "transparent", border: "none", cursor: "pointer", display: "flex", alignItems: "center", fontWeight: "600", color: TEXT_MAIN },
  title: { fontWeight: "800", color: TEXT_MAIN, margin: 0, letterSpacing: "-0.5px" },
  idBoxWrapper: { display: "flex", alignItems: "center" },
  idBox: { padding: "6px 12px", backgroundColor: "#f1f5f9", borderRadius: "8px", color: PRIMARY, fontWeight: "700", border: `1px solid ${BORDER}` },
  mainContent: { flex: 1, overflowY: "auto", width: "100%", boxSizing: "border-box" },
  formCard: { display: "flex", flexDirection: "column", maxWidth: "850px", width: "100%", margin: "0 auto", backgroundColor: "#fff", border: `1px solid ${BORDER}`, boxShadow: "0 1px 3px rgba(0,0,0,0.1)" },
  sectionHeader: { display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px", marginTop: "8px" },
  sectionTitle: { fontSize: "13px", fontWeight: "800", color: TEXT_MAIN, textTransform: "uppercase", letterSpacing: "0.8px", margin: 0 },
  inputLabel: { fontSize: "12px", fontWeight: "600", color: TEXT_MUTED, marginBottom: "8px", display: "block" },
  suggestionWrapper: { width: "100%" },
  suggestionBox: { display: "flex", alignItems: "center", padding: "0 14px", backgroundColor: "#f0fdf4", border: `1.5px dashed ${PRIMARY}`, borderRadius: "12px", color: PRIMARY, fontWeight: "700", cursor: "pointer", fontSize: "14px" },
  gridRowTwo: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px", marginBottom: "24px" },
  gridRowThree: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "24px", marginBottom: "24px" },
  flexColumn: { display: "flex", flexDirection: "column", gap: "24px", marginBottom: "24px" },
  cleanInput: { width: "100%", border: "none", outline: "none", fontSize: "16px", background: "transparent", color: TEXT_MAIN },
  selectInput: { width: "100%", border: "none", outline: "none", fontSize: "16px", background: "transparent", cursor: "pointer", color: TEXT_MAIN },
  eyeButton: { background: "transparent", border: "none", cursor: "pointer", color: TEXT_MUTED, padding: "4px" },
  divider: { height: "1px", backgroundColor: BORDER, margin: "8px 0 32px 0" },
  button: { width: "100%", borderRadius: "14px", border: "none", backgroundColor: PRIMARY, color: "#fff", fontSize: "16px", fontWeight: "700", cursor: "pointer", marginTop: "8px", transition: "opacity 0.2s", display: 'flex', justifyContent: 'center', alignItems: 'center' }
};

export default RegisterUser;