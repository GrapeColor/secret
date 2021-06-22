FROM node:16

WORKDIR /app/secret

COPY package*.json ./
RUN [ "npm", "ci", "--production", "--ignore-scripts" ]

COPY . .

CMD [ "node", "dist/index.js" ]
