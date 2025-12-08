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
    const detail = error.response?.data?.detail || error.message;
    const traceId = error.response?.data?.trace_id;

    return (
        <div className="card bg-red-100 border-status-failed text-status-failed">
            <div className="flex items-start justify-between">
                <div className="flex items-center">
                    <AlertCircle className="w-6 h-6 mr-3" />
                    <h3 className="text-lg font-semibold">{title}</h3>
                </div>
                <button
                    onClick={() => setShowDetails(!showDetails)}
                    className="text-sm font-medium hover:text-red-700 transition"
                >
                    {showDetails ? 'Скрыть детали' : 'Показать детали'}
                    {showDetails ? <ChevronUp className="w-4 h-4 inline ml-1" /> : <ChevronDown className="w-4 h-4 inline ml-1" />}
                </button>
            </div>

            <p className="mt-2 text-sm">
                {status && <span className="font-bold mr-1">[{status}]</span>}
                {detail}
            </p>

            {traceId && (
                <p className="mt-1 text-xs text-red-600/80">
                    ID Трассировки: {traceId} (Передайте его разработчику)
                </p>
            )}

            {/* Подробности для разработчика */}
            {showDetails && (
                <pre className="mt-4 p-3 bg-red-50 border border-status-failed/50 rounded-lg text-xs overflow-auto">
          {error.request_details && (
              <>
                  <strong>Запрос:</strong> {error.request_details.method} {error.request_details.url}<br/>
                  {error.request_details.data && <><strong>Тело запроса:</strong> {JSON.stringify(error.request_details.data, null, 2)}<br/></>}
              </>
          )}

                    {error.response?.data && (
                        <>
                            <strong>Ответ API:</strong> {JSON.stringify(error.response.data, null, 2)}
                        </>
                    )}
        </pre>
            )}
        </div>
    );
};

export default ErrorDisplay;