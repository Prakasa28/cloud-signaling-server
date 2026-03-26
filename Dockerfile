FROM node:18-alpine

WORKDIR /app

COPY package.json ./
RUN npm install

COPY signaling.js ./

EXPOSE 8080

CMD ["npm", "start"]