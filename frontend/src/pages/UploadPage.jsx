import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CloudUpload, CheckCircle, FileText, X, AlertCircle, Clock, ChevronRight, Save } from 'lucide-react';
import api from '../services/api';
import WriteAccess from '../components/WriteAccess';

// ---------------------------------------------------------------------------
// Reusable drop zone
// ---------------------------------------------------------------------------
const DropZone = ({ label, description, file, onFile }) => {
    const [dragActive, setDragActive] = useState(false);
    const inputRef = useRef(null);

    const isExcel = (f) => f.name.endsWith('.xlsx') || f.name.endsWith('.xls');

    const handleDrag = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
        else if (e.type === 'dragleave') setDragActive(false);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        const dropped = e.dataTransfer.files?.[0];
        if (dropped && isExcel(dropped)) onFile(dropped);
    };

    const handleChange = (e) => {
        const picked = e.target.files?.[0];
        if (picked && isExcel(picked)) onFile(picked);
        e.target.value = '';
    };

    return (
        <div className="space-y-2">
            <p className="text-sm font-semibold text-gray-700">{label}</p>
            <div
                className={`rounded-lg border-2 border-dashed p-10 text-center cursor-pointer transition-all duration-200
                    ${dragActive ? 'border-blue-500 bg-blue-50'
                    : file ? 'border-green-400 bg-green-50'
                    : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'}`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={() => !file && inputRef.current.click()}
            >
                <input ref={inputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleChange} />

                {file ? (
                    <div className="flex items-center justify-between bg-white border border-gray-200 rounded-lg px-4 py-3 max-w-sm mx-auto shadow-sm">
                        <div className="flex items-center gap-3 min-w-0">
                            <div className="p-2 bg-green-100 rounded-lg text-green-600 shrink-0"><FileText size={18} /></div>
                            <div className="text-left min-w-0">
                                <p className="text-sm font-medium text-gray-900 truncate">{file.name}</p>
                                <p className="text-xs text-gray-400">{(file.size / 1024).toFixed(1)} KB</p>
                            </div>
                        </div>
                        <button onClick={(e) => { e.stopPropagation(); onFile(null); }}
                            className="ml-3 p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors shrink-0">
                            <X size={16} />
                        </button>
                    </div>
                ) : (
                    <div className="space-y-3">
                        <div className={`w-12 h-12 rounded-xl mx-auto flex items-center justify-center transition-all duration-200
                            ${dragActive ? 'bg-blue-100 text-blue-600 scale-110' : 'bg-gray-100 text-gray-400'}`}>
                            <CloudUpload size={24} />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-gray-700">{description}</p>
                            <p className="text-xs text-gray-400 mt-1">Supported formats: .xlsx, .xls</p>
                        </div>
                        <button onClick={(e) => { e.stopPropagation(); inputRef.current.click(); }}
                            className="inline-block mt-1 bg-white border border-gray-300 text-gray-700 text-sm px-5 py-2 rounded-lg font-medium hover:bg-gray-50 hover:border-gray-400 transition-all active:scale-95">
                            Browse Files
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};


// ---------------------------------------------------------------------------
// Main Upload Page
// ---------------------------------------------------------------------------
const UploadPage = () => {
    const navigate = useNavigate();

    // Derive admin status once on mount
    const isAdmin = (() => {
        try { return JSON.parse(sessionStorage.getItem('user'))?.role === 'admin'; }
        catch { return false; }
    })();

    const [rawFile, setRawFile] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [missingClients, setMissingClients] = useState([]);

    // Admin email-entry form state
    const [clientEmails, setClientEmails] = useState({});
    const [saveLoading, setSaveLoading] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);

    // Recent batches
    const [recentBatches, setRecentBatches] = useState([]);
    const [recentLoading, setRecentLoading] = useState(true);

    useEffect(() => {
        api.get('/batches/recent')
            .then(res => setRecentBatches(res.data || []))
            .catch(() => {})
            .finally(() => setRecentLoading(false));
    }, []);

    const canSubmit = rawFile && !loading;

    const handleSubmit = async () => {
        if (!canSubmit) return;
        setLoading(true);
        setError('');
        setMissingClients([]);
        setClientEmails({});
        setSaveSuccess(false);
        try {
            const formData = new FormData();
            formData.append('master_file', rawFile);
            const res = await api.post('/upload/master', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
                timeout: 120000,
            });

            const data = res.data;

            if (data.status === 'missing_clients') {
                setMissingClients(data.missing_clients || []);
                setError('Some clients are missing email addresses. Please contact an admin to add them.');
                setLoading(false);
                return;
            }

            if (data.status === 'failed') {
                setError(data.message || 'Upload failed. Please contact an admin.');
                setMissingClients(data.missing_clients || []);
                setLoading(false);
                return;
            }

            // status === 'success'
            navigate(`/batches/${data.batch_id}`);
        } catch (e) {
            const detail = e.response?.data?.detail;
            if (detail && typeof detail === 'object' && detail.missing_clients) {
                setMissingClients(detail.missing_clients);
                setError(detail.message || 'Missing client emails. Please contact admin.');
            } else {
                setError(Array.isArray(detail) ? detail.map(d => d.msg).join(', ') : (detail || e.message));
            }
            setLoading(false);
        }
    };

    const handleEmailChange = (clientName, value) => {
        setClientEmails(prev => ({ ...prev, [clientName]: value }));
    };

    const canSaveEmails =
        missingClients.length > 0 &&
        missingClients.every(c => (clientEmails[c] || '').trim() !== '');

    const handleSaveEmails = async () => {
        if (!canSaveEmails) return;
        setSaveLoading(true);
        setSaveSuccess(false);
        try {
            const payload = {
                clients: missingClients.map(c => ({
                    client_name: c,
                    email: clientEmails[c].trim(),
                })),
            };
            await api.post('/admin/clients/bulk', payload);
            setSaveSuccess(true);
            setMissingClients([]);
            setClientEmails({});
            setError('');
        } catch (e) {
            const detail = e.response?.data?.detail;
            setError(typeof detail === 'string' ? detail : 'Failed to save emails. Please try again.');
        } finally {
            setSaveLoading(false);
        }
    };

    const formatDate = (iso) => {
        if (!iso) return '—';
        return new Date(iso).toLocaleString('en-IN', {
            day: '2-digit', month: 'short', year: 'numeric',
            hour: '2-digit', minute: '2-digit',
        });
    };

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            <div>
                <h1 className="text-2xl font-semibold text-gray-900">Upload Files</h1>
                <p className="text-gray-500 mt-1 text-sm">
                    Upload raw shipment file to create a batch.
                </p>
            </div>

            {/* ── Upload Card ── */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-6">
                <DropZone
                    label="Upload Raw File"
                    description="Drag & drop your raw Excel file here"
                    file={rawFile}
                    onFile={setRawFile}
                />

                {/* ── Save-success banner ── */}
                {saveSuccess && (
                    <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 text-sm rounded-lg px-4 py-3">
                        <CheckCircle size={16} className="shrink-0" />
                        <span>Emails saved successfully. Please upload the file again to continue.</span>
                    </div>
                )}

                {/* ── Generic error (no missing clients) ── */}
                {error && missingClients.length === 0 && (
                    <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
                        <AlertCircle size={16} className="mt-0.5 shrink-0" />
                        <span>{error}</span>
                    </div>
                )}

                {/* ── Missing clients panel ── */}
                {missingClients.length > 0 && (
                    <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 space-y-4">
                        <div className="flex items-start gap-2 text-amber-800">
                            <AlertCircle size={16} className="mt-0.5 shrink-0 text-amber-500" />
                            <div>
                                <p className="text-sm font-semibold">Missing client email addresses</p>
                                {isAdmin
                                    ? <p className="text-xs text-amber-700 mt-0.5">Please add emails for missing clients below, then re-upload.</p>
                                    : <p className="text-xs text-amber-700 mt-0.5">Please contact an admin to add the missing emails before uploading.</p>
                                }
                            </div>
                        </div>

                        {isAdmin ? (
                            /* ── Admin: email entry form ── */
                            <div className="space-y-3">
                                {missingClients.map(client => (
                                    <div key={client} className="flex items-center gap-3">
                                        <span className="w-52 shrink-0 text-xs font-mono font-medium text-gray-800 truncate" title={client}>
                                            {client}
                                        </span>
                                        <input
                                            type="email"
                                            placeholder="email@example.com"
                                            value={clientEmails[client] || ''}
                                            onChange={e => handleEmailChange(client, e.target.value)}
                                            className="flex-1 text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        />
                                    </div>
                                ))}

                                <button
                                    onClick={handleSaveEmails}
                                    disabled={!canSaveEmails || saveLoading}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-150
                                        ${canSaveEmails && !saveLoading
                                            ? 'bg-blue-600 text-white hover:bg-blue-700 active:scale-[0.98] shadow-sm'
                                            : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}
                                >
                                    <Save size={14} />
                                    {saveLoading ? 'Saving…' : 'Save Emails'}
                                </button>
                            </div>
                        ) : (
                            /* ── Non-admin: read-only list ── */
                            <ul className="space-y-1 ml-1">
                                {missingClients.map(c => (
                                    <li key={c} className="text-xs font-mono text-amber-900 bg-amber-100 rounded px-2 py-0.5 inline-block mr-1 mb-1">
                                        {c}
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                )}

                <WriteAccess fallback={
                    <p className="text-sm text-gray-400 italic text-center py-2">Read-only access — uploading is disabled.</p>
                }>
                    <button onClick={handleSubmit} disabled={!canSubmit}
                        className={`w-full py-3 rounded-lg font-semibold text-white text-sm transition-all duration-150
                            ${canSubmit
                                ? 'bg-blue-600 hover:bg-blue-700 active:scale-[0.98] shadow-sm hover:shadow-md'
                                : 'bg-gray-300 cursor-not-allowed'}`}>
                        {loading ? 'Processing…' : 'Process & Upload'}
                    </button>
                </WriteAccess>
            </div>

            {/* ── Recent Batches ── */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100">
                    <h2 className="text-sm font-semibold text-gray-800">Recent Batches</h2>
                </div>
                {recentLoading ? (
                    <div className="py-6 text-center text-xs text-gray-400">Loading…</div>
                ) : recentBatches.length === 0 ? (
                    <div className="py-6 text-center text-xs text-gray-400">No batches yet. Upload your first file above.</div>
                ) : (
                    <ul className="divide-y divide-gray-50">
                        {recentBatches.map(batch => (
                            <li key={batch.batch_id}
                                onClick={() => navigate(`/batches/${batch.batch_id}`)}
                                className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 cursor-pointer transition-colors group">
                                <div className="min-w-0">
                                    <p className="text-sm font-medium text-gray-900 font-mono truncate">{batch.batch_id}</p>
                                    <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                                        <Clock size={11} /> {formatDate(batch.created_at)}
                                        <span className="ml-2 text-gray-300">·</span>
                                        <span className="ml-1">{batch.total_clients ?? batch.total_rows ?? '—'} clients</span>
                                    </p>
                                </div>
                                <ChevronRight size={15} className="text-gray-300 group-hover:text-gray-500 transition-colors shrink-0" />
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
};

export default UploadPage;
