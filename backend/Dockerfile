FROM python:3.11

ENV PYTHONUNBUFFERED=1

RUN apt-get -y update
RUN apt-get -y install curl \
    build-essential \
    libhdf5-dev \
    libboost-all-dev \
    ninja-build \
    nodejs \
    npm \
    wget \
    && rm -rf /var/lib/apt/lists/* \
    && TARGETARCH=$(dpkg --print-architecture) \
    && if [ "$TARGETARCH" = "arm64" ] || [ "$TARGETARCH" = "aarch64" ]; then \
        wget https://github.com/Kitware/CMake/archive/refs/tags/v4.0.1.tar.gz -O cmake.tar.gz \
        && tar xzf cmake.tar.gz \
        && cd CMake-4.0.1 \
        && ./bootstrap --parallel=$(nproc) \
        && make -j$(nproc) \
        && make install \
        && cd .. \
        && rm -rf CMake-4.0.1 cmake.tar.gz; \
    else \
        apt-get update && apt-get install -y cmake && rm -rf /var/lib/apt/lists/*; \
    fi

ENV CMAKE=/usr/local/bin/cmake
ENV CMAKE_POLICY_VERSION_MINIMUM=3.5
RUN which cmake && cmake --version

RUN npm install -g deno@">=2.5.0"
RUN pip install --no-cache-dir --upgrade pip
COPY ./ /code
RUN pip install --no-cache-dir /code[api]

RUN mv /code/alembic /alembic
RUN mv /code/alembic.ini /alembic.ini
RUN mv /code/docker-entrypoint.sh /docker-entrypoint.sh

RUN chmod +x /docker-entrypoint.sh
RUN rm -rf /code

WORKDIR /

# Download manual wheels
RUN mkdir cached_wheels && \
    pip download --only-binary=:all: --no-deps -d ./cached_wheels plotly

EXPOSE 8078
ENTRYPOINT ["./docker-entrypoint.sh"]
