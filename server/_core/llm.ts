import { ENV } from "./env";

export type Role = "system" | "user" | "assistant" | "tool" | "function";

export type TextContent = {
  type: "text";
  text: string;
};

export type ImageContent = {
  type: "image_url";
  image_url: {
    url: string;
    detail?: "auto" | "low" | "high";
  };
};

export type FileContent = {
  type: "file_url";
  file_url: {
    url: string;
    mime_type?: "audio/mpeg" | "audio/wav" | "application/pdf" | "audio/mp4" | "video/mp4" ;
  };
};

export type MessageContent = string | TextContent | ImageContent | FileContent;

export type Message = {
  role: Role;
  content: MessageContent | MessageContent[];
  name?: string;
  tool_call_id?: string;
};

export type Tool = {
  type: "function";
  function: {
    name: string;
    description?: string;
    parameters?: Record<string, unknown>;
  };
};

export type ToolChoicePrimitive = "none" | "auto" | "required";
export type ToolChoiceByName = { name: string };
export type ToolChoiceExplicit = {
  type: "function";
  function: {
    name: string;
  };
};

export type ToolChoice =
  | ToolChoicePrimitive
  | ToolChoiceByName
  | ToolChoiceExplicit;

export type InvokeParams = {
  messages: Message[];
  tools?: Tool[];
  toolChoice?: ToolChoice;
  tool_choice?: ToolChoice;
  maxTokens?: number;
  max_tokens?: number;
  outputSchema?: OutputSchema;
  output_schema?: OutputSchema;
  responseFormat?: ResponseFormat;
  response_format?: ResponseFormat;
};

export type ToolCall = {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string;
  };
};

export type InvokeResult = {
  id: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: Role;
      content: string | Array<TextContent | ImageContent | FileContent>;
      tool_calls?: ToolCall[];
    };
    finish_reason: string | null;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
};

export type JsonSchema = {
  name: string;
  schema: Record<string, unknown>;
  strict?: boolean;
};

export type OutputSchema = JsonSchema;

export type ResponseFormat =
  | { type: "text" }
  | { type: "json_object" }
  | { type: "json_schema"; json_schema: JsonSchema };

const ensureArray = (
  value: MessageContent | MessageContent[]
): MessageContent[] => (Array.isArray(value) ? value : [value]);

const normalizeContentPart = (
  part: MessageContent
): TextContent | ImageContent | FileContent => {
  if (typeof part === "string") {
    return { type: "text", text: part };
  }

  if (part.type === "text") {
    return part;
  }

  if (part.type === "image_url") {
    return part;
  }

  if (part.type === "file_url") {
    return part;
  }

  throw new Error("Unsupported message content part");
};

const normalizeMessage = (message: Message) => {
  const { role, name, tool_call_id } = message;

  if (role === "tool" || role === "function") {
    const content = ensureArray(message.content)
      .map(part => (typeof part === "string" ? part : JSON.stringify(part)))
      .join("\n");

    return {
      role,
      name,
      tool_call_id,
      content,
    };
  }

  const contentParts = ensureArray(message.content).map(normalizeContentPart);

  // If there's only text content, collapse to a single string for compatibility
  if (contentParts.length === 1 && contentParts[0].type === "text") {
    return {
      role,
      name,
      content: contentParts[0].text,
    };
  }

  return {
    role,
    name,
    content: contentParts,
  };
};

const normalizeToolChoice = (
  toolChoice: ToolChoice | undefined,
  tools: Tool[] | undefined
): "none" | "auto" | ToolChoiceExplicit | undefined => {
  if (!toolChoice) return undefined;

  if (toolChoice === "none" || toolChoice === "auto") {
    return toolChoice;
  }

  if (toolChoice === "required") {
    if (!tools || tools.length === 0) {
      throw new Error(
        "tool_choice 'required' was provided but no tools were configured"
      );
    }

    if (tools.length > 1) {
      throw new Error(
        "tool_choice 'required' needs a single tool or specify the tool name explicitly"
      );
    }

    return {
      type: "function",
      function: { name: tools[0].function.name },
    };
  }

  if ("name" in toolChoice) {
    return {
      type: "function",
      function: { name: toolChoice.name },
    };
  }

  return toolChoice;
};

type LLMProvider = "openai" | "anthropic" | "forge";

const getLLMProvider = (): LLMProvider => {
  if (ENV.anthropicApiKey && ENV.anthropicApiKey.trim().length > 0) return "anthropic";
  if (ENV.openAIApiKey && ENV.openAIApiKey.trim().length > 0) return "openai";
  if (ENV.forgeApiUrl && ENV.forgeApiUrl.trim().length > 0 && ENV.forgeApiKey) return "forge";
  throw new Error(
    "No LLM provider is configured. Set ANTHROPIC_API_KEY or OPENAI_API_KEY."
  );
};

const resolveApiUrl = (provider: LLMProvider) => {
  if (provider === "openai") {
    return "https://api.openai.com/v1/chat/completions";
  }
  if (provider === "anthropic") {
    return "https://api.anthropic.com/v1/messages";
  }
  return `${ENV.forgeApiUrl.replace(/\/$/, "")}/v1/chat/completions`;
};

