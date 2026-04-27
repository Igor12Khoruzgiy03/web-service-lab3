const express = require('express');
const router = express.Router();
const pool = require('../db'); 
const { requireAuth } = require('../auth'); 

// 1. Список нотаток
router.get('/', requireAuth, async (req, res) => {
    try {
        // 1. Отримуємо параметри та ставимо значення за замовчуванням
        let { search, period, sort, limit, page } = req.query;
        
        limit = parseInt(limit) || 10;
        page = parseInt(page) || 1;
        sort = sort === 'oldest' ? 'ASC' : 'DESC';
        const offset = (page - 1) * limit;

        // 2. Базовий SQL запит (Завжди фільтрується по user_id!)
        let sql = `SELECT * FROM notes WHERE user_id = $1`;
        let params = [req.session.userId];
        let paramCount = 1;

        // 3. Додаємо пошук
        if (search) {
            paramCount++;
            sql += ` AND (title ILIKE $${paramCount} OR content ILIKE $${paramCount})`;
            params.push(`%${search}%`);
        }

        // 4. Додаємо фільтр по періоду
        if (period === '7d') {
            sql += ` AND created_at >= NOW() - INTERVAL '7 days'`;
        } else if (period === '30d') {
            sql += ` AND created_at >= NOW() - INTERVAL '30 days'`;
        }

        // 5. Сортування, Ліміт та Пагінація
        sql += ` ORDER BY created_at ${sort} LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
        params.push(limit, offset);

        const result = await pool.query(sql, params);

        // 6. Рахуємо загальну кількість для пагінації 
        const countResult = await pool.query(`SELECT COUNT(*) FROM notes WHERE user_id = $1`, [req.session.userId]);
        const totalNotes = parseInt(countResult.rows[0].count);
        const totalPages = Math.ceil(totalNotes / limit);

        res.render('notes/list', { 
            notes: result.rows, 
            query: req.query, // передаємо назад, щоб форма пам'ятала, що ми ввели
            currentPage: page,
            totalPages: totalPages
        });
    } catch (err) {
        console.error(err);
        res.status(500).send("Помилка сервера");
    }
});

// 2. Форма створення
router.get('/new', requireAuth, (req, res) => {
    res.render('notes/new'); 
});
//экспорт
router.get('/export/csv', requireAuth, async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT title, content, created_at FROM notes WHERE user_id = $1', 
            [req.session.userId]
        );
        
        const fields = ['title', 'content', 'created_at'];
        const { Parser } = require('json2csv');
        const json2csvParser = new Parser({ fields });
        const csv = json2csvParser.parse(result.rows);

        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', 'attachment; filename=my_notes.csv');

        //'\ufeff' для перекладу
        res.send('\ufeff' + csv); 

    } catch (err) {
        console.error(err);
        res.status(500).send("Ошибка при экспорте");
    }
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
