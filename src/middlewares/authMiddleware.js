const mockUsers = {
  admin: {
    password: 'admin123',
    role: 'admin',
  },
  user: {
    password: 'user123',
    role: 'user',
  },
};

function decodeToken(token) {
  const json = Buffer.from(token, 'base64').toString('utf8');
  return JSON.parse(json);
}

function createToken(payload) {
  return Buffer.from(JSON.stringify(payload)).toString('base64');
}

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authentication required.',
      },
    });
  }

  const token = authHeader.split(' ')[1];

  try {
    const user = decodeToken(token);

    if (!user || !user.username || !user.role) {
      throw new Error('Invalid token payload');
    }

    req.user = user;
    return next();
  } catch (error) {
    return res.status(401).json({
      error: {
        code: 'INVALID_TOKEN',
        message: 'Provided token is invalid or expired.',
      },
    });
  }
}

function requireAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authentication required.',
      },
    });
  }

  if (req.user.role !== 'admin') {
    return res.status(403).json({
      error: {
        code: 'FORBIDDEN',
        message: 'Admin privileges are required to access this resource.',
      },
    });
  }

  return next();
}

function authenticateCredentials(username, password) {
  const userRecord = mockUsers[username];

  if (!userRecord || userRecord.password !== password) {
    return null;
  }

  const payload = {
    username,
    role: userRecord.role,
  };

  return {
    token: createToken(payload),
    user: payload,
  };
}

module.exports = {
  authMiddleware,
  requireAdmin,
  authenticateCredentials,
};
