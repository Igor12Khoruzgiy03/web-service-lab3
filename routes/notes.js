const express = require('express');
const router = express.Router();
const pool = require('../db'); 
const { requireAuth } = require('../auth'); 

// 1. Список нотаток
router.get('/', requireAuth, async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT * FROM notes WHERE user_id = $1 ORDER BY created_at DESC',
            [req.session.userId]
        );
        res.render('notes/list', { notes: result.rows }); 
    } catch (err) {
        console.error("Помилка БД:", err);
        res.status(500).send("Помилка при завантаженні нотаток");
    }
});

// 2. Форма створення
router.get('/new', requireAuth, (req, res) => {
    res.render('notes/new'); 
});

// 3. Збереження нової нотатки
router.post('/', requireAuth, async (req, res) => {
    const { title, content } = req.body;
    try {
        await pool.query(
            'INSERT INTO notes (user_id, title, content) VALUES ($1, $2, $3)',
            [req.session.userId, title, content]
        );
        res.redirect('/notes');
    } catch (err) {
        res.status(500).send("Не вдалося зберегти нотатку");
    }
});

// 4. Видалення
router.post('/:id/delete', requireAuth, async (req, res) => {
    await pool.query('DELETE FROM notes WHERE id = $1 AND user_id = $2', 
        [req.params.id, req.session.userId]);
    res.redirect('/notes');
});
// 5. Форма редагування (GET)
router.get('/:id/edit', requireAuth, async (req, res) => {
    const result = await pool.query('SELECT * FROM notes WHERE id = $1 AND user_id = $2', 
        [req.params.id, req.session.userId]);
    
    if (result.rows.length === 0) return res.send("Нотатку не знайдено");
    
    res.render('notes/edit', { note: result.rows[0] });
});

// 6. Оновлення нотатки (POST)
router.post('/:id', requireAuth, async (req, res) => {
    const { title, content } = req.body;
    await pool.query(
        'UPDATE notes SET title = $1, content = $2 WHERE id = $3 AND user_id = $4',
        [title, content, req.params.id, req.session.userId]
    );
    res.redirect('/notes');
});
module.exports = router;
