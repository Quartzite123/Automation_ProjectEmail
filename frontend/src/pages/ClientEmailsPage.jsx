import React, { useEffect, useState, useCallback } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
    getAdminClients,
    upsertAdminClient,
    deleteAdminClient,
} from '../services/api';

// ---------------------------------------------------------------------------
// Tiny reusable components
// ---------------------------------------------------------------------------

function Spinner() {
    return (
        <div className="flex items-center justify-center py-24">
            <div className="w-8 h-8 border-4 border-red-200 border-t-red-500 rounded-full animate-spin" />
        </div>
    );
}

function Toast({ message, type, onClose }) {
    useEffect(() => {
        const t = setTimeout(onClose, 3500);
        return () => clearTimeout(t);
    }, [onClose]);

    const colors =
        type === 'success'
            ? 'bg-green-50 border-green-200 text-green-800'
            : 'bg-red-50 border-red-200 text-red-800';

    return (
        <div
            className={`fixed top-5 right-5 z-[9999] flex items-center gap-3 px-4 py-3 border rounded-xl shadow-lg text-sm font-medium animate-fade-in ${colors}`}
        >
            <span>{message}</span>
            <button
                onClick={onClose}
                className="ml-1 opacity-60 hover:opacity-100 text-lg leading-none"
            >
                ×
            </button>
        </div>
    );
}

function ConfirmDialog({ message, onConfirm, onCancel, loading }) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6">
                <h3 className="text-base font-semibold text-gray-900 mb-2">Confirm Delete</h3>
                <p className="text-sm text-gray-600 mb-6">{message}</p>
                <div className="flex gap-3 justify-end">
                    <button
                        onClick={onCancel}
                        disabled={loading}
                        className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50 transition"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={loading}
                        className="px-4 py-2 text-sm font-medium text-white bg-red-500 rounded-lg hover:bg-red-600 disabled:opacity-50 transition flex items-center gap-2"
                    >
                        {loading && (
                            <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                        )}
                        Delete
                    </button>
                </div>
            </div>
        </div>
    );
}

