FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install
COPY prisma ./prisma/
RUN npx prisma generate

COPY . .

COPY docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh

RUN npm run build || npx tsc

EXPOSE 3000

ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["npm", "start"]
