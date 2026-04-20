import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express from 'express';
import { join } from 'node:path';

const browserDistFolder = join(import.meta.dirname, '../browser');
const mangaHookBaseUrl = process.env['MANGA_HOOK_API_BASE_URL'] || 'http://127.0.0.1:3000';

const app = express();
const angularApp = new AngularNodeAppEngine();

app.use('/api/mangahook', async (req, res) => {
  const upstreamUrl = new URL(
    req.originalUrl.replace(/^\/api\/mangahook/, '/api'),
    `${mangaHookBaseUrl}/`,
  );

  try {
    const upstreamResponse = await fetch(upstreamUrl, {
      method: req.method,
      headers: {
        Accept: 'application/json',
      },
    });

    res.status(upstreamResponse.status);
    res.type(upstreamResponse.headers.get('content-type') || 'application/json');
    res.send(await upstreamResponse.text());
  } catch (error) {
    res.status(502).json({
      message: `Could not reach MangaHook at ${mangaHookBaseUrl}.`,
      details: error instanceof Error ? error.message : 'Unknown proxy error',
    });
  }
});

/**
 * Serve static files from /browser
 */
app.use(
  express.static(browserDistFolder, {
    maxAge: '1y',
    index: false,
    redirect: false,
  }),
);

/**
 * Handle all other requests by rendering the Angular application.
 */
app.use((req, res, next) => {
  angularApp
    .handle(req)
    .then((response) =>
      response ? writeResponseToNodeResponse(response, res) : next(),
    )
    .catch(next);
});

/**
 * Start the server if this module is the main entry point, or it is ran via PM2.
 * The server listens on the port defined by the `PORT` environment variable, or defaults to 4000.
 */
if (isMainModule(import.meta.url) || process.env['pm_id']) {
  const port = process.env['PORT'] || 4000;
  app.listen(port, (error) => {
    if (error) {
      throw error;
    }

    console.log(`Node Express server listening on http://localhost:${port}`);
  });
}

/**
 * Request handler used by the Angular CLI (for dev-server and during build) or Firebase Cloud Functions.
 */
export const reqHandler = createNodeRequestHandler(app);
