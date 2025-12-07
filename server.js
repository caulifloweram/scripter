const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const { OAuth2Client } = require('google-auth-library');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;

const googleClient = GOOGLE_CLIENT_ID ? new OAuth2Client(
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    `${BASE_URL}/api/auth/google/callback`
) : null;

app.use(cors());
app.use(express.json());

// Database setup
const dbPath = path.join(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath);

// Initialize database
db.serialize(() => {
    // Users table
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        password TEXT,
        google_id TEXT UNIQUE,
        name TEXT,
        picture TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
    
    // Create index for google_id
    db.run(`CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id)`);

    // Scripts table
    db.run(`CREATE TABLE IF NOT EXISTS scripts (
        id TEXT PRIMARY KEY,
        user_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        content TEXT NOT NULL,
        date TEXT NOT NULL,
        time INTEGER NOT NULL,
        is_version INTEGER DEFAULT 0,
        parent_id TEXT,
        version_id TEXT,
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (parent_id) REFERENCES scripts(id)
    )`);

    // Create indexes
    db.run(`CREATE INDEX IF NOT EXISTS idx_scripts_user_id ON scripts(user_id)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_scripts_parent_id ON scripts(parent_id)`);
});

// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Access token required' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Invalid or expired token' });
        }
        req.user = user;
        next();
    });
};

// Register endpoint
app.post('/api/register', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        if (password.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters' });
        }

        // Check if user exists
        db.get('SELECT id FROM users WHERE email = ?', [email], async (err, row) => {
            if (err) {
                return res.status(500).json({ error: 'Database error' });
            }

            if (row) {
                return res.status(400).json({ error: 'Email already registered' });
            }

            // Hash password
            const hashedPassword = await bcrypt.hash(password, 10);

            // Create user
            db.run('INSERT INTO users (email, password) VALUES (?, ?)', [email, hashedPassword], function(err) {
                if (err) {
                    return res.status(500).json({ error: 'Failed to create user' });
                }

                // Generate token
                const token = jwt.sign({ userId: this.lastID, email }, JWT_SECRET, { expiresIn: '30d' });

                res.json({ 
                    token, 
                    user: { id: this.lastID, email } 
                });
            });
        });
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Login endpoint
app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        // Find user
        db.get('SELECT * FROM users WHERE email = ?', [email], async (err, user) => {
            if (err) {
                return res.status(500).json({ error: 'Database error' });
            }

            if (!user) {
                return res.status(401).json({ error: 'Invalid email or password' });
            }

            // Verify password
            const validPassword = await bcrypt.compare(password, user.password);
            if (!validPassword) {
                return res.status(401).json({ error: 'Invalid email or password' });
            }

            // Generate token
            const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: '30d' });

            res.json({ 
                token, 
                user: { id: user.id, email: user.email } 
            });
        });
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Get user's scripts
app.get('/api/scripts', authenticateToken, (req, res) => {
    db.all(
        'SELECT * FROM scripts WHERE user_id = ? ORDER BY time DESC',
        [req.user.userId],
        (err, rows) => {
            if (err) {
                return res.status(500).json({ error: 'Database error' });
            }
            res.json(rows.map(row => ({
                id: row.id,
                name: row.name,
                content: row.content,
                date: row.date,
                time: row.time,
                isVersion: row.is_version === 1,
                parentId: row.parent_id,
                versionId: row.version_id
            })));
        }
    );
});

// Save script
app.post('/api/scripts', authenticateToken, (req, res) => {
    const { id, name, content, date, time, isVersion, parentId, versionId } = req.body;

    if (!name || content === undefined) {
        return res.status(400).json({ error: 'Name and content are required' });
    }

    const scriptId = id || Date.now().toString();
    const isVersionInt = isVersion ? 1 : 0;

    db.run(
        `INSERT OR REPLACE INTO scripts (id, user_id, name, content, date, time, is_version, parent_id, version_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [scriptId, req.user.userId, name, content, date || new Date().toLocaleString(), time || Date.now(), isVersionInt, parentId || null, versionId || null],
        function(err) {
            if (err) {
                return res.status(500).json({ error: 'Failed to save script' });
            }
            res.json({ 
                id: scriptId,
                name,
                content,
                date: date || new Date().toLocaleString(),
                time: time || Date.now(),
                isVersion,
                parentId,
                versionId
            });
        }
    );
});

// Delete script
app.delete('/api/scripts/:id', authenticateToken, (req, res) => {
    const scriptId = req.params.id;

    db.run(
        'DELETE FROM scripts WHERE id = ? AND user_id = ?',
        [scriptId, req.user.userId],
        function(err) {
            if (err) {
                return res.status(500).json({ error: 'Failed to delete script' });
            }
            if (this.changes === 0) {
                return res.status(404).json({ error: 'Script not found' });
            }
            // Also delete all versions
            db.run('DELETE FROM scripts WHERE parent_id = ?', [scriptId]);
            res.json({ success: true });
        }
    );
});

// Sync scripts (upload all local scripts)
app.post('/api/scripts/sync', authenticateToken, (req, res) => {
    const { scripts } = req.body;

    if (!Array.isArray(scripts)) {
        return res.status(400).json({ error: 'Scripts must be an array' });
    }

    const errors = [];
    let successCount = 0;

    scripts.forEach((script, index) => {
        const { id, name, content, date, time, isVersion, parentId, versionId } = script;
        const scriptId = id || (Date.now() + index).toString();
        const isVersionInt = isVersion ? 1 : 0;

        db.run(
            `INSERT OR REPLACE INTO scripts (id, user_id, name, content, date, time, is_version, parent_id, version_id)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [scriptId, req.user.userId, name, content, date, time, isVersionInt, parentId || null, versionId || null],
            (err) => {
                if (err) {
                    errors.push({ scriptId, error: err.message });
                } else {
                    successCount++;
                }
            }
        );
    });

    // Wait a bit for all operations to complete
    setTimeout(() => {
        res.json({ 
            success: true, 
            synced: successCount, 
            errors: errors.length > 0 ? errors : undefined 
        });
    }, 500);
});

