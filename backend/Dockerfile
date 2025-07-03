FROM python:3.11

ENV PYTHONUNBUFFERED=1

RUN apt-get -y update
RUN apt-get -y install curl \
    build-essential \
    libhdf5-dev \
    ninja-build \
    nodejs \
    npm

RUN npm install -g deno
RUN pip install --no-cache-dir --upgrade pip
COPY ./ /code
RUN pip install --no-cache-dir /code[api]

RUN mv /code/alembic /alembic
RUN mv /code/alembic.ini /alembic.ini
RUN mv /code/docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh
RUN rm -rf /code

WORKDIR /

EXPOSE 8078
ENTRYPOINT ["./docker-entrypoint.sh"]
