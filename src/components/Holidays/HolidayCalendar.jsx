import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Tag } from 'lucide-react';

const HolidayCalendar = ({ holidays, onHolidaysChange }) => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [filter, setFilter] = useState('All');

    const daysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
    const firstDayOfMonth = (year, month) => new Date(year, month, 1).getDay();

    const prevMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    };

    const nextMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    };

    const filteredHolidays = holidays.filter(h => filter === 'All' || h.type === filter);

    const renderHeader = () => {
        const monthNames = ["January", "February", "March", "April", "May", "June",
            "July", "August", "September", "October", "November", "December"
        ];
        return (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <h2 style={{ fontSize: '20px', fontWeight: '700', color: 'var(--text-main)', minWidth: '150px' }}>
                        {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
                    </h2>
                    <div style={{ display: 'flex', gap: '4px' }}>
                        <button onClick={prevMonth} className="icon-btn"><ChevronLeft size={18} /></button>
                        <button onClick={nextMonth} className="icon-btn"><ChevronRight size={18} /></button>
                    </div>
                </div>

                <div style={{ display: 'flex', background: '#F3F4F6', padding: '4px', borderRadius: '8px', gap: '4px' }}>
                    {['All', 'National', 'Company', 'Custom'].map(type => (
                        <button
                            key={type}
                            onClick={() => setFilter(type)}
                            style={{
                                padding: '6px 12px',
                                borderRadius: '6px',
                                border: 'none',
                                fontSize: '13px',
                                fontWeight: '600',
                                cursor: 'pointer',
                                background: filter === type ? 'white' : 'transparent',
                                color: filter === type ? 'var(--primary)' : 'var(--text-muted)',
                                boxShadow: filter === type ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                                transition: 'all 0.2s'
                            }}
                        >
                            {type}
                        </button>
                    ))}
                </div>
            </div>
        );
    };

    const renderDays = () => {
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        return (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', marginBottom: '8px' }}>
                {days.map(day => (
                    <div key={day} style={{ textAlign: 'center', fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)', paddingBottom: '8px' }}>
                        {day}
                    </div>
                ))}
            </div>
        );
    };

    const renderCells = () => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const totalDays = daysInMonth(year, month);
        const firstDay = firstDayOfMonth(year, month);
        const cells = [];

        // Helper to normalize dates for comparison
        const normalizeDate = (d) => {
            if (!d) return null;
            const date = new Date(d);
            return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
        };

        // Empty cells for alignment
        for (let i = 0; i < firstDay; i++) {
            cells.push(<div key={`empty-${i}`} style={{ padding: '20px', border: '1px solid #F3F4F6' }}></div>);
        }

        // Actual days
        for (let d = 1; d <= totalDays; d++) {
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            const dayHolidays = filteredHolidays.filter(h => normalizeDate(h.date) === dateStr);
            const isToday = new Date().toDateString() === new Date(year, month, d).toDateString();

            cells.push(
                <div key={d} style={{
                    minHeight: '120px',
                    padding: '8px 0',
                    border: '1px solid #F3F4F6',
                    position: 'relative',
                    background: isToday ? '#F0F7FF' : 'transparent',
                    display: 'flex',
                    flexDirection: 'column'
                }}>
                    <div style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '50%',
                        background: isToday ? 'var(--primary)' : 'transparent',
                        color: isToday ? 'white' : 'var(--text-main)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '14px',
                        fontWeight: isToday ? '800' : '600',
                        marginLeft: '8px',
                        marginBottom: '6px'
                    }}>
                        {d}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', overflow: 'hidden' }}>
                        {dayHolidays.map((h, i) => {
                            const isNational = h.type === 'National';
                            const isCompany = h.type === 'Company';
                            return (
                                <div key={i} style={{
                                    background: isNational ? '#FEE2E2' : (isCompany ? '#FEF3C7' : '#DBEAFE'),
                                    color: isNational ? '#991B1B' : (isCompany ? '#92400E' : '#1E40AF'),
                                    fontSize: '10px',
                                    padding: '3px 8px',
                                    fontWeight: '600',
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    borderLeft: `3px solid ${isNational ? '#EF4444' : (isCompany ? '#F59E0B' : '#3B82F6')}`,
                                    margin: '0 2px'
                                }} title={h.name}>
                                    <span>{h.name}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            );
        }

        return <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', border: '1px solid #F3F4F6', borderRadius: '12px', overflow: 'hidden' }}>{cells}</div>;
    };

    return (
        <div className="holiday-calendar">
            {renderHeader()}
            {renderDays()}
            {renderCells()}

            <style>{`
        .icon-btn {
          background: white;
          border: 1px solid var(--border);
          padding: 6px;
          border-radius: 6px;
          cursor: pointer;
          color: var(--text-muted);
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
        }
        .icon-btn:hover {
          border-color: var(--primary);
          color: var(--primary);
          background: #F0F7FF;
        }
      `}</style>
        </div>
    );
};

export default HolidayCalendar;
