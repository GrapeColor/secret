FROM node:16

WORKDIR /app/secret

COPY package*.json ./
RUN [ "npm", "ci" ]

COPY . .

CMD [ "node", "dist/index.js" ]
