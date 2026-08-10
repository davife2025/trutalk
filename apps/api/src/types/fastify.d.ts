import "fastify";

declare module "fastify" {
  interface FastifyRequest {
    /**
     * Raw request body buffer, captured by the custom content-type parser in
     * server.ts. Needed for Paystack webhook signature verification, which
     * must be computed over the exact raw bytes — a re-serialized JSON body
     * would not reliably match Paystack's original signature.
     */
    rawBody?: Buffer;
  }
}
