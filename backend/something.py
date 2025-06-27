from pydantic import BaseModel, Field

class Foo(BaseModel):
    a: str = Field(description="Hello")



foo = Foo(a="Something")
print(foo)
