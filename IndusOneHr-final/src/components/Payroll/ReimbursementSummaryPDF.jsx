import React from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';

const styles = StyleSheet.create({
    page: {
        padding: 24,
        fontSize: 11,
        color: '#0f172a',
    },
    title: {
        fontSize: 16,
        fontWeight: 700,
        marginBottom: 6,
    },
    subtitle: {
        fontSize: 11,
        marginBottom: 14,
        color: '#334155',
    },
    card: {
        padding: 10,
        border: '1 solid #cbd5e1',
        borderRadius: 4,
        marginBottom: 14,
    },
    cardLabel: {
        fontSize: 10,
        color: '#475569',
    },
    cardValue: {
        fontSize: 18,
        marginTop: 4,
        fontWeight: 700,
    },
    tableHeader: {
        flexDirection: 'row',
        backgroundColor: '#e2e8f0',
        borderBottom: '1 solid #cbd5e1',
    },
    tableRow: {
        flexDirection: 'row',
        borderBottom: '1 solid #e2e8f0',
    },
    colEmployee: {
        width: '70%',
        padding: 7,
    },
    colAmount: {
        width: '30%',
        padding: 7,
        textAlign: 'right',
    },
    footer: {
        marginTop: 16,
        fontSize: 9,
        color: '#64748b',
    },
});

const money = (value) => `Rs ${Number(value || 0).toFixed(2)}`;

const ReimbursementSummaryPDF = ({ report }) => {
    const employees = report?.employees || [];

    return (
        <Document>
            <Page size="A4" style={styles.page}>
                <Text style={styles.title}>Monthly Reimbursement Summary</Text>
                <Text style={styles.subtitle}>
                    {`Month: ${report?.month || '-'}   Year: ${report?.year || '-'}`}
                </Text>

                <View style={styles.card}>
                    <Text style={styles.cardLabel}>Total Approved Reimbursements</Text>
                    <Text style={styles.cardValue}>{money(report?.total_approved_amount)}</Text>
                </View>

                <View style={styles.tableHeader}>
                    <Text style={styles.colEmployee}>Employee</Text>
                    <Text style={styles.colAmount}>Approved Amount</Text>
                </View>

                {employees.length === 0 ? (
                    <View style={styles.tableRow}>
                        <Text style={styles.colEmployee}>No approved reimbursements for this month.</Text>
                        <Text style={styles.colAmount}>-</Text>
                    </View>
                ) : employees.map((row) => (
                    <View key={row.employee_id} style={styles.tableRow}>
                        <Text style={styles.colEmployee}>{row.full_name}</Text>
                        <Text style={styles.colAmount}>{money(row.approved_amount)}</Text>
                    </View>
                ))}

                <Text style={styles.footer}>Generated from HRMS reimbursement module.</Text>
            </Page>
        </Document>
    );
};

export default ReimbursementSummaryPDF;
