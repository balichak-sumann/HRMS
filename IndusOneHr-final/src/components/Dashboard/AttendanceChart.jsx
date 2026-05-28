import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Legend } from 'recharts';

const AttendanceChart = ({ data = [] }) => {
    // Transform deptData if needed, or use as is
    const chartData = data.length > 0 ? data : [
        { name: 'Engineering', count: 0 },
        { name: 'Design', count: 0 },
        { name: 'Marketing', count: 0 },
    ];

    const COLORS = ['#3B82F6', '#FBBF24', '#9CA3AF', '#F59E0B', '#10B981'];
    return (
        <div className="card" style={{ height: '400px' }}>
            <h3 style={{ marginBottom: '24px', fontSize: '18px' }}>Employees Overview</h3>
            <ResponsiveContainer width="100%" height="80%">
                <BarChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                    <XAxis
                        dataKey="name"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#6B7280', fontSize: 12 }}
                        dy={10}
                    />
                    <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#6B7280', fontSize: 12 }}
                    />
                    <Tooltip
                        cursor={{ fill: 'transparent' }}
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    />
                    <Bar dataKey="count" radius={[4, 4, 0, 0]} barSize={40}>
                        {chartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '24px', marginTop: '20px', flexWrap: 'wrap' }}>
                {chartData.map((item, index) => (
                    <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: '12px', height: '12px', borderRadius: '2px', background: COLORS[index % COLORS.length] }}></div>
                        <span style={{ fontSize: '10px', color: '#6B7280' }}>{item.name}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default AttendanceChart;
