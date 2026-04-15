import React, { useState, useEffect, useMemo, useDeferredValue } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, Search, Plus, Edit2, Trash2, X, UserPlus, Loader2, Eye, EyeOff, Building2, User, Phone, Mail, MapPin, Target, Crosshair
} from "lucide-react";

import { supabase } from "../../frontend_supabase/supabaseClient";
import { useAuth } from "../../context/AuthContext";
import { BRAND_GREEN } from "../../utils/theme";

const GREEN = BRAND_GREEN;
const BORDER = "#e5e7eb";
const BLACK = "#000000";

const OFFICE_ROLES = [
  "General",
  "HR",
  "Marketing",
  "Accounts",
  "Developer",
  "Sales",
  "Operations"
];

const CentralOfficeStaff = () => {
  const navigate = useNavigate();

  const [profiles, setProfiles] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
  const [editingId, setEditingId] = useState(null);
  const [showPassword, setShowPassword] = useState(false);

  const [formData, setFormData] = useState({
    name: "", age: "", email: "", password: "", phone: "", office_role: "General"
  });

  const [isHqModalOpen, setIsHqModalOpen] = useState(false);
  const [hqSettings, setHqSettings] = useState({ latitude: "", longitude: "", radius_meters: 100 });
  const [savingHq, setSavingHq] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(false);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener('resize', handleResize);
    fetchOfficeStaff();
    fetchHqSettings();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const fetchHqSettings = async () => {
    const { data } = await supabase.from('office_settings').select('*').eq('id', 'HQ').maybeSingle();
    if (data) {
      setHqSettings({ latitude: data.latitude || "", longitude: data.longitude || "", radius_meters: data.radius_meters || 100 });
    }
  };

  const handleSaveHq = async (e) => {
    e.preventDefault();
    setSavingHq(true);
    try {
      const { error } = await supabase.from('office_settings').update({
        latitude: parseFloat(hqSettings.latitude),
        longitude: parseFloat(hqSettings.longitude),
        radius_meters: parseInt(hqSettings.radius_meters) || 100,
        updated_at: new Date().toISOString()
      }).eq('id', 'HQ');
      if (error) throw error;
      setIsHqModalOpen(false);
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setSavingHq(false);
    }
  };

  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser.");
      return;
    }
    setGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setHqSettings({
          ...hqSettings,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        });
        setGettingLocation(false);
      },
      (error) => {
        alert("Unable to retrieve your location. Please check browser permissions.");
        setGettingLocation(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const fetchOfficeStaff = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('office_staff_profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProfiles(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleGeo = async (id, currentVal) => {
    try {
      const { error } = await supabase.from('office_staff_profiles').update({ geo_enabled: !currentVal }).eq('id', id);
      if (error) throw error;
      setProfiles(prev => prev.map(p => p.id === id ? { ...p, geo_enabled: !currentVal } : p));
    } catch (err) {
      alert('Error toggling geo: ' + err.message);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      if (editingId) {
        // Update existing
        const { error: profileError } = await supabase
          .from('office_staff_profiles')
          .update({
            name: formData.name,
            age: formData.age ? parseInt(formData.age) : null,
            email: formData.email.trim().toLowerCase(),
            phone: formData.phone,
            office_role: formData.office_role
          })
          .eq('id', editingId);

        if (profileError) throw profileError;

        if (formData.password?.trim()) {
          const { error: pwdErr } = await supabase.rpc('update_staff_password', {
            target_user_id: editingId,
            new_password: formData.password
          });
          if (pwdErr) throw pwdErr;
        }
        alert("✅ Updated Successfully");
      } else {
        // ===== CROSS-TABLE EMAIL UNIQUENESS CHECK =====
        const normalizedEmail = formData.email.trim().toLowerCase();

        const [{ data: existsInProfiles }, { data: existsInStaff }, { data: existsInOffice }] = await Promise.all([
          supabase.from('profiles').select('id').eq('email', normalizedEmail).maybeSingle(),
          supabase.from('staff_profiles').select('id').eq('email', normalizedEmail).maybeSingle(),
          supabase.from('office_staff_profiles').select('id').eq('email', normalizedEmail).maybeSingle(),
        ]);

        if (existsInProfiles || existsInStaff || existsInOffice) {
          const source = existsInProfiles ? 'Franchise Owner' : existsInStaff ? 'Store Staff' : 'Office Staff';
          throw new Error(`This email is already registered as a ${source}. Each email must be unique across the entire system.`);
        }

        // Create new via edge function
        const { data: edgeData, error: edgeError } = await supabase.functions.invoke('register-user', {
          body: {
            email: formData.email.trim().toLowerCase(),
            password: formData.password,
            metadata: {
              name: formData.name,
              role: 'office_staff',
              office_role: formData.office_role,
              phone: formData.phone,
              branch: 'TV-1'
            }
          }
        });

        if (edgeError || edgeData?.error) {
          let errMsg = edgeError?.message || edgeData?.error || "Failed to create user safely.";
          // Extract Supabase Edge Function HTTP Error body if available
          if (edgeError && edgeError.context && typeof edgeError.context.json === 'function') {
            try {
              const errBody = await edgeError.context.json();
              if (errBody.error) errMsg = errBody.error;
            } catch (e) {}
          }
          throw new Error(errMsg);
        }

        const authData = edgeData;

        // Insert into our office specific table
        const { error: dbError } = await supabase.from('office_staff_profiles').insert([{
          id: authData.user.id,
          name: formData.name,
          age: formData.age ? parseInt(formData.age) : null,
          email: formData.email.trim().toLowerCase(),
          phone: formData.phone,
          office_role: formData.office_role,
          role: 'office_staff',
          branch: 'TV-1'
        }]);

        if (dbError) throw dbError;
        alert("✅ Office Staff Account Created");
      }

      fetchOfficeStaff();
      closeModal();
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Are you sure you want to completely delete ${name}? This will wipe their login and entire attendance history forever.`)) {
      return;
    }
    
    setDeleting(true);
    try {
      const { error } = await supabase.rpc('delete_office_staff_user', { user_id: id });
      if (error) throw error;
      
      alert("✅ Staff user deleted fully.");
      fetchOfficeStaff();
    } catch (err) {
      alert("Error deleting user: " + err.message);
    } finally {
      setDeleting(false);
    }
  };

  const handleOpenEdit = (profile) => {
    setEditingId(profile.id);
    setFormData({
      name: profile.name,
      age: profile.age || "",
      email: profile.email || "",
      password: "",
      phone: profile.phone || "",
      office_role: profile.office_role || "General"
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setFormData({ name: "", age: "", email: "", password: "", phone: "", office_role: "General" });
  };

  const deferredSearchTerm = useDeferredValue(searchTerm);

  const filteredProfiles = useMemo(() => {
    return profiles.filter(p =>
      p.name?.toLowerCase().includes(deferredSearchTerm.toLowerCase()) ||
      p.office_role?.toLowerCase().includes(deferredSearchTerm.toLowerCase())
    );
  }, [profiles, deferredSearchTerm]);

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <div style={styles.headerInner}>
          <button onClick={() => navigate(-1)} style={styles.backBtn}>
            <ArrowLeft size={18} /> <span>Back</span>
          </button>
          <h1 style={styles.heading}>
            Office <span style={{ color: GREEN }}>Staff</span>
          </h1>
          <div style={styles.idBox}>HQ : TV-1</div>
        </div>
      </header>

      <main style={{ ...styles.mainContent, padding: isMobile ? "0 15px 20px 15px" : "0 40px 20px 40px" }}>

        <div style={{ ...styles.actionRow, gap: isMobile ? '8px' : '15px' }}>
          <div style={{ ...styles.searchContainer, flex: 1 }}>
            <Search size={18} style={styles.searchIcon} color="#94a3b8" />
            <input
              type="text"
              placeholder={isMobile ? "Search..." : "Search by name or designation..."}
              style={styles.searchInput}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button style={{...styles.addBtn, background: "white", color: BLACK, border: `1px solid ${BORDER}`}} onClick={() => setIsHqModalOpen(true)}>
            <Target size={20} /> {!isMobile && "HQ Location"}
          </button>
          <button style={styles.addBtn} onClick={() => setIsModalOpen(true)}>
            <Plus size={20} /> {!isMobile && "New Office Staff"}
          </button>
        </div>

        {isMobile ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {loading ? (
              <div style={styles.loaderCenter}><Loader2 className="animate-spin" color={GREEN} size={32} /></div>
            ) : profiles.length === 0 ? (
              <div style={styles.emptyState}>No office staff found.</div>
            ) : filteredProfiles.map((p) => (
              <div key={p.id} style={styles.mobileCard}>
                <div style={styles.cardHeader}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={styles.cardAvatar}>
                      <User size={20} color={GREEN} />
                    </div>
                    <div>
                      <div style={{ fontWeight: '800', fontSize: '15px', color: BLACK }}>{p.name}</div>
                      <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '700' }}>{p.office_role}</div>
                    </div>
                  </div>
                </div>

                <div style={styles.cardBody}>
                  <div style={styles.cardDetailGrid}>
                    <div style={styles.cardInfoRow}><Phone size={14} color={GREEN} /> {p.phone}</div>
                    <div style={styles.cardInfoRow}><Mail size={14} color={GREEN} /> {p.email || 'No Email'}</div>
                    <div style={{ ...styles.cardInfoRow, justifyContent: 'space-between' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><MapPin size={14} color={GREEN} /> Geo Tag</span>
                      <button onClick={() => handleToggleGeo(p.id, p.geo_enabled !== false)} style={{ ...styles.toggleBtn, background: p.geo_enabled !== false ? GREEN : '#cbd5e1' }}>
                        <div style={{ ...styles.toggleKnob, transform: p.geo_enabled !== false ? 'translateX(18px)' : 'translateX(2px)' }} />
                      </button>
                    </div>
                  </div>
                  <div style={styles.cardActions}>
                    <button onClick={() => handleDelete(p.id, p.name)} disabled={deleting} style={{ ...styles.cardActionBtn, color: '#ef4444', background: '#fef2f2' }}><Trash2 size={16} /> DELETE</button>
                    <button onClick={() => handleOpenEdit(p)} style={{ ...styles.cardActionBtn, color: GREEN, background: `${GREEN}10` }}><Edit2 size={16} /> EDIT</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={styles.tableContainer}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>S.NO</th>
                  <th style={styles.th}>NAME</th>
                  <th style={styles.th}>DESIGNATION</th>
                  <th style={styles.th}>PHONE</th>
                  <th style={styles.th}>EMAIL</th>
                  <th style={{ ...styles.th, textAlign: 'center' }}>GEO TAG</th>
                  <th style={{ ...styles.th, textAlign: 'center' }}>ACTION</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="7"><div style={styles.loaderCenter}><Loader2 className="animate-spin" color={GREEN} size={32} /></div></td></tr>
                ) : profiles.length === 0 ? (
                  <tr><td colSpan="7"><div style={styles.emptyState}>No office staff found.</div></td></tr>
                ) : filteredProfiles.map((profile, index) => (
                  <tr key={profile.id} style={styles.tr}>
                    <td style={styles.td}>{index + 1}</td>
                    <td style={styles.td}>{profile.name}</td>
                    <td style={styles.td}><span style={styles.designationBadge}>{profile.office_role}</span></td>
                    <td style={styles.td}>{profile.phone}</td>
                    <td style={styles.td}>{profile.email}</td>
                    <td style={{ ...styles.td, textAlign: 'center' }}>
                      <button onClick={() => handleToggleGeo(profile.id, profile.geo_enabled !== false)} style={{ ...styles.toggleBtn, background: profile.geo_enabled !== false ? GREEN : '#cbd5e1' }}>
                        <div style={{ ...styles.toggleKnob, transform: profile.geo_enabled !== false ? 'translateX(18px)' : 'translateX(2px)' }} />
                      </button>
                    </td>
                    <td style={styles.actionTd}>
                      <button onClick={() => handleOpenEdit(profile)} style={styles.editBtn} title="Edit"><Edit2 size={16} /></button>
                      <button onClick={() => handleDelete(profile.id, profile.name)} disabled={deleting} style={styles.deleteBtn} title="Delete"><Trash2 size={16} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {/* Modal */}
      {isModalOpen && (
        <div style={styles.modalOverlay} onClick={closeModal}>
          <div style={{ ...styles.modalContent, width: isMobile ? "95%" : "550px", borderRadius: "18px" }} onClick={e => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={styles.modalIconBox}><UserPlus size={20} color={GREEN} /></div>
                <h2 style={{ margin: 0, fontWeight: '800', color: BLACK, fontSize: isMobile ? "20px" : "22px" }}>
                  {editingId ? "Update Office Staff" : "New Office Staff"}
                </h2>
              </div>
              <button onClick={closeModal} style={styles.closeBtn}><X size={24} /></button>
            </div>

            <div style={{ marginBottom: '15px', padding: '10px', background: '#f8fafc', borderRadius: '10px', border: `1px solid ${BORDER}`, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Building2 size={16} color="#64748b" />
              <span style={{ fontSize: '12px', fontWeight: '700', color: '#475569' }}>Registered under: <span style={{ color: GREEN }}>HQ - TV-1</span></span>
            </div>

            <form onSubmit={handleSubmit} style={{ ...styles.formGrid, gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr" }}>
              <div style={styles.inputGroup}>
                <label style={styles.label}>Full Name *</label>
                <input required style={styles.input} type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
              </div>
              <div style={styles.inputGroup}>
                <label style={styles.label}>Age</label>
                <input style={styles.input} type="number" value={formData.age} onChange={e => setFormData({ ...formData, age: e.target.value })} />
              </div>
              
              <div style={styles.inputGroup}>
                <label style={styles.label}>Designation / Role *</label>
                <select required style={styles.input} value={formData.office_role} onChange={e => setFormData({ ...formData, office_role: e.target.value })}>
                  {OFFICE_ROLES.map(r => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>

              <div style={styles.inputGroup}>
                <label style={styles.label}>Phone Number *</label>
                <input required style={styles.input} type="tel" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} />
              </div>

              <div style={{ ...styles.inputGroup, gridColumn: isMobile ? 'span 1' : 'span 2' }}>
                <label style={styles.label}>Email Address *</label>
                <input required style={styles.input} type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} placeholder="employee@domain.com" />
              </div>
              
              <div style={{ ...styles.inputGroup, gridColumn: isMobile ? 'span 1' : 'span 2' }}>
                <label style={styles.label}>Password {!editingId && "*"}</label>
                <div style={{ position: 'relative' }}>
                  <input style={{ ...styles.input, width: '100%', boxSizing: 'border-box' }} type={showPassword ? "text" : "password"} placeholder={editingId ? "Leave blank to keep current" : "Min 6 chars"} value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} required={!editingId} minLength={!editingId ? 6 : undefined} />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button>
                </div>
              </div>

              <div style={{ ...styles.modalFooter, gridColumn: isMobile ? "span 1" : "span 2" }}>
                <button type="button" onClick={closeModal} style={styles.cancelBtn}>Cancel</button>
                <button type="submit" disabled={submitting} style={styles.submitBtn}>{submitting ? "Saving..." : "Save Profile"} </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* HQ Settings Modal */}
      {isHqModalOpen && (
        <div style={styles.modalOverlay} onClick={() => setIsHqModalOpen(false)}>
          <div style={{ ...styles.modalContent, width: isMobile ? "95%" : "450px", borderRadius: "18px" }} onClick={e => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={styles.modalIconBox}><Target size={20} color={GREEN} /></div>
                <h2 style={{ margin: 0, fontWeight: '800', color: BLACK, fontSize: isMobile ? "20px" : "22px" }}>
                  HQ Location Settings
                </h2>
              </div>
              <button onClick={() => setIsHqModalOpen(false)} style={styles.closeBtn}><X size={24} /></button>
            </div>

            <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '20px', lineHeight: '1.5' }}>
              Set the exact GPS coordinates for the TV-1 Headquarters. Staff must be located within the radius to mark their attendance.
            </p>

            <form onSubmit={handleSaveHq} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <button 
                type="button" 
                onClick={handleGetCurrentLocation}
                disabled={gettingLocation}
                style={{ 
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', 
                  background: '#f1f5f9', color: BLACK, border: `1px solid ${BORDER}`, 
                  padding: '12px', borderRadius: '12px', fontWeight: '700', cursor: 'pointer',
                  opacity: gettingLocation ? 0.7 : 1
                }}
              >
                {gettingLocation ? <Loader2 size={18} className="animate-spin" /> : <Crosshair size={18} color={GREEN} />}
                {gettingLocation ? "Detecting Location..." : "Use My Current Location"}
              </button>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <div style={styles.inputGroup}>
                  <label style={styles.label}>Latitude *</label>
                  <input required style={styles.input} type="number" step="any" placeholder="e.g. 17.385044" value={hqSettings.latitude} onChange={e => setHqSettings({...hqSettings, latitude: e.target.value})} />
                </div>
                <div style={styles.inputGroup}>
                  <label style={styles.label}>Longitude *</label>
                  <input required style={styles.input} type="number" step="any" placeholder="e.g. 78.486671" value={hqSettings.longitude} onChange={e => setHqSettings({...hqSettings, longitude: e.target.value})} />
                </div>
              </div>
              
              <div style={styles.inputGroup}>
                <label style={styles.label}>Allowed Radius (Meters) *</label>
                <input required style={styles.input} type="number" min="10" placeholder="e.g. 100" value={hqSettings.radius_meters} onChange={e => setHqSettings({...hqSettings, radius_meters: e.target.value})} />
              </div>

              <div style={styles.modalFooter}>
                <button type="button" onClick={() => setIsHqModalOpen(false)} style={styles.cancelBtn}>Cancel</button>
                <button type="submit" disabled={savingHq} style={styles.submitBtn}>{savingHq ? "Saving..." : "Save Coordinates"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

const styles = {
  page: { background: "#f8fafc", minHeight: "100vh", fontFamily: '"Inter", sans-serif', color: BLACK },
  header: { background: '#fff', borderBottom: '1px solid #e2e8f0', position: 'relative', zIndex: 30, width: '100%', marginBottom: '24px', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' },
  headerInner: { padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', gap: '12px' },
  backBtn: { background: "none", border: "none", color: "#000", fontSize: "14px", fontWeight: "700", cursor: "pointer", padding: 0, display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 },
  heading: { fontWeight: "900", color: "#000", textTransform: 'uppercase', letterSpacing: "-0.5px", margin: 0, fontSize: '20px', textAlign: 'center', flex: 1, lineHeight: 1.2 },
  idBox: { background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '6px 12px', color: '#334155', fontSize: '11px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap', flexShrink: 0 },
  mainContent: { width: "100%", display: "flex", flexDirection: "column", gap: "10px" },
  actionRow: { display: 'flex', marginBottom: '10px' },
  searchContainer: { position: 'relative', display: 'flex', alignItems: 'center' },
  searchIcon: { position: 'absolute', left: '14px' },
  searchInput: { width: '100%', padding: '12px 12px 12px 42px', borderRadius: '14px', border: `1.5px solid ${BORDER}`, outline: 'none', fontWeight: '600', fontSize: '14px', background: 'white' },
  addBtn: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '12px 18px', background: GREEN, color: 'white', borderRadius: '14px', fontWeight: '800', border: 'none', cursor: 'pointer', transition: 'opacity 0.2s' },
  mobileCard: { background: 'white', borderRadius: '18px', border: `1.5px solid ${BORDER}`, overflow: 'hidden', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' },
  cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  cardAvatar: { width: '42px', height: '42px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: `${GREEN}15` },
  cardBody: { paddingTop: '10px', borderTop: `1px dashed ${BORDER}` },
  cardDetailGrid: { display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' },
  cardInfoRow: { fontSize: '13px', fontWeight: '600', color: '#475569', display: 'flex', alignItems: 'center', gap: '10px' },
  cardActions: { display: 'flex', gap: '8px' },
  cardActionBtn: { flex: 1, padding: '10px', borderRadius: '10px', border: 'none', fontSize: '11px', fontWeight: '800', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', cursor: 'pointer' },
  tableContainer: { background: 'white', borderRadius: '20px', border: `1px solid ${BORDER}`, overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' },
  table: { width: '100%', borderCollapse: 'collapse', textAlign: 'left' },
  th: { padding: '16px 20px', fontSize: '11px', fontWeight: '900', color: '#64748b', borderBottom: `1px solid ${BORDER}`, textTransform: 'uppercase', letterSpacing: '0.5px' },
  tr: { borderBottom: `1px solid ${BORDER}`, transition: 'background 0.2s' },
  td: { padding: '16px 20px', fontSize: '14px', fontWeight: '600', color: '#1e293b' },
  designationBadge: { background: '#f1f5f9', color: '#334155', padding: '4px 10px', borderRadius: '100px', fontSize: '12px', fontWeight: '800', border: '1px solid #e2e8f0' },
  actionTd: { display: 'flex', justifyContent: 'center', gap: '10px', padding: '16px' },
  editBtn: { padding: '8px', borderRadius: '8px', background: '#f0fdf4', color: GREEN, border: 'none', cursor: 'pointer' },
  deleteBtn: { padding: '8px', borderRadius: '8px', background: '#fef2f2', color: '#ef4444', border: 'none', cursor: 'pointer' },
  modalOverlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(6px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 },
  modalContent: { background: 'white', padding: '20px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', maxHeight: '95vh', overflowY: 'auto' },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' },
  modalIconBox: { width: '40px', height: '40px', background: `${GREEN}10`, borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  closeBtn: { background: '#f1f5f9', border: 'none', cursor: 'pointer', padding: '6px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  formGrid: { display: 'grid', gap: '12px' },
  inputGroup: { display: 'flex', flexDirection: 'column', gap: '6px' },
  label: { fontSize: '12px', fontWeight: '800', color: '#475569' },
  input: { padding: '10px 12px', borderRadius: '12px', border: `1.5px solid ${BORDER}`, outline: 'none', fontSize: '14px', fontWeight: '600', boxSizing: 'border-box', background: 'white' },
  eyeBtn: { position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', border: 'none', background: 'none', cursor: 'pointer', color: '#64748b' },
  modalFooter: { display: 'flex', gap: '12px', marginTop: '15px' },
  cancelBtn: { flex: 1, padding: '14px', borderRadius: '12px', border: `1.5px solid ${BORDER}`, background: 'white', fontWeight: '700', cursor: 'pointer' },
  submitBtn: { flex: 1.5, padding: '14px', borderRadius: '12px', border: 'none', background: GREEN, color: 'white', fontWeight: '800', cursor: 'pointer' },
  loaderCenter: { display: 'flex', justifyContent: 'center', padding: '50px' },
  emptyState: { textAlign: 'center', padding: '50px', color: '#94a3b8', fontWeight: '600', fontSize: '15px' },
  toggleBtn: { width: '42px', height: '24px', borderRadius: '12px', border: 'none', cursor: 'pointer', position: 'relative', transition: 'background 0.2s', padding: 0, display: 'flex', alignItems: 'center' },
  toggleKnob: { width: '20px', height: '20px', borderRadius: '50%', background: 'white', boxShadow: '0 1px 3px rgba(0,0,0,0.2)', transition: 'transform 0.2s', position: 'absolute' }
};

export default CentralOfficeStaff;
