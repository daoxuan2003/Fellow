function pickAllowedFields(source, allowedFields) {
  if (!source || typeof source !== 'object') {
    return {};
  }

  return allowedFields.reduce((payload, field) => {
    if (Object.prototype.hasOwnProperty.call(source, field) && source[field] !== undefined) {
      payload[field] = source[field];
    }
    return payload;
  }, {});
}

module.exports = {
  pickAllowedFields
};
