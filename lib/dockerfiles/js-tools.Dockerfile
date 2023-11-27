FROM node:20.10.0-alpine3.18

RUN npm install -g prettier@3.0.3
RUN npm install -g ajv-cli@5.0.0
RUN npm install -g markdownlint-cli@0.37.0

WORKDIR /workdir