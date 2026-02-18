import React, { useEffect, useState } from 'react';
import { Search, FileText, Check, X, Clock, Mail, AlertCircle, Loader2, CheckCircle } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { getBatchFiles, approveCustomer, rejectCustomer, sendEmails } from '../services/api';

const ApprovalPage = () => {
    const [searchParams] = useSearchParams();
    const batchId = searchParams.get('batch_id');

    const [files, setFiles] = useState([]);
    const [filter, setFilter] = useState('All');
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(false);
    const [sendingEmails, setSendingEmails] = useState(false);
    const [error, setError] = useState('');
    const [emailStats, setEmailStats] = useState(null);

    const fetchFiles = async () => {
        setLoading(true);
        try {
            const data = await getBatchFiles(batchId);
            setFiles(data.data || []);
        } catch (err) {
            console.error("Failed to fetch files:", err);
            setError("Failed to load files. Ensure a valid batch is selected.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchFiles();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [batchId]);

    const filteredFiles = files.filter(file => {
        const matchesFilter = filter === 'All' || file.status === filter;
        const matchesSearch = (file.customer_name || '').toLowerCase().includes(search.toLowerCase()) ||
            (file.customer_email || '').toLowerCase().includes(search.toLowerCase());
        return matchesFilter && matchesSearch;
    });

    const handleAction = async (email, action) => {
        try {
            // Optimistic update
            setFiles(files.map(f => f.customer_email === email ? { ...f, status: action === 'approve' ? 'Approved' : 'Rejected' } : f));

            if (action === 'approve') {
                await approveCustomer(batchId, email);
            } else {
                await rejectCustomer(batchId, email);
            }
        } catch (err) {
            console.error(`Failed to ${action}:`, err);
            // Revert on failure (could be improved)
            alert(`Failed to ${action} customer.`);
            fetchFiles();
        }
    };

    const handleSendEmails = async () => {
        if (!confirm("Are you sure you want to send emails to all Approved customers?")) return;

        setSendingEmails(true);
        try {
            const stats = await sendEmails(batchId);
            setEmailStats(stats);
            fetchFiles(); // Refresh statuses to "Sent"
        } catch (err) {
            console.error("Failed to send emails:", err);
            alert("Failed to trigger email sending.");
        } finally {
            setSendingEmails(false);
        }
    };

    const getStatusBadge = (status) => {
        switch (status) {
            case 'Approved':
                return <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-100"><Check size={12} /> Approved</span>;
            case 'Rejected':
                return <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-700 border border-red-100"><X size={12} /> Rejected</span>;
            case 'Sent':
                return <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100"><Mail size={12} /> Sent</span>;
            case 'Failed':
                return <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-50 text-orange-700 border border-orange-100"><AlertCircle size={12} /> Failed</span>;
            default:
                return <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-50 text-yellow-700 border border-yellow-100"><Clock size={12} /> Pending</span>;
        }
    };

    if (!batchId) {
        return <div className="p-8 text-center text-gray-500">Please select a batch from the Dashboard.</div>;
    }

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-semibold text-gray-900">Files & Approval</h1>
                    <p className="text-gray-500 mt-1">Batch: {batchId}</p>
                </div>

                <button
                    onClick={handleSendEmails}
                    disabled={sendingEmails || !files.some(f => f.status === 'Approved')}
                    className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2 rounded-lg font-medium transition-all hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                >
                    {sendingEmails ? <Loader2 className="animate-spin" size={18} /> : <Mail size={18} />}
                    {sendingEmails ? 'Sending...' : 'Send Emails'}
                </button>
            </div>

            {emailStats && (
                <div className="bg-green-50 border border-green-200 text-green-800 p-4 rounded-lg flex items-center gap-2">
                    <CheckCircle size={20} />
                    <span>Sent: {emailStats.sent}, Failed: {emailStats.failed}</span>
                </div>
            )}

            {error && (
                <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-lg">
                    {error}
                </div>
            )}

            {/* Toolbar */}
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="relative w-full md:w-96">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                        type="text"
                        placeholder="Search customers..."
                        className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-300 focus:border-red-400 transition-all duration-150 ease-in-out"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>

                <div className="flex bg-gray-100 p-1 rounded-lg">
                    {['All', 'Pending', 'Approved', 'Rejected', 'Sent'].map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setFilter(tab)}
                            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-gray-300 ${filter === tab
                                ? 'bg-white text-gray-900 shadow-sm'
                                : 'text-gray-500 hover:text-gray-900 hover:bg-gray-200'
                                }`}
                        >
                            {tab}
                        </button>
                    ))}
                </div>
            </div>

            {/* List */}
            {loading ? (
                <div className="py-12 text-center text-gray-500">Loading files...</div>
            ) : (
                <div className="space-y-4">
                    {filteredFiles.map((file, index) => (
                        <div key={index} className="bg-white border border-gray-200 p-4 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all duration-150 ease-in-out hover:border-gray-300 hover:shadow-md cursor-pointer hover:bg-gray-50">
                            <div className="flex items-start gap-4">
                                <div className="p-3 bg-red-50 text-red-600 rounded-lg shrink-0">
                                    <FileText size={20} />
                                </div>
                                <div>
                                    <h3 className="text-gray-900 font-medium">{file.customer_name}</h3>
                                    <p className="text-sm text-gray-500">{file.customer_email}</p>
                                </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-6 md:justify-end">
                                <div className="flex flex-col md:items-end">
                                    <span className="text-sm text-gray-900 font-medium">{file.shipment_count} shipments</span>
                                    <span className="text-xs text-gray-400">{file.total_parcels} parcels</span>
                                </div>

                                <div className="w-24 flex justify-end">
                                    {getStatusBadge(file.status)}
                                </div>

                                <div className="flex items-center gap-2">
                                    {file.status === 'Pending' && (
                                        <>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleAction(file.customer_email, 'approve'); }}
                                                className="bg-red-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150 ease-in-out hover:bg-red-600 hover:shadow-sm active:scale-95 active:shadow-inner focus:outline-none focus:ring-2 focus:ring-red-300"
                                            >
                                                Approve
                                            </button>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleAction(file.customer_email, 'reject'); }}
                                                className="border border-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium bg-white transition-all duration-150 ease-in-out hover:bg-gray-50 hover:shadow-sm active:scale-95 focus:outline-none focus:ring-2 focus:ring-gray-200"
                                            >
                                                Reject
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}

                    {filteredFiles.length === 0 && (
                        <div className="text-center py-12 text-gray-400">
                            No files found matching your criteria.
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default ApprovalPage;
