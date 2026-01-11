// frontend/src/components/common/ErrorDisplay.tsx
import React, { useState } from 'react';
import { CustomError } from '../../types/apiTypes';
import { AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';

interface ErrorDisplayProps {
    error: CustomError;
    title?: string;
}

const ErrorDisplay: React.FC<ErrorDisplayProps> = ({ error, title = 'Произошла ошибка' }) => {
    const [showDetails, setShowDetails] = useState(false);

    // Извлекаем основные детали
    const status = error.response?.status;
    let detail = error.message || 'Неизвестная ошибка';

    if (error.response?.data) {
        // Обработка ошибок FastAPI
        if (Array.isArray(error.response.data.detail)) {
            detail = error.response.data.detail.map(err =>
                `${err.loc?.join('.') || 'field'}: ${err.msg}`
            ).join(', ');
        } else if (typeof error.response.data.detail === 'string') {
            detail = error.response.data.detail;
        }
    }

    const traceId = error.response?.data?.trace_id;

    return (
        <div className="card bg-red-50 border border-red-200 text-red-800">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                <div className="flex items-start">
                    <AlertCircle className="w-6 h-6 mr-3 mt-0.5 flex-shrink-0" />
                    <div>
                        <h3 className="text-lg font-semibold">{title}</h3>
                        <p className="mt-1 text-sm break-words">
                            {status && <span className="font-medium mr-1">[{status}]</span>}
                            {detail}
                        </p>
                        {traceId && (
                            <p className="mt-1 text-xs text-red-600/80">
                                ID Отслеживания: {traceId}
                            </p>
                        )}
                    </div>
                </div>
                <button
                    onClick={() => setShowDetails(!showDetails)}
                    className="text-sm font-medium text-red-700 hover:text-red-900 transition self-start sm:self-center"
                >
                    {showDetails ? 'Скрыть детали' : 'Показать детали'}
                    {showDetails ? (
                        <ChevronUp className="w-4 h-4 inline ml-1" />
                    ) : (
                        <ChevronDown className="w-4 h-4 inline ml-1" />
                    )}
                </button>
            </div>

            {/* Подробности для разработчика */}
            {showDetails && (
                <div className="mt-3 pt-3 border-t border-red-200/50">
                    <div className="text-xs bg-red-50/50 rounded-lg p-3 overflow-x-auto">
                        <div className="font-medium mb-1">Детали запроса:</div>
                        {error.request_details && (
                            <>
                                <div>
                                    <span className="font-medium">Метод:</span> {error.request_details.method}
                                </div>
                                <div>
                                    <span className="font-medium">URL:</span> {error.request_details.url}
                                </div>
                                {error.request_details.data && (
                                    <div>
                                        <span className="font-medium">Тело запроса:</span>
                                        <pre className="mt-1 p-2 bg-red-100 rounded text-[11px] overflow-auto max-h-40">
                      {JSON.stringify(error.request_details.data, null, 2)}
                    </pre>
                                    </div>
                                )}
                            </>
                        )}

                        {error.response?.data && (
                            <>
                                <div className="mt-2 font-medium">Ответ сервера:</div>
                                <pre className="mt-1 p-2 bg-red-100 rounded text-[11px] overflow-auto max-h-40">
                  {JSON.stringify(error.response.data, null, 2)}
                </pre>
                            </>
                        )}

                        {error.stack && (
                            <>
                                <div className="mt-2 font-medium">Стек вызовов:</div>
                                <pre className="mt-1 p-2 bg-red-100 rounded text-[11px] overflow-auto max-h-40">
                  {error.stack}
                </pre>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default ErrorDisplay;