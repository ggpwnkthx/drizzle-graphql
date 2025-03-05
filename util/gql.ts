import axios, { type AxiosError } from "npm:axios";

/**
 * A simple GraphQL client that sends queries to a specified GraphQL endpoint.
 *
 * This client uses Axios to perform HTTP POST requests to send GraphQL queries in JSON format.
 *
 * @example
 * const client = new GraphQLClient("https://example.com/graphql");
 * const response = await client.queryGql("{ users { id name } }");
 * console.log(response);
 */
export class GraphQLClient {
  /**
   * Creates a new instance of GraphQLClient.
   *
   * @param url - The URL of the GraphQL endpoint.
   */
  constructor(private url: string) {}

  /**
   * Sends a GraphQL query to the configured endpoint.
   *
   * This method performs an HTTP POST request with the provided query. The query is encapsulated
   * in a JSON payload with an empty variables object. The request includes headers that specify
   * the expected response format and content type.
   *
   * In case of a successful request, the response data is returned. If an error occurs during the request,
   * the method logs the HTTP status and any error details provided by the server, then returns the error
   * response data if available.
   *
   * @param query - The GraphQL query string to be executed.
   * @returns A promise that resolves with the GraphQL server's response data.
   *
   * @throws {AxiosError} When the HTTP request fails.
   */
  public queryGql = async (query: string) => {
    try {
      const res = await axios.post(
        this.url,
        JSON.stringify({
          query: query,
          variables: {},
        }),
        {
          headers: {
            accept: "application/graphql-response+json, application/json",
            "content-type": "application/json",
          },
        },
      );

      return res.data;
    } catch (e) {
      const err = e as AxiosError<any>;

      console.warn(err.status, err.response?.data.errors);
      return err.response?.data;
    }
  };
}
