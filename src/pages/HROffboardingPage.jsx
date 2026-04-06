import React, { useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api';
import { Loader2, RefreshCw, Download, CheckCircle2 } from 'lucide-react';
import { Document, Page, Text, View, StyleSheet, PDFDownloadLink } from '@react-pdf/renderer';

// Dynamic lookup states

// Dynamic lookup states

const formatDate = (value) => {
    if (!value) return '-';
    return new Date(value).toLocaleDateString();
};

const pdfStyles = StyleSheet.create({
    page: { padding: 40, fontFamily: 'Helvetica', fontSize: 11, color: '#1F2937' },
    header: {
        marginBottom: 22,
        borderBottom: '1 solid #E5E7EB',
        paddingBottom: 10,
        flexDirection: 'row',
        justifyContent: 'space-between'
    },
    brand: { fontSize: 16, fontWeight: 'bold', color: '#2563EB' },
    heading: { fontSize: 14, fontWeight: 'bold', marginBottom: 12 },
    sectionTitle: { fontSize: 12, fontWeight: 'bold', marginTop: 12, marginBottom: 6 },
    line: { marginBottom: 4 },
    tableHeader: {
        flexDirection: 'row',
        borderBottom: '1 solid #E5E7EB',
        borderTop: '1 solid #E5E7EB',
        paddingVertical: 6,
        marginTop: 6,
        fontWeight: 'bold'
    },
    row: {
        flexDirection: 'row',
        borderBottom: '1 solid #F3F4F6',
        paddingVertical: 6
    },
    colTask: { width: '46%' },
    colRole: { width: '18%' },
    colStatus: { width: '18%' },
    colDate: { width: '18%' },
    footer: {
        marginTop: 26,
        borderTop: '1 solid #E5E7EB',
        paddingTop: 10,
        fontSize: 9,
        color: '#6B7280'
    }
});

const RelievingLetterPDF = ({ data }) => {
    if (!data) return null;

    return (
        <Document>
            <Page size="A4" style={pdfStyles.page}>
                <View style={pdfStyles.header}>
                    <Text style={pdfStyles.brand}>INDUSINNOVATE TECHNOLOGIES</Text>
                    <View>
                        <Text>Employee Offboarding</Text>
                        <Text>Relieving / Experience Letter</Text>
                    </View>
                </View>

                <Text style={pdfStyles.heading}>Relieving and Experience Letter</Text>
                <Text style={pdfStyles.line}>Date: {new Date().toLocaleDateString()}</Text>
                <Text style={pdfStyles.line}>Employee: {data.employee_name}</Text>
                <Text style={pdfStyles.line}>Department: {data.employee_department || '-'}</Text>
                <Text style={pdfStyles.line}>Role: {data.employee_role || '-'}</Text>
                <Text style={pdfStyles.line}>Last Working Date: {formatDate(data.last_working_date)}</Text>

                <Text style={pdfStyles.sectionTitle}>Letter Content</Text>
                <Text style={pdfStyles.line}>
                    This is to certify that {data.employee_name} was employed with IndusInnovate Technologies and has
                    been relieved from duties effective {formatDate(data.last_working_date)} after successful completion
                    of all offboarding formalities.
                </Text>
                <Text style={pdfStyles.line}>
                    During their tenure, they were associated with the {data.employee_department || 'assigned'} department
                    in the capacity of {data.employee_role || 'team member'}. We appreciate their contribution and wish
                    them success in future endeavors.
                </Text>

                <Text style={pdfStyles.sectionTitle}>Offboarding Clearance Summary</Text>
                <View style={pdfStyles.tableHeader}>
                    <Text style={pdfStyles.colTask}>Checklist Item</Text>
                    <Text style={pdfStyles.colRole}>Assigned Role</Text>
                    <Text style={pdfStyles.colStatus}>Status</Text>
                    <Text style={pdfStyles.colDate}>Cleared On</Text>
                </View>
                {(data.checklist || []).map((item) => (
                    <View key={item.id} style={pdfStyles.row}>
                        <Text style={pdfStyles.colTask}>{item.task_title}</Text>
                        <Text style={pdfStyles.colRole}>{item.assigned_role}</Text>
                        <Text style={pdfStyles.colStatus}>{item.is_cleared ? 'Cleared' : 'Pending'}</Text>
                        <Text style={pdfStyles.colDate}>{item.cleared_at ? formatDate(item.cleared_at) : '-'}</Text>
                    </View>
                ))}

                <View style={{ marginTop: 18 }}>
                    <Text style={pdfStyles.line}>Authorized by: Human Resources</Text>
                    <Text style={pdfStyles.line}>For IndusInnovate Technologies Pvt. Ltd.</Text>
                </View>

                <View style={pdfStyles.footer}>
                    <Text>Confidential HR Document | Generated from IndusInnovate HR Suite</Text>
                </View>
            </Page>
        </Document>
    );
};

const HROffboardingPage = () => {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [finalizing, setFinalizing] = useState(false);
    const [filter, setFilter] = useState('in_progress');
    const [employees, setEmployees] = useState([]);
    const [cases, setCases] = useState([]);
    const [selectedCaseId, setSelectedCaseId] = useState('');
    const [selectedCase, setSelectedCase] = useState(null);
    const [reasonOptions, setReasonOptions] = useState([]);
    const [roleOptions, setRoleOptions] = useState([]);

    const [startForm, setStartForm] = useState({
        employee_id: '',
        last_working_date: '',
        reason: 'resignation',
        reason_details: ''
    });

    const reasonLabel = useMemo(() => {
        return reasonOptions.reduce((acc, item) => {
            acc[item.value] = item.label;
            return acc;
        }, {});
    }, []);

    const fetchList = async (nextFilter = filter) => {
        const [employeeRows, caseRows, reasonRows, roleRows] = await Promise.all([
            api.get('/employees').catch(() => []),
            api.get(`/offboarding/cases?status=${encodeURIComponent(nextFilter)}`),
            api.get('/lookups?category=OFFBOARDING_REASON').catch(() => []),
            api.get('/lookups?category=CLEARANCE_ROLE').catch(() => [])
        ]);

        const activeEmployees = (employeeRows || []).filter((row) => (row.status || 'Active').toLowerCase() !== 'inactive');
        setEmployees(activeEmployees);
        setCases(Array.isArray(caseRows) ? caseRows : []);
        setReasonOptions(reasonRows?.map(r => ({ value: r.value, label: r.value })) || []);
        setRoleOptions(roleRows?.map(r => r.value) || []);

        if (!selectedCaseId && Array.isArray(caseRows) && caseRows[0]) {
            setSelectedCaseId(caseRows[0].id);
        }

        if (selectedCaseId && Array.isArray(caseRows)) {
            const exists = caseRows.some((row) => row.id === selectedCaseId);
            if (!exists) {
                setSelectedCaseId(caseRows[0]?.id || '');
                setSelectedCase(null);
            }
        }
    };

    const fetchCaseDetails = async (caseId) => {
        if (!caseId) {
            setSelectedCase(null);
            return;
        }

        const details = await api.get(`/offboarding/cases/${caseId}`);
        setSelectedCase(details || null);
    };

    const loadData = async () => {
        try {
            setLoading(true);
            await fetchList(filter);
        } catch (error) {
            console.error('Failed to load offboarding data', error);
            alert(error.message || 'Failed to load offboarding data');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    useEffect(() => {
        if (!loading) {
            fetchList(filter).catch((error) => {
                console.error('Failed to refresh offboarding list', error);
            });
        }
    }, [filter]);

    useEffect(() => {
        fetchCaseDetails(selectedCaseId).catch((error) => {
            console.error('Failed to load offboarding case details', error);
        });
    }, [selectedCaseId]);

    const startOffboarding = async (event) => {
        event.preventDefault();
        try {
            setSaving(true);
            const created = await api.post('/offboarding/cases', startForm);
            setStartForm({ employee_id: '', last_working_date: '', reason: 'resignation', reason_details: '' });
            await fetchList(filter);
            setSelectedCaseId(created.id);
        } catch (error) {
            console.error('Failed to start offboarding', error);
            alert(error.message || 'Failed to start offboarding');
        } finally {
            setSaving(false);
        }
    };

    const updateAssignment = async (itemId, payload) => {
        if (!selectedCaseId) return;
        try {
            await api.patch(`/offboarding/cases/${selectedCaseId}/items/${itemId}/assignment`, payload);
            await fetchCaseDetails(selectedCaseId);
            await fetchList(filter);
        } catch (error) {
            console.error('Failed to update assignment', error);
            alert(error.message || 'Failed to update assignment');
        }
    };

    const toggleChecklistItem = async (item) => {
        try {
            await api.patch(`/offboarding/checklist/${item.id}/clear`, { is_cleared: !item.is_cleared });
            await fetchCaseDetails(selectedCaseId);
            await fetchList(filter);
        } catch (error) {
            console.error('Failed to update checklist item', error);
            alert(error.message || 'Failed to update checklist item');
        }
    };

    const finalizeCase = async () => {
        if (!selectedCaseId) return;
        try {
            setFinalizing(true);
            const finalized = await api.post(`/offboarding/cases/${selectedCaseId}/finalize`, {});
            setSelectedCase(finalized);
            await fetchList(filter);
            alert('Offboarding finalized and employee marked inactive');
        } catch (error) {
            console.error('Failed to finalize offboarding', error);
            alert(error.message || 'Failed to finalize offboarding');
        } finally {
            setFinalizing(false);
        }
    };

    if (loading) {
        return (
            <div style={{ textAlign: 'center', padding: '80px' }}>
                <Loader2 className="animate-spin" size={36} color="var(--primary)" />
            </div>
        );
    }

    const canFinalize =
        selectedCase &&
        selectedCase.progress_percentage === 100 &&
        selectedCase.interview_submitted &&
        selectedCase.status !== 'completed';

    return (
        <>
            <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h1 style={{ fontSize: '26px', color: 'var(--text-main)', fontWeight: '700' }}>Employee Offboarding</h1>
                    <p style={{ color: 'var(--text-muted)', marginTop: '6px' }}>
                        Start offboarding, monitor role-wise clearances, and generate relieving letters.
                    </p>
                </div>
                <button className="btn-primary" onClick={loadData}>
                    <RefreshCw size={16} /> Refresh
                </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div className="card" style={{ padding: '16px' }}>
                    <h3 style={{ fontSize: '16px', marginBottom: '10px' }}>Start Offboarding Case</h3>
                    <form onSubmit={startOffboarding} style={{ display: 'grid', gap: '10px' }}>
                        <select
                            className="input-field"
                            value={startForm.employee_id}
                            onChange={(e) => setStartForm((prev) => ({ ...prev, employee_id: e.target.value }))}
                            required
                        >
                            <option value="">Select employee</option>
                            {employees.map((row) => (
                                <option key={row.id} value={row.id}>{row.full_name} ({row.department || 'Unassigned'})</option>
                            ))}
                        </select>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                            <input
                                className="input-field"
                                type="date"
                                value={startForm.last_working_date}
                                onChange={(e) => setStartForm((prev) => ({ ...prev, last_working_date: e.target.value }))}
                                required
                            />
                            <select
                                className="input-field"
                                value={startForm.reason}
                                onChange={(e) => setStartForm((prev) => ({ ...prev, reason: e.target.value }))}
                                required
                            >
                                {reasonOptions.map((option) => (
                                    <option key={option.value} value={option.value}>{option.label}</option>
                                ))}
                            </select>
                        </div>

                        <textarea
                            className="input-field"
                            rows="3"
                            placeholder="Context or additional note"
                            value={startForm.reason_details}
                            onChange={(e) => setStartForm((prev) => ({ ...prev, reason_details: e.target.value }))}
                        />

                        <button className="btn-primary" type="submit" disabled={saving}>
                            {saving ? <Loader2 size={16} className="animate-spin" /> : null}
                            {saving ? 'Creating...' : 'Create Offboarding Case'}
                        </button>
                    </form>
                </div>

                <div className="card" style={{ padding: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', alignItems: 'center' }}>
                        <h3 style={{ fontSize: '16px' }}>Cases</h3>
                        <select className="input-field" style={{ width: '160px' }} value={filter} onChange={(e) => setFilter(e.target.value)}>
                            <option value="in_progress">In Progress</option>
                            <option value="completed">Completed</option>
                            <option value="All">All</option>
                        </select>
                    </div>

                    <div style={{ maxHeight: '280px', overflowY: 'auto', display: 'grid', gap: '8px' }}>
                        {cases.length === 0 ? (
                            <p style={{ color: 'var(--text-muted)' }}>No offboarding cases found.</p>
                        ) : cases.map((row) => (
                            <button
                                type="button"
                                key={row.id}
                                onClick={() => setSelectedCaseId(row.id)}
                                style={{
                                    border: row.id === selectedCaseId ? '1px solid var(--primary)' : '1px solid var(--border)',
                                    background: row.id === selectedCaseId ? 'rgba(37,99,235,0.08)' : 'var(--card-bg)',
                                    borderRadius: '10px',
                                    padding: '10px',
                                    textAlign: 'left',
                                    cursor: 'pointer'
                                }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
                                    <div>
                                        <p style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '13px' }}>{row.employee_name}</p>
                                        <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{reasonLabel[row.reason] || row.reason}</p>
                                    </div>
                                    <span style={{ fontSize: '12px', fontWeight: 700 }}>{row.progress_percentage}%</span>
                                </div>
                                <div style={{ marginTop: '7px', width: '100%', height: '6px', background: '#E2E8F0', borderRadius: '999px' }}>
                                    <div style={{ width: `${row.progress_percentage}%`, height: '100%', background: '#2563EB', borderRadius: '999px' }} />
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="card" style={{ padding: '16px' }}>
                {!selectedCase ? (
                    <p style={{ color: 'var(--text-muted)' }}>Select a case to view details.</p>
                ) : (
                    <>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', alignItems: 'flex-start', marginBottom: '12px' }}>
                            <div>
                                <h3 style={{ fontSize: '18px', fontWeight: 700 }}>{selectedCase.employee_name}</h3>
                                <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
                                    Last Working Date: {formatDate(selectedCase.last_working_date)} | Reason: {reasonLabel[selectedCase.reason] || selectedCase.reason}
                                </p>
                                <p style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
                                    Exit Interview: {selectedCase.interview_submitted ? 'Submitted' : 'Pending'}
                                </p>
                            </div>

                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                <PDFDownloadLink
                                    document={<RelievingLetterPDF data={selectedCase} />}
                                    fileName={`relieving_letter_${selectedCase.employee_name?.replace(/\s+/g, '_') || 'employee'}.pdf`}
                                >
                                    {({ loading: downloading }) => (
                                        <button className="btn-primary" style={{ background: '#0f766e', borderColor: '#0f766e' }}>
                                            <Download size={15} /> {downloading ? 'Preparing...' : 'Relieving Letter PDF'}
                                        </button>
                                    )}
                                </PDFDownloadLink>

                                <button
                                    className="btn-primary"
                                    onClick={finalizeCase}
                                    disabled={!canFinalize || finalizing}
                                    title={canFinalize ? 'Finalize and mark inactive' : 'Clear all checklist items and ensure exit interview is submitted first'}
                                >
                                    {finalizing ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
                                    {finalizing ? 'Finalizing...' : 'Finalize Offboarding'}
                                </button>
                            </div>
                        </div>

                        <div style={{ marginBottom: '12px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                                <span style={{ fontSize: '13px', fontWeight: 600 }}>Progress</span>
                                <span style={{ fontSize: '13px', fontWeight: 700 }}>{selectedCase.progress_percentage}%</span>
                            </div>
                            <div style={{ width: '100%', height: '8px', background: '#E2E8F0', borderRadius: '999px', overflow: 'hidden' }}>
                                <div style={{ width: `${selectedCase.progress_percentage}%`, height: '100%', background: '#2563EB' }} />
                            </div>
                            <p style={{ marginTop: '6px', fontSize: '12px', color: 'var(--text-muted)' }}>
                                {selectedCase.cleared_items}/{selectedCase.total_items} checklist items cleared
                            </p>
                        </div>

                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                                <thead>
                                    <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left' }}>
                                        <th style={{ padding: '8px' }}>Checklist Item</th>
                                        <th style={{ padding: '8px' }}>Assigned Role</th>
                                        <th style={{ padding: '8px' }}>Assigned Person</th>
                                        <th style={{ padding: '8px' }}>Status</th>
                                        <th style={{ padding: '8px' }}>Cleared By</th>
                                        <th style={{ padding: '8px' }}>Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {(selectedCase.checklist || []).map((item) => (
                                        <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                            <td style={{ padding: '8px' }}>{item.task_title}</td>
                                            <td style={{ padding: '8px' }}>
                                                <select
                                                    className="input-field"
                                                    value={item.assigned_role}
                                                    onChange={(e) => updateAssignment(item.id, {
                                                        assigned_role: e.target.value,
                                                        assigned_to: item.assigned_to || ''
                                                    })}
                                                    disabled={selectedCase.status === 'completed'}
                                                >
                                                    {roleOptions.map((role) => (
                                                        <option key={role} value={role}>{role}</option>
                                                    ))}
                                                </select>
                                            </td>
                                            <td style={{ padding: '8px' }}>
                                                <select
                                                    className="input-field"
                                                    value={item.assigned_to || ''}
                                                    onChange={(e) => updateAssignment(item.id, {
                                                        assigned_role: item.assigned_role,
                                                        assigned_to: e.target.value || null
                                                    })}
                                                    disabled={selectedCase.status === 'completed'}
                                                >
                                                    <option value="">Unassigned</option>
                                                    {employees.map((employee) => (
                                                        <option key={employee.id} value={employee.id}>{employee.full_name}</option>
                                                    ))}
                                                </select>
                                            </td>
                                            <td style={{ padding: '8px' }}>{item.is_cleared ? 'Cleared' : 'Pending'}</td>
                                            <td style={{ padding: '8px' }}>
                                                {item.cleared_by_name || '-'}
                                                {item.cleared_at ? ` (${formatDate(item.cleared_at)})` : ''}
                                            </td>
                                            <td style={{ padding: '8px' }}>
                                                <button
                                                    className="btn-primary"
                                                    style={{
                                                        background: item.is_cleared ? '#b91c1c' : '#0f766e',
                                                        borderColor: item.is_cleared ? '#b91c1c' : '#0f766e'
                                                    }}
                                                    onClick={() => toggleChecklistItem(item)}
                                                    disabled={selectedCase.status === 'completed'}
                                                >
                                                    {item.is_cleared ? 'Mark Pending' : 'Mark Cleared'}
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}
            </div>
        </>
    );
};

export default HROffboardingPage;
