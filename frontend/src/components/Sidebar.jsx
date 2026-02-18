import React from 'react';
import { NavLink } from 'react-router-dom';
import { Upload, FolderOpen, Mail, Zap } from 'lucide-react';

const Sidebar = () => {
    const navItems = [
        { name: 'Upload', path: '/upload', icon: Upload },
        { name: 'Files', path: '/files', icon: FolderOpen },
        { name: 'Email Logs', path: '/logs', icon: Mail },
    ];

    return (
        <aside className="w-64 bg-white border-r border-gray-200 h-screen fixed top-0 left-0 flex flex-col z-50">
            {/* Sidebar Header */}
            <div className="h-20 flex items-center px-6 border-b border-gray-100">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-red-500 rounded-xl flex items-center justify-center text-white shadow-sm">
                        <Zap size={20} fill="currentColor" />
                    </div>
                    <div>
                        <h1 className="font-bold text-gray-900 leading-tight">Kiirus Xpress</h1>
                        <p className="text-xs text-gray-500 font-medium">Order Automation</p>
                    </div>
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
                {navItems.map((item) => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        className={({ isActive }) =>
                            `flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-150 ease-in-out outline-none focus-visible:ring-2 focus-visible:ring-red-300 ${isActive
                                ? 'bg-red-50 text-red-600'
                                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 active:bg-gray-200'
                            }`
                        }
                    >
                        <item.icon size={18} />
                        {item.name}
                    </NavLink>
                ))}
            </nav>

            {/* Footer */}
            <div className="p-6 border-t border-gray-100">
                <p className="text-xs text-gray-400">© 2026 Kiirus Xpress</p>
            </div>
        </aside>
    );
};

export default Sidebar;
