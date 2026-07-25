import React from 'react';
export default function AdminLayout({ children, header }) {
    return (
        <div className="min-h-screen bg-gray-100">
            {header && <header className="bg-white shadow"><div className="mx-auto max-w-7xl py-6 px-4">{header}</div></header>}
            <main>{children}</main>
        </div>
    );
}
