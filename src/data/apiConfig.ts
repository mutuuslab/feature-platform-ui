// 백엔드 연결 설정. VITE_API_URL 이 설정되면 실서버(REST)에 연결, 아니면 인메모리 Mock.
// 예: .env.local 에  VITE_API_URL=http://localhost:9100
export const API_URL: string | undefined = import.meta.env.VITE_API_URL || undefined;
export const USE_BACKEND = Boolean(API_URL);