function ClientModal({ initial, onSave, onClose, loading }) {
    const [clientName, setClientName] = useState(initial?.client_name ?? '');
    const [email, setEmail]           = useState(initial?.email ?? '');
    const [error, setError]           = useState('');

    const isEdit = Boolean(initial);

    const handleSubmit = (e) => {
        e.preventDefault();
        setError('');
        const trimName  = clientName.trim();
        const trimEmail = email.trim();
        if (!trimName)  return setError('Client name is required.');
        if (!trimEmail) return setError('Email is required.');
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimEmail))
            return setError('Enter a valid email address.');
        onSave({ client_name: trimName, email: trimEmail });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6">
                <h2 className="text-base font-semibold text-gray-900 mb-5">
                    {isEdit ? `Edit email — ${initial.client_name}` : 'Add Client'}
                </h2>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                            Client Name
                        </label>
                        <input
                            type="text"
                            value={clientName}
                            onChange={(e) => setClientName(e.target.value)}
                            disabled={isEdit}
                            placeholder="e.g. AJANTA PHARMA"
                            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-red-300 focus:border-red-400 outline-none disabled:bg-gray-50 disabled:text-gray-400 transition"
                        />
                        {!isEdit && (
                            <p className="text-[11px] text-gray-400 mt-1">
                                Should match exactly as it appears in uploaded Excel files.
                            </p>
                        )}
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                            Email Address
                        </label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="client@example.com"
                            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-red-300 focus:border-red-400 outline-none transition"
                        />
                    </div>

                    {error && (
                        <p className="text-xs text-red-500 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                            {error}
                        </p>
                    )}

                    <div className="flex gap-3 justify-end pt-1">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={loading}
                            className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50 transition"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-5 py-2 text-sm font-medium text-white bg-red-500 rounded-lg hover:bg-red-600 disabled:opacity-50 transition flex items-center gap-2"
                        >
                            {loading && (
                                <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                            )}
                            {isEdit ? 'Save Changes' : 'Add Client'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function ClientEmailsPage() {
    const { isAdmin } = useAuth();

    if (!isAdmin) return <Navigate to="/upload" replace />;

    const [clients,    setClients]    = useState([]);
    const [loading,    setLoading]    = useState(true);
    const [search,     setSearch]     = useState('');
    const [modal,      setModal]      = useState(null); // null | { mode: 'add' | 'edit', client? }
    const [modalBusy,  setModalBusy]  = useState(false);
    const [deleteTarget, setDeleteTarget] = useState(null); // client_name string
    const [deleteBusy,   setDeleteBusy]   = useState(false);
    const [toast,      setToast]      = useState(null); // { message, type }

    const showToast = useCallback((message, type = 'success') => {
        setToast({ message, type });
    }, []);

    // ── Fetch ──────────────────────────────────────────────────────────────
    const fetchClients = useCallback(async () => {
        setLoading(true);
        try {
            const data = await getAdminClients({ limit: 500 });
            setClients(data.clients ?? data ?? []);
        } catch (err) {
            showToast(err?.response?.data?.detail ?? 'Failed to load clients.', 'error');
        } finally {
            setLoading(false);
        }
    }, [showToast]);

    useEffect(() => { fetchClients(); }, [fetchClients]);

    // ── Filtered list ──────────────────────────────────────────────────────
    const filtered = clients.filter((c) =>
        c.client_name.toLowerCase().includes(search.toLowerCase()) ||
        (c.email ?? '').toLowerCase().includes(search.toLowerCase())
    );

    // ── Save (add / edit) ──────────────────────────────────────────────────
    const handleSave = async ({ client_name, email }) => {
        setModalBusy(true);
        try {
            await upsertAdminClient({ client_name, email });
            showToast(
                modal?.mode === 'edit'
                    ? `Email updated for ${client_name}.`
                    : `${client_name} added successfully.`
            );
            setModal(null);
            fetchClients();
        } catch (err) {
            showToast(err?.response?.data?.detail ?? 'Save failed.', 'error');
        } finally {
            setModalBusy(false);
        }
    };

    // ── Delete ─────────────────────────────────────────────────────────────
    const handleDelete = async () => {
        setDeleteBusy(true);
        try {
            await deleteAdminClient(deleteTarget);
            showToast(`${deleteTarget} deleted.`);
            setDeleteTarget(null);
            fetchClients();
        } catch (err) {
            showToast(err?.response?.data?.detail ?? 'Delete failed.', 'error');
        } finally {
            setDeleteBusy(false);
        }
    };

    // ── Render ─────────────────────────────────────────────────────────────
    return (
        <div className="p-6 max-w-5xl mx-auto">
            {/* Page header */}
            <div className="mb-6">
                <h1 className="text-xl font-bold text-gray-900">Client Emails</h1>
                <p className="text-sm text-gray-500 mt-0.5">
                    Manage recipient email addresses for MIS reports.
                </p>
            </div>

            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row gap-3 mb-5">
                <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search by name or email…"
                    className="flex-1 px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-300 focus:border-red-400 outline-none transition"
                />
                <button
                    onClick={() => setModal({ mode: 'add' })}
                    className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-red-500 rounded-xl hover:bg-red-600 active:bg-red-700 transition shrink-0"
                >
                    <span className="text-base leading-none">+</span>
                    Add Client
                </button>
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
                {loading ? (
                    <Spinner />
                ) : filtered.length === 0 ? (
                    <div className="py-20 text-center text-sm text-gray-400">
                        {search
                            ? 'No clients match your search.'
                            : 'No clients yet. Click "Add Client" to get started.'}
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-gray-100 bg-gray-50">
                                    <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide w-8">
                                        #
                                    </th>
                                    <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                                        Client Name
                                    </th>
                                    <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                                        Email
                                    </th>
                                    <th className="text-right px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {filtered.map((client, idx) => (
                                    <tr
                                        key={client.client_name}
                                        className="hover:bg-gray-50/60 transition-colors"
                                    >
                                        <td className="px-5 py-3.5 text-gray-400 font-mono text-xs">
                                            {idx + 1}
                                        </td>
                                        <td className="px-5 py-3.5 font-medium text-gray-900">
                                            {client.client_name}
                                        </td>
                                        <td className="px-5 py-3.5 text-gray-600">
                                            {client.email || (
                                                <span className="text-amber-500 text-xs font-medium">
                                                    — not set —
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-5 py-3.5 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() =>
                                                        setModal({ mode: 'edit', client })
                                                    }
                                                    className="px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition"
                                                >
                                                    Edit
                                                </button>
                                                <button
                                                    onClick={() =>
                                                        setDeleteTarget(client.client_name)
                                                    }
                                                    className="px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition"
                                                >
                                                    Delete
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Footer count */}
                {!loading && filtered.length > 0 && (
                    <div className="px-5 py-3 border-t border-gray-100 text-xs text-gray-400 flex justify-between items-center">
                        <span>
                            {filtered.length} of {clients.length} client
                            {clients.length !== 1 ? 's' : ''}
                        </span>
                        {search && (
                            <button
                                onClick={() => setSearch('')}
                                className="text-red-500 hover:underline"
                            >
                                Clear search
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* Add / Edit modal */}
            {modal && (
                <ClientModal
                    initial={modal.mode === 'edit' ? modal.client : null}
                    onSave={handleSave}
                    onClose={() => setModal(null)}
                    loading={modalBusy}
                />
            )}

            {/* Delete confirmation */}
            {deleteTarget && (
                <ConfirmDialog
                    message={`Delete "${deleteTarget}"? This cannot be undone.`}
                    onConfirm={handleDelete}
                    onCancel={() => setDeleteTarget(null)}
                    loading={deleteBusy}
                />
            )}

            {/* Toast */}
            {toast && (
                <Toast
                    message={toast.message}
                    type={toast.type}
                    onClose={() => setToast(null)}
                />
            )}
        </div>
    );
}
