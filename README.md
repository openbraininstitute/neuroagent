# Neuroagent

LLM agent made to communicate with different neuroscience related tools. It allows to communicate in a ChatGPT like fashion to get information about brain regions, morphologies, electric traces and the scientific literature.


1. [Release workflow](#release-workflow)
2. [Funding and Acknowledgement](#funding-and-acknowledgement)



## Running (docker compose)


```bash
$ docker compose up
$ docker exec -it neuroagent-backend-1 alembic -x url=postgresql://postgres:pwd@postgres:5432/neuroagent upgrade head

```

Note that the first time you run the docker compose command, it will take a while since it will have to build 2 images - `backend` and `frontend`. The next time you run it, it will be much faster.
You can run `docker compose build frontend` or `docker compose build backend` to build the images separately (useful when you made modifications)


## Release workflow

Commits with a special prefix will be added to the CHANGELOG of the latest release PR.
The main prefixes can be found here:
https://www.conventionalcommits.org/en/v1.0.0/#summary

When a PR is merged into the main branch, a new release PR will be created if there is no open one. Otherwise all changes
from the merged branch will be added to the latest existing release PR.

The workflow is:
1. When merging a PR, change the squashed commit message to one that contains one of the above prefixes. This will trigger the creation of a release PR if there isnt one. The commit message will be automatically added to the changelog.
2. When the release PR is merged, a new release tag will be automatically created on github.


## Funding and Acknowledgement

The development of this software was supported by funding to the Blue Brain Project, a research center of the École polytechnique fédérale de Lausanne (EPFL), from the Swiss government’s ETH Board of the Swiss Federal Institutes of Technology.

Copyright &copy; 2024 Blue Brain Project/EPFL<br>
Copyright &copy; 2025 Open Brain Institute
