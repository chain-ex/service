FROM node:12

WORKDIR /usr/src/app

COPY package*.json ./
COPY yarn.lock

 ./

RUN yarn install --production

COPY . .

ENV NODE_ENV=production

EXPOSE 6500
CMD [ "yarn", "start" ]
