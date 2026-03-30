import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";

const backend_uri = import.meta.env.VITE_BACKEND_URI as string;

export const apiClient = axios.create({
  baseURL: backend_uri,
  withCredentials: true,
});

let isRefreshing = false;

type QueueItem = {
  resolve: () => void;
  reject: (error: unknown) => void;
};

let failedQueue: QueueItem[] = [];

function processQueue(error: unknown | null): void {
  failedQueue.forEach((item) => {
    if (error) {
      item.reject(error);
    } else {
      item.resolve();
    }
  });
  failedQueue = [];
}

apiClient.interceptors.response.use(
  (response) => response,

  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    const url = originalRequest?.url ?? "";
    const isRefreshEndpoint = url === "/auth/refresh";
    const isLoginEndpoint = url.startsWith("/auth/githubLogin");

    if (
      error.response?.status !== 401 ||
      originalRequest?._retry ||
      isRefreshEndpoint ||
      isLoginEndpoint
    ) {
      return Promise.reject(error);
    }

    if (isRefreshing) {
      originalRequest._retry = true;
      return new Promise<unknown>((resolve, reject) => {
        failedQueue.push({
          resolve: () => resolve(apiClient(originalRequest)),
          reject: (err) => reject(err),
        });
      });
    }

    originalRequest._retry = true;
    isRefreshing = true;

    try {
      await apiClient.post("/auth/refresh");

      processQueue(null);

      return apiClient(originalRequest);
    } catch (refreshError) {
      processQueue(refreshError);
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  }
);
