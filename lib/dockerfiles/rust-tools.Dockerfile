FROM rust:1.93-trixie

WORKDIR /workdir

RUN rustup component add clippy
RUN rustup component add rustfmt