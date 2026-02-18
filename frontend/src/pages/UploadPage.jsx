import React, { useState, useRef } from 'react';
import { CloudUpload, CheckCircle, FileText, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { uploadMaster } from '../services/api';

const UploadPage = () => {
    const navigate = useNavigate();
    const [dragActive, setDragActive] = useState(false);
    const [file, setFile] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState('');
    const inputRef = useRef(null);

    const handleDrag = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === 'dragenter' || e.type === 'dragover') {
            setDragActive(true);
        } else if (e.type === 'dragleave') {
            setDragActive(false);
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        setError('');

        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            validateAndSetFile(e.dataTransfer.files[0]);
        }
    };

    const handleChange = (e) => {
        setError('');
        if (e.target.files && e.target.files[0]) {
            validateAndSetFile(e.target.files[0]);
        }
    };

    const validateAndSetFile = (file) => {
        if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
            setFile(file);
        } else {
            setError('Please upload a valid Excel file (.xlsx or .xls)');
            setFile(null);
        }
    };

    const handleUpload = async () => {
        if (!file) return;
        setUploading(true);
        try {
            const data = await uploadMaster(file);
            console.log("Upload success:", data);
            setSuccess(true);
            setFile(null);

            // Redirect to Email page for immediate email management
            if (data.batch_id) {
                setTimeout(() => {
                    navigate(`/email?batch_id=${data.batch_id}`);
                }, 1500);
            }
        } catch (err) {
            console.error("Upload failed:", err);
            setError('Upload failed: ' + (err.response?.data?.detail || err.message));
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
            {/* Header */}
            <div className="text-center md:text-left">
                <h1 className="text-3xl font-semibold text-gray-900">Upload Master File</h1>
                <p className="text-gray-500 mt-1">Upload your master file to create a new batch and start sending emails</p>
            </div>

            <div
                className={`bg-white rounded-2xl border-2 border-dashed p-12 flex flex-col items-center justify-center text-center transition-all duration-200 ease-in-out cursor-pointer min-h-[400px] ${dragActive
                    ? 'border-red-500 bg-red-50 scale-[1.02] shadow-md'
                    : 'border-gray-200 hover:border-red-300 hover:bg-gray-50'
                    }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={() => !file && inputRef.current.click()}
            >
                <input
                    ref={inputRef}
                    type="file"
                    className="hidden"
                    accept=".xlsx, .xls"
                    onChange={handleChange}
                />

                {success ? (
                    <div className="flex flex-col items-center animate-scale-in">
                        <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-6">
                            <CheckCircle size={32} />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900">File Processed Successfully!</h3>
                        <p className="text-gray-500 mt-2 max-w-sm">
                            Redirecting to email management page...
                        </p>
                        <button
                            onClick={(e) => { e.stopPropagation(); setSuccess(false); }}
                            className="mt-8 bg-white border border-gray-200 text-gray-900 px-6 py-2 rounded-lg font-medium transition-all duration-150 ease-in-out hover:bg-gray-50 hover:shadow-sm active:scale-95 focus:outline-none focus:ring-2 focus:ring-gray-200"
                        >
                            Upload Another
                        </button>
                    </div>
                ) : (
                    <>
                        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-6 shadow-sm transition-transform duration-200 ${dragActive ? 'bg-red-100 text-red-600 scale-110' : 'bg-red-50 text-red-500'}`}>
                            <CloudUpload size={32} />
                        </div>

                        {file ? (
                            <div
                                className="mb-8 w-full max-w-sm bg-gray-50 p-4 rounded-xl border border-gray-200 flex items-center gap-3 transition-all duration-150 hover:border-red-200 hover:shadow-sm"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <div className="p-2 bg-white rounded-lg border border-gray-100 text-green-600">
                                    <FileText size={20} />
                                </div>
                                <div className="flex-1 text-left">
                                    <p className="text-sm font-medium text-gray-900 truncate">{file.name}</p>
                                    <p className="text-xs text-gray-500">{(file.size / 1024).toFixed(2)} KB</p>
                                </div>
                                <button
                                    onClick={() => setFile(null)}
                                    className="text-gray-400 hover:text-red-500 p-2 rounded-lg hover:bg-red-50 transition-colors"
                                >
                                    <AlertCircle size={18} />
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-2 mb-8">
                                <p className="text-lg font-medium text-gray-900">Drag & drop your Excel file here</p>
                                <p className="text-sm text-gray-400">Supported formats: .xlsx, .xls</p>
                            </div>
                        )}

                        <div className="flex gap-4">
                            {!file && (
                                <button
                                    onClick={(e) => { e.stopPropagation(); inputRef.current.click(); }}
                                    className="bg-white border border-gray-200 text-gray-900 px-6 py-2.5 rounded-lg font-medium transition-all duration-150 ease-in-out hover:bg-gray-50 hover:border-gray-300 hover:shadow-sm active:scale-95 focus:outline-none focus:ring-2 focus:ring-gray-200"
                                >
                                    Browse Files
                                </button>
                            )}
                            {file && (
                                <button
                                    onClick={(e) => { e.stopPropagation(); handleUpload(); }}
                                    disabled={uploading}
                                    className="bg-red-500 text-white px-8 py-2.5 rounded-lg font-medium shadow-sm flex items-center gap-2 disabled:opacity-70 transition-all duration-150 ease-in-out hover:bg-red-600 hover:shadow-md active:scale-95 active:shadow-inner focus:outline-none focus:ring-2 focus:ring-red-300"
                                >
                                    {uploading ? 'Processing...' : 'Upload & Process'}
                                </button>
                            )}
                        </div>

                        {error && (
                            <div className="mt-6 flex items-center gap-2 text-red-600 bg-red-50 px-4 py-2 rounded-lg text-sm font-medium animate-shake">
                                <AlertCircle size={16} />
                                {error}
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

export default UploadPage;
