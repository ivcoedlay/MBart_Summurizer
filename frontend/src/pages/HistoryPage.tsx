import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { UploadCloud, FileText } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import ErrorDisplay from '../components/common/ErrorDisplay';
import StatusBadge from '../components/common/StatusBadge';
import { createSummary, uploadFile, getSummaryStatus } from '../api/apiService';
import {
    DocumentCreateResponse,
    SummaryResponse,
    SummaryStatus,
    CustomError,
    SummaryCreateRequest
} from '../types/apiTypes';

const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15MB

// Утилита: приведение unknown к CustomError
const toCustomError = (error: unknown): CustomError => {
    if (error instanceof Error) {
        return {
            name: error.name || 'UnknownError',
            message: error.message || 'Произошла неизвестная ошибка',
        };
    }
    if (typeof error === 'object' && error !== null) {
        const err = error as Record<string, unknown>;
        return {
            name: typeof err.name === 'string' ? err.name : 'APIError',
            message: typeof err.message === 'string' ? err.message : 'Ошибка сервера',
        };
    }
    return {
        name: 'UnknownError',
        message: 'Неизвестная ошибка: ' + String(error),
    };
};

const HistoryPage: React.FC = () => {
    const [file, setFile] = useState<File | null>(null);
    const [documentId, setDocumentId] = useState<string | null>(null);
    const [summaryId, setSummaryId] = useState<string | null>(null);
    const [summaryParams, setSummaryParams] = useState({ min_length: 50, max_length: 500 });

    // 1. Мутация загрузки файла
    const uploadMutation = useMutation<DocumentCreateResponse, unknown, File>({
        mutationFn: uploadFile,
        onSuccess: (data) => {
            setDocumentId(data.id);
            // Исправление TS2322: передаем "mbart_ru_sum_gazeta" как константу
            summaryMutation.mutate({
                document_id: data.id,
                method: "mbart_ru_sum_gazeta",
                ...summaryParams,
            });
        },
    });

    // 2. Мутация суммаризации
    const summaryMutation = useMutation<SummaryResponse, unknown, SummaryCreateRequest>({
        mutationFn: createSummary,
        onSuccess: (data) => {
            setSummaryId(data.id);
        },
    });

    // 3. Опрос статуса
    // Исправление TS2339: Извлекаем именно 'data' и переименовываем в 'summaryResult'
    const {
        data: summaryResult,
        isLoading: isSummaryLoading,
        error: summaryError,
    } = useQuery<SummaryResponse, unknown>({
        queryKey: ['summaryStatus', summaryId],
        queryFn: () => getSummaryStatus(summaryId!),
        enabled: !!summaryId,
        refetchInterval: (query) => {
            // Исправление TS2339: в v5 в refetchInterval приходит объект query,
            // состояние проверяем через query.state.data
            const data = query.state.data as SummaryResponse | undefined;
            if (!data) return 3000;
            return data.status === 'done' || data.status === 'failed' ? false : 3000;
        },
    });

    // Вычисляем текущий статус для UI
    const currentStatus = useMemo<SummaryStatus | 'uploading' | 'ready' | 'queued'>(() => {
        if (uploadMutation.isPending) return 'uploading';
        if (summaryMutation.isPending) return 'queued';
        if (summaryResult?.status) return summaryResult.status as SummaryStatus;
        return file ? 'ready' : 'queued';
    }, [uploadMutation.isPending, summaryMutation.isPending, summaryResult?.status, file]);

    // Логгирование ошибок (для фиксации неиспользуемых переменных)
    useEffect(() => {
        if (summaryError) console.error('Polling error:', summaryError);
    }, [summaryError]);

    const onDrop = useCallback((acceptedFiles: File[]) => {
        const acceptedFile = acceptedFiles[0];
        if (acceptedFile && acceptedFile.size > MAX_FILE_SIZE) {
            alert('Файл слишком большой. Максимальный размер: 15 МБ.');
            return;
        }
        setFile(acceptedFile);
        setDocumentId(null);
        setSummaryId(null);
    }, []);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: { 'application/*': ['.docx', '.odt', '.txt', '.pdf'] },
        multiple: false,
    });

    const handleSubmit = () => {
        if (file) {
            uploadMutation.mutate(file);
        }
    };

    const renderProcessingState = () => {
        const status = summaryResult?.status || 'queued';
        const text =
            status === 'queued'
                ? 'Задача поставлена в очередь...'
                : status === 'running'
                    ? 'Обрабатывается моделью, пожалуйста, подождите...'
                    : 'Обработка завершилась с ошибкой.';

        return (
            <div className="mt-8 p-6 card border-2 border-brand-primary/50 text-center bg-white rounded-xl shadow-minimal">
                <div className="flex justify-center mb-4">
                    <StatusBadge status={status as any} />
                </div>
                <p className="mt-3 text-lg font-medium text-text-dark">{text}</p>
                {(status === 'running' || status === 'queued') && (
                    <div className="mt-4 max-w-md mx-auto">
                        <div className="h-2 bg-brand-primary/20 rounded-full overflow-hidden">
                            <div className="h-full bg-brand-primary animate-progress-indeterminate" style={{ width: '50%' }} />
                        </div>
                    </div>
                )}
                {status === 'failed' && summaryResult?.error_message && (
                    <div className="mt-4">
                        <ErrorDisplay
                            error={{
                                name: 'SummarizationError',
                                message: summaryResult.error_message,
                            }}
                            title="Ошибка суммаризации"
                        />
                    </div>
                )}
            </div>
        );
    };

    const renderResultView = () => {
        if (!summaryResult || summaryResult.status !== 'done') return null;

        return (
            <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="card bg-white p-6 rounded-xl shadow-minimal flex flex-col h-[500px]">
                    <h4 className="text-xl font-semibold border-b pb-2 mb-4 flex items-center">
                        <FileText className="w-5 h-5 mr-2 text-brand-primary" />
                        Документ
                    </h4>
                    <div className="bg-ui-neutral/30 p-4 rounded-lg overflow-auto flex-grow text-sm text-gray-700">
                        {documentId ? `Документ #${documentId} успешно загружен и обработан.` : 'Текст документа доступен в базе.'}
                    </div>
                </div>

                <div className="card bg-white p-6 rounded-xl shadow-minimal flex flex-col h-[500px] border-l-4 border-brand-primary">
                    <h4 className="text-xl font-semibold border-b pb-2 mb-4 text-brand-primary">
                        Результат суммаризации
                    </h4>
                    <div className="overflow-auto flex-grow">
                        <p className="text-base leading-relaxed text-text-dark whitespace-pre-wrap">
                            {summaryResult.summary_text || "Текст отсутствует."}
                        </p>
                    </div>
                    <div className="mt-4 border-t pt-3 flex justify-between items-center">
                        <button
                            onClick={() => navigator.clipboard.writeText(summaryResult.summary_text || '')}
                            className="btn-secondary py-1 px-3 text-sm"
                        >
                            Копировать
                        </button>
                        <span className="text-xs text-gray-400 font-mono">
                            ID: {summaryResult.id.substring(0, 8)}...
                        </span>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="max-w-6xl mx-auto px-4">
            <h2 className="text-3xl font-extrabold text-text-dark mb-6">
                Суммаризация документа
            </h2>

            {/* Блок ошибок */}
            <div className="space-y-4 mb-6">
                {uploadMutation.isError && (
                    <ErrorDisplay
                        error={toCustomError(uploadMutation.error)}
                        title="Ошибка загрузки"
                    />
                )}
                {summaryMutation.isError && (
                    <ErrorDisplay
                        error={toCustomError(summaryMutation.error)}
                        title="Ошибка API"
                    />
                )}
            </div>

            {/* Зона загрузки */}
            <div
                {...getRootProps()}
                className={`border-2 border-dashed p-10 rounded-xl transition-all cursor-pointer
                    ${isDragActive ? 'border-brand-primary bg-brand-primary/5' : 'border-ui-neutral hover:border-brand-primary/40 bg-white'}
                `}
            >
                <input {...getInputProps()} />
                <div className="flex flex-col items-center text-center">
                    <UploadCloud className={`w-14 h-14 mb-4 ${isDragActive ? 'text-brand-primary' : 'text-gray-400'}`} />
                    {file ? (
                        <div className="text-lg">
                            <span className="font-bold text-brand-primary">{file.name}</span>
                            <p className="text-sm text-gray-500">{(file.size / 1024).toFixed(1)} КБ</p>
                        </div>
                    ) : (
                        <div>
                            <p className="text-lg font-medium text-text-dark">Выберите файл или перетащите его сюда</p>
                            <p className="text-sm text-gray-400 mt-2">Поддерживаются .docx, .odt, .txt (до 15 МБ)</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Управление */}
            <div className="mt-6 flex flex-wrap gap-4 items-center justify-between bg-white p-6 rounded-xl shadow-minimal border border-ui-neutral/50">
                <div className="flex items-center space-x-6">
                    <div className="flex flex-col">
                        <label className="text-xs font-bold text-gray-500 uppercase mb-1">Мин. токенов</label>
                        <input
                            type="number"
                            value={summaryParams.min_length}
                            onChange={(e) => setSummaryParams(p => ({ ...p, min_length: parseInt(e.target.value) || 10 }))}
                            className="w-24 p-2 border rounded-md"
                        />
                    </div>
                    <div className="flex flex-col">
                        <label className="text-xs font-bold text-gray-500 uppercase mb-1">Макс. токенов</label>
                        <input
                            type="number"
                            value={summaryParams.max_length}
                            onChange={(e) => setSummaryParams(p => ({ ...p, max_length: parseInt(e.target.value) || 100 }))}
                            className="w-24 p-2 border rounded-md"
                        />
                    </div>
                </div>

                <button
                    onClick={handleSubmit}
                    disabled={!file || uploadMutation.isPending || summaryMutation.isPending || (summaryResult?.status === 'running')}
                    className="btn-primary px-8 py-3 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {uploadMutation.isPending ? 'Загрузка...' :
                        summaryMutation.isPending || summaryResult?.status === 'running' || summaryResult?.status === 'queued' ?
                            'В процессе...' : 'Начать анализ'}
                </button>
            </div>

            {/* Результаты и состояния */}
            {(uploadMutation.isPending ||
                summaryMutation.isPending ||
                isSummaryLoading ||
                (summaryResult && summaryResult.status !== 'ready')) && (
                <div className="mt-2">
                    { (summaryResult?.status === 'running' || summaryResult?.status === 'queued' || summaryResult?.status === 'failed') && renderProcessingState() }
                    { summaryResult?.status === 'done' && renderResultView() }
                </div>
            )}
        </div>
    );
};

export default HistoryPage;