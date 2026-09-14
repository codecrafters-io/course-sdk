FROM rust:1.98-trixie

WORKDIR /workdir

RUN rustup component add clippy
RUN rustup component add rustfmt
