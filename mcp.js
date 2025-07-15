const Bluetooth = require('./bluetooth');

class MCP {
  constructor(devices = []) {
    this.devices = devices;
    this.bluetooth = new Bluetooth();
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

  async connectBluetooth(address) {
    return this.bluetooth.connect(address);
  }
}

module.exports = MCP;
