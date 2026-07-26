import React from 'react';
export default function Layout({ children, header }) {
    return (
        <div className="min-h-screen bg-gray-100">
            {header && <header className="bg-white shadow"><div className="max-w-7xl mx-auto py-6 px-4">{header}</div></header>}
            <main>{children}</main>
        </div>
    );
}
export const Button = (...args) => null;
