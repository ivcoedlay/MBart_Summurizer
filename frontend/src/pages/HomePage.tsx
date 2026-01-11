import React, { useState, useCallback, useEffect } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { UploadCloud, FileText, AlertCircle, Loader2, CheckCircle2 } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import ErrorDisplay from '../components/common/ErrorDisplay';
import { uploadFile, createSummary, getSummaryStatus } from '../api/apiService';
import {
    DocumentCreateResponse,
    SummaryResponse,
    SummaryCreateRequest,
    CustomError,
    SummaryStatus,
} from '../types/apiTypes';

const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15MB

// Утилита для преобразования ошибок
const toCustomError = (error: unknown): CustomError => {
    if (error instanceof Error) {
        return {
            name: error.name || 'UnknownError',
            message: error.message || 'Произошла неизвестная ошибка',
            stack: error.stack,
        };
    }
    if (typeof error === 'object' && error !== null) {
        const err = error as Record<string, unknown>;
        return {
            name: typeof err.name === 'string' ? err.name : 'APIError',
            message:
                typeof err.message === 'string' ? err.message :
                    typeof err.detail === 'string' ? err.detail :
                        'Ошибка сервера',
            stack: typeof err.stack === 'string' ? err.stack : undefined,
        };
    }
    return {
        name: 'UnknownError',
        message: 'Неизвестная ошибка: ' + String(error),
    };
};

