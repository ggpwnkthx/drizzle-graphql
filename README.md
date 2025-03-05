# drizzle-graphql for Deno

A Deno adaptation of the drizzle-graphql project, enabling seamless integration
between Drizzle ORM and GraphQL. This module automatically generates a GraphQL
schema based on your Drizzle models and provides powerful customization options
to handle custom types.

## Features

- **Deno-Native**\
  Built for Deno. Designed to work with `Deno.serve` but can work with any HTTP
  service.

- **GraphQL Integration**\
  Designed to work with `GraphQLHTTP` from
  [`jsr:@deno-libs/gql`](https://jsr.io/@deno-libs/gql) to handle GraphQL
  requests, however other GraphQL handlers like Yoga should work as well.

- **Dynamic Custom Type Handling**\
  Easily extend and customize type conversions with three new exported
  functions:
  - `registerGraphQLTypeMapping`
  - `registerRemapFromGraphQL`
  - `registerRemapToGraphQL`

## Installation

Since this is a Deno module, simply import it into your project without any
additional installation steps:

```typescript
import {
  drizzleGraphQL,
  registerGraphQLTypeMapping,
  registerRemapFromGraphQL,
  registerRemapToGraphQL,
} from "jsr:ggpwnkthx/drizzle-graphql";
```

## Usage

### Setting Up a GraphQL Server

Below is an example of how to set up a basic GraphQL endpoint using this module
along with Deno's native HTTP server:

```typescript
import { drizzleGraphQL } from "jsr:ggpwnkthx/drizzle-graphql";
import { GraphQLHTTP } from "jsr:@deno-libs/gql";
import { db } from "./db.ts"; // Your Drizzle ORM database instance

// Generate the GraphQL schema from your Drizzle models
const schema = drizzleGraphQL(db);

// Create a GraphQL handler using GraphQLHTTP
const graphqlHandler = GraphQLHTTP({ schema });

// Use Deno.serve to handle incoming HTTP requests
Deno.serve((req) => {
  if (req.url.endsWith("/graphql")) {
    return graphqlHandler(req);
  }
  return new Response("Not Found", { status: 404 });
});
```

### Registering Custom Type Mappings

If your application uses custom data types that need special handling in
GraphQL, you can register custom converters using the new functions:

- **Register Type Mapping**
  ```typescript
  import { registerGraphQLTypeMapping } from "jsr:ggpwnkthx/drizzle-graphql";
  // Define the output type for geo columns.
  const geoXyType = new GraphQLObjectType({
    name: "PgGeometryObject",
    fields: {
      x: { type: GraphQLFloat },
      y: { type: GraphQLFloat },
    },
  });
  // Define the input type for geo columns.
  const geoXyInputType = new GraphQLInputObjectType({
    name: "PgGeometryObjectInput",
    fields: {
      x: { type: GraphQLFloat },
      y: { type: GraphQLFloat },
    },
  });
  // Register the GraphQL mappings.
  registerGraphQLTypeMapping("PgGeometryObject", (_column, isInput) => ({
    type: isInput ? geoXyInputType : geoXyType,
    description: "Geometry points XY",
  }));
  ```
- **Register Data Converter**
  ```typescript
  registerRemapToGraphQL(
    "PgGeometryObject",
    (value, _column, _key, _tableName, _relationMap) => value,
  );
  registerRemapFromGraphQL(
    "PgGeometryObject",
    (value, _column, _columnName) => ({ ...value }),
  );
  ```

## Examples

The repository includes several examples in the `examples` folder. Each example
contains a `context.ts` file that demonstrates various configurations and usage
scenarios:

- How to integrate the generated GraphQL schema with your Drizzle ORM instance.
- How to configure and register custom type mappings.
- How to set up a Deno server using Deno.serve and GraphQLHTTP.

Review these examples to gain a deeper understanding of how to configure and
extend drizzle-graphql for your specific use case.

## Contributing

Contributions are welcome! If you encounter issues or have ideas for
improvements, please open an issue or submit a pull request.

## License

This project is licensed under the Apache License.
