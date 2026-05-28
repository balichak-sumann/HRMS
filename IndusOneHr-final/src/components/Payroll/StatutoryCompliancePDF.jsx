import React from 'react';
import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer';

Font.register({
    family: 'Noto Sans',
    src: 'https://cdn.jsdelivr.net/gh/googlefonts/noto-fonts@master/hinted/ttf/NotoSans/NotoSans-Regular.ttf'
});

Font.register({
    family: 'Noto Sans Bold',
    src: 'https://cdn.jsdelivr.net/gh/googlefonts/noto-fonts@master/hinted/ttf/NotoSans/NotoSans-Bold.ttf'
});

const styles = StyleSheet.create({
    page: {
        padding: 24,
        fontFamily: 'Noto Sans',
        fontSize: 10,
        color: '#111827'
    },
    title: {
        fontFamily: 'Noto Sans Bold',
        fontSize: 16,
        marginBottom: 6
    },
    subtitle: {
        color: '#4B5563',
        marginBottom: 14
    },
    summaryGrid: {
        display: 'flex',
        flexDirection: 'row',
        gap: 8,
        marginBottom: 14
    },
    summaryCard: {
        flex: 1,
        border: '1 solid #D1D5DB',
        borderRadius: 4,
        padding: 8
    },
    summaryLabel: {
        fontSize: 9,
        color: '#6B7280'
    },
    summaryValue: {
        marginTop: 4,
        fontFamily: 'Noto Sans Bold',
        fontSize: 12
    },
    table: {
        border: '1 solid #D1D5DB',
        borderRadius: 4
    },
    trHead: {
        display: 'flex',
        flexDirection: 'row',
        backgroundColor: '#F3F4F6',
        borderBottom: '1 solid #D1D5DB',
        fontFamily: 'Noto Sans Bold'
    },
    tr: {
        display: 'flex',
        flexDirection: 'row',
        borderBottom: '1 solid #E5E7EB'
    },
    cellName: {
        width: '32%',
        padding: 6
    },
    cell: {
        width: '17%',
        padding: 6,
        textAlign: 'right'
    }
});

const money = (value) => `Rs ${Number(value || 0).toFixed(2)}`;

const StatutoryCompliancePDF = ({ report }) => {
    const rows = report?.records || [];

    return (
        <Document>
            <Page size="A4" style={styles.page}>
                <Text style={styles.title}>Monthly Statutory Compliance Report</Text>
                <Text style={styles.subtitle}>{report?.month} {report?.year}</Text>

                <View style={styles.summaryGrid}>
                    <View style={styles.summaryCard}>
                        <Text style={styles.summaryLabel}>PF Collected (Employee)</Text>
                        <Text style={styles.summaryValue}>{money(report?.totals?.pf_employee)}</Text>
                    </View>
                    <View style={styles.summaryCard}>
                        <Text style={styles.summaryLabel}>ESI Collected (Employee)</Text>
                        <Text style={styles.summaryValue}>{money(report?.totals?.esi_employee)}</Text>
                    </View>
                    <View style={styles.summaryCard}>
                        <Text style={styles.summaryLabel}>TDS Deducted</Text>
                        <Text style={styles.summaryValue}>{money(report?.totals?.tds)}</Text>
                    </View>
                </View>

                <View style={styles.table}>
                    <View style={styles.trHead}>
                        <Text style={styles.cellName}>Employee</Text>
                        <Text style={styles.cell}>Gross</Text>
                        <Text style={styles.cell}>PF Emp</Text>
                        <Text style={styles.cell}>ESI Emp</Text>
                        <Text style={styles.cell}>TDS</Text>
                    </View>

                    {rows.length === 0 ? (
                        <View style={styles.tr}>
                            <Text style={{ padding: 8, color: '#6B7280' }}>No payroll records found for this month.</Text>
                        </View>
                    ) : rows.map((row) => (
                        <View key={row.id} style={styles.tr}>
                            <Text style={styles.cellName}>{row.full_name}</Text>
                            <Text style={styles.cell}>{money(row.gross_salary)}</Text>
                            <Text style={styles.cell}>{money(row.pf_employee)}</Text>
                            <Text style={styles.cell}>{money(row.esi_employee)}</Text>
                            <Text style={styles.cell}>{money(row.tds)}</Text>
                        </View>
                    ))}
                </View>
            </Page>
        </Document>
    );
};

export default StatutoryCompliancePDF;
