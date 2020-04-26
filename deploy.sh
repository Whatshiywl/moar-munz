#! /bin/bash

set -e

docker build -t moar-munz:latest .
sleep 5
heroku container:push web -a moar-munz
sleep 5
heroku container:release web -a moar-munz
