const crypto = require('crypto');

const generateCertificateId = () => {
  return 'CERT-' + crypto.randomBytes(6).toString('hex').toUpperCase();
};

module.exports = generateCertificateId;
