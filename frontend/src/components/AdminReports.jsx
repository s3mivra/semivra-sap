import React, { useState } from 'react';
import { fetchJournalEntries } from '../services/accountingService';
import { fetchProducts } from '../services/productService';
import { Package, FileText, TrendingUp, Users, DollarSign } from 'lucide-react';

const AdminReports = () => {
    const [isExporting, setIsExporting] = useState(false);
    const [status, setStatus] = useState({ type: '', message: '' });

    // --- UTILITY: Convert JSON to CSV and trigger download ---
    const downloadCSV = (csvContent, fileName) => {
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', fileName);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // --- REPORT 1: GENERAL LEDGER ---
    const exportGeneralLedger = async () => {
        setIsExporting(true);
        setStatus({ type: '', message: '' });
        try {
            const response = await fetchJournalEntries();
            const journals = response.data;

            if (journals.length === 0) return setStatus({ type: 'error', message: 'No financial data to export.' });

            // Create CSV Headers
            let csvRows = ['Date,Entry Number,Description,Account Code,Account Name,Debit,Credit,Posted By'];

            // Format Data Rows
            journals.forEach(journal => {
                const date = new Date(journal.date).toLocaleDateString();
                const postedBy = journal.postedBy?.name || 'System Auto';
                
                // Escape commas in descriptions so they don't break the CSV columns!
                const safeDesc = `"${journal.description.replace(/"/g, '""')}"`;

                journal.lines.forEach(line => {
                    const accCode = line.account?.code || 'N/A';
                    const accName = `"${line.account?.name || 'N/A'}"`;
                    
                    csvRows.push(`${date},${journal.entryNumber},${safeDesc},${accCode},${accName},${line.debit || 0},${line.credit || 0},"${postedBy}"`);
                });
            });

            downloadCSV(csvRows.join('\n'), `General_Ledger_Export_${new Date().toISOString().split('T')[0]}.csv`);
            setStatus({ type: 'success', message: 'General Ledger exported successfully!' });
        } catch (error) {
            setStatus({ type: 'error', message: 'Failed to export General Ledger.' });
        } finally {
            setIsExporting(false);
        }
    };

    // --- REPORT 2: INVENTORY STATUS ---
    const exportInventoryStatus = async () => {
        setIsExporting(true);
        setStatus({ type: '', message: '' });
        try {
            const response = await fetchProducts();
            const products = response.data.filter(p => p.isPhysical); // Only grab physical stock

            if (products.length === 0) return setStatus({ type: 'error', message: 'No physical inventory found.' });

            // Create CSV Headers
            let csvRows = ['SKU,Product Name,Material Group,Unit of Measure,Current Stock Level'];

            // Format Data Rows
            products.forEach(p => {
                const safeName = `"${p.name.replace(/"/g, '""')}"`;
                const category = `"${p.category?.name || 'N/A'}"`;
                const unit = p.unit?.abbreviation || 'N/A';
                
                csvRows.push(`${p.sku},${safeName},${category},${unit},${p.currentStock || 0}`);
            });

            downloadCSV(csvRows.join('\n'), `Inventory_Status_${new Date().toISOString().split('T')[0]}.csv`);
            setStatus({ type: 'success', message: 'Inventory Status exported successfully!' });
        } catch (error) {
            setStatus({ type: 'error', message: 'Failed to export Inventory Status.' });
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <div style={{ backgroundColor: '#fff', padding: '30px', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', maxWidth: '800px', margin: '0 auto' }}>
            <h1 style={{ margin: '0 0 10px 0', color: '#2c3e50' }}>Data Exports & Reporting</h1>
            <p style={{ color: '#7f8c8d', marginBottom: '30px' }}>Download your system data into CSV format for Excel, Sheets, or your accounting team.</p>

            {status.message && (
                <div style={{ padding: '15px', marginBottom: '20px', borderRadius: '4px', backgroundColor: status.type === 'success' ? '#e8f8f5' : '#fdedec', color: status.type === 'success' ? '#27ae60' : '#c0392b', fontWeight: 'bold' }}>
                    {status.message}
                </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                
                {/* Financial Export Card */}
                <div style={{ border: '1px solid #eee', borderRadius: '8px', padding: '20px', backgroundColor: '#f8f9fa', textAlign: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2, marginBottom: '10px' }}>
                        <FileText style={{ width: '20px', height: '20px', color: '#2980b9' }} />
                        <h3 style={{ margin: 0, color: '#2980b9' }}>General Ledger</h3>
                    </div>
                    <p style={{ fontSize: '14px', color: '#7f8c8d', marginBottom: '20px' }}>Export every financial journal entry, including manual entries, PO automation, and POS sales.</p>
                    <button 
                        onClick={exportGeneralLedger} 
                        disabled={isExporting}
                        style={{ padding: '12px 20px', backgroundColor: '#2980b9', color: 'white', border: 'none', borderRadius: '4px', cursor: isExporting ? 'not-allowed' : 'pointer', fontWeight: 'bold', width: '100%' }}
                    >
                        {isExporting ? 'Processing...' : 'Export Financials to CSV'}
                    </button>
                </div>

                {/* Inventory Export Card */}
                <div style={{ border: '1px solid #eee', borderRadius: '8px', padding: '20px', backgroundColor: '#f8f9fa', textAlign: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2, marginBottom: '10px' }}>
                        <Package style={{ width: '20px', height: '20px', color: '#27ae60' }} />
                        <h3 style={{ margin: 0, color: '#27ae60' }}>Inventory Status</h3>
                    </div>
                    <p style={{ fontSize: '14px', color: '#7f8c8d', marginBottom: '20px' }}>Export a snapshot of all physical goods, current stock levels, and units of measurement.</p>
                    <button 
                        onClick={exportInventoryStatus} 
                        disabled={isExporting}
                        style={{ padding: '12px 20px', backgroundColor: '#27ae60', color: 'white', border: 'none', borderRadius: '4px', cursor: isExporting ? 'not-allowed' : 'pointer', fontWeight: 'bold', width: '100%' }}
                    >
                        {isExporting ? 'Processing...' : 'Export Inventory to CSV'}
                    </button>
                </div>

            </div>
        </div>
    );
};

export default AdminReports;