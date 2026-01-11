// frontend/src/api/apiClient.ts
import axios, { AxiosInstance, AxiosError } from 'axios';
import { ErrorResponse, CustomError } from '../types/apiTypes';

// Vite автоматически подхватит типы из vite-env.d.ts
const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

const apiClient: AxiosInstance = axios.create({
    baseURL: BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
    timeout: 5000,
});

/**
 * Утилита для форматирования ошибок FastAPI в читаемый вид
 */
const formatFastAPIError = (errorDetail: any): string => {
    if (Array.isArray(errorDetail)) {
        return errorDetail.map(err =>
            `${err.loc?.join('.') || 'field'}: ${err.msg}`
        ).join(', ');
    }
    return typeof errorDetail === 'string' ? errorDetail : JSON.stringify(errorDetail);
};

/**
 * Функция для стандартизированной обработки ошибок и логирования.
 * Повышает удобство разработки и отладки.
 */
const handleError = (error: AxiosError<ErrorResponse>): CustomError => {
    const customError: CustomError = new Error(error.message);

    // 1. Копируем детали ответа, если они есть
    if (error.response) {
        customError.response = {
            status: error.response.status,
            data: error.response.data,
        };

        // Обработка ошибок валидации FastAPI (422)
        let detailMessage = '';
        if (error.response.status === 422 && error.response.data.detail) {
            detailMessage = formatFastAPIError(error.response.data.detail);
        } else if (error.response.data.detail) {
            detailMessage = error.response.data.detail;
        }

        // 2. Логгируем детали ошибки в консоль
        console.error(`--- API Error (${error.response.status}) ---`);
        console.error('Endpoint:', error.config?.url);
        console.error('Метод:', error.config?.method?.toUpperCase());
        console.error('Детали ошибки:', detailMessage || 'Нет деталей');
        if (error.response.data.trace_id) {
            console.error('Trace ID:', error.response.data.trace_id);
        }

        // Устанавливаем понятное сообщение об ошибке
        customError.message = detailMessage || error.response.data.detail || 'Ошибка сервера';
    } else if (error.request) {
        // 3. Логгируем ошибки, связанные с запросом (например, таймаут или нет ответа)
        console.error('--- API Error (Request Failed) ---');
        console.error('Запрос отправлен, но ответ не получен (сервер недоступен или таймаут).');
        console.error('URL:', error.config?.url);
        customError.message = "Сервер недоступен или превышен таймаут.";
    } else {
        // 4. Логгируем ошибки, связанные с настройкой запроса
        console.error('--- API Error (Client Setup) ---', error.message);
    }

    // 5. Добавляем подробности запроса в объект ошибки
    customError.request_details = {
        method: error.config?.method?.toUpperCase() || 'UNKNOWN',
        url: error.config?.url || 'UNKNOWN',
        data: error.config?.data ? JSON.parse(JSON.stringify(error.config.data)) : null,
    };

    return customError;
};

// Добавляем интерцептор для обработки ошибок
apiClient.interceptors.response.use(
    (response) => response,
    (error: AxiosError<ErrorResponse>) => {
        return Promise.reject(handleError(error));
    }
);

export default apiClient;