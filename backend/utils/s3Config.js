function resolveS3Region(endpoint, configuredRegion) {
  let hostname = '';

  try {
    hostname = new URL(endpoint || '').hostname.toLowerCase();
  } catch {
    hostname = '';
  }

  // 雨云 ROS 的 JavaScript SDK 使用固定的签名区域 rainyun。
  // 旧配置中的 cn-north-1 会让预签名下载链接被对象存储以 403 拒绝。
  if (hostname === 'rains3.com' || hostname.endsWith('.rains3.com')) {
    return 'rainyun';
  }

  return configuredRegion?.trim() || 'us-east-1';
}

module.exports = {
  resolveS3Region
};
