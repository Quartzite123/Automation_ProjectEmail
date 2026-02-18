import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getBatchFiles, approveCustomer, rejectCustomer, updateCustomer, deleteCustomer, sendEmails, previewEmail, sendSingleEmail } from '../services/api';
import { CheckCircle, XCircle, Edit2, Trash2, Mail, Loader2, X, Package, Weight, AlertCircle, Eye } from 'lucide-react';
import EmailPreviewModal from '../components/EmailPreviewModal';

const BatchDetailsPage = () => {
    const { batchId } = useParams();
    const navigate = useNavigate();
    const [customers, setCustomers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    // Edit modal state
    const [editingCustomer, setEditingCustomer] = useState(null);
    const [editForm, setEditForm] = useState({
        shipment_count: 0,
        total_parcels: 0,
        total_weight: 0,
        pending_payments: 0
    });

    // Email preview state
    const [emailPreview, setEmailPreview] = useState(null);
    const [previewLoading, setPreviewLoading] = useState(false);
    const [sendingEmail, setSendingEmail] = useState(false);

    const fetchCustomers = async () => {
        setLoading(true);
        setError('');
        try {
            const data = await getBatchFiles(batchId);
            setCustomers(data.data);
        } catch (err) {
            console.error('Failed to fetch customers:', err);
            setError('Failed to load batch data');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (batchId) {
            fetchCustomers();
        }
    }, [batchId]);

    const handleApprove = async (email) => {
        setProcessing(true);
        setError('');
        try {
            await approveCustomer(batchId, email);
            setSuccess(`Approved ${email}`);
            await fetchCustomers();
            setTimeout(() => setSuccess(''), 3000);
        } catch (err) {
            setError('Failed to approve customer');
        } finally {
            setProcessing(false);
        }
    };

    const handleReject = async (email) => {
        setProcessing(true);
        setError('');
        try {
            await rejectCustomer(batchId, email);
            setSuccess(`Rejected ${email}`);
            await fetchCustomers();
            setTimeout(() => setSuccess(''), 3000);
        } catch (err) {
            setError('Failed to reject customer');
        } finally {
            setProcessing(false);
        }
    };

    const openEditModal = (customer) => {
        setEditingCustomer(customer);
        setEditForm({
            shipment_count: customer.shipment_count,
            total_parcels: customer.total_parcels,
            total_weight: customer.total_weight,
            pending_payments: customer.pending_payments
        });
    };

    const handleUpdate = async () => {
        setProcessing(true);
        setError('');
        try {
            await updateCustomer(batchId, editingCustomer.customer_email, editForm);
            setSuccess(`Updated ${editingCustomer.customer_name}`);
            setEditingCustomer(null);
            await fetchCustomers();
            setTimeout(() => setSuccess(''), 3000);
        } catch (err) {
            setError('Failed to update customer');
        } finally {
            setProcessing(false);
        }
    };

    const handleDelete = async (customer) => {
        if (!window.confirm(`Delete ${customer.customer_name} from this batch?`)) {
            return;
        }

        setProcessing(true);
        setError('');
        try {
            await deleteCustomer(batchId, customer.customer_email);
            setSuccess(`Deleted ${customer.customer_name}`);
            await fetchCustomers();
            setTimeout(() => setSuccess(''), 3000);
        } catch (err) {
            setError('Failed to delete customer');
        } finally {
            setProcessing(false);
        }
    };

    const handleSendEmails = async () => {
        const approvedCount = customers.filter(c => c.status === 'Approved').length;
        if (!window.confirm(`Send emails to ${approvedCount} approved customer(s)?`)) {
            return;
        }

        setProcessing(true);
        setError('');
        try {
            const stats = await sendEmails(batchId);
            setSuccess(`Emails sent! Sent: ${stats.sent}, Failed: ${stats.failed}`);
            await fetchCustomers();
            setTimeout(() => setSuccess(''), 5000);
        } catch (err) {
            setError('Failed to send emails');
        } finally {
            setProcessing(false);
        }
    };

    const handlePreviewEmail = async (customer) => {
        setPreviewLoading(true);
        setError('');
        try {
            const preview = await previewEmail(batchId, customer.customer_email);
            setEmailPreview(preview);
        } catch (err) {
            setError('Failed to load email preview');
            console.error('Preview error:', err);
        } finally {
            setPreviewLoading(false);
        }
    };

    const handleSendFromPreview = async () => {
        if (!emailPreview) return;

        setSendingEmail(true);
        setError('');
        try {
            await sendSingleEmail(batchId, emailPreview.customer_email);
            setSuccess(`Email sent successfully to ${emailPreview.customer_email}`);
            setEmailPreview(null);
            await fetchCustomers();
            setTimeout(() => setSuccess(''), 3000);
        } catch (err) {
            setError('Failed to send email');
            console.error('Send error:', err);
        } finally {
            setSendingEmail(false);
        }
    };

    const handleClosePreview = () => {
        if (!sendingEmail) {
            setEmailPreview(null);
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

    if (!batchId) {
        return (
            <div className="p-8 text-center">
                <p className="text-gray-500">No batch selected</p>
                <button onClick={() => navigate('/')} className="mt-4 text-red-600 hover:text-red-700">
                    Return to Dashboard
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-semibold text-gray-900">Batch Details</h1>
                    <p className="text-gray-500 mt-1">Batch: {batchId}</p>
                    <p className="text-sm text-gray-400 mt-1">{customers.length} customer(s)</p>
                </div>

                <button
                    onClick={handleSendEmails}
                    disabled={processing || customers.filter(c => c.status === 'Approved').length === 0}
                    className="flex items-center gap-2 bg-red-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm hover:shadow-md"
                >
                    <Mail size={20} />
                    Send Emails ({customers.filter(c => c.status === 'Approved').length})
                </button>
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
                    <p>Loading customers...</p>
                </div>
            ) : customers.length === 0 ? (
                /* Empty State */
                <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
                    <Package className="mx-auto mb-4 text-gray-300" size={64} />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Customers</h3>
                    <p className="text-gray-500">This batch has no customers.</p>
                </div>
            ) : (
                /* Customer Table */
                <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50 border-b border-gray-200">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Shipments</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Parcels</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Weight (kg)</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pending</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {customers.map((customer, index) => (
                                    <tr key={index} className="hover:bg-gray-50 transition-colors">
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
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                {customer.status === 'Pending' && (
                                                    <>
                                                        <button
                                                            onClick={() => handleApprove(customer.customer_email)}
                                                            disabled={processing}
                                                            className="p-1.5 text-green-600 hover:bg-green-50 rounded transition-colors disabled:opacity-50"
                                                            title="Approve"
                                                        >
                                                            <CheckCircle size={18} />
                                                        </button>
                                                        <button
                                                            onClick={() => handleReject(customer.customer_email)}
                                                            disabled={processing}
                                                            className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
                                                            title="Reject"
                                                        >
                                                            <XCircle size={18} />
                                                        </button>
                                                    </>
                                                )}
                                                {customer.status === 'Approved' && (
                                                    <button
                                                        onClick={() => handlePreviewEmail(customer)}
                                                        disabled={previewLoading}
                                                        className="p-1.5 text-purple-600 hover:bg-purple-50 rounded transition-colors disabled:opacity-50"
                                                        title="View Email"
                                                    >
                                                        {previewLoading ? (
                                                            <Loader2 size={18} className="animate-spin" />
                                                        ) : (
                                                            <Eye size={18} />
                                                        )}
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => openEditModal(customer)}
                                                    disabled={processing}
                                                    className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors disabled:opacity-50"
                                                    title="Edit"
                                                >
                                                    <Edit2 size={18} />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(customer)}
                                                    disabled={processing}
                                                    className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
                                                    title="Delete"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Email Preview Modal */}
            <EmailPreviewModal
                preview={emailPreview}
                onClose={handleClosePreview}
                onSend={handleSendFromPreview}
                sending={sendingEmail}
            />

            {/* Edit Modal */}
            {editingCustomer && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-gray-900">Edit Customer</h3>
                            <button
                                onClick={() => setEditingCustomer(null)}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <p className="text-sm text-gray-600 mb-4">{editingCustomer.customer_name}</p>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Shipment Count</label>
                                <input
                                    type="number"
                                    value={editForm.shipment_count}
                                    onChange={(e) => setEditForm({ ...editForm, shipment_count: parseInt(e.target.value) || 0 })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Total Parcels</label>
                                <input
                                    type="number"
                                    value={editForm.total_parcels}
                                    onChange={(e) => setEditForm({ ...editForm, total_parcels: parseInt(e.target.value) || 0 })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Total Weight (kg)</label>
                                <input
                                    type="number"
                                    step="0.1"
                                    value={editForm.total_weight}
                                    onChange={(e) => setEditForm({ ...editForm, total_weight: parseFloat(e.target.value) || 0 })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Pending Payments</label>
                                <input
                                    type="number"
                                    value={editForm.pending_payments}
                                    onChange={(e) => setEditForm({ ...editForm, pending_payments: parseInt(e.target.value) || 0 })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                                />
                            </div>
                        </div>

                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={() => setEditingCustomer(null)}
                                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleUpdate}
                                disabled={processing}
                                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
                            >
                                {processing ? 'Updating...' : 'Update'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default BatchDetailsPage;
