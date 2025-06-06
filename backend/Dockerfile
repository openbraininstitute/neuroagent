FROM python:3.11

ENV PYTHONUNBUFFERED=1

RUN apt-get -y update
RUN apt-get -y install curl \
    build-essential \
    libhdf5-dev \
    ninja-build

RUN pip install --no-cache-dir --upgrade pip
COPY ./ /code
RUN pip install --no-cache-dir /code[api]

RUN mv /code/alembic /alembic
RUN mv /code/alembic.ini /alembic.ini
RUN rm -rf /code

WORKDIR /

EXPOSE 8078
CMD ["neuroagent-api", "--host", "0.0.0.0", "--port", "8078"]