// Google OAuth - Get auth URL
app.get('/api/auth/google', (req, res) => {
    if (!googleClient) {
        return res.status(503).json({ error: 'Google OAuth not configured' });
    }
    
    const authUrl = googleClient.generateAuthUrl({
        access_type: 'offline',
        scope: ['profile', 'email'],
        prompt: 'consent'
    });
    
    res.json({ authUrl });
});

// Google OAuth - Callback
app.get('/api/auth/google/callback', async (req, res) => {
    if (!googleClient) {
        return res.redirect(`/?error=google_not_configured`);
    }

    const { code } = req.query;
    
    if (!code) {
        return res.redirect(`/?error=no_code`);
    }

    try {
        // Exchange code for tokens
        const { tokens } = await googleClient.getToken(code);
        googleClient.setCredentials(tokens);
        
        // Get user info
        const ticket = await googleClient.verifyIdToken({
            idToken: tokens.id_token,
            audience: GOOGLE_CLIENT_ID
        });
        
        const payload = ticket.getPayload();
        const googleId = payload.sub;
        const email = payload.email;
        const name = payload.name;
        const picture = payload.picture;

        // Find or create user
        db.get('SELECT * FROM users WHERE google_id = ? OR email = ?', [googleId, email], (err, user) => {
            if (err) {
                return res.redirect(`/?error=database_error`);
            }

            if (user) {
                // Update user if needed
                if (!user.google_id) {
                    db.run('UPDATE users SET google_id = ?, name = ?, picture = ? WHERE id = ?', 
                        [googleId, name, picture, user.id]);
                }
                
                const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: '30d' });
                return res.send(`
                    <script>
                        if (window.opener) {
                            window.opener.postMessage({
                                type: 'GOOGLE_AUTH_SUCCESS',
                                token: '${token}',
                                user: { id: ${user.id}, email: '${user.email}', name: '${user.name || name || ''}', picture: '${user.picture || picture || ''}' }
                            }, '*');
                            window.close();
                        } else {
                            window.location.href = '/?token=${token}&email=${encodeURIComponent(user.email)}';
                        }
                    </script>
                `);
            } else {
                // Create new user
                db.run('INSERT INTO users (email, google_id, name, picture) VALUES (?, ?, ?, ?)', 
                    [email, googleId, name, picture], function(err) {
                    if (err) {
                        return res.redirect(`/?error=create_user_failed`);
                    }
                    
                    const token = jwt.sign({ userId: this.lastID, email }, JWT_SECRET, { expiresIn: '30d' });
                    return res.send(`
                        <script>
                            if (window.opener) {
                                window.opener.postMessage({
                                    type: 'GOOGLE_AUTH_SUCCESS',
                                    token: '${token}',
                                    user: { id: ${this.lastID}, email: '${email}', name: '${name || ''}', picture: '${picture || ''}' }
                                }, '*');
                                window.close();
                            } else {
                                window.location.href = '/?token=${token}&email=${encodeURIComponent(email)}';
                            }
                        </script>
                    `);
                });
            }
        });
    } catch (error) {
        console.error('Google OAuth error:', error);
        return res.redirect(`/?error=oauth_failed`);
    }
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'ok',
        googleOAuth: !!googleClient && !!GOOGLE_CLIENT_ID
    });
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    if (googleClient && GOOGLE_CLIENT_ID) {
        console.log('Google OAuth enabled');
    } else {
        console.log('Google OAuth disabled - set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to enable');
    }
});

