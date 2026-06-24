/**
 * Web implementation of the Electron `window.api` bridge.
 * Mirrors electron/preload.js so the existing React pages work unchanged.
 * Data calls -> backend RPC (same channel names as IPC handlers).
 * Push events -> backend SSE stream (see events.js).
 */
import { rpc } from './apiClient'
import { on, removeAll } from './events'

const noop = () => {}

export function installWebApi() {
  if (window.api) return
  window.api = {
    // Window controls (no-op on web)
    window: { minimize: noop, maximize: noop, close: noop, relaunch: () => location.reload() },

    notify: (title, body) => {
      try {
        if ('Notification' in window && Notification.permission === 'granted') new Notification(title, { body })
      } catch {}
    },

    ai: {
      testConnection: (config) => rpc('ai:testConnection', config),
      sendMessage: (payload) => rpc('ai:sendMessage', payload),
      getConfig: () => rpc('ai:getConfig'),
      saveConfig: (config) => rpc('ai:saveConfig', config),
      getProviderConfig: (provider) => rpc('ai:getProviderConfig', provider),
      fetchModels: (config) => rpc('ai:fetchModels', config),
      analyzeImage: (prompt, base64Image) => rpc('ai:analyzeImage', { prompt, base64Image }),
      generateImage: (prompt) => rpc('ai:generateImage', { prompt }),
    },

    whatsapp: {
      connect: () => rpc('whatsapp:connect'),
      disconnect: () => rpc('whatsapp:disconnect'),
      getStatus: () => rpc('whatsapp:getStatus'),
      sendMessage: (to, message) => rpc('whatsapp:sendMessage', { to, message }),
      onQR: (cb) => on('whatsapp:qr', cb),
      onStatus: (cb) => on('whatsapp:status', cb),
      onMessage: (cb) => on('whatsapp:message', cb),
      removeListeners: () => { removeAll('whatsapp:qr'); removeAll('whatsapp:status'); removeAll('whatsapp:message') },
    },

    facebook: {
      connect: (payload) => rpc('facebook:connect', payload),
      getStatus: () => rpc('facebook:getStatus'),
      sendMessage: (userId, message) => rpc('facebook:sendMessage', { userId, message }),
      getComments: (postId) => rpc('facebook:getComments', { postId }),
      replyComment: (commentId, message) => rpc('facebook:replyComment', { commentId, message }),
      onMessage: (cb) => on('facebook:message', cb),
      removeListeners: () => removeAll('facebook:message'),
      oauthLogin: () => rpc('oauth:facebook'),
      getPages: (userToken) => rpc('facebook:getPages', { userToken }),
      connectWithPage: (payload) => rpc('facebook:connectWithPage', payload),
    },

    instagram: {
      connect: (payload) => rpc('instagram:connect', payload),
      getStatus: () => rpc('instagram:getStatus'),
      sendMessage: (userId, message) => rpc('instagram:sendMessage', { userId, message }),
      getComments: (mediaId) => rpc('instagram:getComments', { mediaId }),
      replyComment: (commentId, message) => rpc('instagram:replyComment', { commentId, message }),
      onMessage: (cb) => on('instagram:message', cb),
      removeListeners: () => removeAll('instagram:message'),
      getFromPage: (payload) => rpc('instagram:getFromPage', payload),
      connectFromPage: (payload) => rpc('instagram:connectFromPage', payload),
    },

    meta: {
      getAccounts: () => rpc('meta:getAccounts'),
      saveAccount: (acc) => rpc('meta:saveAccount', acc),
      removeAccount: (pageId) => rpc('meta:removeAccount', pageId),
    },

    // Nashir platform connection (Settings → Platforms)
    nashir: {
      status: () => rpc('nashir:status'),
      saveKey: (apiKey) => rpc('nashir:saveKey', { apiKey }),
    },

    // Manual inbox reply (sends via Nashir to the conversation's last customer message)
    inbox: {
      reply: (conversation_id, message) => rpc('inbox:reply', { conversation_id, message }),
    },

    // Notifications + complaints (orders, complaints, system) — pushed to Telegram if configured.
    notifications: {
      list: (opts) => rpc('notifications:list', opts),
      unreadCount: () => rpc('notifications:unreadCount'),
      markRead: (id) => rpc('notifications:markRead', { id }),
      markAllRead: () => rpc('notifications:markAllRead'),
      delete: (id) => rpc('notifications:delete', { id }),
    },

    // Per-conversation AI pause controls (manual takeover, complaint, scheduled pause).
    conversations: {
      pauseAI: (convId, hours) => rpc('conversations:pauseAI', { convId, hours }),
      resumeAI: (convId) => rpc('conversations:resumeAI', { convId }),
    },

    telegram: {
      connect: (config) => rpc('telegram:connect', config),
      disconnect: () => rpc('telegram:disconnect'),
      getStatus: () => rpc('telegram:getStatus'),
      sendMessage: (payload) => rpc('telegram:sendMessage', payload),
      onMessage: (cb) => on('telegram:message', cb),
      removeListeners: () => removeAll('telegram:message'),
    },

    db: {
      getProducts: () => rpc('db:getProducts'),
      saveProduct: (product) => rpc('db:saveProduct', product),
      deleteProduct: (id) => rpc('db:deleteProduct', id),
      getOrders: (filters) => rpc('db:getOrders', filters),
      saveOrder: (order) => rpc('db:saveOrder', order),
      updateOrderStatus: (id, status) => rpc('db:updateOrderStatus', { id, status }),
      getConversations: (filters) => rpc('db:getConversations', filters),
      getMessages: (convId) => rpc('db:getMessages', convId),
      getStats: () => rpc('db:getStats'),
      getCampaigns: () => rpc('db:getCampaigns'),
      saveCampaign: (campaign) => rpc('db:saveCampaign', campaign),
      deleteCampaign: (id) => rpc('db:deleteCampaign', id),
      getActivityLog: () => rpc('db:getActivityLog'),
      getStoreConfig: () => rpc('db:getStoreConfig'),
      saveStoreConfig: (config) => rpc('db:saveStoreConfig', config),
      getBrandThemes: () => rpc('db:getBrandThemes'),
      saveBrandTheme: (theme) => rpc('db:saveBrandTheme', theme),
      getGeneratedPosts: () => rpc('db:getGeneratedPosts'),
      saveGeneratedPost: (post) => rpc('db:saveGeneratedPost', post),
      deleteGeneratedPost: (id) => rpc('db:deleteGeneratedPost', id),
    },

    excel: {
      importProducts: () => rpc('excel:importProducts'),
      exportProducts: () => rpc('excel:exportProducts'),
      exportOrders: () => rpc('excel:exportOrders'),
    },

    settings: {
      get: (key) => rpc('settings:get', key),
      set: (key, value) => rpc('settings:set', { key, value }),
      getAll: () => rpc('settings:getAll'),
    },

    webhook: {
      start: (config) => rpc('webhook:start', config),
      stop: () => rpc('webhook:stop'),
      getStatus: () => rpc('webhook:status'),
      getLogs: () => rpc('webhook:getLogs'),
      clearLogs: () => rpc('webhook:clearLogs'),
      onEvent: (cb) => on('webhook:event', cb),
      removeListeners: () => removeAll('webhook:event'),
    },

    ngrok: {
      start: (config) => rpc('ngrok:start', config),
      stop: () => rpc('ngrok:stop'),
      getStatus: () => rpc('ngrok:status'),
      onLog: (cb) => on('ngrok:log', cb),
      removeListeners: () => removeAll('ngrok:log'),
    },

    shell: {
      openExternal: (url) => { window.open(url, '_blank', 'noopener'); return Promise.resolve() },
    },

    dialog: {
      // Web file picking handled via <input type=file> in pages; stub returns canceled.
      showOpenDialog: () => Promise.resolve({ canceled: true, filePaths: [] }),
    },

    fs: {
      readFileBase64: () => Promise.reject(new Error('fs not available on web')),
    },
  }
}
