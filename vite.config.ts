import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  // GitHub Pages 프로젝트 사이트는 /<repo>/ 하위에서 제공됨. dev는 루트 유지.
  base: command === "build" ? "/feature-platform-ui/" : "/",
  plugins: [react()],
  build: {
    // 라우트 단위 React.lazy 코드 스플리팅만 사용 (recharts는 lazy 페이지에서만 import → 자동 지연 로드).
    // 수동 벤더 manualChunks는 antd/rc-*/react 순환 의존성 초기화 순서를 깨뜨려 제거함.
    chunkSizeWarningLimit: 1700,
  },
  server: { port: 9001 }, // 전역 규칙: 포트 8000 금지, 개발 서버 9001
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    // 테스트는 항상 Mock 경로로 — 개발자 .env.local 의 VITE_API_URL 이 USE_BACKEND 를 켜지 않도록 무력화.
    env: { VITE_API_URL: "" },
  },
}));
