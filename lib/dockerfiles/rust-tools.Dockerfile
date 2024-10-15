FROM rust:1.80-bookworm

WORKDIR /workdir

RUN rustup component add clippy
RUN rustup component add rustfmt