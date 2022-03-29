#! /bin/bash

set -e

docker-compose build --no-cache
sleep 5
heroku container:push web -a moar-munz
sleep 5
heroku container:release web -a moar-munz
