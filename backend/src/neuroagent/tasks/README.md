# Implementing a Tool that Triggers a Celery Task

This guide describes the minimal way to implement a tool that triggers a Celery task.

## Overview

The pattern consists of:
1. **Defining schemas** in `task_schemas.py` (shared between app and tasks)
2. **Creating the task function** in the tasks directory
3. **Triggering the task** from the tool using Celery's `send_task`
4. **Waiting for results** using the long polling helper (requires Redis client)
5. **Notifying completion** using the `task_stream_notifier` context manager

## Step-by-Step Implementation

### 1. Define Schemas in `task_schemas.py`

Create input and output Pydantic models that both the app and tasks can access:

```python
from pydantic import BaseModel

class MyTaskInput(BaseModel):
    """Input schema for my_task."""
    field1: str
    field2: int

class MyTaskOutput(BaseModel):
    """Output schema for my_task."""
    result: str
    token_consumption: dict[str, str | int | None] | None = None
```

### 2. Create the Task Function

In `backend/src/neuroagent/tasks/my_task.py`:

```python
from celery import Task
from neuroagent.task_schemas import MyTaskInput, MyTaskOutput
from neuroagent.tasks.main import celery, get_redis_client
from neuroagent.tasks.utils import task_stream_notifier

def run_my_task(arg: MyTaskInput) -> MyTaskOutput:
    """Your task logic here."""
    # Do the work
    result = perform_work(arg.field1, arg.field2)
    return MyTaskOutput(result=result)

@celery.task(name="my_task", bind=True, pydantic=True)
def run(self: Task, arg: MyTaskInput) -> MyTaskOutput:
    """Celery task wrapper."""
    task_id = self.request.id
    redis_client = get_redis_client()
    
    # Context manager automatically handles stream notifications
    with task_stream_notifier(redis_client, task_id):
        return run_my_task(arg)
```

**Key points:**
- Use `@celery.task(name="my_task", bind=True, pydantic=True)` decorator
- With `bind=True`, the task receives `self` as the first argument (typed as `Task`)
- Import `Task` from `celery` and annotate `self: Task` for proper type checking
- Get `task_id` from `self.request.id`
- Get Redis client using `get_redis_client()`
- Wrap task execution with `task_stream_notifier` context manager

### 3. Create the Tool

In `backend/src/neuroagent/tools/my_tool.py`:

```python
from celery import Celery
from redis import asyncio as aioredis
from neuroagent.task_schemas import MyTaskInput, MyTaskOutput
from neuroagent.tools.base_tool import BaseTool
from neuroagent.utils import long_poll_celery_result

class MyTool(BaseTool):
    # ... tool metadata ...
    metadata: MyToolMetadata  # Must include celery_client and redis_client
    
    async def arun(self) -> MyToolOutput:
        # Prepare task input
        task_input = MyTaskInput(
            field1=self.input_schema.field1,
            field2=self.input_schema.field2,
        )
        
        # Submit task to Celery
        celery_client = self.metadata.celery_client
        redis_client = self.metadata.redis_client
        task_result = celery_client.send_task(
            "my_task", args=[task_input.model_dump()]
        )
        
        # Wait for result using Redis Streams (long polling)
        result_dict = await long_poll_celery_result(
            task_result, redis_client, timeout=30
        )
        
        # Parse and return result
        task_output = MyTaskOutput(**result_dict)
        return MyToolOutput(result=task_output.result)
```

**Key points:**
- Use `celery_client.send_task("my_task", args=[task_input.model_dump()])`
- Use `long_poll_celery_result()` to wait for completion
- **Why Redis client is required**: The `long_poll_celery_result` helper uses Redis Streams under the hood. It performs a blocking `XREAD` call on a stream key `task:{task_id}:progress` to wait for the task completion notification.

### 4. The `task_stream_notifier` Context Manager

The `task_stream_notifier` in `backend/src/neuroagent/tasks/utils.py` automatically:
- Publishes a "done" message to Redis stream `task:{task_id}:progress` on successful completion
- Publishes an "error" message if the task raises an exception
- Sets a TTL on the stream key (1 day by default)

This is what enables the long polling mechanism - the tool waits for this stream message to know when the task is complete.
