import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2, AlertCircle, CheckCircle, Lock, Eye, EyeOff } from 'lucide-react';
import axios from 'axios';

const API_BASE = `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api`;

export default function ResetPasswordPage() {
    const [searchParams]                      = useSearchParams();
    const navigate                            = useNavigate();
    const token                               = searchParams.get('token') || '';

    const [newPassword, setNewPassword]       = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showNew, setShowNew]               = useState(false);
    const [showConfirm, setShowConfirm]       = useState(false);
    const [loading, setLoading]               = useState(false);
    const [success, setSuccess]               = useState(false);
    const [error, setError]                   = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (!token) {
            setError('Reset token is missing. Please use the link from your email.');
            return;
        }
        if (newPassword.length < 6) {
            setError('Password must be at least 6 characters.');
            return;
        }
        if (newPassword !== confirmPassword) {
            setError('Passwords do not match.');
            return;
        }

        setLoading(true);
        try {
            await axios.post(`${API_BASE}/auth/reset-password`, {
                token,
                new_password: newPassword,
            });
            setSuccess(true);
            setTimeout(() => navigate('/login', { replace: true }), 3000);
        } catch (err) {
            if (!err.response) {
                setError('Server is not reachable. Please try again later.');
            } else if (err.response.data?.detail) {
                setError(err.response.data.detail);
            } else {
                setError('Failed to reset password. The link may have expired or already been used.');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                <div className="bg-[#1a1a1a] rounded-2xl shadow-2xl border border-gray-800 overflow-hidden">
                    {/* Header strip */}
                    <div className="bg-[#d4a017] px-8 py-8 text-center">
                        <h1 className="text-2xl font-bold text-black">Kiirus Xpress</h1>
                        <p className="text-black/70 text-sm mt-1">Set New Password</p>
                    </div>

                    <div className="px-8 py-8">
                        {success ? (
                            <div className="text-center">
                                <CheckCircle size={48} className="text-green-400 mx-auto mb-4" />
                                <h2 className="text-lg font-semibold text-white mb-2">Password reset!</h2>
                                <p className="text-sm text-gray-400 mb-6">
                                    Your password has been updated. Redirecting to login…
                                </p>
                                <Link
                                    to="/login"
                                    className="text-sm text-[#d4a017] hover:text-[#f2c94c] transition-colors"
                                >
                                    Go to login →
                                </Link>
                            </div>
                        ) : (
                            <>
                                <h2 className="text-xl font-semibold text-white mb-1">Reset your password</h2>
                                <p className="text-sm text-gray-400 mb-6">
                                    Enter a new password for your account.
                                </p>

                                <form onSubmit={handleSubmit} className="space-y-4">
                                    {/* New password */}
                                    <div>
                                        <label className="text-sm font-medium text-gray-300 block mb-1.5">
                                            New password
                                        </label>
                                        <div className="relative">
                                            <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                                            <input
                                                type={showNew ? 'text' : 'password'}
                                                value={newPassword}
                                                onChange={(e) => setNewPassword(e.target.value)}
                                                placeholder="••••••••"
                                                required
                                                autoComplete="new-password"
                                                className="w-full pl-10 pr-10 py-2.5 bg-[#0f0f0f] border border-gray-700 rounded-lg text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-[#d4a017] focus:border-[#d4a017] transition-all"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowNew((v) => !v)}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                                                tabIndex={-1}
                                                aria-label={showNew ? 'Hide password' : 'Show password'}
                                            >
                                                {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
                                            </button>
                                        </div>
                                    </div>

                                    {/* Confirm password */}
                                    <div>
                                        <label className="text-sm font-medium text-gray-300 block mb-1.5">
                                            Confirm new password
                                        </label>
                                        <div className="relative">
                                            <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                                            <input
                                                type={showConfirm ? 'text' : 'password'}
                                                value={confirmPassword}
                                                onChange={(e) => setConfirmPassword(e.target.value)}
                                                placeholder="••••••••"
                                                required
                                                autoComplete="new-password"
                                                className="w-full pl-10 pr-10 py-2.5 bg-[#0f0f0f] border border-gray-700 rounded-lg text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-[#d4a017] focus:border-[#d4a017] transition-all"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowConfirm((v) => !v)}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                                                tabIndex={-1}
                                                aria-label={showConfirm ? 'Hide password' : 'Show password'}
                                            >
                                                {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                                            </button>
                                        </div>
                                    </div>

                                    {error && (
                                        <div className="flex items-start gap-2.5 bg-red-950/60 border border-red-800 rounded-lg px-4 py-3">
                                            <AlertCircle size={16} className="text-red-400 mt-0.5 shrink-0" />
                                            <p className="text-sm text-red-300">{error}</p>
                                        </div>
                                    )}

                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="w-full bg-[#d4a017] hover:bg-[#f2c94c] active:bg-[#b8880e] disabled:opacity-50 disabled:cursor-not-allowed text-black font-semibold py-2.5 rounded-lg text-sm transition-all flex items-center justify-center gap-2"
                                    >
                                        {loading ? (
                                            <>
                                                <Loader2 size={16} className="animate-spin" />
                                                Resetting…
                                            </>
                                        ) : (
                                            'Reset Password'
                                        )}
                                    </button>
                                </form>

                                <div className="text-center mt-6">
                                    <Link
                                        to="/login"
                                        className="text-xs text-[#d4a017] hover:text-[#f2c94c] transition-colors"
                                    >
                                        ← Back to login
                                    </Link>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
