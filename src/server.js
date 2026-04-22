import { createApp } from './app.js';
import { env } from './config/app.js';
import { startWA } from './services/whatsappClient.js';
import { handleMessage } from './services/whatsappHandler.js';

startWA(handleMessage);

const app = createApp();
app.locals.onMessage = handleMessage;

app.listen(env.port, () => {
  console.log(`🚀 Server running on port ${env.port}`);
});
