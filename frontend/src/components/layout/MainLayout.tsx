// frontend/src/components/layout/MainLayout.tsx

import React from 'react';
import Header from './Header';

interface MainLayoutProps {
    children: React.ReactNode;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
    return (
        <div className="min-h-screen flex flex-col">
            <Header />
            <main className="flex-grow py-8 px-4 sm:px-6 lg:px-8">
                <div className="max-w-7xl mx-auto">
                    {children}
                </div>
            </main>
            {/* TODO: Добавить Footer, если нужно */}
        </div>
    );
};

export default MainLayout;