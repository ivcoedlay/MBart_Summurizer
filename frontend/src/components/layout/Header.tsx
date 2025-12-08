// frontend/src/components/layout/Header.tsx

import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const Header: React.FC = () => {
    const location = useLocation();

    const navItemClass = (path: string) =>
        `p-2 transition-colors duration-150 ${
            location.pathname === path
                ? 'border-b-2 border-brand-primary text-brand-primary font-semibold'
                : 'hover:text-brand-primary/80'
        }`;

    return (
        <header className="bg-white border-b border-ui-neutral shadow-minimal sticky top-0 z-10">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center h-16">
                <Link to="/" className="text-2xl font-bold text-text-dark flex items-center">
                    <span className="text-brand-primary mr-1">🧠</span> AI Summarizer
                </Link>
                <nav className="flex space-x-6">
                    <Link to="/" className={navItemClass('/')}>
                        Суммаризация
                    </Link>
                    <Link to="/history" className={navItemClass('/history')}>
                        История
                    </Link>
                </nav>
            </div>
        </header>
    );
};

export default Header;