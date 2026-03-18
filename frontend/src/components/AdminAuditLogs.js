import React, { useEffect, useState } from 'react';
import { fetchAuditLogs } from '../services/auditService';

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

    if (loading) return <div>Loading Compliance Logs...</div>;

    return (
        <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', marginBottom: '30px' }}>
            <h2 style={{ margin: '0 0 20px 0', fontSize: '18px', color: '#2c3e50', borderBottom: '1px solid #eee', paddingBottom: '10px' }}>
                System Audit & Compliance Logs
            </h2>
            <div style={{ overflowX: 'auto', maxHeight: '400px', overflowY: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px' }}>
                    <thead style={{ position: 'sticky', top: 0, backgroundColor: '#f8f9fa' }}>
                        <tr style={{ color: '#7f8c8d' }}>
                            <th style={{ padding: '10px', borderBottom: '2px solid #eee' }}>Timestamp</th>
                            <th style={{ padding: '10px', borderBottom: '2px solid #eee' }}>User</th>
                            <th style={{ padding: '10px', borderBottom: '2px solid #eee' }}>Action</th>
                            <th style={{ padding: '10px', borderBottom: '2px solid #eee' }}>Resource Path</th>
                        </tr>
                    </thead>
                    <tbody>
                        {logs.map(log => (
                            <tr key={log._id} style={{ borderBottom: '1px solid #eee', fontFamily: 'monospace' }}>
                                <td style={{ padding: '10px' }}>{new Date(log.createdAt).toLocaleString()}</td>
                                <td style={{ padding: '10px', color: log.user ? '#2980b9' : '#e74c3c' }}>
                                    {log.user ? `${log.user.email} (${log.user.role})` : 'System / Unauthenticated'}
                                </td>
                                <td style={{ padding: '10px', fontWeight: 'bold' }}>{log.action}</td>
                                <td style={{ padding: '10px', color: '#7f8c8d' }}>{log.resource}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default AdminAuditLogs;