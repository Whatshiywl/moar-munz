FROM node:slim

WORKDIR /app
COPY package.json .
RUN npm i --only=prod

WORKDIR /repo
COPY package.json .
RUN npm i

COPY . .
RUN echo build api && \
    NODE_OPTIONS="--max-old-space-size=4096" node ./node_modules/.bin/ng build api --prod && \
    echo build moar-munz && \
    NODE_OPTIONS="--max-old-space-size=4096" node ./node_modules/.bin/ng build moar-munz --prod && \
    mv dist /app && \
    mv package.json /app/.

WORKDIR /app
RUN rm -rf /repo && \
    npm cache clean -f

ENTRYPOINT [ "node", "apps/api/main.js" ]