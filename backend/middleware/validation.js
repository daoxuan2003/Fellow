function cleanString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function parseRegistration(body) {
  const nickname = cleanString(body?.nickname);
  const account = cleanString(body?.account);
  const password = typeof body?.password === 'string' ? body.password : '';

  if (nickname.length < 1 || nickname.length > 30) {
    return { error: '昵称长度需要在 1 到 30 个字符之间' };
  }
  if (account.length < 3 || account.length > 64) {
    return { error: '账号长度需要在 3 到 64 个字符之间' };
  }
  if (password.length < 8 || password.length > 128) {
    return { error: '密码长度需要在 8 到 128 个字符之间' };
  }

  return { value: { nickname, account, password } };
}

function parseLogin(body) {
  const account = cleanString(body?.account);
  const password = typeof body?.password === 'string' ? body.password : '';

  if (!account || account.length > 64 || !password || password.length > 128) {
    return { error: '请输入有效的账号和密码' };
  }

  return { value: { account, password } };
}

function parsePairCode(body) {
  const pairCode = cleanString(body?.pairCode).toUpperCase();

  if (!/^[A-Z0-9]{6}$/.test(pairCode)) {
    return { error: '请输入 6 位字母或数字配对码' };
  }

  return { value: { pairCode } };
}

function createBodyValidator(parser) {
  return (req, res, next) => {
    const result = parser(req.body);
    if (result.error) {
      return res.status(400).json({ success: false, message: result.error });
    }

    req.body = { ...req.body, ...result.value };
    next();
  };
}

function validateUserIdParam(req, res, next) {
  if (!/^[a-fA-F0-9]{24}$/.test(req.params.userId || '')) {
    return res.status(400).json({ success: false, message: '用户 ID 格式无效' });
  }
  next();
}

module.exports = {
  parseRegistration,
  parseLogin,
  parsePairCode,
  validateRegistration: createBodyValidator(parseRegistration),
  validateLogin: createBodyValidator(parseLogin),
  validatePairCode: createBodyValidator(parsePairCode),
  validateUserIdParam
};
