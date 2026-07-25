import React from 'react';
export default function AuthenticatedLayout({ children, header }) {
    return (
        <div className="min-h-screen bg-gray-100">
            {header && <header className="bg-white shadow"><div className="mx-auto max-w-7xl px-4 py-6">{header}</div></header>}
            <main>{children}</main>
        </div>
    );
}
