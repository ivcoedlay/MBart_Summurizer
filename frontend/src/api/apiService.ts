// frontend/src/api/apiService.ts
import apiClient from './apiClient';
import {
  DocumentCreateResponse,
  DocumentListResponse,
  DocumentDetailResponse,
  SummaryCreateRequest,
  SummaryResponse,
} from '../types/apiTypes';

// --- Document API ---
/**
 * Загрузка нового файла для обработки.
 * @param file - Объект File для отправки.
 */
export const uploadFile = async (file: File): Promise<DocumentCreateResponse> => {
  const formData = new FormData();
  formData.append('file', file);
  const response = await apiClient.post<DocumentCreateResponse>('/documents/', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    // Увеличенный таймаут для загрузки больших файлов
    timeout: 10000
  });
  return response.data;
};

/**
 * Получение списка документов (История).
 * @param limit - Количество элементов на странице.
 * @param offset - Смещение.
 */
export const getDocumentHistory = async (limit: number = 10, offset: number = 0): Promise<DocumentListResponse> => {
  const response = await apiClient.get<DocumentListResponse>('/documents/', {
    params: { limit, offset },
  });
  return response.data;
};

/**
 * Получение деталей конкретного документа, включая распарсенный текст.
 * @param id - ID документа.
 */
export const getDocumentDetails = async (id: string): Promise<DocumentDetailResponse> => {
  const response = await apiClient.get<DocumentDetailResponse>(`/documents/${id}`);
  return response.data;
};

// --- Summary API ---
/**
 * Запуск фоновой суммаризации документа.
 * @param data - Параметры суммаризации.
 */
export const createSummary = async (data: SummaryCreateRequest): Promise<SummaryResponse> => {
  // Валидация параметров перед отправкой
  if (data.min_length && data.max_length && data.min_length > data.max_length) {
    throw new Error('Минимальная длина не может быть больше максимальной');
  }

  // Приведение параметров к допустимым значениям
  const validatedData = {
    ...data,
    min_length: data.min_length ? Math.max(0, Math.min(1024, data.min_length)) : undefined,
    max_length: data.max_length ? Math.max(16, Math.min(2048, data.max_length)) : undefined,
    method: data.method || 'mbart_ru_sum_gazeta'
  };

  const response = await apiClient.post<SummaryResponse>('/summaries/', validatedData);
  return response.data;
};

/**
 * Проверка статуса и получение результата суммаризации.
 * @param id - ID записи суммаризации.
 */
export const getSummaryStatus = async (id: string): Promise<SummaryResponse> => {
  const response = await apiClient.get<SummaryResponse>(`/summaries/${id}`);
  return response.data;
};

/**
 * Получает последнюю суммаризацию по ID документа.
 * @param documentId - ID документа.
 */
export const getSummaryByDocumentId = async (documentId: string): Promise<SummaryResponse> => {
  const response = await apiClient.get<SummaryResponse>(`/summaries/by-document/${documentId}`);
  return response.data;
};