const HomePage: React.FC = () => {
    const [file, setFile] = useState<File | null>(null);
    const [summaryParams, setSummaryParams] = useState({
        min_length: 50,
        max_length: 500,
    });
    const [validationError, setValidationError] = useState<string | null>(null);
    const [summaryId, setSummaryId] = useState<string | null>(null);

    // Мутация для загрузки файла
    const uploadMutation = useMutation<DocumentCreateResponse, Error, File>({
        mutationFn: uploadFile,
    });

    // Мутация для создания суммаризации
    const summaryMutation = useMutation<SummaryResponse, Error, SummaryCreateRequest>({
        mutationFn: createSummary,
        onSuccess: (data) => {
            setSummaryId(data.id);
        },
    });

    // Опрос статуса суммаризации
    const summaryQuery = useQuery<SummaryResponse>({
        queryKey: ['summaryStatus', summaryId],
        queryFn: () => getSummaryStatus(summaryId!),
        enabled: !!summaryId,
        refetchInterval: (query) => {
            const data = query.state.data as SummaryResponse | undefined;
            return data?.status === 'done' || data?.status === 'failed' ? false : 3000;
        },
    });

    // Эффект для валидации параметров
    useEffect(() => {
        if (summaryParams.min_length > summaryParams.max_length) {
            setValidationError('Минимальная длина не может быть больше максимальной');
        } else if (summaryParams.min_length < 0) {
            setValidationError('Минимальная длина не может быть отрицательной');
        } else if (summaryParams.max_length > 2048) {
            setValidationError('Максимальная длина не может превышать 2048');
        } else {
            setValidationError(null);
        }
    }, [summaryParams]);

    const onDrop = useCallback((acceptedFiles: File[]) => {
        const acceptedFile = acceptedFiles[0];
        if (acceptedFile && acceptedFile.size > MAX_FILE_SIZE) {
            setValidationError('Файл слишком большой. Максимальный размер: 15 МБ.');
            return;
        }
        setFile(acceptedFile);
        setValidationError(null);
        // Сброс предыдущих результатов при новом выборе файла
        setSummaryId(null);
    }, []);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
            'application/vnd.oasis.opendocument.text': ['.odt'],
            'text/plain': ['.txt'],
        },
        multiple: false,
    });

    const handleSubmit = () => {
        if (!file) {
            setValidationError('Пожалуйста, выберите файл для загрузки');
            return;
        }
        if (validationError) {
            return;
        }

        setSummaryId(null); // Сброс предыдущего ID суммаризации
        uploadMutation.mutate(file, {
            onSuccess: (docResponse) => {
                summaryMutation.mutate({
                    document_id: docResponse.id,
                    method: 'mbart_ru_sum_gazeta',
                    min_length: summaryParams.min_length,
                    max_length: summaryParams.max_length,
                });
            },
            onError: (error) => {
                console.error('Upload error:', error);
            }
        });
    };

    const isProcessing =
        uploadMutation.isPending ||
        summaryMutation.isPending ||
        (!!summaryId && (summaryQuery.data?.status === 'queued' || summaryQuery.data?.status === 'running'));

    const currentStatus = summaryQuery.data?.status ||
        (summaryMutation.isSuccess ? 'queued' : null);

    // Получаем актуальный результат суммаризации (из опроса или из мутации)
    const summaryResult = summaryQuery.isSuccess ? summaryQuery.data :
        summaryMutation.isSuccess ? summaryMutation.data : null;

    return (
        <div>
            <h2 className="text-3xl font-extrabold text-text-dark mb-6">
                Загрузка документа и AI-суммаризация
            </h2>

            {/* Ошибки валидации параметров */}
            {validationError && (
                <div className="mb-4 p-4 bg-red-50 text-red-700 border border-red-200 rounded-lg flex items-start">
                    <AlertCircle className="w-5 h-5 mr-2 mt-0.5 flex-shrink-0" />
                    <p>{validationError}</p>
                </div>
            )}

            {/* Ошибки API */}
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
                        title="Ошибка создания задачи суммаризации"
                    />
                </div>
            )}

            {summaryQuery.isError && (
                <div className="mb-4">
                    <ErrorDisplay
                        error={toCustomError(summaryQuery.error)}
                        title="Ошибка получения статуса суммаризации"
                    />
                </div>
            )}

            {/* Drag & Drop */}
            <div
                {...getRootProps()}
                className={`border-2 border-dashed p-10 rounded-xl transition duration-200 ${
                    isDragActive
                        ? 'border-brand-primary bg-brand-primary/10'
                        : 'border-ui-neutral hover:border-brand-primary/50'
                }`}
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

            {/* Кнопка и параметры */}
            <div className="mt-6 flex flex-col sm:flex-row sm:items-center sm:justify-between card p-4 gap-4">
                <div className="flex flex-col sm:flex-row sm:items-center gap-6">
                    <div className="flex flex-col">
                        <label className="text-xs font-medium text-gray-700 mb-1">Мин. токенов</label>
                        <input
                            type="number"
                            min="0"
                            max="1024"
                            value={summaryParams.min_length}
                            onChange={(e) => {
                                const val = parseInt(e.target.value, 10);
                                if (!isNaN(val)) {
                                    setSummaryParams((prev) => ({ ...prev, min_length: val }));
                                }
                            }}
                            className={`w-24 p-2 border rounded-lg focus:ring-brand-primary focus:border-brand-primary ${
                                summaryParams.min_length > summaryParams.max_length || summaryParams.min_length < 0
                                    ? 'border-red-500'
                                    : ''
                            }`}
                            title="Минимальное количество токенов"
                        />
                    </div>
                    <div className="flex flex-col">
                        <label className="text-xs font-medium text-gray-700 mb-1">Макс. токенов</label>
                        <input
                            type="number"
                            min="16"
                            max="2048"
                            value={summaryParams.max_length}
                            onChange={(e) => {
                                const val = parseInt(e.target.value, 10);
                                if (!isNaN(val)) {
                                    setSummaryParams((prev) => ({ ...prev, max_length: val }));
                                }
                            }}
                            className={`w-24 p-2 border rounded-lg focus:ring-brand-primary focus:border-brand-primary ${
                                summaryParams.min_length > summaryParams.max_length || summaryParams.max_length > 2048
                                    ? 'border-red-500'
                                    : ''
                            }`}
                            title="Максимальное количество токенов"
                        />
                    </div>
                </div>
                <button
                    onClick={handleSubmit}
                    className="btn-primary flex items-center justify-center px-6 py-3"
                    disabled={!file || isProcessing || !!validationError}
                >
                    {isProcessing ? (
                        <>
                            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                            {currentStatus === 'queued' ? 'В очереди...' : 'Обработка...'}
                        </>
                    ) : (
                        'Запустить Суммаризацию'
                    )}
                </button>
            </div>

            {/* Индикатор прогресса при обработке */}
            {(summaryMutation.isSuccess || summaryQuery.isFetching) && currentStatus && (
                <div className="mt-6 card p-4 bg-brand-primary/5 border border-brand-primary/20">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center">
                            {currentStatus === 'running' && <Loader2 className="w-5 h-5 mr-3 animate-spin text-brand-primary" />}
                            {currentStatus === 'queued' && <div className="w-5 h-5 mr-3 rounded-full bg-brand-primary/30 animate-pulse" />}
                            {currentStatus === 'done' && <CheckCircle2 className="w-5 h-5 mr-3 text-green-500" />}
                            {currentStatus === 'failed' && <AlertCircle className="w-5 h-5 mr-3 text-red-500" />}

                            <span className="font-medium">
                {currentStatus === 'queued' && 'Задача добавлена в очередь обработки'}
                                {currentStatus === 'running' && 'Нейросеть анализирует текст... Пожалуйста, подождите'}
                                {currentStatus === 'done' && 'Суммаризация успешно завершена'}
                                {currentStatus === 'failed' && 'Ошибка при суммаризации'}
              </span>
                        </div>
                        {summaryId && (
                            <span className="text-xs font-mono bg-ui-neutral/20 px-2 py-1 rounded">
                ID: {summaryId.substring(0, 8)}...
              </span>
                        )}
                    </div>

                    {/* Индикатор загрузки */}
                    {(currentStatus === 'queued' || currentStatus === 'running') && (
                        <div className="mt-3 h-2 bg-ui-neutral/30 rounded-full overflow-hidden">
                            <div
                                className={`h-full rounded-full transition-all duration-500 ${
                                    currentStatus === 'queued'
                                        ? 'bg-brand-primary/50 animate-pulse'
                                        : 'bg-brand-primary animate-[progress-bar_2s_ease-in-out_infinite]'
                                }`}
                                style={{ width: currentStatus === 'queued' ? '25%' : '50%' }}
                            ></div>
                        </div>
                    )}

                    {currentStatus === 'failed' && summaryQuery.data?.error_message && (
                        <div className="mt-3 text-sm text-red-600 p-2 bg-red-50 rounded border border-red-100">
                            {summaryQuery.data.error_message}
                        </div>
                    )}
                </div>
            )}

            {/* Результат */}
            {summaryResult && currentStatus === 'done' && (
                <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Исходный текст (превью) */}
                    <div className="card h-[600px] overflow-hidden flex flex-col">
                        <h4 className="text-xl font-semibold border-b pb-2 mb-4">Исходный текст</h4>
                        <div className="bg-ui-neutral/10 p-4 rounded-lg h-full overflow-auto">
                            <p className="whitespace-pre-wrap text-sm text-gray-700">
                                {uploadMutation.data?.parsed_preview || 'Текст не доступен'}
                            </p>
                        </div>
                    </div>

                    {/* Результат суммаризации */}
                    <div className="card h-[600px] flex flex-col">
                        <h4 className="text-xl font-semibold border-b pb-2 mb-4 text-brand-primary">
                            Результат суммаризации
                        </h4>
                        <div className="bg-brand-primary/5 p-4 rounded-lg h-full overflow-auto flex-grow">
                            <p className="whitespace-pre-wrap text-base font-medium text-text-dark">
                                {summaryResult.summary_text || 'Нет данных.'}
                            </p>
                        </div>

                        <div className="mt-4 border-t pt-3 flex justify-between items-center">
                            <button
                                onClick={() => navigator.clipboard.writeText(summaryResult.summary_text || '')}
                                className="btn-secondary text-sm px-4 py-2"
                            >
                                Копировать в буфер
                            </button>
                            <span className="text-xs text-gray-500">
                (ID: {summaryResult.id})
              </span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default HomePage;