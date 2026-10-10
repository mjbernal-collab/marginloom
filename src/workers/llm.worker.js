import { WebWorkerMLCEngineHandler } from '@mlc-ai/web-llm';
import { installCacheMode } from './cache-mode.js';
const setCacheMode = installCacheMode();
const handler = new WebWorkerMLCEngineHandler();
self.onmessage = message => {
  if (message.data.type === 'cacheMode') setCacheMode(message.data.cacheOnly);
  else handler.onmessage(message);
};
