class Bluetooth {
  async connect(address) {
    console.log(`Simulated Bluetooth connection to ${address}`);
    return { connected: true, address };
  }
}

module.exports = Bluetooth;
