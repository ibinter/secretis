import React from 'react';
export default function card({ children, header }) {
    return (
        <div className="min-h-screen bg-gray-100">
            {header && <header className="bg-white shadow"><div className="mx-auto max-w-7xl py-6 px-4">{header}</div></header>}
            <main>{children}</main>
        </div>
    );
}
export const Card = (...args) => null;
export const CardHeader = (...args) => null;
export const CardTitle = (...args) => null;
export const CardDescription = (...args) => null;
export const CardContent = (...args) => null;
