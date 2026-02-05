import { createApp } from './app.js';
import { env } from './config/env.js';
import { startWA } from './whatsapp/client.js';
import { handleMessage } from './whatsapp/handler.js';

startWA(handleMessage);


const app = createApp();

app.listen(env.port, () => {
  console.log(`🚀 Server running on port ${env.port}`);
});
