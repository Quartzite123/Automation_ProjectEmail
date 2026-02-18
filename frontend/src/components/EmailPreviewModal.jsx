import React from 'react';
import { X, Mail } from 'lucide-react';

const EmailPreviewModal = ({ 
    isOpen,
    emailData, 
    onClose
}) => {
    if (!isOpen || !emailData) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200">
                    <div className="flex items-center gap-3">
                        <Mail className="text-red-600" size={24} />
                        <div>
                            <h3 className="text-lg font-semibold text-gray-900">Email Preview</h3>
                            <p className="text-sm text-gray-500">{emailData.customer_name} ({emailData.customer_email})</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Subject */}
                <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
                    <p className="text-xs font-medium text-gray-500 mb-1">Subject</p>
                    <p className="text-sm font-medium text-gray-900">{emailData.subject}</p>
                </div>

                {/* Email Content */}
                <div className="flex-1 overflow-auto p-6 bg-gray-100">
                    <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                        <iframe
                            srcDoc={emailData.html}
                            title="Email Preview"
                            className="w-full h-[500px] border-0"
                            sandbox="allow-same-origin"
                        />
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};

export default EmailPreviewModal;
