import React, { useState, useEffect } from 'react';
import HolidayCalendar from '../components/Holidays/HolidayCalendar';
import { api } from '../lib/api';
import { Plus, X, Calendar as CalendarIcon, Loader2, PartyPopper } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const CalendarPage = () => {
    const { profile } = useAuth();
    const isHR = profile?.role === 'hr' || profile?.role === 'admin';

    const [holidays, setHolidays] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        date: '',
        type: 'National',
        label: ''
    });

    useEffect(() => {
        fetchHolidays();
    }, []);

    const fetchHolidays = async () => {
        try {
            setLoading(true);
            const data = await api.get('/holidays');
            setHolidays(data || []);
        } catch (error) {
            console.error('Error fetching holidays:', error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleAddHoliday = async (e) => {
        e.preventDefault();
        try {
            setIsSubmitting(true);
            await api.post('/holidays', formData);
            fetchHolidays();
            setShowAddModal(false);
            setFormData({ name: '', date: '', type: 'National', label: '' });
        } catch (error) {
            alert('Error adding event: ' + error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const upcomingHolidays = holidays.filter(h => new Date(h.date) >= new Date()).slice(0, 5);

    return (
        <>
            <div style={{ marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h1 style={{ fontSize: '24px', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <CalendarIcon size={24} color="var(--primary)" /> Calendar
                    </h1>
                    <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '4px' }}>
                        {isHR ? 'Manage public holidays and company-specific events.' : 'View upcoming holidays and plan your time.'}
                    </p>
                </div>
                {isHR && (
                    <button
                        onClick={() => setShowAddModal(true)}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '10px 16px',
                            borderRadius: '8px',
                            border: 'none',
                            background: 'var(--primary)',
                            color: 'white',
                            fontWeight: '600',
                            cursor: 'pointer',
                            fontSize: '14px'
                        }}
                    >
                        <Plus size={18} />
                        Add Event
                    </button>
                )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '32px' }}>
                <div className="card" style={{ padding: '24px' }}>
                    {loading ? (
                        <div style={{ height: '400px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Loader2 className="animate-spin" size={40} color="var(--primary)" />
                        </div>
                    ) : (
                        <HolidayCalendar holidays={holidays} />
                    )}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    <div className="card" style={{ padding: '24px' }}>
                        <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <PartyPopper size={18} color="#F59E0B" /> Company Holidays ({new Date().getFullYear()})
                        </h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {holidays.filter(h => h.type === 'Company' && new Date(h.date).getFullYear() === new Date().getFullYear())
                                .sort((a, b) => new Date(a.date) - new Date(b.date))
                                .map((holiday) => (
                                    <div key={holiday.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', background: 'var(--input-bg)', borderRadius: '8px' }}>
                                        <div style={{
                                            width: '40px',
                                            height: '40px',
                                            background: 'var(--card-bg)',
                                            color: 'var(--text-main)',
                                            borderRadius: '8px',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            border: '1px solid #F59E0B'
                                        }}>
                                            <span style={{ fontSize: '10px', fontWeight: '700', color: '#B45309', textTransform: 'uppercase' }}>
                                                {new Date(holiday.date).toLocaleString('default', { month: 'short' })}
                                            </span>
                                            <span style={{ fontSize: '14px', fontWeight: '800' }}>
                                                {new Date(holiday.date).getDate()}
                                            </span>
                                        </div>
                                        <div>
                                            <p style={{ fontSize: '14px', fontWeight: '600' }}>{holiday.name}</p>
                                            <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{holiday.label || 'Company Holiday'}</p>
                                        </div>
                                    </div>
                                ))}
                            {holidays.filter(h => h.type === 'Company' && new Date(h.date).getFullYear() === new Date().getFullYear()).length === 0 && !loading && (
                                <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '14px', padding: '20px' }}>No company holidays scheduled.</p>
                            )}
                        </div>
                    </div>

                    <div className="card" style={{ padding: '24px' }}>
                        <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <CalendarIcon size={18} color="#EF4444" /> Upcoming Public Events
                        </h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {upcomingHolidays.map((holiday) => (
                                <div key={holiday.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', background: 'var(--input-bg)', borderRadius: '8px' }}>
                                    <div style={{
                                        width: '40px',
                                        height: '40px',
                                        background: 'var(--card-bg)',
                                        color: 'var(--text-main)',
                                        borderRadius: '8px',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        border: '1px solid var(--border)'
                                    }}>
                                        <span style={{ fontSize: '10px', fontWeight: '700', color: '#EF4444', textTransform: 'uppercase' }}>
                                            {new Date(holiday.date).toLocaleString('default', { month: 'short' })}
                                        </span>
                                        <span style={{ fontSize: '14px', fontWeight: '800' }}>
                                            {new Date(holiday.date).getDate()}
                                        </span>
                                    </div>
                                    <div>
                                        <p style={{ fontSize: '14px', fontWeight: '600' }}>{holiday.name}</p>
                                        <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{holiday.label || holiday.type}</p>
                                    </div>
                                </div>
                            ))}
                            {upcomingHolidays.length === 0 && !loading && (
                                <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '14px', padding: '20px' }}>No upcoming events.</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {showAddModal && (
                <div style={{
                    position: 'fixed',
                    top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.5)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    zIndex: 1000, padding: '20px'
                }}>
                    <div className="card" style={{ width: '100%', maxWidth: '450px', padding: '0' }}>
                        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h2 style={{ fontSize: '18px', fontWeight: '700' }}>Add New Event</h2>
                            <button onClick={() => setShowAddModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleAddHoliday} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <label style={{ fontSize: '14px', fontWeight: '600' }}>Event Name</label>
                                <input
                                    type="text"
                                    className="input-field"
                                    placeholder="e.g. Independence Day"
                                    required
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <label style={{ fontSize: '14px', fontWeight: '600' }}>Date</label>
                                <input
                                    type="date"
                                    className="input-field"
                                    required
                                    value={formData.date}
                                    onChange={e => setFormData({ ...formData, date: e.target.value })}
                                />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <label style={{ fontSize: '14px', fontWeight: '600' }}>Type</label>
                                <select
                                    className="input-field"
                                    value={formData.type}
                                    onChange={e => setFormData({ ...formData, type: e.target.value })}
                                >
                                    <option value="National">National Holiday</option>
                                    <option value="Company">Company Holiday</option>
                                    <option value="Custom">Custom Event</option>
                                </select>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <label style={{ fontSize: '14px', fontWeight: '600' }}>Short Label</label>
                                <input
                                    type="text"
                                    className="input-field"
                                    placeholder="e.g. Public Holiday"
                                    value={formData.label}
                                    onChange={e => setFormData({ ...formData, label: e.target.value })}
                                />
                            </div>
                            <div style={{ display: 'gap: 12px', marginTop: '8px' }}>
                                <button
                                    type="button"
                                    onClick={() => setShowAddModal(false)}
                                    style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--card-bg)', color: 'var(--text-main)', fontWeight: '600', cursor: 'pointer', marginRight: '12px' }}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    style={{ flex: 1, padding: '10px', borderRadius: '8px', border: 'none', background: 'var(--primary)', color: 'white', fontWeight: '600', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                                >
                                    {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : 'Save Event'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <style>{`
        .input-field {
          padding: 10px 12px;
          border-radius: 8px;
          border: 1px solid var(--border);
          outline: none;
          font-size: 14px;
        }
        .animate-spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
        </>
    );
};

export default CalendarPage;
