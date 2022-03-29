FROM node:16-slim

WORKDIR /app
COPY package.json .
COPY package-lock.json .
RUN npm i --only=prod --legacy-peer-deps

WORKDIR /repo
COPY package.json .
COPY package-lock.json .
RUN npm i --legacy-peer-deps

COPY . .
RUN echo build api && \
    NODE_OPTIONS="--max-old-space-size=4096" node ./node_modules/.bin/ng build api --configuration production && \
    echo build moar-munz && \
    NODE_OPTIONS="--max-old-space-size=4096" node ./node_modules/.bin/ng build moar-munz --configuration production && \
    mv dist /app && \
    mv package.json /app/.

WORKDIR /app
RUN rm -rf /repo && \
    npm cache clean -f

ENTRYPOINT [ "node", "dist/apps/api/main.js" ]
