export const ENV = {
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  isProduction: process.env.NODE_ENV === "production",
  openAIApiKey: process.env.OPENAI_API_KEY ?? "",
  anthropicApiKey: process.env.ANTHROPIC_API_KEY ?? "",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  clayApiKey: process.env.CLAY_API_KEY ?? "",
  clayTableId: process.env.CLAY_TABLE_ID ?? "",
  clayWebhookUrl: process.env.CLAY_WEBHOOK_URL ?? "",
  makeWebhookUrl: process.env.MAKE_WEBHOOK_URL ?? "",
};
