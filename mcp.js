class MCP {
  constructor(devices = []) {
    this.devices = devices;
  }

  async broadcast(message) {
    const results = await Promise.allSettled(
      this.devices.map(device => {
        const url = `http://${device.host}:${device.port}/message`;
        return fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message })
        });
      })
    );
    return results;
  }
}

module.exports = MCP;
