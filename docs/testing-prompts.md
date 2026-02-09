# Hex Multi-Provider Testing Prompts

Reusable prompt blocks for Claude Code sessions. Each prompt is self-contained — copy-paste into a new session to execute.

**Providers covered:** Anthropic, OpenAI, Ollama (local)
**Hardware assumed:** Windows, 8–16 GB VRAM

---

## Prompt 1: Prerequisites & Repo Setup

```
I need to set up the Hex repository for development and testing on Windows. Please:

1. Verify Node 22+ is installed: `node --version`
2. Verify pnpm is installed: `pnpm --version`
3. Install dependencies: `pnpm install`
4. Verify build works: `pnpm build`
5. Verify lint passes: `pnpm check`
6. Run unit tests to establish baseline: `pnpm test`

Report the results of each step. If any step fails, diagnose and fix the issue before proceeding.
```

---

## Prompt 2: Set Up Anthropic Provider

```
I need to configure Hex to use Anthropic as a provider. My API key is: [PASTE_KEY_HERE]

Please do the following:

1. Add the API key to the Hex env file (~/.hex/.env):
   Add the line: ANTHROPIC_API_KEY=[key]

   Alternatively, use the interactive CLI:
   pnpm hex configure
   and choose "Anthropic API key".

2. Verify the provider is configured:
   pnpm hex models status
   This should show "anthropic" with an "api_key" profile.

3. Set Anthropic as the default model:
   pnpm hex models set anthropic/claude-sonnet-4-20250514

4. Probe to verify auth works:
   pnpm hex models status --probe

5. Quick end-to-end test:
   pnpm hex agent --message "Say hello in exactly 5 words"

Report the output of each step.
```

---

## Prompt 3: Set Up OpenAI Provider

```
I need to configure Hex to use OpenAI as a provider. My API key is: [PASTE_KEY_HERE]

Please do the following:

1. Add the API key to the Hex env file (~/.hex/.env):
   Add the line: OPENAI_API_KEY=[key]

   Alternatively, use the interactive CLI:
   pnpm hex configure
   and choose "OpenAI API key".

2. Verify the provider appears:
   pnpm hex models status
   Should show "openai" in auth overview.

3. Set OpenAI as the default model:
   pnpm hex models set openai/gpt-4.1

4. Probe to verify auth works:
   pnpm hex models status --probe

5. Quick end-to-end test:
   pnpm hex agent --message "What is 2+2? Reply with just the number."

6. Switch back to Anthropic as primary:
   pnpm hex models set anthropic/claude-sonnet-4-20250514

Report the output of each step.
```

---

## Prompt 4: Install & Set Up Ollama for Local LLMs (Windows)

```
I need to set up Ollama for local LLM inference on Windows with 8-16GB VRAM.

1. Check if Ollama is installed:
   ollama --version
   If not installed, I need to download from https://ollama.com/download/windows

2. Once Ollama is running, pull recommended models for my VRAM:

   For 8GB VRAM (pick 1-2):
   ollama pull mistral           # 7B - best tool-calling for Hex agents (~5GB)
   ollama pull llama3.3:8b       # 8B - best general purpose (~6GB)
   ollama pull deepseek-r1:8b    # 8B - best reasoning, auto-detected by Hex (~6GB)
   ollama pull qwen3:8b          # 8B - best multilingual + coding (~6GB)

   For 16GB VRAM (also pull these):
   ollama pull phi4:14b          # 14B - strong all-rounder (~10GB)
   ollama pull gemma3:12b        # 12B - efficient Google model (~9GB)

3. Verify Ollama is serving:
   curl http://127.0.0.1:11434/api/tags
   Should return a JSON list of pulled models.

4. Configure Hex to discover Ollama models.
   Add to ~/.hex/.env:
   OLLAMA_API_KEY=ollama-local

   Hex auto-discovers models from http://127.0.0.1:11434/api/tags when this
   env var is set (see src/agents/models-config.providers.ts).

5. Verify Ollama models appear in Hex:
   pnpm hex models status
   Should show "ollama" provider with discovered models.

6. Set a local model as default and test:
   pnpm hex models set ollama/mistral:latest
   pnpm hex agent --message "Hello! What model are you?"

Report the output of each step and which models were pulled.
```

---

## Prompt 5: Run Unit Tests (No API Keys Needed)

```
Run the Hex test suite to verify the codebase works correctly. Unit tests use mocks
and do not require API keys.

1. Full unit test suite:
   pnpm test

2. Provider-specific tests:
   pnpm test -- --reporter=verbose src/agents/models-config.providers.ollama.test.ts
   pnpm test -- --reporter=verbose src/agents/model-auth.test.ts
   pnpm test -- --reporter=verbose src/agents/model-catalog.test.ts
   pnpm test -- --reporter=verbose src/agents/model-compat.test.ts

3. CLI command tests:
   pnpm test -- --reporter=verbose src/commands/models.list.test.ts
   pnpm test -- --reporter=verbose src/commands/models.set.test.ts

4. Auth health tests:
   pnpm test -- --reporter=verbose src/agents/auth-health.test.ts

Report pass/fail counts for each.
```

---

