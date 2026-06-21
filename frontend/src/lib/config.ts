/**
 * Application Configuration Utility
 * Groups and validates environment variables.
 * Throws an error if any required key is missing.
 */

const getEnvVar = (key: string, isRequired = true): string => {
  const value = process.env[key];
  if (isRequired && !value) {
    throw new Error(`Missing mandatory environment variable: ${key}`);
  }
  return value || '';
};

export const config = {
  nashir: {
    apiKey: getEnvVar('NASHIR_API_KEY'),
    baseUrl: getEnvVar('NASHIR_BASE_URL'),
  },
  ai: {
    openaiApiKey: getEnvVar('OPENAI_API_KEY'),
    model: getEnvVar('AI_MODEL'),
  },
  database: {
    // Public keys (Client-side)
    public: {
      supabaseUrl: getEnvVar('NEXT_PUBLIC_SUPABASE_URL'),
      supabaseAnonKey: getEnvVar('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
    },
    // Secret keys (Server-side)
    secret: {
      supabaseServiceRoleKey: getEnvVar('SUPABASE_SERVICE_ROLE_KEY'),
    },
  },
  networking: {
    webhookUrl: getEnvVar('WEBHOOK_URL'),
    webhookVerifyToken: getEnvVar('WEBHOOK_VERIFY_TOKEN'),
  },
};

export type Config = typeof config;
