import React, { useState, useEffect } from 'react';
import { Clock, Play, Square, Calendar, CheckCircle, AlertCircle, Timer, RefreshCw } from 'lucide-react';
import { api } from '../lib/api';
import { getIstTodayYmd } from '../lib/istDate';

const buildPreciseLocationLabel = (addr = {}, latitude, longitude) => {
    const locality = addr.suburb || addr.neighbourhood || addr.city_district || addr.residential || addr.hamlet || addr.quarter;
    const city = addr.city || addr.town || addr.village || addr.municipality || addr.county;
    const area = addr.state_district || addr.district;
    const state = addr.state;
    const postcode = addr.postcode;

    const mainParts = [locality, city].filter(Boolean);
    const regionParts = [area, state].filter(Boolean);

    let label = mainParts.join(', ');
    if (!label && regionParts.length > 0) {
        label = regionParts.join(', ');
    }
    if (!label && Number.isFinite(latitude) && Number.isFinite(longitude)) {
        label = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
    }

    if (postcode) {
        return `${label} - ${postcode}`;
    }
    return label || 'Unknown Location';
};

const EmployeeAttendancePage = () => {
    const formatLocalYmd = (date) => {
        const formatter = new Intl.DateTimeFormat('en-CA', {
            timeZone: 'Asia/Kolkata',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
        });
        return formatter.format(date);
    };

    const normalizeDateYmd = (raw) => {
        if (!raw) return null;

        if (raw instanceof Date && !Number.isNaN(raw.getTime())) {
            return formatLocalYmd(raw);
        }

        const text = String(raw).trim();
        const isoDateOnlyMatch = text.match(/^(\d{4}-\d{2}-\d{2})$/);
        if (isoDateOnlyMatch) {
            return isoDateOnlyMatch[1];
        }

        const parsed = new Date(text);
        if (!Number.isNaN(parsed.getTime())) {
            return formatLocalYmd(parsed);
        }

        const directMatch = text.match(/^(\d{4}-\d{2}-\d{2})/);
        if (directMatch) {
            return directMatch[1];
        }

        return null;
    };
    const getTodayYmd = () => getIstTodayYmd();
    const shiftDate = (dateStr, deltaDays) => {
        const d = new Date(`${dateStr}T00:00:00`);
        d.setDate(d.getDate() + deltaDays);
        return formatLocalYmd(d);
    };

    const getRecordDateYmd = (record) => {
        const raw = record?.attendance_date_resolved || record?.attendance_date;
        if (raw) {
            return normalizeDateYmd(raw);
        }
        if (record?.check_in) {
            return normalizeDateYmd(record.check_in);
        }
        return null;
    };

    const [currentTime, setCurrentTime] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState(getTodayYmd());
    const [isCheckingIn, setIsCheckingIn] = useState(false); // To prevent double-clicks
    const [isCheckingOut, setIsCheckingOut] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [attendance, setAttendance] = useState([]);
    const [todayRecord, setTodayRecord] = useState(null);
    const [todayRecords, setTodayRecords] = useState([]);
    const [holidays, setHolidays] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeDuration, setActiveDuration] = useState(0);
    const [currentShift, setCurrentShift] = useState(null);
    const [leaves, setLeaves] = useState([]);
    const [viewport, setViewport] = useState({
        width: window.innerWidth,
        height: window.innerHeight
    });
    const activeSessionForSelectedDate = todayRecords.find((rec) => Boolean(rec.check_in) && !rec.check_out) || null;

    const selectedDateObj = new Date(`${selectedDate}T00:00:00`);
    const isWeekend = selectedDateObj.getDay() === 0 || selectedDateObj.getDay() === 6;
    const selectedHoliday = holidays.find(h => normalizeDateYmd(h.date) === selectedDate);
    const selectedLeave = leaves.find(l =>
        l.status === 'Approved' &&
        selectedDate >= normalizeDateYmd(l.start_date) &&
        selectedDate <= normalizeDateYmd(l.end_date)
    );
    const isCheckInBlocked = Boolean(isWeekend || selectedHoliday || selectedLeave);
    const checkInBlockReason = selectedLeave
        ? 'On Approved Leave'
        : selectedHoliday
            ? `Holiday: ${selectedHoliday.name}`
            : isWeekend
                ? 'Weekend'
                : '';
    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentTime(new Date());
        }, 1000);
        fetchAttendance();

        // Poll attendance data every 10 seconds (real-time updates for admin/HR changes)
        // Only poll when viewing today's date to reduce unnecessary API calls
        const pollInterval = setInterval(() => {
            const todayYmd = getTodayYmd();
            if (selectedDate === todayYmd) {
                fetchAttendance();
            }
        }, 10000); // Poll every 10 seconds

        return () => {
            clearInterval(timer);
            clearInterval(pollInterval);
        };
    }, [selectedDate]);

    // Deterministic Active Duration Calculation completely decoupled from isolated states
    useEffect(() => {
        let cumulativeSeconds = 0;

        // Sum prior completed shift durations for the day
        todayRecords.forEach(rec => {
            if (rec.check_out) {
                const s = new Date(rec.check_in).getTime();
                const e = new Date(rec.check_out).getTime();
                cumulativeSeconds += Math.max(0, Math.floor((e - s) / 1000));
            }
        });

        if (activeSessionForSelectedDate) {
            const checkInTime = new Date(activeSessionForSelectedDate.check_in).getTime();
            
            // Cap the duration calculation to the end of the selected date 
            // so we don't show >24 hours if a session stays open for days.
            const endOfDay = new Date(`${selectedDate}T23:59:59`).getTime();
            const effectiveNowTime = Math.min(currentTime.getTime(), endOfDay);
            
            const rawDiffSeconds = Math.floor((effectiveNowTime - checkInTime) / 1000);
            
            // Use Math.max(0, ...) to handle slight clock skew between server and local machine
            const adjustedRawSeconds = Math.max(0, rawDiffSeconds);
            cumulativeSeconds += adjustedRawSeconds;
            
            // diagnostic log
            if (rawDiffSeconds < 0 && rawDiffSeconds > -300) {
                console.warn(`[Attendance Timer] Slight clock drift detected: ${rawDiffSeconds}s. Timer will resume shortly.`);
            }

            setActiveDuration(cumulativeSeconds);
        } else {
            setActiveDuration(cumulativeSeconds);
        }
    }, [currentTime, todayRecords, selectedDate, activeSessionForSelectedDate]);

    useEffect(() => {
        const onResize = () => {
            setViewport({ width: window.innerWidth, height: window.innerHeight });
        };

        window.addEventListener('resize', onResize);
        return () => window.removeEventListener('resize', onResize);
    }, []);

    const fetchAttendance = async () => {
        try {
            const data = await api.get('/attendance/my');
            setAttendance(data);
        } catch (err) {
            console.error('Failed to fetch attendance', err);
        }

        try {
            const shiftData = await api.get('/shifts/my-current');
            setCurrentShift(shiftData || null);
        } catch (err) {
            setCurrentShift(null);
            console.error('Failed to fetch current shift', err);
        }

        try {
            const hData = await api.get('/holidays');
            setHolidays(hData || []);
        } catch (err) {
            console.error('Failed to fetch holidays', err);
        }

        try {
            const lData = await api.get('/leaves');
            setLeaves(lData || []);
        } catch (err) {
            console.error('Failed to fetch leaves', err);
        } finally {
            setLoading(false);
        }
    };

    const handleManualRefresh = async () => {
        if (isRefreshing) return;
        setIsRefreshing(true);
        try {
            await fetchAttendance();
        } finally {
            setIsRefreshing(false);
        }
    };

    useEffect(() => {
        const recordsForSelectedDate = attendance.filter((rec) => getRecordDateYmd(rec) === selectedDate);
        setTodayRecords(recordsForSelectedDate);

        const activeSession = recordsForSelectedDate.find((rec) => !rec.check_out);
        const mostRecentSession = recordsForSelectedDate.length > 0 ? recordsForSelectedDate[0] : null;
        setTodayRecord(activeSession || mostRecentSession || null);
    }, [attendance, selectedDate]);

    const [cameraStream, setCameraStream] = useState(null);
    const [cameraMode, setCameraMode] = useState(null); // 'checkin' | 'checkout'
    const videoRef = React.useRef(null);

    const openCamera = async (mode) => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 480 }, height: { ideal: 480 } } });
            setCameraStream(stream);
            setCameraMode(mode);
        } catch (err) {
            alert('Camera access is required. Please allow camera permission in your browser settings.');
        }
    };

    // Attach stream to video element when it mounts
    React.useEffect(() => {
        if (videoRef.current && cameraStream) {
            videoRef.current.srcObject = cameraStream;
            videoRef.current.play().catch(() => {});
        }
        return () => {
            if (cameraStream && !cameraMode) {
                cameraStream.getTracks().forEach(t => t.stop());
            }
        };
    }, [cameraStream, cameraMode]);

    const closeCamera = () => {
        if (cameraStream) cameraStream.getTracks().forEach(t => t.stop());
        setCameraStream(null);
        setCameraMode(null);
    };

    const captureAndSubmit = async () => {
        if (!videoRef.current || !cameraStream) return;
        const canvas = document.createElement('canvas');
        canvas.width = 480;
        canvas.height = 480;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(videoRef.current, 0, 0, 480, 480);
        cameraStream.getTracks().forEach(t => t.stop());
        setCameraStream(null);

        const photoBlob = await new Promise(r => canvas.toBlob(r, 'image/jpeg', 0.75));
        if (!photoBlob) { alert('Failed to capture photo.'); setCameraMode(null); return; }

        if (cameraMode === 'checkin') {
            setCameraMode(null);
            await doCheckIn(photoBlob);
        } else {
            setCameraMode(null);
            await doCheckOut(photoBlob);
        }
    };

    const handleCheckIn = () => {
        if (isCheckingIn) return;
        if (activeSessionForSelectedDate) { fetchAttendance(); return; }
        if (isCheckInBlocked) { alert(`Check-in is disabled for this date (${checkInBlockReason}).`); return; }
        openCamera('checkin');
    };

    const doCheckIn = async (photoBlob) => {
        try {
            setIsCheckingIn(true);
            setLoading(true);
            let locationString = "Unknown Location";

            if ("geolocation" in navigator) {
                try {
                    const position = await new Promise((resolve, reject) => {
                        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 12000, maximumAge: 0, enableHighAccuracy: true });
                    });
                    const { latitude, longitude } = position.coords;
                    try {
                        const geoRes = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&addressdetails=1&zoom=18&accept-language=en&lat=${latitude}&lon=${longitude}`);
                        const data = await geoRes.json();
                        locationString = buildPreciseLocationLabel(data.address || {}, latitude, longitude);
                    } catch (geoErr) {
                        locationString = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
                    }
                } catch (posErr) {
                    try {
                        const ipRes = await fetch('https://ipapi.co/json/');
                        const ipData = await ipRes.json();
                        locationString = `${[ipData.city, ipData.region].filter(Boolean).join(', ') || 'Unknown City'} (IP Approx)`;
                    } catch (ipErr) { /* keep Unknown */ }
                }
            }

            const formData = new FormData();
            formData.append('location', locationString);
            formData.append('attendance_date', selectedDate);
            formData.append('photo', photoBlob, `checkin-${Date.now()}.jpg`);

            const token = localStorage.getItem('token');
            const res = await fetch('/api/attendance/check-in', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData,
            });
            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.error || `Check-in failed (${res.status})`);
            }
            await fetchAttendance();
        } catch (err) {
            if ((err?.message || '').toLowerCase().includes('active check-in session')) { await fetchAttendance(); return; }
            alert(err.message);
        } finally {
            setLoading(false);
            setIsCheckingIn(false);
        }
    };

    const handleCheckOut = () => {
        if (isCheckingOut) return;
        openCamera('checkout');
    };

    const doCheckOut = async (photoBlob) => {
        try {
            setIsCheckingOut(true);

            // Get location for checkout
            let locationString = "Unknown Location";
            if ("geolocation" in navigator) {
                try {
                    const position = await new Promise((resolve, reject) => {
                        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 12000, maximumAge: 0, enableHighAccuracy: true });
                    });
                    const { latitude, longitude } = position.coords;
                    try {
                        const geoRes = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&addressdetails=1&zoom=18&accept-language=en&lat=${latitude}&lon=${longitude}`);
                        const data = await geoRes.json();
                        locationString = buildPreciseLocationLabel(data.address || {}, latitude, longitude);
                    } catch (geoErr) {
                        locationString = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
                    }
                } catch (posErr) {
                    try {
                        const ipRes = await fetch('https://ipapi.co/json/');
                        const ipData = await ipRes.json();
                        locationString = `${[ipData.city, ipData.region].filter(Boolean).join(', ') || 'Unknown City'} (IP Approx)`;
                    } catch (ipErr) { /* keep Unknown */ }
                }
            }

            const formData = new FormData();
            formData.append('attendance_date', displayedAttendanceDate);
            formData.append('location', locationString);
            formData.append('photo', photoBlob, `checkout-${Date.now()}.jpg`);

            const token = localStorage.getItem('token');
            const res = await fetch('/api/attendance/check-out', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData,
            });
            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.error || `Check-out failed (${res.status})`);
            }
            await fetchAttendance();
        } catch (err) {
            if ((err.message || '').toLowerCase().includes('no active check-in found')) { await fetchAttendance(); return; }
            alert(err.message);
        } finally {
            setIsCheckingOut(false);
        }
    };

    const calculateHours = (start, end) => {
        if (!start) return 0;
        const startTime = new Date(start);
        const endTime = end ? new Date(end) : currentTime;
        const durationMs = endTime - startTime;
        return Math.max(0, durationMs) / (1000 * 60 * 60);
    };

    const calculateTotalTodayHours = () => {
        const total = todayRecords.reduce((sum, record) => sum + calculateHours(record.check_in, record.check_out), 0);
        // If the user wants to see it changing, showing 2 decimals helps (every 36 seconds)
        // or we could show HH:MM
        const hours = Math.floor(total);
        const minutes = Math.floor((total - hours) * 60);
        if (hours > 0) return `${hours}h ${minutes}m`;
        return `${minutes}m`;
    };

    const calculateTotalPresentForMonth = () => {
        const presentStatuses = new Set(['Present', 'Late', 'Half-Day']);
        const uniqueDays = new Set();

        for (const record of attendance) {
            if (!presentStatuses.has(record.status)) continue;

            const dateYmd = getRecordDateYmd(record);
            if (dateYmd && dateYmd.startsWith(`${calendarYear}-${String(calendarMonth + 1).padStart(2, '0')}`)) {
                uniqueDays.add(dateYmd);
            }
        }

        return uniqueDays.size;
    };

    const displayedAttendanceDate = selectedDate;
    const primaryRecord = activeSessionForSelectedDate || todayRecord;
    const effectiveStatus = selectedLeave
        ? 'On Leave'
        : selectedHoliday
            ? 'Holiday'
            : isWeekend
                ? 'Weekend'
                : (primaryRecord?.status || '--');
    const shouldMaskAttendanceTimes = Boolean(selectedLeave || selectedHoliday || isWeekend);
    const displayedCheckInTime = shouldMaskAttendanceTimes
        ? '--:--'
        : (primaryRecord?.check_in
            ? new Date(primaryRecord.check_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            : '--:--');
    const displayedCheckOutTime = shouldMaskAttendanceTimes
        ? '--:--'
        : (primaryRecord?.check_out
            ? new Date(primaryRecord.check_out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            : '--:--');

    const formatDuration = (totalSeconds) => {
        const sign = totalSeconds < 0 ? '-' : '';
        const absSeconds = Math.abs(totalSeconds);
        const h = Math.floor(absSeconds / 3600).toString().padStart(2, '0');
        const m = Math.floor((absSeconds % 3600) / 60).toString().padStart(2, '0');
        const s = (absSeconds % 60).toString().padStart(2, '0');
        return `${sign}${h}:${m}:${s}`;
    };

    // Calendar Heatmap logic
    const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
    const calendarYear = selectedDateObj.getFullYear();
    const calendarMonth = selectedDateObj.getMonth();
    const daysInMonth = getDaysInMonth(calendarYear, calendarMonth);
    const firstDayOfMonth = new Date(calendarYear, calendarMonth, 1).getDay();
    const isShortViewport = viewport.height <= 860;
    const isVeryShortViewport = viewport.height <= 760;

    const getStatusColor = (dateString) => {
        const leaveRecord = leaves.find(l => 
            l.status === 'Approved' && 
            dateString >= normalizeDateYmd(l.start_date) && 
            dateString <= normalizeDateYmd(l.end_date)
        );
        if (leaveRecord) return 'var(--status-rejected-text)';

        const recordByDate = attendance.find(rec => getRecordDateYmd(rec) === dateString);
        if (recordByDate) {
            switch (recordByDate.status) {
                case 'Present': return 'var(--status-approved-text)';
                case 'Late': return 'var(--status-pending-text)';
                case 'On Leave': return 'var(--status-rejected-text)';
                case 'Half-Day': return 'var(--primary)';
                default: return 'var(--status-approved-text)';
            }
        }

        return 'var(--input-bg)';
    };

    return (
        <div style={{ maxWidth: '920px', margin: '-6px auto 0', height: '100%', minHeight: 0, boxSizing: 'border-box', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {/* Camera Modal */}
            {cameraMode && (
                <div style={{ position: 'fixed', inset: 0, zIndex: 99999, background: 'rgba(0,0,0,0.85)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '20px' }}>
                    <h2 style={{ color: 'white', fontSize: '20px', fontWeight: '700' }}>
                        {cameraMode === 'checkin' ? '📸 Check-In Photo' : '📸 Check-Out Photo'}
                    </h2>
                    <div style={{ width: '320px', height: '320px', borderRadius: '16px', overflow: 'hidden', border: '3px solid #3B82F6', background: '#000' }}>
                        <video
                            ref={videoRef}
                            autoPlay
                            playsInline
                            muted
                            style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }}
                        />
                    </div>
                    <p style={{ color: '#94a3b8', fontSize: '13px' }}>Position your face in the frame and click Capture</p>
                    <div style={{ display: 'flex', gap: '16px' }}>
                        <button
                            onClick={captureAndSubmit}
                            style={{ padding: '14px 32px', background: '#10B981', color: 'white', border: 'none', borderRadius: '10px', fontSize: '16px', fontWeight: '700', cursor: 'pointer' }}
                        >
                            ✓ Capture & Submit
                        </button>
                        <button
                            onClick={closeCamera}
                            style={{ padding: '14px 32px', background: '#EF4444', color: 'white', border: 'none', borderRadius: '10px', fontSize: '16px', fontWeight: '700', cursor: 'pointer' }}
                        >
                            ✕ Cancel
                        </button>
                    </div>
                </div>
            )}

            <header style={{ marginBottom: isShortViewport ? '8px' : '12px', flexShrink: 0 }}>
                <h1 style={{ fontSize: '24px', color: 'var(--text-main)', marginBottom: '6px' }}>Attendance Tracker</h1>
                <p style={{ color: 'var(--text-muted)' }}>Keep track of your daily presence and work hours.</p>
                <p style={{ color: 'var(--text-muted)', marginTop: '6px', fontSize: '13px' }}>
                    Assigned Shift: {currentShift?.name ? `${currentShift.name} (${String(currentShift.start_time).slice(0, 5)} - ${String(currentShift.end_time).slice(0, 5)})` : 'Not assigned'}
                </p>
                <div style={{ marginTop: isShortViewport ? '6px' : '10px', display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                    <button
                        className="btn-secondary"
                        onClick={() => setSelectedDate((d) => shiftDate(d, -1))}
                        style={{ padding: '7px 12px', fontSize: '13px' }}
                    >
                        Previous Day
                    </button>
                    <input
                        type="date"
                        className="input-field"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        style={{ width: '165px', padding: '8px 10px', fontSize: '13px' }}
                    />
                    <button
                        className="btn-secondary"
                        onClick={() => setSelectedDate((d) => shiftDate(d, 1))}
                        style={{ padding: '7px 12px', fontSize: '13px' }}
                    >
                        Next Day
                    </button>
                    <button
                        className="btn-secondary"
                        onClick={() => setSelectedDate(getTodayYmd())}
                        style={{ padding: '7px 12px', fontSize: '13px' }}
                    >
                        Today
                    </button>
                    <button
                        className="btn-secondary"
                        onClick={handleManualRefresh}
                        disabled={isRefreshing || loading}
                        style={{ 
                            padding: '7px 12px', 
                            fontSize: '13px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            opacity: isRefreshing || loading ? 0.6 : 1,
                            cursor: isRefreshing || loading ? 'not-allowed' : 'pointer'
                        }}
                        title="Refresh attendance data"
                    >
                        <RefreshCw 
                            size={16} 
                            style={{ 
                                animation: isRefreshing ? 'spin 1s linear infinite' : 'none'
                            }} 
                        />
                        Refresh
                    </button>
                </div>
            </header>

            <div className="responsive-grid-2-1" style={{ marginBottom: isShortViewport ? '8px' : '12px', alignItems: 'start', flexShrink: 0 }}>
                {/* Check-in Card */}
                <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', padding: isShortViewport ? '14px 18px' : '18px 20px', textAlign: 'center' }}>
                    <div style={{ fontSize: '42px', fontWeight: '700', color: 'var(--text-main)', marginBottom: '4px', lineHeight: 1.1 }}>
                        {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </div>
                    <p style={{ color: 'var(--text-muted)', marginBottom: isShortViewport ? '10px' : '14px', fontSize: '14px' }}>
                        {new Date(`${displayedAttendanceDate}T00:00:00`).toLocaleDateString([], { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </p>

                    {!activeSessionForSelectedDate ? (
                        isCheckInBlocked ? (
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                padding: '11px 20px',
                                background: 'var(--input-bg)',
                                color: 'var(--text-muted)',
                                border: '1px solid var(--border)',
                                borderRadius: '50px',
                                fontSize: '16px',
                                fontWeight: '600',
                                cursor: 'not-allowed'
                            }}>
                                <Calendar size={20} /> {checkInBlockReason}
                            </div>
                        ) : (
                            <button
                                onClick={handleCheckIn}
                                disabled={loading}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    padding: '11px 20px',
                                    background: loading ? 'var(--text-muted)' : 'var(--primary)',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '50px',
                                    fontSize: '16px',
                                    fontWeight: '600',
                                    cursor: loading ? 'not-allowed' : 'pointer',
                                    boxShadow: loading ? 'none' : '0 4px 14px rgba(59, 130, 246, 0.4)',
                                    transition: 'transform 0.2s'
                                }}
                                onMouseOver={(e) => !loading && (e.currentTarget.style.transform = 'scale(1.05)')}
                                onMouseOut={(e) => !loading && (e.currentTarget.style.transform = 'scale(1)')}
                            >
                                <Play fill="white" size={20} /> {loading ? 'Locating...' : 'Check-In'}
                            </button>
                        )
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                            <div style={{
                                fontSize: '26px',
                                fontWeight: '700',
                                color: 'var(--primary)',
                                fontFamily: 'monospace',
                                background: 'rgba(59, 130, 246, 0.1)',
                                padding: '8px 14px',
                                borderRadius: '10px'
                            }}>
                                {formatDuration(activeDuration)}
                            </div>
                            <button
                                onClick={handleCheckOut}
                                disabled={loading || isCheckingOut}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    padding: '11px 20px',
                                    background: (loading || isCheckingOut) ? 'var(--text-muted)' : '#EF4444',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '50px',
                                    fontSize: '16px',
                                    fontWeight: '600',
                                    cursor: (loading || isCheckingOut) ? 'not-allowed' : 'pointer',
                                    boxShadow: (loading || isCheckingOut) ? 'none' : '0 4px 14px rgba(239, 68, 68, 0.4)',
                                    transition: 'transform 0.2s'
                                }}
                                onMouseOver={(e) => !(loading || isCheckingOut) && (e.currentTarget.style.transform = 'scale(1.05)')}
                                onMouseOut={(e) => !(loading || isCheckingOut) && (e.currentTarget.style.transform = 'scale(1)')}
                            >
                                <Square fill="white" size={20} /> {isCheckingOut ? 'Checking out...' : 'Check-Out'}
                            </button>
                        </div>
                    )}

                    {primaryRecord && (
                        <div style={{ marginTop: isShortViewport ? '10px' : '14px', display: 'flex', gap: isShortViewport ? '10px' : '14px', flexWrap: 'wrap', justifyContent: 'center' }}>
                            <div>
                                <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>CHECK-IN</p>
                                <p style={{ fontWeight: '600', fontSize: '14px' }}>{displayedCheckInTime}</p>
                            </div>
                            <div>
                                <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>CHECK-OUT</p>
                                <p style={{ fontWeight: '600', fontSize: '14px' }}>{displayedCheckOutTime}</p>
                            </div>
                            <div>
                                <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>STATUS</p>
                                <span className={`attendance-status-badge ${effectiveStatus.toLowerCase().replace(/\s+/g, '-')}`}>
                                    {effectiveStatus}
                                </span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Summary Stats */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: isShortViewport ? '8px' : '10px' }}>
                    <div className="card" style={{ background: 'var(--card-bg)', borderLeft: '4px solid #F59E0B' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Work Time ({displayedAttendanceDate === getTodayYmd() ? 'Today' : displayedAttendanceDate})</p>
                                <h3 style={{ fontSize: '18px', marginTop: '2px', color: 'var(--text-main)' }}>
                                    {todayRecords.some(r => !r.check_out) ? formatDuration(activeDuration).split(':').slice(0, 2).join(':') + 'h' : calculateTotalTodayHours()}
                                </h3>
                            </div>
                            <Timer color="#F59E0B" size={24} />
                        </div>
                    </div>
                    <div className="card" style={{ background: 'var(--card-bg)', borderLeft: '4px solid var(--primary)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Total Present (Month)</p>
                                <h3 style={{ fontSize: '18px', marginTop: '2px', color: 'var(--text-main)' }}>
                                    {calculateTotalPresentForMonth()}
                                </h3>
                            </div>
                            <AlertCircle color="var(--primary)" size={24} />
                        </div>
                    </div>
                </div>
            </div>

            {/* Heatmap Calendar */}
            <div className="card" style={{ padding: isShortViewport ? '10px' : '12px', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: isVeryShortViewport ? '6px' : '8px', flexShrink: 0 }}>
                    <h3 style={{ fontSize: '14px', color: 'var(--text-main)' }}>Attendance History</h3>
                    <div style={{ display: 'flex', gap: '8px', fontSize: '10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <div style={{ width: '8px', height: '8px', background: 'var(--status-approved-text)', borderRadius: '2px' }}></div> Present
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <div style={{ width: '8px', height: '8px', background: 'var(--status-pending-text)', borderRadius: '2px' }}></div> Late
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <div style={{ width: '8px', height: '8px', background: 'var(--status-rejected-text)', borderRadius: '2px' }}></div> On Leave
                        </div>
                    </div>
                </div>

                <div className="calendar-grid" style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(7, 1fr)',
                    gridAutoRows: isVeryShortViewport ? 'minmax(22px, 1fr)' : 'minmax(24px, 1fr)',
                    gap: isVeryShortViewport ? '4px' : '5px',
                    textAlign: 'center',
                    flex: 1,
                    minHeight: 0
                }}>
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                        <div key={day} style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-muted)', paddingBottom: '4px' }}>{day}</div>
                    ))}
                    {[...Array(firstDayOfMonth)].map((_, i) => <div key={`empty-${i}`}></div>)}
                    {[...Array(daysInMonth)].map((_, i) => {
                        const day = i + 1;
                        const dateString = `${calendarYear}-${String(calendarMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                        const statusColor = getStatusColor(dateString);
                        const isSelected = dateString === selectedDate;
                        const isFuture = dateString > getTodayYmd();
                        return (
                            <div
                                key={day}
                                onClick={() => setSelectedDate(dateString)}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    background: isFuture ? 'var(--input-bg)' : statusColor,
                                    borderRadius: '4px',
                                    fontSize: '12px',
                                    fontWeight: '500',
                                    minHeight: isVeryShortViewport ? '22px' : '24px',
                                    color: (isFuture && statusColor === 'var(--input-bg)') ? 'var(--text-muted)' : (statusColor === 'var(--input-bg)' ? 'var(--text-main)' : 'white'),
                                    cursor: 'pointer',
                                    border: isSelected ? '2px solid var(--primary)' : '1px solid transparent',
                                    opacity: isFuture ? 0.7 : 1,
                                    transform: isSelected ? 'scale(1.05)' : 'scale(1)',
                                    transition: 'transform 0.15s ease'
                                }}
                                title={isFuture ? 'Future date' : `Select ${dateString}`}
                            >
                                {day}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default EmployeeAttendancePage;
