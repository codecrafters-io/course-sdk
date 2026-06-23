FROM rust:1.96-trixie

WORKDIR /workdir

RUN rustup component add clippy
RUN rustup component add rustfmt