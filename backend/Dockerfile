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

# Create package.json and install pyodide locally
WORKDIR /code
RUN echo '{ "type": "module" }' > package.json
RUN npm install pyodide
RUN cp -r node_modules /node_modules
RUN mv setup_pyodide.js /setup_pyodide.js && mv package.json /package.json
WORKDIR /
RUN chmod +x /docker-entrypoint.sh
RUN chmod +x /setup_pyodide.js
RUN rm -rf /code


EXPOSE 8078
ENTRYPOINT ["./docker-entrypoint.sh"]
