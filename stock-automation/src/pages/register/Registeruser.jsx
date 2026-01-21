import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../supabase/supabaseClient";
import { Eye, EyeOff, ArrowLeft, UserPlus, MapPin } from "lucide-react";

const PRIMARY = "#065f46";
const BORDER = "#e5e7eb";

// DATA for Dropdowns
const COUNTRIES = ["India"];
const INDIAN_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat", "Haryana",
  "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur",
  "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana",
  "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal", "Delhi", "Puducherry", "Chandigarh", "Jammu and Kashmir", "Ladakh"
];

// Sample Cities - Ideally this would be dynamic, but for now using a simple list + 'Other'
const MAJOR_CITIES = {
  "Maharashtra": ["Mumbai", "Pune", "Nagpur", "Nashik", "Other"],
  "Karnataka": ["Bengaluru", "Mysuru", "Hubballi", "Other"],
  "Delhi": ["New Delhi", "North Delhi", "South Delhi", "Other"],
  "Tamil Nadu": ["Chennai", "Coimbatore", "Madurai", "Other"],
  "Telangana": ["Hyderabad", "Warangal", "Other"],
  "West Bengal": ["Kolkata", "Howrah", "Other"],
  // Default fallback
  "default": ["Capital City", "Other"]
};

function RegisterUser() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  const [formData, setFormData] = useState({
    company: "",
    franchise_id: "",
    name: "",
    phone: "",
    email: "",
    password: "",
    branch_location: "",
    role: "franchise",
    // Address Fields
    country: "India",
    state: "",
    city: "",
    cityOther: "",
    pincode: "",
    addressLine: ""
  });

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const getCityOptions = () => {
    if (!formData.state) return [];
    return MAJOR_CITIES[formData.state] || MAJOR_CITIES["default"];
  };

  const handleSubmit = async () => {
    if (loading) return;
    setLoading(true);

    if (!formData.company) {
      alert("Please select a company");
      setLoading(false);
      return;
    }

    // Address Validation
    if (!formData.state || !formData.city || !formData.pincode || !formData.addressLine) {
      alert("Please complete the address details");
      setLoading(false);
      return;
    }

    // Construct final address string
    const finalCity = formData.city === "Other" ? formData.cityOther : formData.city;
    if (!finalCity) {
      alert("Please enter the city name");
      setLoading(false);
      return;
    }

    const fullAddress = `${formData.addressLine}, ${finalCity}, ${formData.state}, ${formData.country} - ${formData.pincode}`;

    const { data, error: authError } = await supabase.auth.signUp({
      email: formData.email.trim().toLowerCase(),
      password: formData.password,
    });

    if (authError) {
      alert(authError.message);
      setLoading(false);
      return;
    }

    if (!data.user) {
      alert("User not created");
      setLoading(false);
      return;
    }

    const { error: profileError } = await supabase
      .from("profiles")
      .upsert(
        {
          id: data.user.id,
          company: formData.company,
          franchise_id: formData.franchise_id.trim(),
          name: formData.name.trim(),
          phone: formData.phone.trim(),
          email: formData.email.trim().toLowerCase(),
          branch_location: formData.branch_location.trim(),
          address: fullAddress, // Storing concatenated address
          role: "franchise",
        },
        { onConflict: "id" }
      );

    if (profileError) {
      alert("Profile not saved: " + profileError.message);
      setLoading(false);
      return;
    }

    alert("Account created. Please login.");
    navigate("/");
  };

  return (
    <div style={styles.page}>
      <div style={styles.topBar}>
        <button onClick={() => navigate(-1)} style={styles.backButton}>
          <ArrowLeft size={18} />
          <span>Back</span>
        </button>
      </div>

      <div style={{ ...styles.card, width: isMobile ? "90%" : "500px" }}>
        <div style={styles.header}>
          <div style={styles.iconWrapper}>
            <UserPlus size={28} color={PRIMARY} />
          </div>
          <h1 style={styles.title}>Create Account</h1>
          <p style={styles.subtitle}>Register new franchise owner</p>
        </div>

        <div style={styles.form}>
          {/* COMPANY */}
          <select name="company" value={formData.company} onChange={handleChange} style={styles.select}>
            <option value="">Select Company</option>
            <option value="T vanamm">T vanamm</option>
            <option value="T leaf">T leaf</option>
          </select>

          <div style={styles.row}>
            <input name="franchise_id" placeholder="Franchise ID" onChange={handleChange} style={styles.input} />
            <input name="branch_location" placeholder="Branch Name" onChange={handleChange} style={styles.input} />
          </div>

          <input name="name" placeholder="Owner Name" onChange={handleChange} style={styles.input} />

          <div style={styles.row}>
            <input name="phone" placeholder="Phone" onChange={handleChange} style={styles.input} />
            <input name="email" type="email" placeholder="Email" onChange={handleChange} style={styles.input} />
          </div>

          <div style={styles.passwordWrapper}>
            <input
              name="password"
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              onChange={handleChange}
              style={styles.passwordInput}
            />
            <button type="button" onClick={() => setShowPassword((p) => !p)} style={styles.eyeButton}>
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          {/* ADDRESS SECTION */}
          <div style={styles.divider}>
            <span style={styles.dividerText}>Address Details</span>
          </div>

          <div style={styles.row}>
            <select name="country" value={formData.country} onChange={handleChange} style={styles.select}>
              <option value="India">India</option>
            </select>
            <input name="pincode" placeholder="Pincode" onChange={handleChange} style={styles.input} maxLength={6} />
          </div>

          <div style={styles.row}>
            <select name="state" value={formData.state} onChange={handleChange} style={styles.select}>
              <option value="">Select State</option>
              {INDIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>

            <select name="city" value={formData.city} onChange={handleChange} style={styles.select} disabled={!formData.state}>
              <option value="">Select City</option>
              {getCityOptions().map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {formData.city === "Other" && (
            <input name="cityOther" placeholder="Enter City Name" onChange={handleChange} style={styles.input} />
          )}

          <textarea
            name="addressLine"
            placeholder="Detailed Address (House No, Street, Landmark)"
            onChange={handleChange}
            style={styles.textarea}
            rows={3}
          />

          <button
            onClick={handleSubmit}
            disabled={loading}
            style={{
              ...styles.button,
              opacity: loading ? 0.7 : 1,
              cursor: loading ? "not-allowed" : "pointer",
            }}
          >
            {loading ? "Creating..." : "Create Account"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default RegisterUser;

const styles = {
  page: {
    minHeight: "100vh",
    width: "100vw",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#ffffff",
    fontFamily: '"Inter", sans-serif',
    position: "relative",
    padding: "40px 0",
  },
  topBar: { position: "absolute", top: "30px", left: "30px" },
  backButton: { display: "flex", alignItems: "center", gap: "8px", background: "transparent", border: "none", fontSize: "14px", fontWeight: "600", color: "#6b7280", cursor: "pointer" },
  card: { padding: "40px", border: `1.5px solid ${BORDER}`, borderRadius: "32px", backgroundColor: "#fff", textAlign: "center" },
  header: { marginBottom: "24px", display: "flex", flexDirection: "column", alignItems: "center" },
  iconWrapper: { width: "50px", height: "50px", borderRadius: "16px", background: "rgba(6, 95, 70, 0.05)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "12px" },
  title: { fontSize: "24px", fontWeight: "900", color: "#000", margin: "0 0 4px 0" },
  subtitle: { fontSize: "14px", color: "#6b7280", margin: 0 },
  form: { display: "flex", flexDirection: "column", gap: "12px" },
  row: { display: "flex", gap: "10px" },
  input: { width: "100%", padding: "14px", borderRadius: "12px", border: `1.5px solid ${BORDER}`, background: "#fff", fontSize: "14px", outline: "none" },
  textarea: { width: "100%", padding: "14px", borderRadius: "12px", border: `1.5px solid ${BORDER}`, background: "#fff", fontSize: "14px", outline: "none", resize: "none", fontFamily: '"Inter", sans-serif' },
  select: { width: "100%", padding: "14px", borderRadius: "12px", border: `1.5px solid ${BORDER}`, background: "#fff", fontSize: "14px", outline: "none", appearance: "none" },
  passwordWrapper: { position: "relative" },
  passwordInput: { width: "100%", padding: "14px 40px 14px 14px", borderRadius: "12px", border: `1.5px solid ${BORDER}`, background: "#fff", fontSize: "14px", outline: "none" },
  eyeButton: { position: "absolute", top: "50%", right: "14px", transform: "translateY(-50%)", background: "transparent", border: "none", cursor: "pointer", color: "#9ca3af" },
  button: { width: "100%", padding: "16px", borderRadius: "12px", border: "none", backgroundColor: PRIMARY, color: "#fff", fontSize: "14px", fontWeight: "800", cursor: "pointer", marginTop: "10px", boxShadow: "0 4px 12px rgba(6, 95, 70, 0.2)" },
  divider: { display: 'flex', alignItems: 'center', margin: '10px 0' },
  dividerText: { fontSize: '12px', fontWeight: '700', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '1px' }
};
