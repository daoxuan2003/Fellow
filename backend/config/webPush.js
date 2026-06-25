const DEFAULT_VAPID_SUBJECT = 'mailto:admin@example.com';

function readWebPushConfig(env = process.env) {
  return {
    publicKey: env.VAPID_PUBLIC_KEY || '',
    privateKey: env.VAPID_PRIVATE_KEY || '',
    subject: env.VAPID_SUBJECT || DEFAULT_VAPID_SUBJECT
  };
}

function formatConfiguredStatus(value) {
  return value ? '已设置' : '未设置';
}

function formatVapidConfigStatus(config) {
  return {
    publicKey: formatConfiguredStatus(config.publicKey),
    privateKey: formatConfiguredStatus(config.privateKey)
  };
}

module.exports = {
  DEFAULT_VAPID_SUBJECT,
  formatVapidConfigStatus,
  readWebPushConfig
};
