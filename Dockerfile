FROM node:18-alpine

WORKDIR /app

COPY package.json .
RUN npm install && apk add --no-cache netcat-openbsd bash

COPY . .

EXPOSE 5555

CMD ["npm", "start"]
