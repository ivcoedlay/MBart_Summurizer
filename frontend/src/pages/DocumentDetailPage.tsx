import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getDocumentDetails } from '../api/apiService';
import { DocumentDetailResponse } from '../types/apiTypes';
import {
    FileText,
    Clock,
    CheckCircle2,
    AlertCircle,
    Loader2,
    ChevronDown,
    ChevronUp,
    Download
} from 'lucide-react';

const DocumentDetailPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const [isTextExpanded, setIsTextExpanded] = useState(false);

    // Исправляем ошибку TS2339, указывая тип <DocumentDetailResponse>
    const { data, isLoading, isError } = useQuery<DocumentDetailResponse>({
        queryKey: ['document', id],
        queryFn: () => getDocumentDetails(id!),
        enabled: !!id,
        refetchInterval: (query) => {
            // Авто-обновление, если документ еще в процессе обработки
            return query.state.data?.status === 'processing' ? 3000 : false;
        }
    });

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px]">
                <Loader2 className="w-10 h-10 animate-spin text-primary-600 mb-4" />
                <p className="text-gray-500">Загрузка информации о документе...</p>
            </div>
        );
    }

    if (isError || !data) {
        return (
            <div className="bg-red-50 border border-red-200 rounded-xl p-6 flex items-center text-red-700">
                <AlertCircle className="w-6 h-6 mr-4" />
                <div>
                    <h3 className="font-bold">Ошибка загрузки</h3>
                    <p>Не удалось получить данные документа. Попробуйте позже.</p>
                </div>
            </div>
        );
    }

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
                            <h1 className="text-2xl font-bold text-gray-900">{data.filename}</h1>
                            <div className="flex items-center text-sm text-gray-500 mt-1">
                                <Clock className="w-4 h-4 mr-1" />
                                {new Date(data.created_at).toLocaleString('ru-RU')}
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center space-x-3">
                        {/* Статус теперь типизирован корректно */}
                        <div className={`flex items-center px-4 py-2 rounded-full text-sm font-medium
              ${data.status === 'completed' ? 'bg-green-100 text-green-700' :
                            data.status === 'processing' ? 'bg-amber-100 text-amber-700' :
                                'bg-red-100 text-red-700'}`}
                        >
                            {data.status === 'completed' && <CheckCircle2 className="w-4 h-4 mr-2" />}
                            {data.status === 'processing' && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            {data.status === 'failed' && <AlertCircle className="w-4 h-4 mr-2" />}
                            {data.status === 'completed' ? 'Готово' :
                                data.status === 'processing' ? 'В обработке' : 'Ошибка'}
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
                            {data.summary ? (
                                <p className="text-gray-700 leading-relaxed text-lg italic">
                                    «{data.summary}»
                                </p>
                            ) : data.status === 'processing' ? (
                                <div className="text-center py-10">
                                    <Loader2 className="w-8 h-8 animate-spin text-primary-400 mx-auto mb-3" />
                                    <p className="text-gray-500 text-sm">Нейросеть анализирует текст...</p>
                                </div>
                            ) : (
                                <p className="text-gray-400 italic">Суммаризация еще не выполнена.</p>
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
                                    {data.parsed_text || "Текст не был извлечен."}
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
                                <span className="text-gray-500">ID проекта:</span>
                                <span className="font-mono text-xs text-gray-900">{data.id.substring(0, 8)}...</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-500">Язык:</span>
                                <span className="text-gray-900">Русский (RU)</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-500">Длина текста:</span>
                                <span className="text-gray-900">{data.parsed_text?.length || 0} симв.</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DocumentDetailPage;