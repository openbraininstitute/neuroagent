FROM python:3.11

ENV PYTHONUNBUFFERED=1

RUN apt-get -y update && \
    apt-get -y install \
    curl \
    build-essential \
    libhdf5-dev \
    ninja-build \
    wget \
    && rm -rf /var/lib/apt/lists/* \
    && wget https://github.com/Kitware/CMake/archive/refs/tags/v4.0.1.tar.gz -O cmake.tar.gz \
    && tar xzf cmake.tar.gz \
    && cd CMake-4.0.1 \
    && ./bootstrap --parallel=$(nproc) \
    && make -j$(nproc) \
    && make install \
    && cd .. \
    && rm -rf CMake-4.0.1 cmake.tar.gz

ENV CMAKE=/usr/local/bin/cmake
ENV CMAKE_POLICY_VERSION_MINIMUM=3.5
RUN which cmake && cmake --version

RUN pip install --no-cache-dir --upgrade pip
COPY ./ /code
RUN pip install --no-cache-dir /code[api]

RUN mv /code/alembic /alembic
RUN mv /code/alembic.ini /alembic.ini
RUN rm -rf /code

WORKDIR /

EXPOSE 8078
CMD ["neuroagent-api", "--host", "0.0.0.0", "--port", "8078"]
