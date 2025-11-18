const os = require('os');

function getHotspotIp() {
  const ifaces = os.networkInterfaces();
  for (const name of Object.keys(ifaces)) {
    for (const iface of ifaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal && iface.address.startsWith('10.')) {
        return iface.address;
      }
    }
  }
  return null;
}

module.exports = { getHotspotIp };
