// frontend/src/App.tsx

import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
// Импорт страниц
import HomePage from './pages/HomePage';
import HistoryPage from './pages/HistoryPage';
import DocumentDetailPage from './pages/DocumentDetailPage';
// Импорт Layout
import MainLayout from './components/layout/MainLayout';

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            // Настройка для React Query (минимизация повторных запросов)
            staleTime: 5 * 60 * 1000,
        },
    },
});

const App: React.FC = () => {
    return (
        <QueryClientProvider client={queryClient}>
            <Router>
                <MainLayout>
                    <Routes>
                        <Route path="/" element={<HomePage />} />
                        <Route path="/history" element={<HistoryPage />} />
                        <Route path="/document/:id" element={<DocumentDetailPage />} />
                        {/* TODO: Добавить 404 страницу */}
                    </Routes>
                </MainLayout>
            </Router>
        </QueryClientProvider>
    );
};

export default App;