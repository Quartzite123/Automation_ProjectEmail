import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { getBatches, getBatchFiles, approveCustomer, rejectCustomer, sendEmails } from '../services/api';
import { CheckCircle, XCircle, Mail, Loader2, AlertCircle, Package } from 'lucide-react';

const RecordsPage = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const [customers, setCustomers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    // Get status from query parameter
    const queryParams = new URLSearchParams(location.search);
    const statusFilter = queryParams.get('status') || 'all';

    const getPageTitle = () => {
        switch (statusFilter) {
            case 'all': return 'All Processed Records';
            case 'Pending': return 'Pending Approval';
            case 'Approved': return 'Ready to Send';
            case 'Sent': return 'Emails Sent';
            default: return 'Records';
        }
    };

    const fetchAllCustomers = async () => {
        setLoading(true);
        setError('');
        try {
            // 1. Get all batches
            const batchesData = await getBatches();

            // 2. Fetch customers from each batch
            const allCustomers = [];
            for (const batch of batchesData) {
                try {
                    const batchData = await getBatchFiles(batch.batch_id);
                    // Add batch_id to each customer for reference
                    const customersWithBatch = batchData.data.map(customer => ({
                        ...customer,
                        batch_id: batch.batch_id
                    }));
                    allCustomers.push(...customersWithBatch);
                } catch (err) {
                    console.error(`Failed to fetch batch ${batch.batch_id}:`, err);
                }
            }

            // 3. Apply filter
            let filtered = allCustomers;
            if (statusFilter !== 'all') {
                filtered = allCustomers.filter(c => c.status === statusFilter);
            }

            // 4. Sort by batch_id (latest first)
            filtered.sort((a, b) => b.batch_id.localeCompare(a.batch_id));

            setCustomers(filtered);
        } catch (err) {
            console.error('Failed to fetch records:', err);
            setError('Failed to load records');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAllCustomers();
    }, [statusFilter]);

    const handleApprove = async (batchId, email) => {
        setProcessing(true);
        setError('');
        try {
            await approveCustomer(batchId, email);
            setSuccess(`Approved ${email}`);
            await fetchAllCustomers();
            setTimeout(() => setSuccess(''), 3000);
        } catch (err) {
            setError('Failed to approve customer');
        } finally {
            setProcessing(false);
        }
    };

    const handleReject = async (batchId, email) => {
        setProcessing(true);
        setError('');
        try {
            await rejectCustomer(batchId, email);
            setSuccess(`Rejected ${email}`);
            await fetchAllCustomers();
            setTimeout(() => setSuccess(''), 3000);
        } catch (err) {
            setError('Failed to reject customer');
        } finally {
            setProcessing(false);
        }
    };

    const handleSendEmailsForBatch = async (batchId) => {
        const approvedInBatch = customers.filter(c => c.batch_id === batchId && c.status === 'Approved').length;
        if (!window.confirm(`Send emails to ${approvedInBatch} approved customer(s) in batch ${batchId}?`)) {
            return;
        }

        setProcessing(true);
        setError('');
        try {
            const stats = await sendEmails(batchId);
            setSuccess(`Batch ${batchId}: Sent: ${stats.sent}, Failed: ${stats.failed}`);
            await fetchAllCustomers();
            setTimeout(() => setSuccess(''), 5000);
        } catch (err) {
            setError('Failed to send emails');
        } finally {
            setProcessing(false);
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'Approved': return 'bg-green-50 text-green-700 border-green-100';
            case 'Rejected': return 'bg-red-50 text-red-700 border-red-100';
            case 'Sent': return 'bg-blue-50 text-blue-700 border-blue-100';
            case 'Failed': return 'bg-orange-50 text-orange-700 border-orange-100';
            default: return 'bg-gray-50 text-gray-700 border-gray-100';
        }
    };

    // Group customers by batch for "Send Emails" action
    const batchesWithApproved = statusFilter === 'Approved'
        ? [...new Set(customers.map(c => c.batch_id))]
        : [];

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-semibold text-gray-900">{getPageTitle()}</h1>
                    <p className="text-gray-500 mt-1">{customers.length} record(s)</p>
                </div>

                {/* Send Emails for Approved Status */}
                {statusFilter === 'Approved' && batchesWithApproved.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                        {batchesWithApproved.map(batchId => (
                            <button
                                key={batchId}
                                onClick={() => handleSendEmailsForBatch(batchId)}
                                disabled={processing}
                                className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50 transition-all shadow-sm"
                            >
                                <Mail size={16} />
                                Send {batchId.split('_')[1]}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Success Message */}
            {success && (
                <div className="bg-green-50 border border-green-200 text-green-800 p-4 rounded-lg flex items-center gap-3">
                    <CheckCircle size={20} />
                    <p>{success}</p>
                </div>
            )}

            {/* Error Message */}
            {error && (
                <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-lg flex items-center gap-3">
                    <AlertCircle size={20} />
                    <p>{error}</p>
                </div>
            )}

            {/* Loading State */}
            {loading ? (
                <div className="py-12 text-center text-gray-500">
                    <Loader2 className="animate-spin mx-auto mb-2" size={32} />
                    <p>Loading records...</p>
                </div>
            ) : customers.length === 0 ? (
                /* Empty State */
                <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
                    <Package className="mx-auto mb-4 text-gray-300" size={64} />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Records Found</h3>
                    <p className="text-gray-500">No customers match the selected filter.</p>
                    <button
                        onClick={() => navigate('/')}
                        className="mt-4 text-red-600 hover:text-red-700 font-medium"
                    >
                        Return to Dashboard
                    </button>
                </div>
            ) : (
                /* Records Table */
                <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50 border-b border-gray-200">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Batch ID</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Shipments</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Parcels</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Weight (kg)</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pending</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                    {statusFilter === 'Pending' && (
                                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                    )}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {customers.map((customer, index) => (
                                    <tr key={index} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <button
                                                onClick={() => navigate(`/batch/${customer.batch_id}`)}
                                                className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
                                            >
                                                {customer.batch_id}
                                            </button>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div>
                                                <p className="text-sm font-medium text-gray-900">{customer.customer_name}</p>
                                                <p className="text-xs text-gray-500">{customer.customer_email}</p>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-900">{customer.shipment_count}</td>
                                        <td className="px-6 py-4 text-sm text-gray-900">{customer.total_parcels}</td>
                                        <td className="px-6 py-4 text-sm text-gray-900">{customer.total_weight}</td>
                                        <td className="px-6 py-4 text-sm text-gray-900">{customer.pending_payments}</td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(customer.status)}`}>
                                                {customer.status}
                                            </span>
                                        </td>
                                        {statusFilter === 'Pending' && (
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button
                                                        onClick={() => handleApprove(customer.batch_id, customer.customer_email)}
                                                        disabled={processing}
                                                        className="p-1.5 text-green-600 hover:bg-green-50 rounded transition-colors disabled:opacity-50"
                                                        title="Approve"
                                                    >
                                                        <CheckCircle size={18} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleReject(customer.batch_id, customer.customer_email)}
                                                        disabled={processing}
                                                        className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
                                                        title="Reject"
                                                    >
                                                        <XCircle size={18} />
                                                    </button>
                                                </div>
                                            </td>
                                        )}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

export default RecordsPage;
