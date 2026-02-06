import type { HexPluginApi } from "../../src/plugins/types.js";
import { createLlmTaskTool } from "./src/llm-task-tool.js";

export default function register(api: HexPluginApi) {
  api.registerTool(createLlmTaskTool(api), { optional: true });
}
