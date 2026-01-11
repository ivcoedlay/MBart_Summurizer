import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
    getDocumentDetails,
    getSummaryByDocumentId,
} from '../api/apiService';
import {
    DocumentDetailResponse,
    SummaryResponse,
} from '../types/apiTypes';
import {
    FileText,
    Clock,
    CheckCircle2,
    AlertCircle,
    Loader2,
    ChevronDown,
    ChevronUp,
    Download,
} from 'lucide-react';

const DocumentDetailPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const [isTextExpanded, setIsTextExpanded] = useState(false);

    // Запрос документа
    const {
        data: documentData,          // ← правильно: data → documentData
        isLoading: isDocLoading,
        isError: isDocError,
    } = useQuery<DocumentDetailResponse>({
        queryKey: ['document', id],
        queryFn: () => getDocumentDetails(id!),
        enabled: !!id,
    });

    // Запрос суммаризации по document_id
    const {
        data: summaryData,           // ← правильно: data → summaryData
        isLoading: isSummaryLoading,
        isError: isSummaryError,
    } = useQuery<SummaryResponse>({
        queryKey: ['summary-by-document', id],
        queryFn: () => getSummaryByDocumentId(id!),
        enabled: !!id,
        refetchInterval: (query) => {
            const data = query.state.data as SummaryResponse | undefined;
            return data?.status === 'done' || data?.status === 'failed' ? false : 3000;
        },
    });

    const isLoading = isDocLoading;
    const isError = isDocError;

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px]">
                <Loader2 className="w-10 h-10 animate-spin text-primary-600 mb-4" />
                <p className="text-gray-500">Загрузка информации о документе...</p>
            </div>
        );
    }

    if (isError || !documentData) {
        return (
            <div className="bg-red-50 border border-red-200 rounded-xl p-6 flex items-center text-red-700">
                <AlertCircle className="w-6 h-6 mr-4" />
                <div>
                    <h3 className="font-bold">Ошибка загрузки</h3>
                    <p>Не удалось получить данные документа.</p>
                </div>
            </div>
        );
    }

    const summaryStatus = summaryData?.status || 'not_started';
    const summaryText = summaryData?.summary_text || null;
    const errorMessage = summaryData?.error_message || null;

    return (
        <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in duration-500">
            {/* Header Card */}
            <div className="bg-white rounded-2xl p-6 shadow-minimal border border-gray-100">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center space-x-4">
                        <div className="p-3 bg-primary-50 rounded-lg">
                            <FileText className="w-8 h-8 text-primary-600" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">{documentData.filename}</h1>
                            <div className="flex items-center text-sm text-gray-500 mt-1">
                                <Clock className="w-4 h-4 mr-1" />
                                {new Date(documentData.uploaded_at).toLocaleString('ru-RU')}
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center space-x-3">
                        <div
                            className={`flex items-center px-4 py-2 rounded-full text-sm font-medium ${
                                summaryStatus === 'done'
                                    ? 'bg-green-100 text-green-700'
                                    : summaryStatus === 'running'
                                        ? 'bg-amber-100 text-amber-700 animate-pulse'
                                        : summaryStatus === 'failed'
                                            ? 'bg-red-100 text-red-700'
                                            : 'bg-gray-100 text-gray-700'
                            }`}
                        >
                            {summaryStatus === 'done' && <CheckCircle2 className="w-4 h-4 mr-2" />}
                            {summaryStatus === 'running' && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            {summaryStatus === 'failed' && <AlertCircle className="w-4 h-4 mr-2" />}
                            {summaryStatus === 'done'
                                ? 'Готово'
                                : summaryStatus === 'running'
                                    ? 'В обработке'
                                    : summaryStatus === 'failed'
                                        ? 'Ошибка'
                                        : 'Не запущено'}
                        </div>
                        <button className="p-2 text-gray-400 hover:text-primary-600 transition-colors">
                            <Download className="w-6 h-6" />
                        </button>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Content: Summary */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white rounded-2xl shadow-minimal border border-gray-100 overflow-hidden">
                        <div className="p-6 border-b border-gray-50 bg-gray-50/50">
                            <h2 className="text-lg font-semibold text-gray-900">Результат суммаризации</h2>
                        </div>
                        <div className="p-6">
                            {summaryText ? (
                                <p className="text-gray-700 leading-relaxed text-lg italic">
                                    «{summaryText}»
                                </p>
                            ) : summaryStatus === 'running' || summaryStatus === 'queued' ? (
                                <div className="text-center py-10">
                                    <Loader2 className="w-8 h-8 animate-spin text-primary-400 mx-auto mb-3" />
                                    <p className="text-gray-500 text-sm">
                                        {summaryStatus === 'queued' ? 'В очереди...' : 'Нейросеть анализирует текст...'}
                                    </p>
                                </div>
                            ) : summaryStatus === 'failed' ? (
                                <div className="text-red-600">
                                    <AlertCircle className="inline w-5 h-5 mr-1" />
                                    Ошибка: {errorMessage || 'Неизвестная ошибка'}
                                </div>
                            ) : (
                                <p className="text-gray-400 italic">Суммаризация ещё не запущена.</p>
                            )}
                        </div>
                    </div>

                    {/* Collapsible Original Text */}
                    <div className="bg-white rounded-2xl shadow-minimal border border-gray-100">
                        <button
                            onClick={() => setIsTextExpanded(!isTextExpanded)}
                            className="w-full p-6 flex items-center justify-between hover:bg-gray-50 transition-colors"
                        >
                            <h2 className="text-lg font-semibold text-gray-900">Полный текст документа</h2>
                            {isTextExpanded ? <ChevronUp /> : <ChevronDown />}
                        </button>
                        {isTextExpanded && (
                            <div className="p-6 pt-0 border-t border-gray-50 animate-in slide-in-from-top-2 duration-300">
                                <div className="bg-gray-50 rounded-xl p-4 text-gray-600 text-sm leading-relaxed whitespace-pre-wrap max-h-[500px] overflow-y-auto">
                                    {documentData.parsed_text || 'Текст не был извлечен.'}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Sidebar: Details */}
                <div className="space-y-6">
                    <div className="bg-white rounded-2xl p-6 shadow-minimal border border-gray-100">
                        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">Метаданные</h3>
                        <div className="space-y-4 text-sm">
                            <div className="flex justify-between">
                                <span className="text-gray-500">ID документа:</span>
                                <span className="font-mono text-xs text-gray-900">{documentData.id.substring(0, 8)}...</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-500">Язык:</span>
                                <span className="text-gray-900">Русский (RU)</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-500">Длина текста:</span>
                                <span className="text-gray-900">{documentData.parsed_text?.length || 0} симв.</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DocumentDetailPage;