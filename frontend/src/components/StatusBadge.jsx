import React from 'react';

const StatusBadge = ({ status }) => {
    const getStyles = () => {
        switch (status.toLowerCase()) {
            case 'approved':
            case 'success':
                return 'bg-green-100 text-green-800 border-green-200';
            case 'pending':
                return 'bg-yellow-100 text-yellow-800 border-yellow-200';
            case 'rejected':
            case 'failed':
                return 'bg-red-100 text-red-800 border-red-200';
            case 'sent':
                return 'bg-blue-100 text-blue-800 border-blue-200';
            default:
                return 'bg-gray-100 text-gray-800 border-gray-200';
        }
    };

    return (
        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStyles()}`}>
            {status}
        </span>
    );
};

export default StatusBadge;
