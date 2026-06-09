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
  },
}));
