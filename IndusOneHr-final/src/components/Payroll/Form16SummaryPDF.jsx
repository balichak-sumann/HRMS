import React from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';

const styles = StyleSheet.create({
    page: {
        padding: 24,
        fontSize: 10,
        color: '#0f172a',
    },
    heading: {
        fontSize: 16,
        fontWeight: 700,
        marginBottom: 4,
    },
    subHeading: {
        fontSize: 11,
        color: '#334155',
        marginBottom: 12,
    },
    section: {
        marginTop: 10,
    },
    sectionTitle: {
        fontSize: 12,
        fontWeight: 700,
        marginBottom: 6,
    },
    row: {
        flexDirection: 'row',
        borderBottom: '1 solid #e2e8f0',
        paddingVertical: 5,
    },
    colWide: {
        width: '60%',
    },
    colMid: {
        width: '20%',
        textAlign: 'right',
    },
    colNarrow: {
        width: '20%',
        textAlign: 'right',
    },
    summaryCard: {
        border: '1 solid #cbd5e1',
        borderRadius: 4,
        padding: 8,
        marginTop: 8,
    },
    summaryLabel: {
        fontSize: 9,
        color: '#475569',
    },
    summaryValue: {
        fontSize: 13,
        fontWeight: 700,
        marginTop: 2,
    },
});

const money = (value) => `Rs ${Number(value || 0).toFixed(2)}`;

const Form16SummaryPDF = ({ summary }) => {
    const deductions = summary?.deductions || [];

    return (
        <Document>
            <Page size="A4" style={styles.page}>
                <Text style={styles.heading}>Form 16 Summary</Text>
                <Text style={styles.subHeading}>Financial Year: {summary?.financial_year || '-'}</Text>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Employee</Text>
                    <Text>Name: {summary?.employee?.full_name || '-'}</Text>
                    <Text>PAN: {summary?.employee?.pan || '-'}</Text>
                    <Text>Department: {summary?.employee?.department || '-'}</Text>
                    <Text>Designation: {summary?.employee?.role || '-'}</Text>
                </View>

                <View style={styles.summaryCard}>
                    <Text style={styles.summaryLabel}>Gross Income</Text>
                    <Text style={styles.summaryValue}>{money(summary?.gross_income)}</Text>
                </View>
                <View style={styles.summaryCard}>
                    <Text style={styles.summaryLabel}>Approved Deductions</Text>
                    <Text style={styles.summaryValue}>{money(summary?.total_approved_deductions)}</Text>
                </View>
                <View style={styles.summaryCard}>
                    <Text style={styles.summaryLabel}>Taxable Income</Text>
                    <Text style={styles.summaryValue}>{money(summary?.taxable_income)}</Text>
                </View>
                <View style={styles.summaryCard}>
                    <Text style={styles.summaryLabel}>Total TDS Deducted</Text>
                    <Text style={styles.summaryValue}>{money(summary?.total_tds_deducted)}</Text>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Approved Deduction Lines</Text>
                    <View style={styles.row}>
                        <Text style={styles.colWide}>Section / Item</Text>
                        <Text style={styles.colMid}>Section</Text>
                        <Text style={styles.colNarrow}>Approved</Text>
                    </View>

                    {deductions.length === 0 ? (
                        <View style={styles.row}>
                            <Text style={styles.colWide}>No approved deductions for this FY.</Text>
                            <Text style={styles.colMid}>-</Text>
                            <Text style={styles.colNarrow}>-</Text>
                        </View>
                    ) : deductions.map((row) => (
                        <View key={row.section_code + row.item_label + row.approved_amount} style={styles.row}>
                            <Text style={styles.colWide}>{row.item_label}</Text>
                            <Text style={styles.colMid}>{row.section_code}</Text>
                            <Text style={styles.colNarrow}>{money(row.approved_amount)}</Text>
                        </View>
                    ))}
                </View>
            </Page>
        </Document>
    );
};

export default Form16SummaryPDF;
