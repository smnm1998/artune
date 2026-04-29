import { API_BASE_URL, REQUEST_TIMEOUT } from '@/constants/api';
import { ERROR_MESSAGES } from '@/constants/errorMessages';

/**
 * API 에러 클래스
 */
export class ApiError extends Error {
  status: number;
  originalError?: unknown;

  constructor(message: string, status: number, originalError?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.originalError = originalError;
  }
}

/**
 * HTTP 요청 수행 함수
 *
 * @param {string} endpoint - API 엔드포인트 경로
 * @param {Object} options - fetch 옵션
 * @param {Promise<any>} API 응답 데이터
 * @throws {ApiError} API 요청 실패 시
 */
async function request<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    // HTTP Error 처리
    if (!response.ok) {
      const errorMessages =
        response.status >= 500
          ? ERROR_MESSAGES.SERVER_ERROR
          : ERROR_MESSAGES.CLIENT_ERROR;

      throw new ApiError(errorMessages, response.status);
    }

    // 응답 데이터 생성
    const data = (await response.json()) as T;
    return data;
  } catch (error) {
    clearTimeout(timeoutId);

    // 타임아웃 에러
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new ApiError(ERROR_MESSAGES.TIMEOUT_ERROR, 408, error);
    }

    // ApiError
    if (error instanceof ApiError) {
      throw error;
    }

    // etc.
    throw new ApiError(ERROR_MESSAGES.UNKNOWN_ERROR, 0, error);
  }
}

/**
 * GET 요청
 */
export const get = <T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> => {
  return request<T>(endpoint, { ...options, method: 'GET' });
};

/**
 * POST 요청
 */
export const post = <T>(
  endpoint: string,
  data: unknown,
  options: RequestInit = {},
): Promise<T> => {
  return request(endpoint, {
    ...options,
    method: 'POST',
    body: JSON.stringify(data),
  });
};
