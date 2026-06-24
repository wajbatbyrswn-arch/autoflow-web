import { Ctx } from '../rpc';

// Placeholder handlers for features not yet wired on web (WhatsApp/Telegram/webhook/ngrok/excel).
// They return safe defaults so the existing pages render without crashing.
const notReady = (feature: string) => async () => ({ success: false, error: `${feature} غير مفعّل بعد على الويب` });

export const stubHandlers = {
  // WhatsApp (to be implemented with Baileys on the backend)
  'whatsapp:connect': notReady('واتساب'),
  'whatsapp:disconnect': async () => ({ success: true }),
  'whatsapp:getStatus': async () => ({ connected: false, status: 'disconnected' }),
  'whatsapp:sendMessage': notReady('واتساب'),

  // Telegram: real bot API integration lives in notifications.ts
  // (telegram:saveToken / telegram:getStatus / telegram:sendTest).
  // We keep these old shim channels as no-ops for backward compatibility.
  'telegram:disconnect': async () => ({ success: true }),
  'telegram:sendMessage': notReady('تلغرام'),

  // Webhook server: not needed on web (Nashir handles inbound); report stopped.
  'webhook:start': async () => ({ success: false, error: 'غير مطلوب على الويب — يتم الجلب عبر ناشر' }),
  'webhook:stop': async () => ({ success: true }),
  'webhook:status': async () => ({ running: false }),
  'webhook:getLogs': async () => [],
  'webhook:clearLogs': async () => ({ success: true }),

  // Ngrok: not applicable on hosted backend.
  'ngrok:start': async () => ({ success: false, error: 'غير مطلوب على الويب' }),
  'ngrok:stop': async () => ({ success: true }),
  'ngrok:status': async () => ({ running: false }),

  // Excel import/export (browser handles files; stub for now)
  'excel:importProducts': async (_ctx: Ctx) => ({ success: false, error: 'استيراد Excel قريباً على الويب' }),
  'excel:exportProducts': async () => ({ success: false, error: 'تصدير Excel قريباً على الويب' }),
  'excel:exportOrders': async () => ({ success: false, error: 'تصدير Excel قريباً على الويب' }),
};
