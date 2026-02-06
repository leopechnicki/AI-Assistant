import type { HexPluginApi } from "hex/plugin-sdk";
import { emptyPluginConfigSchema } from "hex/plugin-sdk";
import { createDiagnosticsOtelService } from "./src/service.js";

const plugin = {
  id: "diagnostics-otel",
  name: "Diagnostics OpenTelemetry",
  description: "Export diagnostics events to OpenTelemetry",
  configSchema: emptyPluginConfigSchema(),
  register(api: HexPluginApi) {
    api.registerService(createDiagnosticsOtelService());
  },
};

export default plugin;
