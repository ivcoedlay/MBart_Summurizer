import React, { useState, useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import { UploadCloud, FileText } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import ErrorDisplay from '../components/common/ErrorDisplay';
import { uploadFile, createSummary } from '../api/apiService';
import {
    DocumentCreateResponse,
    SummaryResponse,
    SummaryCreateRequest,
} from '../types/apiTypes';

const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15MB

const HomePage: React.FC = () => {
    const [file, setFile] = useState<File | null>(null);
    const [summaryParams, setSummaryParams] = useState({
        min_length: 50,
        max_length: 500,
    });

    // Мутация для загрузки файла
    const uploadMutation = useMutation<DocumentCreateResponse, Error, File>({
        mutationFn: uploadFile,
    });

    // Мутация для суммаризации
    const summaryMutation = useMutation<SummaryResponse, Error, SummaryCreateRequest>({
        mutationFn: createSummary,
    });

    const onDrop = useCallback((acceptedFiles: File[]) => {
        const acceptedFile = acceptedFiles[0];
        if (acceptedFile && acceptedFile.size > MAX_FILE_SIZE) {
            alert('Файл слишком большой. Максимальный размер: 15 МБ.');
            return;
        }
        setFile(acceptedFile);
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
        if (file && !uploadMutation.isPending && !summaryMutation.isPending) {
            uploadMutation.mutate(file, {
                onSuccess: (docResponse) => {
                    summaryMutation.mutate({
                        document_id: docResponse.id,
                        method: 'mbart_ru_sum_gazeta',
                        min_length: summaryParams.min_length,
                        max_length: summaryParams.max_length,
                    });
                },
            });
        }
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

            {/* Ошибки */}
            {uploadMutation.isError && (
                <div className="mb-4">
                    <ErrorDisplay error={uploadMutation.error} title="Ошибка загрузки файла" />
                </div>
            )}
            {summaryMutation.isError && (
                <div className="mb-4">
                    <ErrorDisplay error={summaryMutation.error} title="Ошибка суммаризации" />
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
            <div className="mt-6 flex justify-between items-center card p-4">
                <div className="flex items-center space-x-4">
                    <label className="font-medium text-text-dark">Параметры длины:</label>
                    <input
                        type="number"
                        min="50"
                        max="1000"
                        value={summaryParams.min_length}
                        onChange={(e) => {
                            const val = parseInt(e.target.value, 10);
                            if (!isNaN(val)) {
                                setSummaryParams((prev) => ({ ...prev, min_length: val }));
                            }
                        }}
                        className="w-20 p-2 border border-ui-neutral rounded-lg focus:ring-brand-primary focus:border-brand-primary"
                        title="Минимальное количество токенов"
                    />
                    <input
                        type="number"
                        min="50"
                        max="1000"
                        value={summaryParams.max_length}
                        onChange={(e) => {
                            const val = parseInt(e.target.value, 10);
                            if (!isNaN(val)) {
                                setSummaryParams((prev) => ({ ...prev, max_length: val }));
                            }
                        }}
                        className="w-20 p-2 border border-ui-neutral rounded-lg focus:ring-brand-primary focus:border-brand-primary"
                        title="Максимальное количество токенов"
                    />
                </div>

                <button
                    onClick={handleSubmit}
                    className="btn-primary flex items-center"
                    disabled={!file || isProcessing}
                >
                    {isProcessing ? 'Обработка...' : 'Запустить Суммаризацию'}
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