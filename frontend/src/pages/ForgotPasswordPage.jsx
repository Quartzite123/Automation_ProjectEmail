import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, AlertCircle, CheckCircle, Mail } from 'lucide-react';
import axios from 'axios';

const API_BASE = `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api`;

export default function ForgotPasswordPage() {
    const [email, setEmail]     = useState('');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError]     = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (!email.trim() || !email.includes('@')) {
            setError('Please enter a valid email address.');
            return;
        }

        setLoading(true);
        try {
            await axios.post(`${API_BASE}/auth/forgot-password`, {
                email: email.trim().toLowerCase(),
            });
            setSuccess(true);
        } catch (err) {
            // Even on error we show success to prevent enumeration.
            // Only show error for network failures.
            if (!err.response) {
                setError('Server is not reachable. Please try again later.');
            } else {
                setSuccess(true);
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
                        <p className="text-black/70 text-sm mt-1">Password Reset</p>
                    </div>

                    <div className="px-8 py-8">
                        {success ? (
                            <div className="text-center">
                                <CheckCircle size={48} className="text-green-400 mx-auto mb-4" />
                                <h2 className="text-lg font-semibold text-white mb-2">Check your email</h2>
                                <p className="text-sm text-gray-400 mb-6">
                                    If an account exists for that email, a reset link has been sent.
                                    The link is valid for <strong className="text-gray-300">30 minutes</strong>.
                                </p>
                                <Link
                                    to="/login"
                                    className="text-sm text-[#d4a017] hover:text-[#f2c94c] transition-colors"
                                >
                                    ← Back to login
                                </Link>
                            </div>
                        ) : (
                            <>
                                <h2 className="text-xl font-semibold text-white mb-1">Forgot your password?</h2>
                                <p className="text-sm text-gray-400 mb-6">
                                    Enter your email and we'll send you a reset link.
                                </p>

                                <form onSubmit={handleSubmit} className="space-y-4">
                                    <div>
                                        <label className="text-sm font-medium text-gray-300 block mb-1.5">
                                            Email address
                                        </label>
                                        <div className="relative">
                                            <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                                            <input
                                                type="email"
                                                value={email}
                                                onChange={(e) => setEmail(e.target.value)}
                                                placeholder="you@example.com"
                                                required
                                                autoComplete="email"
                                                className="w-full pl-10 pr-4 py-2.5 bg-[#0f0f0f] border border-gray-700 rounded-lg text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-[#d4a017] focus:border-[#d4a017] transition-all"
                                            />
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
                                                Sending…
                                            </>
                                        ) : (
                                            'Send Reset Link'
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
