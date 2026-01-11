// frontend/src/pages/HomePage.tsx
import React, { useState, useCallback, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { UploadCloud, FileText, AlertCircle, Loader2 } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import ErrorDisplay from '../components/common/ErrorDisplay';
import { uploadFile, createSummary } from '../api/apiService';
import {
    DocumentCreateResponse,
    SummaryResponse,
    SummaryCreateRequest,
    CustomError,
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

    // Мутация для загрузки файла
    const uploadMutation = useMutation<DocumentCreateResponse, Error, File>({
        mutationFn: uploadFile,
    });

    // Мутация для суммаризации
    const summaryMutation = useMutation<SummaryResponse, Error, SummaryCreateRequest>({
        mutationFn: createSummary,
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
        (uploadMutation.isSuccess && !summaryMutation.isSuccess && !summaryMutation.isError);

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
                        title="Ошибка суммаризации"
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
                            Обработка...
                        </>
                    ) : (
                        'Запустить Суммаризацию'
                    )}
                </button>
            </div>

            {/* Результат */}
            {summaryMutation.isSuccess && summaryMutation.data && (
                <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Исходный текст (превью) */}
                    <div className="card h-[600px] overflow-hidden flex flex-col">
                        <h4 className="text-xl font-semibold border-b pb-2 mb-4">Исходный текст</h4>
                        <p className="whitespace-pre-wrap overflow-auto text-sm text-gray-700 flex-grow p-1">
                            {uploadMutation.data?.parsed_preview || 'Текст не доступен'}
                        </p>
                    </div>

                    {/* Результат суммаризации */}
                    <div className="card h-[600px] flex flex-col">
                        <h4 className="text-xl font-semibold border-b pb-2 mb-4 text-brand-primary">
                            Результат суммаризации
                        </h4>
                        <p className="whitespace-pre-wrap overflow-auto text-base font-medium flex-grow p-1">
                            {summaryMutation.data.summary_text || 'Нет данных.'}
                        </p>
                        <div className="mt-4 border-t pt-3">
                            <button
                                onClick={() =>
                                    navigator.clipboard.writeText(summaryMutation.data.summary_text || '')
                                }
                                className="btn-secondary text-sm"
                            >
                                Копировать в буфер
                            </button>
                            <span className="text-xs text-gray-500 ml-4">(ID: {summaryMutation.data.id})</span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default HomePage;