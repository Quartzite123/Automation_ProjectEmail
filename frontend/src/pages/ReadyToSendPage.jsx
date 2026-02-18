import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getBatchFiles, sendEmails } from '../services/api';
import { Mail, FileText, Package, Weight, Calendar, AlertCircle, Loader2, CheckCircle } from 'lucide-react';

const ReadyToSendPage = () => {
    const { batchId } = useParams();
    const navigate = useNavigate();
    const [approvedCustomers, setApprovedCustomers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [emailStats, setEmailStats] = useState(null);
    const [sendLimit, setSendLimit] = useState(null); // null = send all
    const [customLimit, setCustomLimit] = useState('');

    const fetchApprovedCustomers = async () => {
        setLoading(true);
        setError('');
        try {
            const data = await getBatchFiles(batchId);
            const approved = data.data.filter(c => c.status === 'Approved');
            setApprovedCustomers(approved);
        } catch (err) {
            console.error('Failed to fetch customers:', err);
            setError('Failed to load approved customers. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (batchId) {
            fetchApprovedCustomers();
        }
    }, [batchId]);

    const handleSendEmails = async () => {
        const actualLimit = sendLimit === 'custom' ? parseInt(customLimit) : sendLimit;
        const countToSend = actualLimit ? Math.min(actualLimit, approvedCustomers.length) : approvedCustomers.length;

        if (!window.confirm(`Send emails to ${countToSend} approved customer(s)?`)) {
            return;
        }

        setSending(true);
        setError('');
        setSuccess(false);

        try {
            const stats = await sendEmails(batchId, actualLimit);
            setEmailStats(stats);
            setSuccess(true);

            // Refresh data to show updated statuses
            setTimeout(() => {
                fetchApprovedCustomers();
            }, 1000);
        } catch (err) {
            console.error('Failed to send emails:', err);
            setError('Failed to send emails. Please check your AWS SES configuration.');
        } finally {
            setSending(false);
        }
    };

    if (!batchId) {
        return (
            <div className="p-8 text-center">
                <AlertCircle className="mx-auto mb-4 text-gray-400" size={48} />
                <p className="text-gray-500">No batch selected</p>
                <button
                    onClick={() => navigate('/')}
                    className="mt-4 text-red-600 hover:text-red-700 font-medium"
                >
                    Return to Dashboard
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-semibold text-gray-900">Ready to Send Emails</h1>
                <p className="text-gray-500 mt-1">Batch: {batchId}</p>
            </div>

            {/* Send Controls */}
            {!loading && approvedCustomers.length > 0 && (
                <div className="bg-white border border-gray-200 rounded-xl p-6">
                    <div className="flex flex-col lg:flex-row lg:items-end gap-4">
                        <div className="flex-1">
                            <label className="block text-sm font-medium text-gray-700 mb-3">
                                Send first:
                            </label>
                            <div className="flex flex-wrap gap-2">
                                <button
                                    onClick={() => setSendLimit(1)}
                                    className={`px-4 py-2 rounded-lg border font-medium transition-all ${sendLimit === 1
                                            ? 'bg-red-600 text-white border-red-600'
                                            : 'bg-white text-gray-700 border-gray-300 hover:border-red-600 hover:text-red-600'
                                        }`}
                                >
                                    1
                                </button>
                                <button
                                    onClick={() => setSendLimit(5)}
                                    className={`px-4 py-2 rounded-lg border font-medium transition-all ${sendLimit === 5
                                            ? 'bg-red-600 text-white border-red-600'
                                            : 'bg-white text-gray-700 border-gray-300 hover:border-red-600 hover:text-red-600'
                                        }`}
                                >
                                    5
                                </button>
                                <button
                                    onClick={() => setSendLimit(10)}
                                    className={`px-4 py-2 rounded-lg border font-medium transition-all ${sendLimit === 10
                                            ? 'bg-red-600 text-white border-red-600'
                                            : 'bg-white text-gray-700 border-gray-300 hover:border-red-600 hover:text-red-600'
                                        }`}
                                >
                                    10
                                </button>
                                <button
                                    onClick={() => setSendLimit(20)}
                                    className={`px-4 py-2 rounded-lg border font-medium transition-all ${sendLimit === 20
                                            ? 'bg-red-600 text-white border-red-600'
                                            : 'bg-white text-gray-700 border-gray-300 hover:border-red-600 hover:text-red-600'
                                        }`}
                                >
                                    20
                                </button>
                                <button
                                    onClick={() => setSendLimit(50)}
                                    className={`px-4 py-2 rounded-lg border font-medium transition-all ${sendLimit === 50
                                            ? 'bg-red-600 text-white border-red-600'
                                            : 'bg-white text-gray-700 border-gray-300 hover:border-red-600 hover:text-red-600'
                                        }`}
                                >
                                    50
                                </button>
                                <button
                                    onClick={() => setSendLimit(null)}
                                    className={`px-4 py-2 rounded-lg border font-medium transition-all ${sendLimit === null
                                            ? 'bg-red-600 text-white border-red-600'
                                            : 'bg-white text-gray-700 border-gray-300 hover:border-red-600 hover:text-red-600'
                                        }`}
                                >
                                    All ({approvedCustomers.length})
                                </button>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="number"
                                        min="1"
                                        max={approvedCustomers.length}
                                        value={customLimit}
                                        onChange={(e) => {
                                            setCustomLimit(e.target.value);
                                            setSendLimit('custom');
                                        }}
                                        placeholder="Custom"
                                        className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                                    />
                                </div>
                            </div>
                            <p className="text-sm text-gray-500 mt-2">
                                Remaining approved: {approvedCustomers.length}
                            </p>
                        </div>

                        <button
                            onClick={handleSendEmails}
                            disabled={sending || approvedCustomers.length === 0 || success || (sendLimit === 'custom' && (!customLimit || parseInt(customLimit) <= 0))}
                            className="flex items-center gap-2 bg-red-600 text-white px-6 py-3 rounded-lg font-medium transition-all hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md active:scale-95 whitespace-nowrap"
                        >
                            {sending ? (
                                <>
                                    <Loader2 className="animate-spin" size={20} />
                                    Sending...
                                </>
                            ) : success ? (
                                <>
                                    <CheckCircle size={20} />
                                    Sent
                                </>
                            ) : (
                                <>
                                    <Mail size={20} />
                                    Send Now
                                </>
                            )}
                        </button>
                    </div>
                </div>
            )}

            {/* Success Message */}
            {success && emailStats && (
                <div className="bg-green-50 border border-green-200 text-green-800 p-4 rounded-lg flex items-start gap-3">
                    <CheckCircle size={20} className="mt-0.5 flex-shrink-0" />
                    <div>
                        <p className="font-medium">Emails sent successfully!</p>
                        <p className="text-sm mt-1">
                            Requested: {emailStats.requested} | Sent: {emailStats.sent} | Failed: {emailStats.failed}
                            {emailStats.remaining > 0 && ` | Remaining Approved: ${emailStats.remaining}`}
                        </p>
                    </div>
                </div>
            )}

            {/* Error Message */}
            {error && (
                <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-lg flex items-start gap-3">
                    <AlertCircle size={20} className="mt-0.5 flex-shrink-0" />
                    <p>{error}</p>
                </div>
            )}

            {/* Loading State */}
            {loading ? (
                <div className="py-12 text-center text-gray-500">
                    <Loader2 className="animate-spin mx-auto mb-2" size={32} />
                    <p>Loading approved customers...</p>
                </div>
            ) : approvedCustomers.length === 0 ? (
                /* Empty State */
                <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
                    <Mail className="mx-auto mb-4 text-gray-300" size={64} />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Approved Customers</h3>
                    <p className="text-gray-500 mb-6">
                        There are no approved customers in this batch ready to receive emails.
                    </p>
                    <button
                        onClick={() => navigate(`/approval?batch_id=${batchId}`)}
                        className="bg-red-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-red-700 transition-colors"
                    >
                        Go to Approval Page
                    </button>
                </div>
            ) : (
                /* Customer List */
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <p className="text-sm text-gray-600">
                            {approvedCustomers.length} customer{approvedCustomers.length !== 1 ? 's' : ''} ready to receive emails
                        </p>
                    </div>

                    {approvedCustomers.map((customer, index) => (
                        <div
                            key={index}
                            className="bg-white border border-gray-200 p-6 rounded-xl hover:border-gray-300 hover:shadow-md transition-all duration-150"
                        >
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex items-start gap-4 flex-1">
                                    <div className="p-3 bg-green-50 text-green-600 rounded-lg shrink-0">
                                        <FileText size={24} />
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="text-lg font-semibold text-gray-900">{customer.customer_name}</h3>
                                        <p className="text-sm text-gray-500 mt-0.5">{customer.customer_email}</p>

                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                                            <div className="flex items-center gap-2 text-sm">
                                                <Package size={16} className="text-gray-400" />
                                                <div>
                                                    <p className="text-gray-500 text-xs">Shipments</p>
                                                    <p className="font-medium text-gray-900">{customer.shipment_count}</p>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2 text-sm">
                                                <Package size={16} className="text-gray-400" />
                                                <div>
                                                    <p className="text-gray-500 text-xs">Parcels</p>
                                                    <p className="font-medium text-gray-900">{customer.total_parcels}</p>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2 text-sm">
                                                <Weight size={16} className="text-gray-400" />
                                                <div>
                                                    <p className="text-gray-500 text-xs">Weight</p>
                                                    <p className="font-medium text-gray-900">{customer.total_weight} kg</p>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2 text-sm">
                                                <AlertCircle size={16} className="text-gray-400" />
                                                <div>
                                                    <p className="text-gray-500 text-xs">Pending</p>
                                                    <p className="font-medium text-gray-900">{customer.pending_payments}</p>
                                                </div>
                                            </div>
                                        </div>

                                        {customer.latest_dispatch && (
                                            <div className="flex items-center gap-2 text-sm text-gray-500 mt-3">
                                                <Calendar size={14} />
                                                <span>Latest dispatch: {customer.latest_dispatch}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-100">
                                    <CheckCircle size={12} />
                                    Approved
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default ReadyToSendPage;
