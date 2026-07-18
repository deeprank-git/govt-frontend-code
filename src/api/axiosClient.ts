import axios from "axios";
import { clearAuth, getRefreshToken, getToken, setTokens } from "@/lib/auth-store";

declare module "axios" {
  export interface InternalAxiosRequestConfig {
    _retry?: boolean;
    _hadToken?: boolean;
  }
}

const axiosClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
});

axiosClient.interceptors.request.use((config) => {
  const token = getToken();
  config._hadToken = !!token;
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// De-duplicated so concurrent 401s trigger exactly one /auth/refresh call —
// the backend rotates the refresh token on each use, so racing calls with
// the same stored token would otherwise break each other.
let refreshPromise: Promise<string | null> | null = null;

function performRefresh(): Promise<string | null> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return Promise.resolve(null);
  if (!refreshPromise) {
    refreshPromise = axios
      .post(`${import.meta.env.VITE_API_BASE_URL}/auth/refresh`, { refreshToken })
      .then((res) => {
        const { token, refreshToken: newRefreshToken } = res.data ?? {};
        if (token && newRefreshToken) {
          setTokens(token, newRefreshToken);
          return token;
        }
        return null;
      })
      .catch(() => null)
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

axiosClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config;

    if (error.response?.status === 401 && config && !config._retry) {
      config._retry = true;
      const newToken = await performRefresh();
      if (newToken) {
        return axiosClient(config);
      }
    }

    // Only force a redirect if this request actually had a session to begin
    // with — a 401 on a request that never had a token just means "this
    // endpoint needs login," not "your session expired," and shouldn't
    // bounce an anonymous visitor off a public page.
    if (error.response?.status === 401 && config?._hadToken) {
      clearAuth();
      if (typeof window !== "undefined" && !window.location.pathname.startsWith("/auth")) {
        window.location.assign("/auth?mode=login");
      }
    }

    return Promise.reject(error);
  },
);

export default axiosClient;
