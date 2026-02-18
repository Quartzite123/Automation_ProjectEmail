import React, { useEffect, useState } from 'react';
import { Upload, FileText, CheckCircle, Mail, Clock, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getBatches } from '../services/api';

const StatCard = ({ icon: Icon, value, label }) => (
    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between h-32 transition-all duration-150 ease-in-out hover:shadow-md hover:-translate-y-0.5 cursor-pointer">
        <Icon className="w-5 h-5 text-red-500 mb-2" />
        <div>
            <h3 className="text-2xl font-semibold text-gray-900">{value}</h3>
            <p className="text-sm text-gray-500 font-medium">{label}</p>
        </div>
    </div>
);

const Dashboard = () => {
    const navigate = useNavigate();
    const [stats, setStats] = useState({
        totalCustomers: 0,
        pendingFiles: 0,
        approvedFiles: 0,
        emailsSentToday: 0,
        nextScheduledRun: '17:00'
    });
    const [batches, setBatches] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const data = await getBatches();
                setBatches(data);

                // Aggregate stats
                const totalCustomers = data.reduce((acc, b) => acc + (b.total_customers || 0), 0);
                const pendingFiles = data.reduce((acc, b) => acc + (b.pending || 0), 0);
                const approvedFiles = data.reduce((acc, b) => acc + (b.approved || 0), 0);
                const emailsSentToday = data.reduce((acc, b) => acc + (b.sent || 0), 0);

                setStats({
                    totalCustomers,
                    pendingFiles,
                    approvedFiles,
                    emailsSentToday,
                    nextScheduledRun: '17:00' // Mock for now
                });
            } catch (error) {
                console.error("Failed to fetch dashboard data:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    if (loading) {
        return <div className="p-8 text-center text-gray-500">Loading dashboard...</div>;
    }

    return (
        <div className="space-y-8 animate-fade-in">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-semibold text-gray-900">Dashboard</h1>
                <p className="text-gray-500 mt-1">Overview of your order communication workflow</p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div
                    onClick={() => navigate('/records?status=all')}
                    className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between h-32 transition-all duration-150 ease-in-out hover:shadow-md hover:-translate-y-0.5 cursor-pointer"
                >
                    <Upload className="w-5 h-5 text-red-500 mb-2" />
                    <div>
                        <h3 className="text-2xl font-semibold text-gray-900">{stats.totalCustomers}</h3>
                        <p className="text-sm text-gray-500 font-medium">Total Processed</p>
                    </div>
                </div>
                <div
                    onClick={() => navigate('/records?status=Pending')}
                    className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between h-32 transition-all duration-150 ease-in-out hover:shadow-md hover:-translate-y-0.5 cursor-pointer hover:border-orange-300"
                >
                    <Clock className="w-5 h-5 text-red-500 mb-2" />
                    <div>
                        <h3 className="text-2xl font-semibold text-gray-900">{stats.pendingFiles}</h3>
                        <p className="text-sm text-gray-500 font-medium">Pending Approval</p>
                    </div>
                </div>
                <div
                    onClick={() => {
                        if (batches.length > 0 && stats.approvedFiles > 0) {
                            const latestBatch = batches[0];
                            navigate(`/ready-to-send/${latestBatch.batch_id}`);
                        }
                    }}
                    className={`bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between h-32 transition-all duration-150 ease-in-out ${stats.approvedFiles > 0 ? 'hover:shadow-md hover:-translate-y-0.5 cursor-pointer hover:border-green-300' : 'cursor-default'
                        }`}
                >
                    <CheckCircle className="w-5 h-5 text-red-500 mb-2" />
                    <div>
                        <h3 className="text-2xl font-semibold text-gray-900">{stats.approvedFiles}</h3>
                        <p className="text-sm text-gray-500 font-medium">Ready to Send</p>
                    </div>
                </div>
                <div
                    onClick={() => navigate('/records?status=Sent')}
                    className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between h-32 transition-all duration-150 ease-in-out hover:shadow-md hover:-translate-y-0.5 cursor-pointer hover:border-blue-300"
                >
                    <Mail className="w-5 h-5 text-red-500 mb-2" />
                    <div>
                        <h3 className="text-2xl font-semibold text-gray-900">{stats.emailsSentToday}</h3>
                        <p className="text-sm text-gray-500 font-medium">Emails Sent</p>
                    </div>
                </div>
            </div>

            {/* Next Scheduled Run Card */}
            <div className="bg-red-50 border border-red-100 rounded-xl p-6 flex items-start gap-4 transition-all duration-150 hover:bg-red-100/50 cursor-default">
                <div className="bg-white p-2 rounded-full border border-red-100">
                    <Clock className="w-5 h-5 text-red-500" />
                </div>
                <div>
                    <h3 className="text-gray-900 font-semibold">Action Required</h3>
                    <p className="text-sm text-gray-600 mt-1">
                        You have <span className="font-medium text-gray-900">{stats.pendingFiles} pending files</span> waiting for approval.
                    </p>
                </div>
            </div>

            {/* Recent Batches List */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-gray-100">
                    <h3 className="text-lg font-medium text-gray-900">Recent Batches</h3>
                </div>
                <div className="divide-y divide-gray-100">
                    {batches.length === 0 ? (
                        <div className="p-6 text-center text-gray-400">No recent activity</div>
                    ) : (
                        batches.map((batch) => (
                            <div
                                key={batch.batch_id}
                                onClick={() => navigate(`/batch/${batch.batch_id}`)}
                                className="p-4 px-6 flex items-start gap-4 hover:bg-gray-50 transition-colors duration-150 cursor-pointer"
                            >
                                <div className="p-2 bg-blue-50 rounded-full text-blue-500">
                                    <FileText size={16} />
                                </div>
                                <div className="flex-1">
                                    <p className="text-sm font-medium text-gray-900">{batch.batch_id}</p>
                                    <div className="flex gap-3 mt-1 text-xs text-gray-500">
                                        <span className="text-orange-500">{batch.pending} Pending</span>
                                        <span className="text-green-600">{batch.approved} Approved</span>
                                        <span className="text-blue-600">{batch.sent} Sent</span>
                                    </div>
                                </div>
                                <span className="text-xs text-gray-400">{new Date(batch.created_at).toLocaleString()}</span>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
