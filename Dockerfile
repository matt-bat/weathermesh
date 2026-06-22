FROM node:24-alpine

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY data ./data
COPY public ./public
COPY src ./src

EXPOSE 3000

CMD ["npm", "start"]

