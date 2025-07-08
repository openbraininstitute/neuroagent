To generate the pydantic models from an API openapi.json spec, run the following command:
```bash
pip install datamodel-code-generator
datamodel-codegen --enum-field-as-literal=all --target-python-version=3.11  --reuse-model  --field-constraints --input-file-type=openapi --output-model-type=pydantic_v2.BaseModel --openapi-scopes {schemas,paths,parameters} --use-standard-collections --use-union-operator --use-default-kwarg --use-operation-id-as-name --extra-fields=ignore --url=TARGET_URL/openapi.json --output=OUTPUT
```
