// frontend/src/types/apiTypes.ts

export type SummaryStatus = 'queued' | 'running' | 'done' | 'failed';

// --- Общие схемы ---

/** Стандартизированный ответ при ошибке от FastAPI */
export interface ErrorResponse {
  /** Код статуса HTTP, например 404, 422 */
  status_code: number;
  /** Краткое описание ошибки */
  detail: string;
  /** Временная метка ошибки */
  timestamp: string;
  /** Поле для логирования: может содержать трассировку или детали */
  trace_id?: string;
}

/** Расширенный объект ошибки, который мы будем использовать на фронтенде */
export interface CustomError extends Error {
  response?: {
    status: number;
    data: ErrorResponse;
  };
  /** Для удобного логирования */
  request_details?: {
    method: string;
    url: string;
    data: any;
  };
}

// --- Документы (History) ---

export interface DocumentListItem {
  id: string;
  filename: string;
  size_bytes: number;
  uploaded_at: string; // ISO 8601 datetime string
  parsed: boolean;
}

export interface DocumentListResponse {
  total: number;
  limit: number;
  offset: number;
  items: DocumentListItem[];
}

export interface DocumentDetailResponse extends DocumentListItem {
  mime_type: string;
  parsed_text: string | null;
  storage_ref: string;
}

// --- Суммаризация (Summaries) ---

export interface SummaryCreateRequest {
  document_id: string;
  method: 'mbart_ru_sum_gazeta'; // или другой метод
  min_length: number;
  max_length: number;
}

export interface SummaryResponse {
  id: string;
  document_id: string | null;
  method: string;
  params: { [key: string]: any };
  summary_text: string | null;
  created_at: string;
  status: SummaryStatus;
  /** Поле, добавленное для failed статуса */
  error_message?: string;
}

// --- Загрузка ---

export interface DocumentCreateResponse {
  id: string;
  filename: string;
  message: string;
}