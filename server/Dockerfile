# Feature Platform 백엔드 — vast.ai 등 컨테이너 호스팅용.
# 키는 이미지에 넣지 않습니다. 실행 시 환경변수로 주입:
#   docker run -e ANTHROPIC_API_KEY=sk-ant-... -e ALLOWED_ORIGIN=https://mutuuslab.github.io -p 9100:9100 <image>
FROM node:20-slim
WORKDIR /app

# 의존성 먼저 설치 (레이어 캐시)
COPY package.json package-lock.json* ./
RUN npm install

# 소스 (.dockerignore 가 .env / node_modules 제외)
COPY . .

ENV PORT=9100
EXPOSE 9100
CMD ["npm", "run", "start"]
