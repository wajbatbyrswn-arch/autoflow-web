declare namespace NodeJS {
  interface ProcessEnv {
    // Nashir.ai API
    NASHIR_API_KEY: string;
    NASHIR_BASE_URL: string;

    // AI Engine
    OPENAI_API_KEY: string;
    AI_MODEL: string;

    // Database (Supabase)
    NEXT_PUBLIC_SUPABASE_URL: string;
    NEXT_PUBLIC_SUPABASE_ANON_KEY: string;
    SUPABASE_SERVICE_ROLE_KEY: string;

    // Networking
    WEBHOOK_URL: string;
    WEBHOOK_VERIFY_TOKEN: string;
  }
}
