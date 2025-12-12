const bcrypt = require('bcryptjs');

// Middleware per verificare l'autenticazione
function requireAuth(req, res, next) {
  if (req.session && req.session.userId) {
    next();
  } else {
    res.status(401).json({
      success: false,
      error: 'Autenticazione richiesta'
    });
  }
}

// Middleware per verificare il ruolo admin
function requireAdmin(req, res, next) {
  if (req.session && req.session.userId && req.session.role === 'admin') {
    next();
  } else {
    res.status(403).json({
      success: false,
      error: 'Accesso negato. Privilegi di amministratore richiesti.'
    });
  }
}

// Middleware per verificare il ruolo (admin o viewer)
function requireRole(roles) {
  return (req, res, next) => {
    if (!req.session || !req.session.userId) {
      return res.status(401).json({
        success: false,
        error: 'Autenticazione richiesta'
      });
    }

    if (roles.includes(req.session.role)) {
      next();
    } else {
      res.status(403).json({
        success: false,
        error: 'Accesso negato. Permessi insufficienti.'
      });
    }
  };
}

// Funzione per verificare la password
async function verifyPassword(plainPassword, hashedPassword) {
  return bcrypt.compare(plainPassword, hashedPassword);
}

// Funzione per hashare la password
function hashPassword(password) {
  return bcrypt.hashSync(password, 10);
}

module.exports = {
  requireAuth,
  requireAdmin,
  requireRole,
  verifyPassword,
  hashPassword
};
