# Running locally


```bash
$ pip install -e .
```

Make sure to define `.env`  - check `.env.example` to see what is required.

Also, you will need to have a database running. Either sqlite or postgres. See below for instructions on how to set up sqlite.

```bash
$ touch sqlite.db
$ alembic -x url=sqlite:///sqlite.db upgrade head
```

```bash
$ neuroagent-api
```
