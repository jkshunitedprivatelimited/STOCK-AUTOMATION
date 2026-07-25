import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../../frontend_supabase/supabaseClient";
import {
  Eye, EyeOff, MapPin, Building2, User, Phone, Mail, KeyRound, Map, Loader2, IndianRupee, RefreshCw
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

function InviteRegister() {
  const { token } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [inviteData, setInviteData] = useState(null);

  const [showPassword, setShowPassword] = useState(false);
  const [focusedField, setFocusedField] = useState(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState("");

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);

    const validateToken = async () => {
      try {
        const { data, error } = await supabase
          .from('franchise_invites')
          .select('*')
          .eq('id', token)
          .single();

        if (error || !data) {
          setErrorMsg("This invitation link is invalid or does not exist.");
          setValidating(false);
          return;
        }

        if (data.status !== 'pending') {
          setErrorMsg("This invitation link has already been used.");
          setValidating(false);
          return;
        }

        if (new Date() > new Date(data.expires_at)) {
          setErrorMsg("This invitation link has expired. Please request a new one from the admin.");
          setValidating(false);
          return;
        }

        setInviteData(data);
      } catch (err) {
        setErrorMsg("Failed to validate invitation link.");
        console.error(err);
      } finally {
        setValidating(false);
      }
    };

    if (token) validateToken();
    else {
      setErrorMsg("No token provided in the URL.");
      setValidating(false);
    }

    return () => window.removeEventListener('resize', handleResize);
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!inviteData) return;

    const form = e.target;
    const data = new FormData(form);
    
    const emailStr = data.get("email");
    const passwordStr = data.get("password");

    if (!emailStr || !passwordStr) return alert("Email and Password are required.");

    setLoading(true);
    try {
      const metadataPayload = {
        name: (data.get("name") || "").trim(),
        phone: (data.get("phone") || "").trim(),
        company: inviteData.company_name.trim(),
        franchise_id: inviteData.franchise_id.trim().toUpperCase(),
        branch_location: (data.get("branch_location") || "").trim(),
        address: (data.get("addressLine") || "").trim(),
        city: (data.get("city") || "").trim().toUpperCase(),
        state: data.get("state") || "",
        pincode: (data.get("pincode") || "").trim(),
        nearest_bus_stop: (data.get("nearestBusStop") || "").trim(),
        transportation_charge: inviteData.transportation_charge,
        role: 'franchise'
      };

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 45000);

      let resData;
      try {
        const response = await fetch(`${supabaseUrl}/functions/v1/register-user`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseAnonKey}`,
            'apikey': supabaseAnonKey,
          },
          body: JSON.stringify({
            email: emailStr.trim().toLowerCase(),
            password: passwordStr,
            metadata: metadataPayload
          }),
          signal: controller.signal,
        });
        clearTimeout(timeout);
        resData = await response.json();
      } catch (fetchErr) {
        clearTimeout(timeout);
        if (fetchErr.name === 'AbortError') {
          throw new Error("Registration timed out. The server took too long to respond. Please try again.");
        }
        throw new Error("Failed to connect to the registration service. Please check your internet connection.");
      }

      if (resData?.error) {
        throw new Error(resData.error);
      }

      // Update Invite Status to 'used'
      await supabase.from('franchise_invites').update({ status: 'used' }).eq('id', token);

      if (inviteData.sync_menu) {
        try {
          const { error: syncError } = await supabase.rpc('clone_franchise_menu', {
            target_id: inviteData.franchise_id.trim().toUpperCase(),
            central_id: 'TV-1'
          });
          if (syncError) {
            console.error('Menu sync error:', syncError);
          }
        } catch (syncErr) {
          console.error(syncErr);
        }
      }

      setSubmittedEmail(emailStr.trim().toLowerCase());
      setSubmitSuccess(true);

    } catch (err) {
      alert("❌ Registration Failed: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  if (validating) {
    return (
      <div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "#f8fafc" }}>
        <Loader2 className="animate-spin" size={40} color={PRIMARY} />
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "#f8fafc" }}>
        <div style={{ backgroundColor: "#fff", padding: "40px", borderRadius: "16px", boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)", textAlign: "center", maxWidth: "400px" }}>
          <div style={{ color: "#ef4444", fontWeight: "700", fontSize: "20px", marginBottom: "12px" }}>Access Denied</div>
          <div style={{ color: TEXT_MUTED, fontSize: "15px" }}>{errorMsg}</div>
        </div>
      </div>
    );
  }

  if (submitSuccess) {
    return (
      <div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "#f8fafc", fontFamily: '"Inter", sans-serif' }}>
        <div style={{ backgroundColor: "#fff", padding: "48px 40px", borderRadius: "20px", boxShadow: "0 4px 24px rgba(0,0,0,0.08)", textAlign: "center", maxWidth: "460px", width: "90%" }}>
          <div style={{ width: "64px", height: "64px", borderRadius: "50%", backgroundColor: "#f0fdf4", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px auto" }}>
            <Mail size={32} color={PRIMARY} />
          </div>
          <h2 style={{ color: TEXT_MAIN, fontSize: "22px", fontWeight: "800", margin: "0 0 12px 0" }}>Registration Submitted!</h2>
          <p style={{ color: TEXT_MUTED, fontSize: "15px", lineHeight: "1.6", margin: "0 0 8px 0" }}>
            If <strong style={{ color: TEXT_MAIN }}>{submittedEmail}</strong> is a valid email address, you will receive a confirmation email with your login credentials shortly.
          </p>
          <p style={{ color: TEXT_MUTED, fontSize: "14px", lineHeight: "1.5", margin: "0 0 28px 0" }}>
            Please check your inbox (and spam folder) for the email from <strong>JKSH United</strong>.
          </p>
          <button
            onClick={() => navigate("/login")}
            style={{ backgroundColor: PRIMARY, color: "#fff", border: "none", borderRadius: "12px", padding: "14px 32px", fontSize: "15px", fontWeight: "700", cursor: "pointer", transition: "opacity 0.2s" }}
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.pageContainer}>
      <div style={{ ...styles.headerBar, padding: isMobile ? "0 12px" : "0 24px" }}>
        <div style={{ ...styles.title, fontSize: isMobile ? "18px" : "22px", color: PRIMARY }}>JKSH United</div>
      </div>

      <div style={{ ...styles.mainContent, padding: isMobile ? "12px" : "32px" }}>
        <div style={{ ...styles.formCard, padding: isMobile ? "24px 16px" : "40px", borderRadius: isMobile ? "20px" : "16px" }}>
          
          <div style={{ textAlign: "center", marginBottom: "32px" }}>
            <h1 style={{ fontSize: "24px", fontWeight: "800", color: TEXT_MAIN, margin: "0 0 8px 0" }}>Franchise Registration</h1>
            <p style={{ fontSize: "14px", color: TEXT_MUTED, margin: 0 }}>Please complete your details to set up your franchise account.</p>
          </div>

          <form onSubmit={handleSubmit}>
            <div style={styles.sectionHeader}>
              <Building2 size={18} color={PRIMARY} />
              <h2 style={styles.sectionTitle}>Brand Identity (Assigned)</h2>
            </div>

            <div style={isMobile ? styles.flexColumn : styles.gridRowTwo}>
              <InputGroup label="Brand" isMobile={isMobile}>
                <input readOnly value={inviteData.company_name} style={{ ...styles.cleanInput, color: TEXT_MUTED, backgroundColor: "transparent" }} />
              </InputGroup>

              <InputGroup label="Franchise ID" isMobile={isMobile}>
                <input readOnly value={inviteData.franchise_id} style={{ ...styles.cleanInput, color: TEXT_MUTED, backgroundColor: "transparent" }} />
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

            <button type="submit" disabled={loading} style={{ ...styles.button, padding: isMobile ? "18px" : "16px" }}>
              {loading ? <Loader2 className="animate-spin" size={20} /> : "Complete Registration"}
            </button>
          </form>

        </div>
      </div>
    </div>
  );
}

const styles = {
  pageContainer: { minHeight: "100vh", backgroundColor: "#f8fafc", display: "flex", flexDirection: "column", fontFamily: '"Inter", sans-serif' },
  headerBar: { height: "70px", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "#fff", borderBottom: `1px solid ${BORDER}`, position: "sticky", top: 0, zIndex: 100 },
  title: { fontWeight: "800", margin: 0, letterSpacing: "-0.5px" },
  mainContent: { flex: 1, overflowY: "auto", width: "100%", boxSizing: "border-box" },
  formCard: { display: "flex", flexDirection: "column", maxWidth: "850px", width: "100%", margin: "0 auto", backgroundColor: "#fff", border: `1px solid ${BORDER}`, boxShadow: "0 1px 3px rgba(0,0,0,0.1)" },
  sectionHeader: { display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px", marginTop: "8px" },
  sectionTitle: { fontSize: "13px", fontWeight: "800", color: TEXT_MAIN, textTransform: "uppercase", letterSpacing: "0.8px", margin: 0 },
  inputLabel: { fontSize: "12px", fontWeight: "600", color: TEXT_MUTED, marginBottom: "8px", display: "block" },
  gridRowTwo: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px", marginBottom: "24px" },
  gridRowThree: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "24px", marginBottom: "24px" },
  flexColumn: { display: "flex", flexDirection: "column", gap: "24px", marginBottom: "24px" },
  cleanInput: { width: "100%", border: "none", outline: "none", fontSize: "16px", background: "transparent", color: TEXT_MAIN },
  selectInput: { width: "100%", border: "none", outline: "none", fontSize: "16px", background: "transparent", cursor: "pointer", color: TEXT_MAIN },
  eyeButton: { background: "transparent", border: "none", cursor: "pointer", color: TEXT_MUTED, padding: "4px" },
  divider: { height: "1px", backgroundColor: BORDER, margin: "8px 0 32px 0" },
  button: { width: "100%", borderRadius: "14px", border: "none", backgroundColor: PRIMARY, color: "#fff", fontSize: "16px", fontWeight: "700", cursor: "pointer", marginTop: "8px", transition: "opacity 0.2s", display: 'flex', justifyContent: 'center', alignItems: 'center' }
};

export default InviteRegister;
