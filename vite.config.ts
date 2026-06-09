import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  // GitHub Pages 프로젝트 사이트는 /<repo>/ 하위에서 제공됨. dev는 루트 유지.
  base: command === "build" ? "/feature-platform-ui/" : "/",
  plugins: [react()],
  server: { port: 9001 }, // 전역 규칙: 포트 8000 금지, 개발 서버 9001
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
  },
}));
