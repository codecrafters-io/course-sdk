FROM rust:1.95-trixie

WORKDIR /workdir

RUN rustup component add clippy
RUN rustup component add rustfmt