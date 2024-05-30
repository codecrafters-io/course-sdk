FROM rust:1.70-buster

WORKDIR /workdir

RUN rustup component add rustfmt