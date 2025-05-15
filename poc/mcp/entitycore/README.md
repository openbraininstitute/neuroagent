# Important

- Building a server documentation (node): https://modelcontextprotocol.io/quickstart/server#node

Whenever there is a change in the source code of the server run 

```shell
npm run build
```


- The `src/checkTypes.ts` is just a prototype and by default is excluded in `tsconfig.json`. 
- There needs to be at least one nonoptional parameter in your schema: https://github.com/modelcontextprotocol/typescript-sdk/issues/400. This messes up with the `checkTypes` script.
- Cursor and Claude seem to behave differently. Cursor is struggling with some of the zod types you created whereas Claude is able to parse them. Feels like Cursor does some
extra validation but does it badly. It seems to be because Cursor does not allow for any `optional` parameters at all - https://forum.cursor.com/t/mcp-server-tool-calls-fail-with-invalid-type-for-parameter-in-tool/70831

# Autogenerating types

```shell
npx openapi-typescript https://staging.openbluebrain.com/api/entitycore/openapi.json -o ./src/types.d.ts
```

