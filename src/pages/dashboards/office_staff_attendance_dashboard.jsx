import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../frontend_supabase/supabaseClient';
import { BRAND_GREEN } from '../../utils/theme';
import {
  Clock, MapPin, CheckCircle2, XCircle, LogOut, Loader2, Calendar as CalendarIcon, History, AlertTriangle, Coffee
} from 'lucide-react';

const PRIMARY = BRAND_GREEN;
const BLACK = '#000000';
const BORDER = '#e5e7eb';

// Haversine formula to calculate distance between two coordinates in meters
function getDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3;
  const p1 = lat1 * Math.PI / 180;
  const p2 = lat2 * Math.PI / 180;
  const dp = (lat2 - lat1) * Math.PI / 180;
  const dl = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(dp / 2) * Math.sin(dp / 2) +
    Math.cos(p1) * Math.cos(p2) *
    Math.sin(dl / 2) * Math.sin(dl / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

export default function OfficeStaffAttendanceDashboard() {
  const { user, profile, logout } = useAuth();
  const navigate = useNavigate();

  const [currentTime, setCurrentTime] = useState(new Date());
  const [todayLog, setTodayLog] = useState(null);
  const [historyLogs, setHistoryLogs] = useState([]);
  
  const [geoError, setGeoError] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const [hqSettings, setHqSettings] = useState(null);
  const [geoEnabled, setGeoEnabled] = useState(true);
  const [showCheckoutConfirm, setShowCheckoutConfirm] = useState(false);

  // 1. Live Clock
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // 2. Fetch Attendance Data & HQ Settings & Geo Setting
  useEffect(() => {
    if (user?.id) {
      fetchAttendanceData();
      fetchHqSettings();
      fetchGeoEnabled();
    }
  }, [user]);

  const fetchGeoEnabled = async () => {
    try {
      const { data } = await supabase.from('office_staff_profiles').select('geo_enabled').eq('id', user.id).maybeSingle();
      if (data) {
        setGeoEnabled(data.geo_enabled !== false); // default true
      }
    } catch (err) {
      console.error("Failed to load geo setting", err);
    }
  };

  const fetchHqSettings = async () => {
    try {
      const { data } = await supabase.from('office_settings').select('*').eq('id', 'HQ').maybeSingle();
      if (data) {
        setHqSettings(data);
      }
    } catch (err) {
      console.error("Failed to load HQ settings", err);
    }
  };

  const fetchAttendanceData = async () => {
    try {
      const todayStr = new Date().toLocaleDateString('en-CA');

      const { data: todayData } = await supabase
        .from('office_staff_attendance_logs')
        .select('*')
        .eq('staff_id', user.id)
        .eq('date', todayStr)
        .maybeSingle();

      setTodayLog(todayData);

      const { data: historyData } = await supabase
        .from('office_staff_attendance_logs')
        .select('*')
        .eq('staff_id', user.id)
        .order('date', { ascending: false })
        .limit(10);

      setHistoryLogs(historyData || []);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const performAction = async (actionType, latitude, longitude) => {
    try {
      const todayStr = new Date().toLocaleDateString('en-CA');
      const timeNow = new Date().toISOString();

      if (actionType === 'CHECK_IN') {
        const { error } = await supabase.from('office_staff_attendance_logs').insert([{
          staff_id: user.id,
          date: todayStr,
          check_in_time: timeNow,
          check_in_location: latitude !== null ? { latitude, longitude } : null,
          status: 'Checked In',
          total_break_minutes: 0
        }]);
        if (error) throw error;
      } else if (actionType === 'CHECK_OUT') {
        const updatePayload = {
          check_out_time: timeNow,
          check_out_location: latitude !== null ? { latitude, longitude } : null,
          status: 'Checked Out'
        };
        // If currently on break, end the break and add to total
        if (todayLog?.status === 'On Break' && todayLog?.break_start_time) {
          const breakMinutes = Math.round((new Date() - new Date(todayLog.break_start_time)) / 60000);
          updatePayload.total_break_minutes = (todayLog.total_break_minutes || 0) + breakMinutes;
          updatePayload.break_start_time = null;
        }
        const { error } = await supabase.from('office_staff_attendance_logs')
          .update(updatePayload)
          .eq('id', todayLog.id);
        if (error) throw error;
      } else if (actionType === 'START_BREAK') {
        const { error } = await supabase.from('office_staff_attendance_logs')
          .update({ status: 'On Break', break_start_time: timeNow })
          .eq('id', todayLog.id);
        if (error) throw error;
      } else if (actionType === 'END_BREAK') {
        const breakMinutes = Math.round((new Date() - new Date(todayLog.break_start_time)) / 60000);
        const { error } = await supabase.from('office_staff_attendance_logs')
          .update({
            status: 'Checked In',
            break_start_time: null,
            total_break_minutes: (todayLog.total_break_minutes || 0) + breakMinutes
          })
          .eq('id', todayLog.id);
        if (error) throw error;
      }

      await fetchAttendanceData();
    } catch (err) {
      setGeoError("Database error: " + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAction = async (actionType) => {
    setGeoError("");
    setIsProcessing(true);

    // If geo is disabled for this user, skip location check entirely
    if (!geoEnabled) {
      await performAction(actionType, null, null);
      return;
    }

    if (!navigator.geolocation) {
      setGeoError("Geolocation is not supported by your browser.");
      setIsProcessing(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;

        if (!hqSettings || !hqSettings.latitude || !hqSettings.longitude) {
           setGeoError("HQ Location is not configured by Central Admin yet. Cannot verify attendance.");
           setIsProcessing(false);
           return;
        }

        const hqLat = parseFloat(hqSettings.latitude);
        const hqLng = parseFloat(hqSettings.longitude);
        const maxRadius = parseInt(hqSettings.radius_meters) || 100;

        const distance = getDistance(latitude, longitude, hqLat, hqLng);

        if (distance > maxRadius) {
          setGeoError(`Check-In BLOCKED. You are ${Math.round(distance)} meters away from the office. You must be within ${maxRadius} meters to check in.`);
          setIsProcessing(false);
          return;
        }

        await performAction(actionType, latitude, longitude);
      },
      (error) => {
        setIsProcessing(false);
        switch (error.code) {
          case error.PERMISSION_DENIED:
            setGeoError("You must allow location access to check-in.");
            break;
          case error.POSITION_UNAVAILABLE:
            setGeoError("Location information is unavailable. Check your device GPS.");
            break;
          case error.TIMEOUT:
            setGeoError("The request to get user location timed out.");
            break;
          default:
            setGeoError("An unknown error occurred while getting location.");
            break;
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const handleCheckoutClick = () => {
    setShowCheckoutConfirm(true);
  };

  const confirmCheckout = () => {
    setShowCheckoutConfirm(false);
    handleAction('CHECK_OUT');
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  if (isLoading) {
    return (
      <div style={styles.pageCenter}>
        <Loader2 className="animate-spin" size={40} color={PRIMARY} />
        <p style={{ marginTop: '16px', fontWeight: '700', color: '#64748b' }}>Loading Attendance Portal...</p>
      </div>
    );
  }

  // Determine current status state
  const hasCheckedIn = !!todayLog;
  const hasCheckedOut = !!todayLog?.check_out_time;
  const isOnBreak = todayLog?.status === 'On Break';

  // Calculate live break duration
  let liveBreakMinutes = 0;
  if (isOnBreak && todayLog?.break_start_time) {
    liveBreakMinutes = Math.round((currentTime - new Date(todayLog.break_start_time)) / 60000);
  }

  return (
    <div style={styles.page}>
      {/* HEADER */}
      <header style={styles.header}>
        <div style={styles.headerInner}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={styles.logoBox}>
              <span style={{ fontWeight: '900', color: PRIMARY, fontSize: '18px' }}>JKSH</span>
            </div>
            <div>
              <h1 style={{ fontWeight: '900', fontSize: '18px', margin: 0, color: BLACK, lineHeight: '1.2' }}>HQ Attendance</h1>
              <p style={{ fontSize: '12px', color: '#64748b', margin: 0, fontWeight: '600' }}>Branch TV-1 Staff Portal</p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontWeight: '800', fontSize: '14px', color: BLACK }}>{profile?.name || user?.email}</div>
              <div style={{ fontSize: '11px', color: PRIMARY, fontWeight: '700', textTransform: 'uppercase' }}>{profile?.office_role || 'Staff'}</div>
            </div>
            <button onClick={handleLogout} style={styles.logoutBtn} title="Sign Out">
              <LogOut size={16} /> <span style={{ fontWeight: '700' }}>Logout</span>
            </button>
          </div>
        </div>
      </header>

      <main style={styles.mainContainer}>
        <div style={styles.grid}>
          
          {/* CLOCK & ACTIONS CARD */}
          <div style={styles.card}>
            <div style={styles.cardHeader}>
              <Clock size={20} color={PRIMARY} />
              <h2 style={styles.cardTitle}>Live Timeclock</h2>
            </div>
            <div style={styles.clockBody}>
              <div style={styles.timeDisplay}>
                {currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </div>
              <div style={styles.dateDisplay}>
                {currentTime.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </div>

              {geoError && (
                <div style={styles.errorBox}>
                  <AlertTriangle size={18} color="#ef4444" style={{ flexShrink: 0 }} />
                  <span>{geoError}</span>
                </div>
              )}

              <div style={styles.actionArea}>
                {!hasCheckedIn ? (
                  <button 
                    style={{ ...styles.actionBtn, background: PRIMARY, color: 'white', opacity: isProcessing ? 0.7 : 1 }}
                    onClick={() => handleAction('CHECK_IN')}
                    disabled={isProcessing}
                  >
                    {isProcessing ? <Loader2 className="animate-spin" size={24} /> : <CheckCircle2 size={24} />}
                    <span>{isProcessing ? 'Verifying Location...' : 'PRESS TO CHECK IN'}</span>
                  </button>
                ) : !hasCheckedOut ? (
                  <>
                    <div style={styles.statusPill}>
                      <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: isOnBreak ? '#f59e0b' : '#22c55e' }} />
                      {isOnBreak 
                        ? `On Break — ${liveBreakMinutes} min${liveBreakMinutes !== 1 ? 's' : ''} (Total: ${(todayLog.total_break_minutes || 0) + liveBreakMinutes} mins)`
                        : `Checked In since ${new Date(todayLog.check_in_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`
                      }
                    </div>

                    {todayLog.total_break_minutes > 0 && !isOnBreak && (
                      <div style={{ fontSize: '12px', fontWeight: '700', color: '#64748b', textAlign: 'center' }}>
                        Total break today: {todayLog.total_break_minutes} min{todayLog.total_break_minutes !== 1 ? 's' : ''}
                      </div>
                    )}

                    {isOnBreak ? (
                      <button 
                        style={{ ...styles.actionBtn, background: '#f59e0b', color: 'white', opacity: isProcessing ? 0.7 : 1 }}
                        onClick={() => handleAction('END_BREAK')}
                        disabled={isProcessing}
                      >
                        {isProcessing ? <Loader2 className="animate-spin" size={24} /> : <Coffee size={24} />}
                        <span>{isProcessing ? 'Ending Break...' : 'END BREAK'}</span>
                      </button>
                    ) : (
                      <button 
                        style={{ ...styles.actionBtn, background: '#f59e0b', color: 'white', opacity: isProcessing ? 0.7 : 1 }}
                        onClick={() => handleAction('START_BREAK')}
                        disabled={isProcessing}
                      >
                        {isProcessing ? <Loader2 className="animate-spin" size={24} /> : <Coffee size={24} />}
                        <span>{isProcessing ? 'Starting Break...' : 'TAKE A BREAK'}</span>
                      </button>
                    )}

                    <button 
                      style={{ ...styles.actionBtn, background: '#ef4444', color: 'white', opacity: isProcessing ? 0.7 : 1 }}
                      onClick={handleCheckoutClick}
                      disabled={isProcessing}
                    >
                      {isProcessing ? <Loader2 className="animate-spin" size={24} /> : <XCircle size={24} />}
                      <span>{isProcessing ? 'Recording...' : 'PRESS TO CHECK OUT'}</span>
                    </button>
                  </>
                ) : (
                  <div style={{ ...styles.statusPill, background: '#f8fafc', color: '#64748b', border: `1px solid ${BORDER}` }}>
                    Shift completed for today! Thanks for your hard work.
                  </div>
                )}
              </div>

              <div style={styles.locationNote}>
                <MapPin size={14} />
                <span>{geoEnabled ? `GPS verification within ${hqSettings ? hqSettings.radius_meters : 100}m of HQ` : 'Geo-fencing disabled by admin'}</span>
              </div>
            </div>
          </div>

          {/* HISTORY CARD */}
          <div style={styles.card}>
            <div style={styles.cardHeader}>
              <History size={20} color={PRIMARY} />
              <h2 style={styles.cardTitle}>Recent Logs</h2>
            </div>
            <div style={styles.historyBody}>
              {historyLogs.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#94a3b8', padding: '40px 0', fontWeight: '600', fontSize: '14px' }}>
                  No attendance history found.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {historyLogs.map(log => (
                    <div key={log.id} style={styles.historyRow}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={styles.historyDateBox}>
                          <CalendarIcon size={14} color="#64748b" />
                          <span>{new Date(log.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          <span style={{ fontSize: '14px', fontWeight: '700', color: BLACK }}>
                            {log.status === 'Checked Out' ? 'Shift Completed' : log.status === 'On Break' ? 'On Break' : 'Shift Active'}
                          </span>
                          <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '500' }}>
                            In: {log.check_in_time ? new Date(log.check_in_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '--:--'} 
                            {' • '} 
                            Out: {log.check_out_time ? new Date(log.check_out_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                            {log.total_break_minutes > 0 && ` • Break: ${log.total_break_minutes}m`}
                          </span>
                        </div>
                      </div>
                      <div>
                        {log.status === 'Checked Out' && log.check_in_time && log.check_out_time && (
                          <div style={{ fontSize: '13px', fontWeight: '800', color: PRIMARY, background: `${PRIMARY}10`, padding: '4px 10px', borderRadius: '8px' }}>
                            {Math.abs(Math.round((new Date(log.check_out_time) - new Date(log.check_in_time)) / 3600000 * 10) / 10)} hrs
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

        </div>
      </main>

      {/* Checkout Confirmation Modal */}
      {showCheckoutConfirm && (
        <div style={styles.confirmOverlay} onClick={() => setShowCheckoutConfirm(false)}>
          <div style={styles.confirmBox} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <XCircle size={24} color="#ef4444" />
              </div>
              <div>
                <h3 style={{ margin: 0, fontWeight: '800', fontSize: '18px', color: BLACK }}>End Your Shift?</h3>
                <p style={{ margin: 0, fontSize: '13px', color: '#64748b', fontWeight: '500' }}>This action cannot be undone for today.</p>
              </div>
            </div>
            <p style={{ fontSize: '14px', color: '#475569', lineHeight: '1.6', margin: '0 0 20px 0' }}>
              Are you sure you want to check out? Your shift duration and break times will be recorded permanently.
            </p>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={() => setShowCheckoutConfirm(false)} style={{ flex: 1, padding: '14px', borderRadius: '12px', border: `1.5px solid ${BORDER}`, background: 'white', fontWeight: '700', cursor: 'pointer', fontSize: '14px' }}>
                Cancel
              </button>
              <button onClick={confirmCheckout} style={{ flex: 1.5, padding: '14px', borderRadius: '12px', border: 'none', background: '#ef4444', color: 'white', fontWeight: '800', cursor: 'pointer', fontSize: '14px' }}>
                Yes, Check Out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  pageCenter: { height: '100vh', width: '100vw', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', background: '#f8fafc' },
  page: { background: '#f8fafc', minHeight: '100vh', fontFamily: '"Inter", sans-serif', color: BLACK },
  header: { background: 'white', borderBottom: `1px solid ${BORDER}`, position: 'sticky', top: 0, zIndex: 10 },
  headerInner: { maxWidth: '1200px', margin: '0 auto', padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  logoBox: { width: '40px', height: '40px', borderRadius: '10px', background: `${PRIMARY}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  mainContainer: { maxWidth: '1200px', margin: '0 auto', padding: '30px 20px' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' },
  card: { background: 'white', borderRadius: '24px', border: `1px solid ${BORDER}`, overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' },
  cardHeader: { padding: '24px 24px 16px', display: 'flex', alignItems: 'center', gap: '10px', borderBottom: `1px solid ${BORDER}` },
  cardTitle: { fontSize: '16px', fontWeight: '800', color: BLACK, margin: 0 },
  clockBody: { padding: '30px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center' },
  timeDisplay: { fontSize: '48px', fontWeight: '900', letterSpacing: '-2px', color: BLACK, lineHeight: '1', margin: '0 0 8px 0' },
  dateDisplay: { fontSize: '15px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '40px' },
  actionArea: { width: '100%', maxWidth: '340px', display: 'flex', flexDirection: 'column', gap: '16px' },
  actionBtn: { width: '100%', padding: '20px', borderRadius: '16px', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', fontSize: '16px', fontWeight: '900', cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' },
  locationNote: { display: 'flex', alignItems: 'center', gap: '6px', marginTop: '24px', fontSize: '12px', color: '#94a3b8', fontWeight: '600' },
  errorBox: { width: '100%', maxWidth: '340px', background: '#fef2f2', border: '1px solid #fecaca', padding: '16px', borderRadius: '12px', color: '#b91c1c', fontSize: '13px', fontWeight: '700', display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: '24px', lineHeight: '1.4' },
  statusPill: { background: '#f0fdf4', color: '#166534', padding: '12px 16px', borderRadius: '12px', fontSize: '13px', fontWeight: '700', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', textAlign: 'center' },
  historyBody: { padding: '20px' },
  historyRow: { padding: '16px', borderRadius: '16px', background: '#f8fafc', border: `1px solid ${BORDER}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  historyDateBox: { background: 'white', border: `1px solid ${BORDER}`, borderRadius: '10px', padding: '8px 12px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: '800', color: BLACK },
  logoutBtn: { background: '#f1f5f9', border: `1px solid ${BORDER}`, color: BLACK, padding: '8px 16px', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', transition: 'background 0.2s' },
  confirmOverlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(6px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 },
  confirmBox: { background: 'white', borderRadius: '20px', padding: '24px', maxWidth: '420px', width: '90%', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }
};
