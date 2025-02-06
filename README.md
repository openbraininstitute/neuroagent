# Neuroagent

LLM agent made to communicate with different neuroscience related tools. It allows to communicate in a ChatGPT like fashion to get information about brain regions, morphologies, electric traces and the scientific literature.


1. [Release workflow](#release-workflow)
2. [Funding and Acknowledgement](#funding-and-acknowledgement)



## Running (docker compose)
The simplest way to run the project is using docker compose. You will need to have docker and docker compose installed.

```bash
$ docker compose up
$ docker exec -it neuroagent-backend-1 alembic -x url=postgresql://postgres:pwd@postgres:5432/neuroagent upgrade head

```

Note that the first time you run the `docker compose up` command, it will take a while since it will have to build 2 images - `backend` and `frontend`. The next time you run it, it will be much faster.
You can run `docker compose build frontend` or `docker compose build backend` to build the images separately (useful when you made modifications)


The second command will run the alembic migrations to create the database tables. Note that the you will only need to run this command once, the changes will be persisted inside the `neuroagent_postgres_data` volume. You can run `docker volume ls` to see the volumes created by docker compose and `docker volume rm neuroagent_postgres_data` to remove the volume and start from scratch.


## Funding and Acknowledgement

The development of this software was supported by funding to the Blue Brain Project, a research center of the École polytechnique fédérale de Lausanne (EPFL), from the Swiss government’s ETH Board of the Swiss Federal Institutes of Technology.

Copyright &copy; 2024 Blue Brain Project/EPFL<br>
Copyright &copy; 2025 Open Brain Institute
