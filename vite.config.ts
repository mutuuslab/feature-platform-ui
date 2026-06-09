import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  // GitHub Pages 프로젝트 사이트는 /<repo>/ 하위에서 제공됨. dev는 루트 유지.
  base: command === "build" ? "/feature-platform-ui/" : "/",
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 1300,
    rollupOptions: {
      output: {
        // 벤더를 캐시 친화적 청크로 분리 (recharts는 차트 페이지 진입 시에만 로드)
        manualChunks(id: string) {
          if (!id.includes("node_modules")) return undefined;
          if (id.includes("recharts") || id.includes("/d3-") || id.includes("victory")) return "charts";
          if (id.includes("@ant-design") || id.includes("/antd/") || id.includes("/rc-")) return "antd";
          if (id.includes("@refinedev")) return "refine";
          if (id.includes("react-router") || id.includes("/react-dom/") || id.includes("/react/") || id.includes("/scheduler/")) return "react";
          return "vendor";
        },
      },
    },
  },
  server: { port: 9001 }, // 전역 규칙: 포트 8000 금지, 개발 서버 9001
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
  },
}));
