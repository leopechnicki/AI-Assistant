---
summary: "Hex Gateway on Android via Termux (repurpose an old phone)"
read_when:
  - Running Hex on an Android phone
  - Setting up Hex in Termux
  - Running a gateway on a phone
  - Repurposing an old Android phone as an AI server
title: "Termux (Android)"
---

# Hex Gateway on Android (Termux)

## Goal

Run a persistent Hex Gateway on any Android phone or tablet using Termux. Repurpose an old phone as a **free, always-on AI server** with built-in battery backup and LTE connectivity.

Perfect for:

- 24/7 Telegram/WhatsApp AI bot on an old phone
- Zero-cost self-hosted gateway (no cloud, no Pi)
- Portable AI assistant with cellular connectivity

## Two Modes

| Mode | What runs on the phone | Ollama location | RAM usage | Best for |
| --- | --- | --- | --- | --- |
| **A: Gateway only** | Hex Gateway | Remote (your PC) | ~200-400 MB | Lightweight, always-on relay |
| **B: Gateway + Ollama** | Hex Gateway + Ollama app | Local (on phone) | ~1-5 GB | Fully self-contained, offline-capable |

## Phone Compatibility

| Phone | RAM | Works? | Notes |
| --- | --- | --- | --- |
| Galaxy S10/S20/S21+ | 6-8 GB | Best | Both modes work well |
| Pixel 4/5/6+ | 6-8 GB | Best | Both modes work well |
| Any flagship (2019+) | 6+ GB | Good | Both modes |
| Mid-range (4 GB) | 4 GB | OK | Gateway-only recommended |
| Budget (2-3 GB) | 2-3 GB | Tight | Gateway-only, may need swap |

**Requirements:** ARM64 (aarch64), Android 7+, 2 GB+ RAM, 500 MB free storage.

## What You Will Need