const getApiKey = (provider: LLMProvider) => {
  if (provider === "openai") return ENV.openAIApiKey;
  if (provider === "anthropic") return ENV.anthropicApiKey;
  return ENV.forgeApiKey;
};

const getModel = (provider: LLMProvider) => {
  if (provider === "openai") return "gpt-4o-mini";
  if (provider === "anthropic") return "claude-sonnet-4-20250514";
  return "gemini-2.5-flash";
};

const normalizeResponseFormat = ({
  responseFormat,
  response_format,
  outputSchema,
  output_schema,
}: {
  responseFormat?: ResponseFormat;
  response_format?: ResponseFormat;
  outputSchema?: OutputSchema;
  output_schema?: OutputSchema;
}):
  | { type: "json_schema"; json_schema: JsonSchema }
  | { type: "text" }
  | { type: "json_object" }
  | undefined => {
  const explicitFormat = responseFormat || response_format;
  if (explicitFormat) {
    if (
      explicitFormat.type === "json_schema" &&
      !explicitFormat.json_schema?.schema
    ) {
      throw new Error(
        "responseFormat json_schema requires a defined schema object"
      );
    }
    return explicitFormat;
  }

  const schema = outputSchema || output_schema;
  if (!schema) return undefined;

  if (!schema.name || !schema.schema) {
    throw new Error("outputSchema requires both name and schema");
  }

  return {
    type: "json_schema",
    json_schema: {
      name: schema.name,
      schema: schema.schema,
      ...(typeof schema.strict === "boolean" ? { strict: schema.strict } : {}),
    },
  };
};

async function invokeAnthropic(params: InvokeParams): Promise<InvokeResult> {
  const { messages } = params;

  // Extract system message if present
  const systemMessages = messages.filter(m => m.role === "system");
  const nonSystemMessages = messages.filter(m => m.role !== "system");

  const anthropicMessages = nonSystemMessages.map(m => {
    const content = Array.isArray(m.content) ? m.content : [m.content];
    const textParts = content.map(part => {
      if (typeof part === "string") return { type: "text" as const, text: part };
      if (typeof part === "object" && "text" in part) return { type: "text" as const, text: part.text };
      return { type: "text" as const, text: JSON.stringify(part) };
    });
    return {
      role: m.role === "assistant" ? "assistant" as const : "user" as const,
      content: textParts.length === 1 ? textParts[0].text : textParts,
    };
  });

  const payload: Record<string, unknown> = {
    model: getModel("anthropic"),
    max_tokens: 4096,
    messages: anthropicMessages,
  };

  if (systemMessages.length > 0) {
    const systemText = systemMessages
      .map(m => (typeof m.content === "string" ? m.content : JSON.stringify(m.content)))
      .join("\n");
    payload.system = systemText;
  }

  const response = await fetch(resolveApiUrl("anthropic"), {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": ENV.anthropicApiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `LLM invoke failed: ${response.status} ${response.statusText} – ${errorText}`
    );
  }

  const data = await response.json() as {
    id: string;
    content: Array<{ type: string; text?: string }>;
    model: string;
    usage?: { input_tokens: number; output_tokens: number };
  };

  // Convert Anthropic response to OpenAI-compatible format
  const textContent = data.content
    .filter((c: { type: string }) => c.type === "text")
    .map((c: { text?: string }) => c.text || "")
    .join("");

  return {
    id: data.id,
    created: Date.now(),
    model: data.model,
    choices: [
      {
        index: 0,
        message: { role: "assistant", content: textContent },
        finish_reason: "stop",
      },
    ],
    usage: data.usage
      ? {
          prompt_tokens: data.usage.input_tokens,
          completion_tokens: data.usage.output_tokens,
          total_tokens: data.usage.input_tokens + data.usage.output_tokens,
        }
      : undefined,
  };
}

export async function invokeLLM(params: InvokeParams): Promise<InvokeResult> {
  const {
    messages,
    tools,
    toolChoice,
    tool_choice,
    outputSchema,
    output_schema,
    responseFormat,
    response_format,
  } = params;

  const provider = getLLMProvider();

  // Anthropic has a different API format — handle separately
  if (provider === "anthropic") {
    return invokeAnthropic(params);
  }

  const payload: Record<string, unknown> = {
    model: getModel(provider),
    messages: messages.map(normalizeMessage),
  };

  if (tools && tools.length > 0) {
    payload.tools = tools;
  }

  const normalizedToolChoice = normalizeToolChoice(
    toolChoice || tool_choice,
    tools
  );
  if (normalizedToolChoice) {
    payload.tool_choice = normalizedToolChoice;
  }

  payload.max_tokens = 32768;
  if (provider === "forge") {
    payload.thinking = {
      budget_tokens: 128,
    };
  }

  const normalizedResponseFormat = normalizeResponseFormat({
    responseFormat,
    response_format,
    outputSchema,
    output_schema,
  });

  if (normalizedResponseFormat) {
    payload.response_format = normalizedResponseFormat;
  }

  const response = await fetch(resolveApiUrl(provider), {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${getApiKey(provider)}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `LLM invoke failed: ${response.status} ${response.statusText} – ${errorText}`
    );
  }

  return (await response.json()) as InvokeResult;
}
