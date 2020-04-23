FROM node:slim

COPY . /repo
WORKDIR /repo

RUN npm i @angular/cli -g && \
    npm i && \
    ng build api --prod && \
    ng build moar-munz --prod && \
    mv dist /app && \
    mv package.json /app/.

WORKDIR /app

RUN npm i --only=prod && \
    rm -rf /repo && \
    npm uninstall @angular/cli -g && \
    npm cache clean -f

ENTRYPOINT [ "node", "apps/api/main.js" ]