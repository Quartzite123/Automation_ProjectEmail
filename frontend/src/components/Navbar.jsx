import React from 'react';

const Navbar = () => {
    return (
        <nav className="bg-white border-b border-border shadow-sm h-16 flex items-center px-6 sticky top-0 z-50">
            <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white font-bold text-xl">
                    K
                </div>
                <span className="text-xl font-bold text-secondary tracking-tight">Kiirus Automation</span>
            </div>
        </nav>
    );
};

export default Navbar;
