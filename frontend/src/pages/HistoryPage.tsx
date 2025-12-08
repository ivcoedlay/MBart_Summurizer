// frontend/src/pages/HomePage.tsx

import React, { useState, useCallback } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { UploadCloud, FileText } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import ErrorDisplay from '../components/common/ErrorDisplay';
import StatusBadge from '../components/common/StatusBadge';
import { createSummary, uploadFile, getSummaryStatus } from '../api/apiService';
import { DocumentCreateResponse, SummaryResponse, SummaryStatus } from '../types/apiTypes';

const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15MB

const HomePage: React.FC = () => {
    const [file, setFile] = useState<File | null>(null);
    const [documentId, setDocumentId] = useState<string | null>(null);
    const [summaryId, setSummaryId] = useState<string | null>(null);

    // Параметры суммаризации по умолчанию
    const [summaryParams, setSummaryParams] = useState({ min_length: 50, max_length: 500 });

    // 1. Мутация для загрузки файла
    const uploadMutation = useMutation<DocumentCreateResponse, any, File>({
        mutationFn: uploadFile,
        onSuccess: (data) => {
            setDocumentId(data.id);
            // После успешной загрузки сразу запускаем суммаризацию
            summaryMutation.mutate({
                document_id: data.id,
                method: 'mbart_ru_sum_gazeta',
                ...summaryParams,
            });
        },
    });

    // 2. Мутация для запуска суммаризации (возвращает статус 'queued')
    const summaryMutation = useMutation<SummaryResponse, any, Omit<SummaryCreateRequest, 'text'>>({
        mutationFn: createSummary,
        onSuccess: (data) => {
            setSummaryId(data.id);
            // React Query начнет опрос благодаря установке summaryId
        },
    });

    // 3. Запрос для опроса статуса (Polling)
    const { data: summaryResult, isLoading: isSummaryLoading, error: summaryError } = useQuery<SummaryResponse, any>({
        queryKey: ['summaryStatus', summaryId],
        queryFn: () => getSummaryStatus(summaryId!),
        // Опрос каждые 3 секунды, пока статус не "done" или "failed"
        enabled: !!summaryId && summaryResult?.status !== 'done' && summaryResult?.status !== 'failed',
        refetchInterval: 3000,
    });

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

    const currentStatus: SummaryStatus | 'uploading' | 'ready' =
        uploadMutation.isPending ? 'uploading' :
            summaryResult?.status ||
            summaryMutation.isPending ? 'queued' :
                file ? 'ready' : 'queued';


    // --- Визуализация ---

    const renderProcessingState = () => {
        const status = summaryResult?.status || 'queued';
        const text = status === 'queued' ? 'Задача поставлена в очередь...' :
            status === 'running' ? 'Обрабатывается моделью, пожалуйста, подождите...' :
                status === 'failed' ? 'Обработка завершилась с ошибкой.' : '';

        return (
            <div className="mt-8 p-6 card border-2 border-brand-primary/50 text-center">
                <StatusBadge status={status as SummaryStatus} />
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
                        error={{ message: summaryResult.error_message } as any}
                        title="Ошибка суммаризации"
                    />
                )}
            </div>
        );
    };

    const renderResultView = () => {
        if (!summaryResult || summaryResult.status !== 'done') return null;

        // TODO: Получить preview_text документа для левой панели.
        // Сейчас используем заглушку, так как бэкенд возвращает только ID
        const previewText = "Загруженный документ успешно распарсен и его текст находится в хранилище. Для полной реализации нужен GET-запрос на /documents/{id} для получения текста.";

        return (
            <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Левая колонка: Исходный текст (Preview) */}
                <div className="card h-[600px] overflow-hidden flex flex-col">
                    <h4 className="text-xl font-semibold border-b pb-2 mb-4">Исходный текст</h4>
                    <p className="whitespace-pre-wrap overflow-auto text-sm text-gray-700 flex-grow p-1">
                        {previewText}
                    </p>
                </div>

                {/* Правая колонка: Суммаризация */}
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

            {/* Ошибки загрузки или запуска суммаризации */}
            {uploadMutation.isError && (
                <div className="mb-4">
                    <ErrorDisplay error={uploadMutation.error} title="Ошибка загрузки файла" />
                </div>
            )}
            {summaryMutation.isError && (
                <div className="mb-4">
                    <ErrorDisplay error={summaryMutation.error} title="Ошибка запуска суммаризации" />
                </div>
            )}

            {/* 1. Область Drag-n-Drop */}
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
                            Файл выбран: **{file.name}** ({Math.round(file.size / 1024)} КБ)
                        </p>
                    ) : (
                        <p className="mt-2 text-lg font-medium">
                            Перетащите файл сюда, или нажмите, чтобы выбрать файл (.docx, .odt, .txt)
                        </p>
                    )}
                    <p className="text-sm text-gray-500 mt-1">
                        Максимальный размер: 15 МБ.
                    </p>
                </div>
            </div>

            {/* 2. Кнопка и Настройки */}
            <div className="mt-6 flex justify-between items-center card p-4">
                <div className="flex items-center space-x-4">
                    <label className="font-medium text-text-dark">Параметры длины:</label>
                    <input
                        type="number"
                        min="50" max="1000"
                        value={summaryParams.min_length}
                        onChange={(e) => setSummaryParams(prev => ({ ...prev, min_length: parseInt(e.target.value) }))}
                        className="w-20 p-2 border border-ui-neutral rounded-lg focus:ring-brand-primary focus:border-brand-primary"
                        title="Минимальное количество токенов"
                    />
                    <input
                        type="number"
                        min="50" max="1000"
                        value={summaryParams.max_length}
                        onChange={(e) => setSummaryParams(prev => ({ ...prev, max_length: parseInt(e.target.value) }))}
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
                        : summaryMutation.isPending || (summaryResult && summaryResult.status !== 'done' && summaryResult.status !== 'failed')
                            ? 'Обработка запущена...'
                            : 'Запустить Суммаризацию'
                    }
                </button>
            </div>

            {/* 3. Отображение статуса и результата */}
            {(uploadMutation.isPending || summaryMutation.isPending || isSummaryLoading || summaryResult?.status === 'running' || summaryResult?.status === 'queued' || summaryResult?.status === 'failed') &&
                renderProcessingState()
            }

            {summaryResult?.status === 'done' &&
                renderResultView()
            }
        </div>
    );
};

export default HomePage;