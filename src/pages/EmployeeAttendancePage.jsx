import React, { useState, useEffect } from 'react';
import { Clock, Play, Square, Calendar, CheckCircle, AlertCircle, Timer } from 'lucide-react';
import { api } from '../lib/api';

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
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    };
    const getTodayYmd = () => formatLocalYmd(new Date());
    const shiftDate = (dateStr, deltaDays) => {
        const d = new Date(`${dateStr}T00:00:00`);
        d.setDate(d.getDate() + deltaDays);
        return formatLocalYmd(d);
    };

    const [currentTime, setCurrentTime] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState(getTodayYmd());
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

    // Determine if today is restricted
    const selectedDateObj = new Date(`${selectedDate}T00:00:00`);
    const isWeekend = selectedDateObj.getDay() === 0 || selectedDateObj.getDay() === 6;

    // Check if selected day matches any holiday
    const selectedHoliday = holidays.find(h => h.date === selectedDate);

    // Check if selected day falls within any approved leave
    const selectedLeave = leaves.find(l => 
        l.status === 'Approved' && 
        selectedDate >= l.start_date.slice(0,10) && 
        selectedDate <= l.end_date.slice(0,10)
    );

    const isRestrictedDay = isWeekend || selectedHoliday || selectedLeave;
    const restrictReason = selectedHoliday ? selectedHoliday.name : 
                          selectedLeave ? 'On Leave' : 
                          (isWeekend ? 'Weekend' : '');

    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentTime(new Date());

            // Update active session duration every second
            setTodayRecord(currentActive => {
                if (selectedDate === getTodayYmd() && currentActive && !currentActive.check_out) {
                    const diffSeconds = Math.floor((new Date() - new Date(currentActive.check_in)) / 1000);
                    setActiveDuration(diffSeconds > 0 ? diffSeconds : 0);
                } else {
                    setActiveDuration(0);
                }
                return currentActive;
            });
        }, 1000);
        fetchAttendance();
        return () => clearInterval(timer);
    }, [selectedDate]);

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

            // Get all records for today
            const foundToday = data.filter(rec => rec.check_in.startsWith(selectedDate));
            setTodayRecords(foundToday);

            // Find an active session (not checked out) or the most recent one
            const activeSession = foundToday.find(rec => !rec.check_out);
            const mostRecentSession = foundToday.length > 0 ? foundToday[0] : null;

            setTodayRecord(activeSession || mostRecentSession || null);
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

    const handleCheckIn = async () => {
        try {
            setLoading(true);
            let locationString = "Unknown Location";

            // 1. Try Browser Geolocation (GPS)
            if ("geolocation" in navigator) {
                try {
                    const position = await new Promise((resolve, reject) => {
                        navigator.geolocation.getCurrentPosition(resolve, reject, {
                            timeout: 12000,
                            maximumAge: 0,
                            enableHighAccuracy: true
                        });
                    });

                    const { latitude, longitude } = position.coords;

                    // OpenStreetMap Reverse Geocoding
                    try {
                        const res = await fetch(
                            `https://nominatim.openstreetmap.org/reverse?format=json&addressdetails=1&zoom=18&accept-language=en&lat=${latitude}&lon=${longitude}`
                        );
                        const data = await res.json();
                        const addr = data.address || {};
                        locationString = buildPreciseLocationLabel(addr, latitude, longitude);
                    } catch (geoErr) {
                        locationString = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
                    }
                } catch (posErr) {
                    console.warn("GPS access denied or failed, falling back to IP...");

                    // 2. IP-based Geolocation Fallback
                    try {
                        const ipRes = await fetch('https://ipapi.co/json/');
                        const ipData = await ipRes.json();
                        const ipParts = [ipData.city, ipData.region].filter(Boolean);
                        locationString = `${ipParts.join(', ') || 'Unknown City'} (IP Approx)`;
                    } catch (ipErr) {
                        console.error("IP Geolocation also failed", ipErr);
                    }
                }
            } else {
                // Fallback for browsers without geolocation support
                try {
                    const ipRes = await fetch('https://ipapi.co/json/');
                    const ipData = await ipRes.json();
                    const ipParts = [ipData.city, ipData.region].filter(Boolean);
                    locationString = `${ipParts.join(', ') || 'Unknown City'} (IP Approx)`;
                } catch (ipErr) {
                    console.error("IP Geolocation failed", ipErr);
                }
            }

            await api.post('/attendance/check-in', { location: locationString, attendance_date: selectedDate });
            fetchAttendance();
        } catch (err) {
            alert(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleCheckOut = async () => {
        try {
            await api.post('/attendance/check-out', { attendance_date: selectedDate });
            fetchAttendance();
        } catch (err) {
            alert(err.message);
        }
    };

    const calculateHours = (start, end) => {
        if (!start) return 0;
        const startTime = new Date(start);
        const endTime = end ? new Date(end) : new Date();
        return (endTime - startTime) / (1000 * 60 * 60);
    };

    const calculateTotalTodayHours = () => {
        const total = todayRecords.reduce((sum, record) => sum + calculateHours(record.check_in, record.check_out), 0);
        return total.toFixed(1);
    };

    const calculateTotalPresentForMonth = () => {
        const presentStatuses = new Set(['Present', 'Late', 'Half-Day']);
        const uniqueDays = new Set();

        for (const record of attendance) {
            if (!presentStatuses.has(record.status)) continue;

            const checkInDate = new Date(record.check_in);
            if (
                checkInDate.getFullYear() === calendarYear &&
                checkInDate.getMonth() === calendarMonth
            ) {
                uniqueDays.add(record.check_in.slice(0, 10));
            }
        }

        return uniqueDays.size;
    };

    const formatDuration = (totalSeconds) => {
        const h = Math.floor(totalSeconds / 3600).toString().padStart(2, '0');
        const m = Math.floor((totalSeconds % 3600) / 60).toString().padStart(2, '0');
        const s = (totalSeconds % 60).toString().padStart(2, '0');
        return `${h}:${m}:${s}`;
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
        const record = attendance.find(rec => rec.check_in.startsWith(dateString));
        if (record) {
            switch (record.status) {
                case 'Present': return 'var(--status-approved-text)';
                case 'Late': return 'var(--status-pending-text)';
                case 'On Leave': return 'var(--status-rejected-text)';
                case 'Half-Day': return 'var(--primary)';
                default: return 'var(--status-approved-text)';
            }
        }
        
        const leaveRecord = leaves.find(l => 
            l.status === 'Approved' && 
            dateString >= l.start_date.slice(0,10) && 
            dateString <= l.end_date.slice(0,10)
        );
        if (leaveRecord) return 'var(--status-rejected-text)';

        return 'var(--input-bg)';
    };

    return (
        <div style={{ maxWidth: '920px', margin: '-6px auto 0', height: '100%', minHeight: 0, boxSizing: 'border-box', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
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
                        max={new Date().toISOString().split('T')[0]}
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
                </div>
            </header>

            <div className="responsive-grid-2-1" style={{ marginBottom: isShortViewport ? '8px' : '12px', alignItems: 'start', flexShrink: 0 }}>
                {/* Check-in Card */}
                <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', padding: isShortViewport ? '14px 18px' : '18px 20px', textAlign: 'center' }}>
                    <div style={{ fontSize: '42px', fontWeight: '700', color: 'var(--text-main)', marginBottom: '4px', lineHeight: 1.1 }}>
                        {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </div>
                    <p style={{ color: 'var(--text-muted)', marginBottom: isShortViewport ? '10px' : '14px', fontSize: '14px' }}>
                        {currentTime.toLocaleDateString([], { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </p>

                    {(!todayRecord || todayRecord.check_out) ? (
                        isRestrictedDay ? (
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
                                <Calendar size={20} /> {restrictReason}
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
                                disabled={loading}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    padding: '11px 20px',
                                    background: loading ? 'var(--text-muted)' : '#EF4444',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '50px',
                                    fontSize: '16px',
                                    fontWeight: '600',
                                    cursor: loading ? 'not-allowed' : 'pointer',
                                    boxShadow: loading ? 'none' : '0 4px 14px rgba(239, 68, 68, 0.4)',
                                    transition: 'transform 0.2s'
                                }}
                                onMouseOver={(e) => !loading && (e.currentTarget.style.transform = 'scale(1.05)')}
                                onMouseOut={(e) => !loading && (e.currentTarget.style.transform = 'scale(1)')}
                            >
                                <Square fill="white" size={20} /> Check-Out
                            </button>
                        </div>
                    )}

                    {todayRecord && (
                        <div style={{ marginTop: isShortViewport ? '10px' : '14px', display: 'flex', gap: isShortViewport ? '10px' : '14px', flexWrap: 'wrap', justifyContent: 'center' }}>
                            <div>
                                <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>CHECK-IN</p>
                                <p style={{ fontWeight: '600', fontSize: '14px' }}>{new Date(todayRecord.check_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                            </div>
                            <div>
                                <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>CHECK-OUT</p>
                                <p style={{ fontWeight: '600', fontSize: '14px' }}>{todayRecord.check_out ? new Date(todayRecord.check_out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}</p>
                            </div>
                            <div>
                                <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>STATUS</p>
                                <span className={`attendance-status-badge ${(todayRecord.status || '').toLowerCase().replace(/\s+/g, '-')}`}>
                                    {todayRecord.status}
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
                                <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Hours Worked (Today)</p>
                                <h3 style={{ fontSize: '18px', marginTop: '2px', color: 'var(--text-main)' }}>{calculateTotalTodayHours()}h</h3>
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
                        return (
                            <div
                                key={day}
                                onClick={() => setSelectedDate(dateString)}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    background: statusColor,
                                    borderRadius: '4px',
                                    fontSize: '12px',
                                    fontWeight: '500',
                                    minHeight: isVeryShortViewport ? '22px' : '24px',
                                    color: statusColor === 'var(--input-bg)' ? 'var(--text-main)' : 'white',
                                    cursor: 'pointer',
                                    border: isSelected ? '2px solid var(--primary)' : '1px solid transparent',
                                    transform: isSelected ? 'scale(1.05)' : 'scale(1)',
                                    transition: 'transform 0.15s ease'
                                }}
                                title={`Select ${dateString}`}
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
