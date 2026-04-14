import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { FileText, ShieldAlert, CheckCircle2, TrendingUp } from 'lucide-react';

const AdminTaxManagement = () => {
    const [taxData, setTaxData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchTaxes = async () => {
            try {
                const res = await api.get('/taxes/summary');
                setTaxData(res.data.data);
            } catch (err) {
                setError('Failed to load tax summary from the ledger.');
            } finally {
                setLoading(false);
            }
        };
        fetchTaxes();
    }, []);

    const formatMoney = (amount) => `₱${(amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    if (loading) return <div className="p-8 text-center text-slate-500">Compiling BIR Data...</div>;
    if (error) return <div className="p-8 text-center text-red-500">{error}</div>;

    const totalCompanyLiability = taxData.valueAddedTax.netVatPayable + taxData.statutory.totalPayable + taxData.withholding.totalPayable;

    return (
        <div className="p-6 max-w-6xl mx-auto">
            {/* Header */}
            <div className="bg-white border border-slate-200 p-8 rounded-xl shadow-sm mb-8 flex justify-between items-center">
                <div>
                    <div className="inline-flex items-center gap-2 bg-emerald-100 text-emerald-800 text-xs font-bold px-3 py-1 rounded-full mb-2">
                        <CheckCircle2 className="w-3 h-3" /> BIR COMPLIANCE ENGINE
                    </div>
                    <h1 className="text-3xl font-light text-slate-900 mb-1">Tax & Statutory Liabilities</h1>
                    <p className="text-slate-500 text-sm">Real-time aggregation of your Philippine tax obligations.</p>
                </div>
                <div className="text-right p-5 bg-slate-800 rounded-xl text-white shadow-inner min-w-[200px]">
                    <div className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-1">Total Gov Liability</div>
                    <div className="text-3xl font-black text-emerald-400">{formatMoney(totalCompanyLiability)}</div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* 1. Value Added Tax (VAT) */}
                <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
                    <div className="bg-indigo-50 border-b border-indigo-100 p-5 flex items-center gap-3">
                        <TrendingUp className="w-5 h-5 text-indigo-600" />
                        <div>
                            <h2 className="text-lg font-bold text-slate-800">Value Added Tax</h2>
                            <p className="text-indigo-600/70 text-xs font-semibold">BIR Form 2550Q / 2550M</p>
                        </div>
                    </div>
                    <div className="p-6 flex-grow">
                        <div className="space-y-4 mb-6">
                            <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                                <span className="text-slate-600 text-sm">Output VAT (From Sales)</span>
                                <span className="font-medium text-slate-900">{formatMoney(taxData.valueAddedTax.outputVat)}</span>
                            </div>
                            <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                                <span className="text-slate-600 text-sm">Less: Input VAT (Purchases)</span>
                                <span className="font-medium text-slate-500">({formatMoney(taxData.valueAddedTax.inputVat)})</span>
                            </div>
                        </div>
                        <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 flex justify-between items-center">
                            <span className="font-bold text-slate-700 text-sm">Net VAT Payable</span>
                            <span className="font-bold text-lg text-slate-900">{formatMoney(taxData.valueAddedTax.netVatPayable)}</span>
                        </div>
                    </div>
                    <div className="p-4 border-t border-slate-100 bg-slate-50">
                        <button className="w-full text-sm font-semibold text-indigo-600 hover:text-indigo-800 transition-colors">Record BIR Payment →</button>
                    </div>
                </div>

                {/* 2. Statutory Benefits */}
                <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
                    <div className="bg-emerald-50 border-b border-emerald-100 p-5 flex items-center gap-3">
                        <ShieldAlert className="w-5 h-5 text-emerald-600" />
                        <div>
                            <h2 className="text-lg font-bold text-slate-800">Statutory Benefits</h2>
                            <p className="text-emerald-600/70 text-xs font-semibold">Employee/Employer Contributions</p>
                        </div>
                    </div>
                    <div className="p-6 flex-grow">
                        <div className="space-y-4 mb-6">
                            <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                                <span className="text-slate-600 text-sm">SSS Premium Payable</span>
                                <span className="font-medium text-slate-900">{formatMoney(taxData.statutory.sss)}</span>
                            </div>
                            <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                                <span className="text-slate-600 text-sm">PhilHealth Payable</span>
                                <span className="font-medium text-slate-900">{formatMoney(taxData.statutory.philhealth)}</span>
                            </div>
                            <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                                <span className="text-slate-600 text-sm">Pag-IBIG Payable</span>
                                <span className="font-medium text-slate-900">{formatMoney(taxData.statutory.pagibig)}</span>
                            </div>
                        </div>
                        <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 flex justify-between items-center">
                            <span className="font-bold text-slate-700 text-sm">Total Remittance Due</span>
                            <span className="font-bold text-lg text-slate-900">{formatMoney(taxData.statutory.totalPayable)}</span>
                        </div>
                    </div>
                    <div className="p-4 border-t border-slate-100 bg-slate-50">
                        <button className="w-full text-sm font-semibold text-emerald-600 hover:text-emerald-800 transition-colors">Record Remittance →</button>
                    </div>
                </div>

                {/* 3. Withholding Tax */}
                <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
                    <div className="bg-amber-50 border-b border-amber-100 p-5 flex items-center gap-3">
                        <FileText className="w-5 h-5 text-amber-600" />
                        <div>
                            <h2 className="text-lg font-bold text-slate-800">Withholding Taxes</h2>
                            <p className="text-amber-600/70 text-xs font-semibold">BIR Form 1601-C / 1601-E</p>
                        </div>
                    </div>
                    <div className="p-6 flex-grow">
                        <div className="space-y-4 mb-6">
                            <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                                <span className="text-slate-600 text-sm">Tax on Compensation</span>
                                <span className="font-medium text-slate-900">{formatMoney(taxData.withholding.compensation)}</span>
                            </div>
                            <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                                <span className="text-slate-600 text-sm">Expanded Withholding</span>
                                <span className="font-medium text-slate-900">{formatMoney(taxData.withholding.expanded)}</span>
                            </div>
                        </div>
                        <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 flex justify-between items-center">
                            <span className="font-bold text-slate-700 text-sm">Total Withholding Due</span>
                            <span className="font-bold text-lg text-slate-900">{formatMoney(taxData.withholding.totalPayable)}</span>
                        </div>
                    </div>
                    <div className="p-4 border-t border-slate-100 bg-slate-50">
                        <button className="w-full text-sm font-semibold text-amber-600 hover:text-amber-800 transition-colors">Record BIR Payment →</button>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default AdminTaxManagement;