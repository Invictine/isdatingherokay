const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const DATA_PATH = path.join(__dirname, 'data', 'db.json');
const PUBLIC_DIR = path.join(__dirname, 'public');

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', chunk => {
      data += chunk;
      if (data.length > 1e6) {
        req.connection.destroy();
        reject(new Error('Request body too large'));
      }
    });
    req.on('end', () => {
      resolve(data);
    });
    req.on('error', reject);
  });
}

function loadDb() {
  try {
    const raw = fs.readFileSync(DATA_PATH, 'utf-8');
    return JSON.parse(raw);
  } catch (error) {
    return { users: {} };
  }
}

function saveDb(db) {
  fs.writeFileSync(DATA_PATH, JSON.stringify(db, null, 2));
}

function getUserIdFromAuth(req) {
  const authHeader = req.headers['authorization'];
  if (!authHeader) return null;
  const parts = authHeader.split(' ');
  if (parts.length !== 2) return null;
  return parts[1];
}

function sendJson(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(body)
  });
  res.end(body);
}

function serveStatic(req, res) {
  let pathname = url.parse(req.url).pathname;
  if (pathname === '/') {
    pathname = '/index.html';
  }
  const filePath = path.join(PUBLIC_DIR, pathname);
  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    const contentTypes = {
      '.html': 'text/html',
      '.css': 'text/css',
      '.js': 'application/javascript',
      '.json': 'application/json',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.svg': 'image/svg+xml'
    };
    const contentType = contentTypes[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  });
}

function ensureUser(db, userId) {
  if (!db.users[userId]) {
    db.users[userId] = {
      id: userId,
      name: '',
      birthdate: '',
      partners: []
    };
  }
  return db.users[userId];
}

function handleApi(req, res) {
  const parsedUrl = url.parse(req.url, true);
  const method = req.method;

  if (parsedUrl.pathname === '/api/me') {
    const userId = getUserIdFromAuth(req);
    if (!userId) {
      sendJson(res, 401, { error: 'Missing Authorization header' });
      return;
    }
    if (method === 'GET') {
      const db = loadDb();
      const user = ensureUser(db, userId);
      sendJson(res, 200, user);
      return;
    }
    if (method === 'POST') {
      readBody(req)
        .then(body => {
          const payload = body ? JSON.parse(body) : {};
          const db = loadDb();
          const user = ensureUser(db, userId);
          if (typeof payload.name === 'string') {
            user.name = payload.name;
          }
          if (typeof payload.birthdate === 'string') {
            user.birthdate = payload.birthdate;
          }
          ensureUser(db, userId);
          saveDb(db);
          sendJson(res, 200, user);
        })
        .catch(err => {
          sendJson(res, 400, { error: err.message });
        });
      return;
    }
  }

  if (parsedUrl.pathname === '/api/partners') {
    const userId = getUserIdFromAuth(req);
    if (!userId) {
      sendJson(res, 401, { error: 'Missing Authorization header' });
      return;
    }

    if (method === 'GET') {
      const db = loadDb();
      const user = ensureUser(db, userId);
      sendJson(res, 200, user.partners || []);
      return;
    }

    if (method === 'POST') {
      readBody(req)
        .then(body => {
          const payload = body ? JSON.parse(body) : {};
          if (!payload.name || !payload.birthdate || !payload.startDate) {
            throw new Error('Missing required fields');
          }
          const db = loadDb();
          const user = ensureUser(db, userId);
          const partner = {
            id: Date.now().toString(36) + Math.random().toString(36).slice(2),
            name: payload.name,
            birthdate: payload.birthdate,
            startDate: payload.startDate,
            endDate: payload.endDate || '',
            notes: payload.notes || ''
          };
          user.partners = user.partners || [];
          user.partners.push(partner);
          saveDb(db);
          sendJson(res, 201, partner);
        })
        .catch(err => {
          sendJson(res, 400, { error: err.message });
        });
      return;
    }
  }

  if (parsedUrl.pathname === '/api/relationships') {
    if (method === 'GET') {
      const db = loadDb();
      const relationships = Object.values(db.users).flatMap(user => {
        return (user.partners || []).map(partner => ({
          userId: user.id,
          userName: user.name,
          userBirthdate: user.birthdate,
          partner
        }));
      });
      sendJson(res, 200, relationships);
      return;
    }
  }

  sendJson(res, 404, { error: 'Not found' });
}

const server = http.createServer((req, res) => {
  if (req.url.startsWith('/api/')) {
    handleApi(req, res);
  } else {
    serveStatic(req, res);
  }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
