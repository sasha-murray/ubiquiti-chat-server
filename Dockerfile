FROM node:13

WORKDIR /app

COPY package.json ./

RUN yarn

COPY . .

EXPOSE 80

CMD [ "yarn", "start"]