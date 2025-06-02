from pydantic import BaseModel, ConfigDict
from pydantic.json_schema import SkipJsonSchema


class Foo(BaseModel):
    a: int
    b: str
    c: SkipJsonSchema[float | None] = None

    model_config = ConfigDict(
        extra="ignore",
    )
    


print(Foo.model_json_schema())


foo = Foo(a=1, b="test")

print(foo.model_dump())
