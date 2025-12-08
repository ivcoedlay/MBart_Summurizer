// frontend/src/pages/DocumentDetailPage.tsx

import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getDocumentDetails, getSummaryStatus } from '../api/apiService';
import ErrorDisplay from '../components/common/ErrorDisplay';
import StatusBadge from '../components/common/StatusBadge';
import { ArrowLeft, HardDrive, Settings } from 'lucide-react';
import { DocumentDetailResponse, SummaryResponse } from '../types/apiTypes';

const DocumentDetailPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();

    // 1. Получение деталей документа
    const { data: document, isLoading: docLoading, error: docError } = useQuery<DocumentDetailResponse, any>({
        queryKey: ['documentDetail', id],
        queryFn: () => getDocumentDetails(id!),
        enabled: !!id,
    });

    // 2. Получение связанной суммаризации (Предполагаем, что Summary ID связан 1-к-1 с Document ID, но это требует проверки)
    // В идеале, нужно найти SummaryModel по document_id.
    // Здесь мы просто используем заглушку, предполагая, что summary.id == document.id для простоты
    const { data: summary, isLoading: sumLoading, error: sumError } = useQuery<SummaryResponse, any>({
        queryKey: ['summaryDetail', id],
        queryFn: () => getSummaryStatus(id!), // Используем Document ID как Summary ID для теста
        enabled: !!id,
        refetchInterval: document?.parsed ? 3000 : false, // Опрашивать, если документ распарсен
    });

    if (docLoading) return <p>Загрузка деталей документа...</p>;

    if (docError) return <ErrorDisplay error={docError} title="Ошибка загрузки деталей" />;

    if (!document) return <p>Документ не найден.</p>;

    const formatDate = (isoString: string) => new Date(isoString).toLocaleString('ru-RU');

    return (
        <div>
            <div className="mb-6 flex justify-between items-center">
                <Link to="/history" className="text-brand-primary hover:underline flex items-center">
                    <ArrowLeft className="w-4 h-4 mr-1" /> Вернуться к истории
                </Link>
                <h1 className="text-3xl font-extrabold text-text-dark">
                    {document.filename}
                </h1>
            </div>

            {/* Основная информация и Метаданные */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                {/* Карточка 1: Статус */}
                <div className="card">
                    <h3 className="font-semibold text-lg mb-2">Общий статус</h3>
                    <StatusBadge status={summary?.status || (document.parsed ? 'Parsed' : 'queued')} />
                    {summary && summary.status !== 'done' && (
                        <p className="text-sm mt-2 text-gray-500">
                            {summary.status === 'failed' ? 'Требуется повторный запуск.' : 'Автоматический опрос статуса...'}
                        </p>
                    )}
                </div>

                {/* Карточка 2: Метаданные */}
                <div className="card">
                    <h3 className="font-semibold text-lg mb-2">Метаданные файла</h3>
                    <p className="text-sm">
                        <span className="font-medium">Загружен:</span> {formatDate(document.uploaded_at)}
                    </p>
                    <p className="text-sm">
                        <span className="font-medium">Размер:</span> {(document.size_bytes / 1024).toFixed(2)} КБ
                    </p>
                    <p className="text-sm flex items-center">
                        <HardDrive className="w-4 h-4 mr-1 text-gray-400" />
                        <span className="font-medium">Хранение:</span> {document.storage_ref.slice(0, 10)}...
                    </p>
                </div>

                {/* Карточка 3: Параметры суммаризации */}
                <div className="card">
                    <h3 className="font-semibold text-lg mb-2 flex items-center">
                        <Settings className="w-4 h-4 mr-1 text-brand-primary" />
                        Параметры
                    </h3>
                    {summary ? (
                        <>
                            <p className="text-sm">
                                <span className="font-medium">Мин. длина:</span> {summary.params.min_length}
                            </p>
                            <p className="text-sm">
                                <span className="font-medium">Макс. длина:</span> {summary.params.max_length}
                            </p>
                            <p className="text-sm">
                                <span className="font-medium">Метод:</span> {summary.method}
                            </p>
                        </>
                    ) : (
                        <p className="text-sm text-gray-500">
                            Параметры не найдены или суммаризация не запускалась.
                        </p>
                    )}
                </div>
            </div>

            {/* Ошибки Суммаризации */}
            {sumError && (
                <div className="mb-4">
                    <ErrorDisplay error={sumError} title="Ошибка получения результата суммаризации" />
                </div>
            )}

            {/* Текст документа и Суммаризация */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Колонка 1: Распарсенный текст */}
                <div className="card h-[70vh] overflow-hidden flex flex-col">
                    <h4 className="text-xl font-semibold border-b pb-2 mb-4">Распарсенный текст документа</h4>
                    <p className="whitespace-pre-wrap overflow-auto text-sm text-gray-700 flex-grow p-1">
                        {document.parsed_text || "Текст еще не распарсен или не найден в базе данных."}
                    </p>
                </div>

                {/* Колонка 2: Результат суммаризации */}
                <div className="card h-[70vh] flex flex-col">
                    <h4 className="text-xl font-semibold border-b pb-2 mb-4 text-brand-primary">
                        Результат суммаризации
                    </h4>
                    {sumLoading && summary?.status !== 'done' ? (
                        <p className="text-gray-500">Ожидание результата...</p>
                    ) : (
                        <p className="whitespace-pre-wrap overflow-auto text-base font-medium flex-grow p-1">
                            {summary && summary.summary_text ? summary.summary_text : "Суммаризация не готова или не запускалась."}
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default DocumentDetailPage;