FROM rust:1.91-trixie

WORKDIR /workdir

RUN rustup component add clippy
RUN rustup component add rustfmt