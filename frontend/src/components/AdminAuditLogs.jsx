import React, { useEffect, useState } from 'react';
import { fetchAuditLogs } from '../services/auditService';
import { FileText, AlertCircle, Loader, User, Activity } from 'lucide-react';

const AdminAuditLogs = () => {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadLogs = async () => {
            try {
                const data = await fetchAuditLogs();
                setLogs(data.data);
            } catch (err) {
                console.error("Failed to fetch logs", err);
            } finally {
                setLoading(false);
            }
        };
        loadLogs();
    }, []);

    if (loading) return (
        <div className="flex justify-center items-center p-8">
            <Loader className="w-6 h-6 animate-spin text-slate-400" />
            <span className="ml-2 text-slate-600">Loading Compliance Logs...</span>
        </div>
    );

    return (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 mb-8">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-200">
                <FileText className="w-6 h-6 text-slate-400" />
                <h2 className="text-xl font-medium text-slate-900 m-0">System Audit & Compliance Logs</h2>
            </div>
            <div className="overflow-x-auto max-h-96 overflow-y-auto">
                <table className="w-full border-collapse text-left text-xs">
                    <thead className="sticky top-0 bg-slate-50">
                        <tr className="text-slate-600">
                            <th className="py-3 px-4 border-b-2 border-slate-200">Timestamp</th>
                            <th className="py-3 px-4 border-b-2 border-slate-200">User</th>
                            <th className="py-3 px-4 border-b-2 border-slate-200">Action</th>
                            <th className="py-3 px-4 border-b-2 border-slate-200">Resource Path</th>
                        </tr>
                    </thead>
                    <tbody>
                        {logs.map(log => (
                            <tr key={log._id} className="border-b border-slate-200 font-mono hover:bg-slate-50 transition-colors">
                                <td className="py-3 px-4 text-slate-600">{new Date(log.createdAt).toLocaleString()}</td>
                                <td className="py-3 px-4">
                                    <div className="flex items-center gap-2">
                                        <User className="w-3 h-3" />
                                        <span className={log.user ? "text-blue-600" : "text-red-500"}>
                                            {log.user ? `${log.user.email} (${log.user.role})` : 'System / Unauthenticated'}
                                        </span>
                                    </div>
                                </td>
                                <td className="py-3 px-4">
                                    <div className="flex items-center gap-2">
                                        <Activity className="w-3 h-3 text-slate-400" />
                                        <span className="font-medium text-slate-900">{log.action}</span>
                                    </div>
                                </td>
                                <td className="py-3 px-4 text-slate-500 font-mono text-xs">{log.resource}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default AdminAuditLogs;