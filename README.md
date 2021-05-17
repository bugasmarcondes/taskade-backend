- GraphQL, is a query language for APIs, and it provides a complete description of the data in your API, giving clients the power to ask exactly what they need.
  - Schema (SDL), is a collection of type definitions (hence "typeDefs") that together define the "shape" of queries that are executed against your data.
    - User types, Query, Mutation
    - Resolvers, define the technique for fetching the types defined in the schema. This resolver retrieves books from the "books" array above.

```
npm init --yes
npm install apollo-server graphql
```

- Development of src/index.js
- Execute the server with
  - node src/index.js

```
npm install nodemon -g
npm install mongodb dotenv
```

- Development of ./.env

```
npm install bcryptjs
npm install jsonwebtoken
```
