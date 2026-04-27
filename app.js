const express = require('express');
const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);
const pool = require('./db');
const { authRouter, requireAuth } = require('./auth');
const notesRouter = require('./routes/notes');
const path = require('path');
const ejs = require('ejs');

const app = express();

app.engine('ejs', ejs.__express);
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.urlencoded({ extended: false }));

app.use(session({
    store: new pgSession({ pool: pool, createTableIfMissing: true }),
    secret: "super_secret_key_123",
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 7 * 24 * 60 * 60 * 1000 }
}));

app.use((req, res, next) => {
    res.locals.sessionUser = req.session.username || null;
    next();
});

app.use('/auth', authRouter);
app.use('/notes', notesRouter); 

app.get('/', requireAuth, (req, res) => {
    res.send(`<h1>Вітаємо, ${res.locals.sessionUser}!</h1><form action="/auth/logout" method="POST"><button type="submit">Вийти</button></form><br><a href="/notes">Перейти до нотаток</a>`);
});

app.listen(3000, () => console.log('Server started on http://localhost:3000'));