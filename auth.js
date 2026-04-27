const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const pool = require('./db');

// --- КРОК 5: Маршрути автентифікації ---

// Форма реєстрації (GET)
router.get('/register', (req, res) => {
    if (req.session.userId) return res.redirect('/');
    res.send('<h1>Реєстрація</h1><form method="POST"><input name="username" placeholder="Username" required><br><input name="email" type="email" placeholder="Email" required><br><input name="password" type="password" placeholder="Password" required><br><input name="confirmPassword" type="password" placeholder="Confirm Password" required><br><button type="submit">Зареєструватися</button></form>');
});

// Обробка реєстрації (POST)
router.post('/register', async (req, res) => {
    const { username, email, password, confirmPassword } = req.body;

    if (password !== confirmPassword) return res.send("Паролі не співпадають");

    try {
        const hashedPassword = await bcrypt.hash(password, 12);
        await pool.query(
            'INSERT INTO users (username, email, password) VALUES ($1, $2, $3)',
            [username, email, hashedPassword]
        );
        res.redirect('/auth/login');
    } catch (err) {
    console.error("ПОМИЛКА БАЗИ:", err); 
    res.send("Помилка бази даних: " + err.message); 
    }
});

// Форма входу (GET)
router.get('/login', (req, res) => {
    res.send('<h1>Вхід</h1><form method="POST"><input name="email" type="email" placeholder="Email" required><br><input name="password" type="password" placeholder="Password" required><br><button type="submit">Увійти</button></form>');
});

// Обробка входу (POST)
router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);

    if (result.rows.length > 0) {
        const user = result.rows[0];
        const isMatch = await bcrypt.compare(password, user.password);
        if (isMatch) {
            req.session.userId = user.id;
            req.session.username = user.username;
            return res.redirect('/');
        }
    }
    res.send("Невірний email або пароль");
});

// Вихід (POST)
router.post('/logout', (req, res) => {
    req.session.destroy(() => res.redirect('/auth/login'));
});

// --- КРОК 6: Middleware для захисту ---
function requireAuth(req, res, next) {
    if (req.session && req.session.userId) return next();
    res.redirect("/auth/login");
}

module.exports = { authRouter: router, requireAuth };