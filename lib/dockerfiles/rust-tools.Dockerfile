FROM rust:1.92-trixie

WORKDIR /workdir

RUN rustup component add clippy
RUN rustup component add rustfmt