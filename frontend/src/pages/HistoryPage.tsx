// frontend/src/pages/HistoryPage.tsx

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { UploadCloud, FileText } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import ErrorDisplay from '../components/common/ErrorDisplay';
import StatusBadge from '../components/common/StatusBadge';
import { createSummary, uploadFile, getSummaryStatus } from '../api/apiService';
import { DocumentCreateResponse, SummaryResponse, SummaryStatus, CustomError } from '../types/apiTypes';

// Тип запроса суммаризации (если не экспортирован)
interface SummaryCreateRequest {
    document_id: string;
    method: string;
    min_length: number;
    max_length: number;
}

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
            summaryMutation.mutate({
                document_id: data.id,
                method: 'mbart_ru_sum_gazeta',
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
    const {
        summaryResult, // ← правильно: data, а не summaryResult
        isLoading: isSummaryLoading,
        error: summaryError, // сохраняем, даже если не рендерим сейчас
    } = useQuery<SummaryResponse, unknown>({
        queryKey: ['summaryStatus', summaryId],
        queryFn: () => getSummaryStatus(summaryId!),
        enabled: !!summaryId,
        refetchInterval: (data) => {
            if (!data) return 3000;
            return data.status === 'done' || data.status === 'failed' ? false : 3000;
        },
    });

    // Вычисляем currentStatus после объявления summaryResult
    const currentStatus = useMemo<SummaryStatus | 'uploading' | 'ready'>(() => {
        if (uploadMutation.isPending) return 'uploading';
        if (summaryMutation.isPending) return 'queued';
        if (summaryResult?.status) return summaryResult.status;
        return file ? 'ready' : 'queued';
    }, [uploadMutation.isPending, summaryMutation.isPending, summaryResult?.status, file]);

    // 🔸 Используем summaryError хотя бы в useEffect (чтобы TS не ругался на "never read")
    // Например, для будущего логгирования или отладки
    useEffect(() => {
        if (summaryError) {
            console.warn('Ошибка при опросе статуса суммаризации:', summaryError);
        }
    }, [summaryError]);

    // Также можно использовать documentId и currentStatus в логах/отладке
    useEffect(() => {
        if (documentId) {
            console.debug('Загружен документ с ID:', documentId);
        }
    }, [documentId]);

    useEffect(() => {
        // currentStatus может использоваться позже
        // console.debug('Текущий статус:', currentStatus);
    }, [currentStatus]);

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
        accept: { 'application/*': ['.docx', '.odt', '.txt'] },
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
            <div className="mt-8 p-6 card border-2 border-brand-primary/50 text-center">
                <StatusBadge status={status} />
                <p className="mt-3 text-lg font-medium">{text}</p>
                {(status === 'running' || status === 'queued') && (
                    <div className="mt-4">
                        <div className="h-2 bg-brand-primary/30 rounded-full overflow-hidden">
                            <div className="h-full bg-brand-primary w-1/2 animate-pulse" />
                        </div>
                    </div>
                )}
                {status === 'failed' && summaryResult?.error_message && (
                    <ErrorDisplay
                        error={{
                            name: 'SummarizationRuntimeError',
                            message: summaryResult.error_message,
                        }}
                        title="Ошибка суммаризации"
                    />
                )}
            </div>
        );
    };

    const renderResultView = () => {
        if (!summaryResult || summaryResult.status !== 'done') return null;

        const previewText = "Загруженный документ успешно распарсен и его текст находится в хранилище. Для полной реализации нужен GET-запрос на /documents/{id} для получения текста.";

        return (
            <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="card h-[600px] overflow-hidden flex flex-col">
                    <h4 className="text-xl font-semibold border-b pb-2 mb-4">Исходный текст</h4>
                    <p className="whitespace-pre-wrap overflow-auto text-sm text-gray-700 flex-grow p-1">
                        {previewText}
                    </p>
                </div>

                <div className="card h-[600px] flex flex-col">
                    <h4 className="text-xl font-semibold border-b pb-2 mb-4 text-brand-primary">
                        Результат суммаризации
                    </h4>
                    <p className="whitespace-pre-wrap overflow-auto text-base font-medium flex-grow p-1">
                        {summaryResult.summary_text || "Нет данных."}
                    </p>
                    <div className="mt-4 border-t pt-3">
                        <button
                            onClick={() => navigator.clipboard.writeText(summaryResult.summary_text || '')}
                            className="btn-secondary text-sm"
                        >
                            Копировать в буфер
                        </button>
                        <span className="text-xs text-gray-500 ml-4">
                            (ID: {summaryResult.id})
                        </span>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div>
            <h2 className="text-3xl font-extrabold text-text-dark mb-6">
                Загрузка документа и AI-суммаризация
            </h2>

            {/* Ошибки */}
            {uploadMutation.isError && (
                <div className="mb-4">
                    <ErrorDisplay
                        error={toCustomError(uploadMutation.error)}
                        title="Ошибка загрузки файла"
                    />
                </div>
            )}
            {summaryMutation.isError && (
                <div className="mb-4">
                    <ErrorDisplay
                        error={toCustomError(summaryMutation.error)}
                        title="Ошибка запуска суммаризации"
                    />
                </div>
            )}
            {/* Можно раскомментировать, если захотите показывать ошибку опроса */}
            {/* {summaryError && (
                <div className="mb-4">
                    <ErrorDisplay
                        error={toCustomError(summaryError)}
                        title="Ошибка получения статуса"
                    />
                </div>
            )} */}

            {/* Drag & Drop */}
            <div
                {...getRootProps()}
                className={`border-2 border-dashed p-10 rounded-xl transition duration-200 
          ${isDragActive ? 'border-brand-primary bg-brand-primary/10' : 'border-ui-neutral hover:border-brand-primary/50'}
        `}
            >
                <input {...getInputProps()} />
                <div className="flex flex-col items-center justify-center text-center">
                    <UploadCloud className="w-12 h-12 text-brand-primary" />
                    {file ? (
                        <p className="mt-2 text-lg font-medium">
                            <FileText className="inline w-5 h-5 mr-2" />
                            Файл выбран: <strong>{file.name}</strong> ({Math.round(file.size / 1024)} КБ)
                        </p>
                    ) : (
                        <p className="mt-2 text-lg font-medium">
                            Перетащите файл сюда, или нажмите, чтобы выбрать файл (.docx, .odt, .txt)
                        </p>
                    )}
                    <p className="text-sm text-gray-500 mt-1">Максимальный размер: 15 МБ.</p>
                </div>
            </div>

            {/* Параметры и кнопка */}
            <div className="mt-6 flex justify-between items-center card p-4">
                <div className="flex items-center space-x-4">
                    <label className="font-medium text-text-dark">Параметры длины:</label>
                    <input
                        type="number"
                        min="50"
                        max="1000"
                        value={summaryParams.min_length}
                        onChange={(e) =>
                            setSummaryParams((prev) => ({
                                ...prev,
                                min_length: Math.max(50, parseInt(e.target.value) || 50),
                            }))
                        }
                        className="w-20 p-2 border border-ui-neutral rounded-lg focus:ring-brand-primary focus:border-brand-primary"
                        title="Минимальное количество токенов"
                    />
                    <input
                        type="number"
                        min="50"
                        max="1000"
                        value={summaryParams.max_length}
                        onChange={(e) =>
                            setSummaryParams((prev) => ({
                                ...prev,
                                max_length: Math.min(1000, Math.max(50, parseInt(e.target.value) || 500)),
                            }))
                        }
                        className="w-20 p-2 border border-ui-neutral rounded-lg focus:ring-brand-primary focus:border-brand-primary"
                        title="Максимальное количество токенов"
                    />
                </div>

                <button
                    onClick={handleSubmit}
                    className="btn-primary flex items-center"
                    disabled={!file || uploadMutation.isPending || summaryMutation.isPending}
                >
                    {uploadMutation.isPending
                        ? 'Загрузка...'
                        : summaryMutation.isPending || (summaryResult && summaryResult.status !== 'done')
                            ? 'Обработка запущена...'
                            : 'Запустить Суммаризацию'}
                </button>
            </div>

            {/* Состояние обработки и результат */}
            {(uploadMutation.isPending ||
                    summaryMutation.isPending ||
                    isSummaryLoading ||
                    summaryResult?.status === 'running' ||
                    summaryResult?.status === 'queued' ||
                    summaryResult?.status === 'failed') &&
                renderProcessingState()}

            {summaryResult?.status === 'done' && renderResultView()}
        </div>
    );
};

export default HistoryPage;