## Prompt 6: Run Live Tests Against Cloud Providers

```
Run the Hex live test suite against real API providers.
Requires ANTHROPIC_API_KEY and OPENAI_API_KEY set in ~/.hex/.env or environment.

On Windows (PowerShell):

1. Run all live tests:
   $env:LIVE = "1"
   pnpm vitest run --config vitest.live.config.ts

2. If specific provider tests are needed:
   $env:LIVE = "1"
   $env:HEX_LIVE_TEST = "1"
   pnpm vitest run --config vitest.live.config.ts src/agents/anthropic.setup-token.live.test.ts

3. Model profile live tests:
   $env:LIVE = "1"
   pnpm vitest run --config vitest.live.config.ts src/agents/models.profiles.live.test.ts

Tests for unconfigured providers skip gracefully.
Report pass/fail/skip counts.
```

---

## Prompt 7: End-to-End Provider Verification

```
Verify all three providers work end-to-end with Hex.

1. Check status across all providers:
   pnpm hex models status --probe

2. Test Anthropic:
   pnpm hex models set anthropic/claude-sonnet-4-20250514
   pnpm hex agent --message "You are being tested. Reply with: ANTHROPIC_OK"

3. Test OpenAI:
   pnpm hex models set openai/gpt-4.1
   pnpm hex agent --message "You are being tested. Reply with: OPENAI_OK"

4. Test Ollama (requires Ollama running locally):
   pnpm hex models set ollama/mistral:latest
   pnpm hex agent --message "You are being tested. Reply with: OLLAMA_OK"

5. Configure fallback chain in ~/.hex/hex.json:
   Set agents.defaults.model to:
   {
     "primary": "anthropic/claude-sonnet-4-20250514",
     "fallbacks": ["openai/gpt-4.1", "ollama/mistral:latest"]
   }
   Keep models.mode as "merge" so all providers stay available.

6. Verify final status:
   pnpm hex models status --probe

Report the response from each provider and the final probe results.
```

---

## Prompt 8: Ollama Model Benchmarking

```
Test which Ollama models work well with Hex's tool-calling and agent features.
Requires Ollama running with models pulled (see Prompt 4).

For each model, set it as default and test basic response quality:

1. Mistral 7B (best tool-calling):
   pnpm hex models set ollama/mistral:latest
   pnpm hex agent --message "What is the current date and time?"

2. Llama 3.3 8B (general purpose):
   pnpm hex models set ollama/llama3.3:8b
   pnpm hex agent --message "Explain recursion in one sentence."

3. DeepSeek R1 8B (reasoning - Hex auto-detects "r1" as reasoning model):
   pnpm hex models set ollama/deepseek-r1:8b
   pnpm hex agent --message "What is 17 * 23? Show your work."

4. Qwen 3 8B (multilingual + coding):
   pnpm hex models set ollama/qwen3:8b
   pnpm hex agent --message "Write a one-line Python function that reverses a string."

For each model, report:
- Did it respond?
- Approximate response latency
- Response quality (coherent, followed instructions, used tools if applicable)

After testing, restore Anthropic as primary:
   pnpm hex models set anthropic/claude-sonnet-4-20250514
```

---

## Prompt 9: Full Test Coverage & Health Check

```
Run the complete Hex verification suite to ensure everything works after
configuring multiple providers.

1. Test coverage:
   pnpm test:coverage
   Thresholds: 70% lines/functions/statements, 55% branches

2. Type-checking:
   pnpm tsgo

3. Lint/format:
   pnpm check

4. Build:
   pnpm build

5. Doctor (overall health check):
   pnpm hex doctor

Report:
- Coverage percentages
- Any test failures
- Any type errors
- Any lint issues
- Doctor output
```

---

## Local LLM Quick Reference

| Model | Params | VRAM | Strength | Command |
|-------|--------|------|----------|---------|
| Mistral 7B | 7B | ~5 GB | Tool-calling, function-calling | `ollama pull mistral` |
| Llama 3.3 8B | 8B | ~6 GB | General purpose, large community | `ollama pull llama3.3:8b` |
| Qwen 3 8B | 8B | ~6 GB | Multilingual, coding | `ollama pull qwen3:8b` |
| DeepSeek R1 8B | 8B | ~6 GB | Reasoning (auto-detected by Hex) | `ollama pull deepseek-r1:8b` |
| Phi-4 14B | 14B | ~10 GB | Strong all-rounder (needs 16 GB) | `ollama pull phi4:14b` |
| Gemma 3 12B | 12B | ~9 GB | Efficient Google model (needs 12 GB+) | `ollama pull gemma3:12b` |

**8 GB VRAM pick:** Mistral 7B (tools) + Llama 3.3 8B (general)
**16 GB VRAM pick:** Add Phi-4 14B or Qwen 3 14B

**Critical:** Model must fit entirely in VRAM. CPU offloading causes up to 11x speed loss.

---

## Environment Variables Reference

```env
# Cloud providers
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...

# Local (Ollama)
OLLAMA_API_KEY=ollama-local

# Live testing
LIVE=1
HEX_LIVE_TEST=1
```

All variables go in `~/.hex/.env` for persistence across sessions.
