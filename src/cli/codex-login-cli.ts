import type { Command } from "commander";
import { defaultRuntime } from "../runtime.js";
import { theme } from "../terminal/theme.js";

export function registerCodexLoginCli(program: Command) {
  program
    .command("codex-login")
    .description("Authenticate with OpenAI Codex via OAuth (ChatGPT account)")
    .option("--profile <id>", "Auth profile ID", "openai-codex:default")
    .option("--set-default", "Set Codex as the default model after login", true)
    .option("--no-set-default", "Do not change the default model")
    .addHelpText(
      "after",
      () =>
        `\n${theme.muted("Authenticates via OpenAI OAuth to use Codex CLI models.")}\n` +
        `${theme.muted("Default model: openai-codex/gpt-5.3-codex")}\n` +
        `${theme.muted("Supports both local browser and remote/VPS environments.")}\n`,
    )
    .action(async (opts) => {
      try {
        await runCodexLogin({
          profileId: opts.profile as string,
          setDefaultModel: Boolean(opts.setDefault),
        });
      } catch (err) {
        defaultRuntime.error(String(err));
        defaultRuntime.exit(1);
      }
    });
}

async function runCodexLogin(params: { profileId: string; setDefaultModel: boolean }) {
  const { intro, note, outro, spinner } = await import("@clack/prompts");
  const { loginOpenAICodex } = await import("@mariozechner/pi-ai");
  const { isRemoteEnvironment } = await import("../commands/oauth-env.js");
  const { createVpsAwareOAuthHandlers } = await import("../commands/oauth-flow.js");
  const { openUrl } = await import("../commands/onboard-helpers.js");
  const { applyAuthProfileConfig, writeOAuthCredentials } = await import(
    "../commands/onboard-auth.js"
  );
  const { applyOpenAICodexModelDefault, OPENAI_CODEX_DEFAULT_MODEL } = await import(
    "../commands/openai-codex-model-default.js"
  );
  const { updateConfig } = await import("../commands/models/shared.js");
  const { logConfigUpdated } = await import("../config/logging.js");
  const { stylePromptTitle } = await import("../terminal/prompt-style.js");

  if (!process.stdin.isTTY) {
    throw new Error("codex-login requires an interactive TTY.");
  }

  intro(stylePromptTitle("OpenAI Codex Login"));

  const isRemote = isRemoteEnvironment();

  note(
    isRemote
      ? [
          "You are running in a remote/VPS environment.",
          "A URL will be shown for you to open in your LOCAL browser.",
          "After signing in, paste the redirect URL back here.",
          "",
          "OpenAI OAuth uses localhost:1455 for the callback.",
          "If on SSH, forward the port: ssh -L 1455:localhost:1455 user@host",
        ].join("\n")
      : [
          "A browser window will open for OpenAI authentication.",
          "Sign in with your ChatGPT account.",
          "If the callback doesn't auto-complete, paste the redirect URL.",
        ].join("\n"),
    stylePromptTitle("OAuth Flow"),
  );

  const spin = spinner();
  spin.start("Starting OpenAI Codex OAuth flow...");

  const prompter = {
    text: async (opts: { message: string; placeholder?: string; validate?: (v: string) => string | undefined }) => {
      spin.stop("");
      const { text } = await import("@clack/prompts");
      const result = await text({
        message: opts.message,
        placeholder: opts.placeholder,
        validate: opts.validate,
      });
      if (typeof result === "symbol") {
        throw new Error("Login cancelled");
      }
      return String(result);
    },
    note: async (message: string, title?: string) => {
      note(message, title);
    },
    progress: (msg: string) => {
      spin.start(msg);
      return {
        update: (m: string) => spin.update(m),
        stop: (m: string) => spin.stop(m),
      };
    },
  };

  try {
    const { onAuth, onPrompt } = createVpsAwareOAuthHandlers({
      isRemote,
      prompter: prompter as never,
      runtime: defaultRuntime,
      spin: { update: (m: string) => spin.update(m), stop: (m: string) => spin.stop(m) } as never,
      openUrl,
      localBrowserMessage: "Complete sign-in in browser...",
    });

    const creds = await loginOpenAICodex({
      onAuth,
      onPrompt,
      onProgress: (msg: string) => spin.update(msg),
    });

    spin.stop("OpenAI OAuth complete");

    if (creds) {
      await writeOAuthCredentials("openai-codex", creds);

      await updateConfig((cfg) => {
        let nextConfig = applyAuthProfileConfig(cfg, {
          profileId: params.profileId,
          provider: "openai-codex",
          mode: "oauth",
        });

        if (params.setDefaultModel) {
          const applied = applyOpenAICodexModelDefault(nextConfig);
          nextConfig = applied.next;
        }

        return nextConfig;
      });

      logConfigUpdated(defaultRuntime);

      note(
        [
          `Auth profile: ${params.profileId}`,
          `Provider: openai-codex (OAuth)`,
          params.setDefaultModel ? `Default model: ${OPENAI_CODEX_DEFAULT_MODEL}` : "",
        ]
          .filter(Boolean)
          .join("\n"),
        stylePromptTitle("Configured"),
      );

      outro("Codex login complete. You can now use Codex models.");
    } else {
      spin.stop("No credentials received");
      outro("Login was not completed.");
    }
  } catch (err) {
    spin.stop("OAuth failed");
    defaultRuntime.error(String(err));
    note("Trouble with OAuth? Try:\n- Ensure localhost:1455 is accessible\n- For SSH: ssh -L 1455:localhost:1455 user@host\n- See https://docs.hex.ai/start/faq", stylePromptTitle("Troubleshooting"));
    outro("Login failed.");
    process.exitCode = 1;
  }
}
