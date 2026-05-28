import React, { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { Loader2 } from 'lucide-react';

const money = (value) => `Rs ${Number(value || 0).toFixed(2)}`;

const EmployeeAssetsPage = () => {
    const [loading, setLoading] = useState(true);
    const [assets, setAssets] = useState([]);

    const fetchMyAssets = async () => {
        try {
            setLoading(true);
            const rows = await api.get('/assets/my');
            setAssets(Array.isArray(rows) ? rows : []);
        } catch (error) {
            console.error('Failed to fetch my assets', error);
            alert(error.message || 'Failed to fetch assigned assets');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMyAssets();
    }, []);

    if (loading) {
        return (
            <div style={{ textAlign: 'center', padding: '80px' }}>
                <Loader2 className="animate-spin" size={36} color="var(--primary)" />
            </div>
        );
    }

    return (
        <>
            <div style={{ marginBottom: '24px' }}>
                <h1 style={{ fontSize: '26px', color: 'var(--text-main)', fontWeight: '700' }}>My Assets</h1>
                <p style={{ color: 'var(--text-muted)', marginTop: '4px' }}>
                    Assets currently assigned to you.
                </p>
            </div>

            <div className="card" style={{ padding: '16px' }}>
                {assets.length === 0 ? (
                    <p style={{ color: 'var(--text-muted)' }}>No company assets are currently assigned to you.</p>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left' }}>
                                    <th style={{ padding: '8px' }}>Asset</th>
                                    <th style={{ padding: '8px' }}>Type</th>
                                    <th style={{ padding: '8px' }}>Serial Number</th>
                                    <th style={{ padding: '8px' }}>Assigned Date</th>
                                    <th style={{ padding: '8px' }}>Value</th>
                                    <th style={{ padding: '8px' }}>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {assets.map((asset) => (
                                    <tr key={asset.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                        <td style={{ padding: '8px', fontWeight: 600 }}>{asset.name}</td>
                                        <td style={{ padding: '8px' }}>{asset.asset_type}</td>
                                        <td style={{ padding: '8px' }}>{asset.serial_number}</td>
                                        <td style={{ padding: '8px' }}>{asset.assigned_date ? new Date(asset.assigned_date).toLocaleDateString() : '-'}</td>
                                        <td style={{ padding: '8px' }}>{asset.asset_value != null ? money(asset.asset_value) : '-'}</td>
                                        <td style={{ padding: '8px' }}>{asset.status}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </>
    );
};

export default EmployeeAssetsPage;