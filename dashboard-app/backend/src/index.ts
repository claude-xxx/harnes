import { serve } from '@hono/node-server';
import { app } from './app.js';

const port = Number(process.env.PORT ?? 3001);

serve({ fetch: app.fetch, port }, (info) => {
  console.log(`[backend] listening on http://localhost:${info.port}`);
  console.log(`[backend] OpenAPI spec: http://localhost:${info.port}/api/openapi.json`);
  console.log(`[backend] Swagger UI:   http://localhost:${info.port}/api/doc`);
});