- Android phone (ARM64, Android 7+)
- **Termux** from [F-Droid](https://f-droid.org/packages/com.termux/) (NOT from Google Play, that version is outdated)
- **Termux:API** addon from [F-Droid](https://f-droid.org/packages/com.termux.api/) (for wakelock and notifications)
- WiFi or mobile data connection
- ~30 minutes

## 1) Install Termux

1. Install [F-Droid](https://f-droid.org/) if you do not have it
2. In F-Droid, search for **Termux** and install it
3. Also install **Termux:API** (for wakelock support)
4. Open Termux and let it set up (takes a minute on first launch)

## 2) Run the Setup Script

The setup script installs Node.js, Hex, and creates all config files.

**Mode A (gateway only, remote Ollama):**

```bash
pkg install -y git
git clone https://github.com/hex/hex.git ~/hex-repo
bash ~/hex-repo/scripts/termux-setup-gateway.sh
```

**Mode B (gateway + local Ollama):**

```bash
pkg install -y git
git clone https://github.com/hex/hex.git ~/hex-repo
bash ~/hex-repo/scripts/termux-setup-gateway.sh --with-ollama
```

The script will prompt you for:

- **Telegram bot token** (get one from [@BotFather](https://t.me/BotFather))
- **Ollama host IP** (Mode A only, your PC's local IP address)

## 3) Configure (Optional)

The setup script creates a config at `~/.hex/hex.json`. Edit it to customize:

```bash
nano ~/.hex/hex.json
```

Key settings:

| Setting | Default | Description |
| --- | --- | --- |
| `models.providers.ollama.baseUrl` | `http://127.0.0.1:11434/v1` | Ollama endpoint (change to PC IP for Mode A) |
| `agents.defaults.model.primary` | `ollama/qwen2.5:7b` | Primary model |
| `gateway.bind` | `loopback` | Network binding (`loopback`, `lan`, or `tailnet`) |
| `gateway.port` | `18789` | Gateway port |

## 4) Start the Gateway

```bash
bash ~/termux-gateway.sh start
```

The runner script handles wakelock, memory limits, and logging automatically.

**Other commands:**

```bash
bash ~/termux-gateway.sh status    # Check if running
bash ~/termux-gateway.sh logs      # View live logs
bash ~/termux-gateway.sh stop      # Stop gateway
bash ~/termux-gateway.sh restart   # Restart
```

## 5) Verify

```bash
# Check gateway status
bash ~/termux-gateway.sh status

# Send a test message to your Telegram bot
# It should respond using Ollama!
```

---

## Mode A: Gateway Only (Remote Ollama)

The phone runs only the Hex Gateway. Model inference happens on your PC (or any machine running Ollama).

### Setup on your PC

Make sure Ollama is running and accessible on your local network:

```bash
# On your PC (Windows/Mac/Linux)
# Ollama must listen on all interfaces, not just localhost
OLLAMA_HOST=0.0.0.0 ollama serve
```

Find your PC's IP address:

```bash
# Windows
ipconfig    # Look for IPv4 Address (e.g., 192.168.1.100)

# Linux/Mac
ip addr     # or ifconfig
```

### Phone config

In `~/.hex/hex.json`, set the Ollama URL to your PC:

```json
{
  "models": {
    "providers": {
      "ollama": {
        "baseUrl": "http://192.168.1.100:11434/v1"
      }
    }
  }
}
```

### Pros and cons

- **Low RAM** (~200-400 MB on phone)
- **Fast responses** (PC GPU handles inference)
- **Requires PC to be on** and on the same network (or use Tailscale)

---

## Mode B: Gateway + Ollama on Phone

Everything runs on the phone. Fully self-contained, works offline.

### Install Ollama for Android

1. Install [Ollama](https://ollama.com/download) from the Play Store or build from source
2. Open the Ollama app and pull a model:
   - **Recommended for phone:** `qwen2.5:3b` (~2 GB RAM, fast)
   - **Better quality:** `qwen2.5:7b` (~4 GB RAM, slower)
   - **Smallest usable:** `llama3.2:1b` (~1 GB RAM, basic)

### Phone config

In `~/.hex/hex.json`, Ollama points to localhost (this is the default):

```json
{
  "models": {
    "providers": {
      "ollama": {
        "baseUrl": "http://127.0.0.1:11434/v1"
      }
    }
  }
}
```

### Model recommendations for phone

| Model | RAM | Speed | Quality | Best for |
| --- | --- | --- | --- | --- |
| `qwen2.5:3b` | ~2 GB | Fast | Good | Daily use on phone |
| `llama3.2:3b` | ~2 GB | Fast | Good | Alternative to Qwen |
| `qwen2.5:7b` | ~4 GB | Moderate | Better | Galaxy S10 (8 GB) can handle it |
| `llama3.1:8b` | ~5 GB | Slow | Good | Only on 8 GB+ phones |

**Tip:** Stick to 3B models for responsive interactions. 7B models work but responses take 10-30 seconds on phone hardware.

### Pros and cons

- **Fully offline** (no PC needed, works on cellular)
- **Higher RAM** (~1-5 GB depending on model)
- **Slower responses** (phone CPU/GPU vs PC GPU)

---

## Keep It Running

Android aggressively kills background apps. These steps keep the gateway alive:

### Disable battery optimization

1. Go to **Settings > Apps > Termux**
2. Tap **Battery** (or "Battery optimization")
3. Set to **Unrestricted** (or "Don't optimize")

Do the same for the **Termux:API** app, and for **Ollama** if using Mode B.

### Wakelock

The runner script automatically acquires a Termux wakelock on start. This prevents Android from sleeping the process. You will see a persistent notification from Termux while the wakelock is active.

### Auto-start on boot (Termux:Boot)

Install [Termux:Boot](https://f-droid.org/packages/com.termux.boot/) from F-Droid, then:

```bash
mkdir -p ~/.termux/boot
cat > ~/.termux/boot/hex-gateway << 'EOF'
#!/data/data/com.termux/files/usr/bin/bash
sleep 10  # Wait for network
bash ~/termux-gateway.sh start
EOF
chmod +x ~/.termux/boot/hex-gateway
```

Now the gateway starts automatically when the phone boots.

### Home screen widget (Termux:Widget)

Install [Termux:Widget](https://f-droid.org/packages/com.termux.widget/) from F-Droid, then:

```bash
mkdir -p ~/.shortcuts
cp ~/hex-repo/scripts/termux-gateway-widget.sh ~/.shortcuts/hex-gateway
chmod +x ~/.shortcuts/hex-gateway
```

Add the Termux:Widget to your home screen for one-tap gateway toggle.

### Keep the phone plugged in

If you are repurposing an old phone as a dedicated server, keep it plugged in. Modern phones handle constant charging fine (battery management circuits prevent overcharging).

---

## Remote Access

### Tailscale (recommended)

Install Tailscale on the phone for secure remote access from anywhere:

1. Install [Tailscale](https://play.google.com/store/apps/details?id=com.tailscale.ipn) from Play Store
2. Sign in and connect
3. Update gateway binding:

```bash
# Edit ~/.hex/hex.json
# Change "bind": "loopback" to "bind": "tailnet"
```

4. Restart the gateway:

```bash
bash ~/termux-gateway.sh restart
```

Now you can access the gateway from any device on your Tailscale network.

### SSH from PC

If you just need occasional access:

```bash
# On your PC, forward the gateway port
ssh -L 18789:localhost:18789 phone-ip
```

---

## Performance Tips

- **Use WiFi** over mobile data when possible (lower latency, no data charges)
- **Close other apps** to free RAM for the gateway and Ollama
- **Use quantized models** (Q4_K_M) for best performance-to-quality ratio on phone
- **Monitor memory:** `bash ~/termux-gateway.sh status` shows current RAM usage
- **Reduce context window** in hex.json if responses are slow (e.g., `"contextWindow": 8192`)

---

## Troubleshooting

### Gateway fails to start

```bash
# Check logs for errors
bash ~/termux-gateway.sh logs

# Common: Ollama not running (Mode B)
# -> Open the Ollama Android app first

# Common: Wrong Ollama IP (Mode A)
# -> Verify your PC IP and that Ollama is listening on 0.0.0.0
curl http://YOUR_PC_IP:11434/api/tags
```

### Out of memory

```bash
# Check available memory
free -h

# Reduce Node.js heap (edit ~/termux-gateway.sh)
# Change: --max-old-space-size=1536
# To:     --max-old-space-size=768

# Use a smaller model (3B instead of 7B)
```

### Termux killed by Android

- Ensure battery optimization is **disabled** for Termux
- Check wakelock: the Termux notification should show "Acquiring wakelock"
- Some manufacturers (Samsung, Xiaomi) have extra battery savers; disable those too
- Install Termux:Boot for auto-restart

### Node.js version too old

```bash
# Check version
node --version

# Update
pkg upgrade nodejs-lts
```

### Native modules fail to build

Some native modules (`sharp`, `node-pty`) may not compile on Termux because it uses Bionic libc instead of glibc. This is fine because:

- `sharp` is only for image processing (not needed for text-based Telegram)
- `node-pty` is only for TUI/terminal features (not needed for gateway)
- The gateway works without these modules

If you need image support, install sharp's system dependency:

```bash
pkg install libvips
npm rebuild sharp
```

### Ollama connection refused

```bash
# Check if Ollama is running
curl http://127.0.0.1:11434/api/tags

# For Mode A (remote), check PC connectivity
curl http://YOUR_PC_IP:11434/api/tags

# If using Mode A, make sure Ollama listens on 0.0.0.0:
# On PC: OLLAMA_HOST=0.0.0.0 ollama serve
```

---

## Cost Comparison

| Setup | One-Time Cost | Monthly Cost | Notes |
| --- | --- | --- | --- |
| **Old phone (Termux)** | $0 | $0 | Repurpose what you have |
| **Pi 4 (4 GB)** | ~$55 | $0 | + PSU, case, SD card |
| **Pi 5 (4 GB)** | ~$60 | $0 | Best Pi performance |
| **DigitalOcean VPS** | $0 | $6/mo | $72/year |
| **Hetzner ARM** | $0 | ~$4/mo | ~$48/year |

**Bonus:** A phone has WiFi, LTE, battery backup, camera, and microphone built in.

---

## See Also

- [Raspberry Pi guide](/platforms/raspberry-pi) -- budget self-hosted on a Pi
- [Linux guide](/platforms/linux) -- general Linux setup
- [Android app](/platforms/android) -- native companion app (connects to remote gateway)
- [Tailscale](/gateway/tailscale) -- remote access
- [Nodes](/nodes) -- pair other devices with your gateway
