const express = require('express');
const app = express();
const port = 3000;
const authMiddleware = require('./authMiddleware');
const { Pool } = require('pg');
const pool  = new Pool({
    connectionString: 'postgresql://neondb_owner:npg_1V4FTQKEZULR@ep-flat-firefly-ataekle7-pooler.c-9.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require'
})
// pool.connect()

app.use(express.json());

app.post('/signup', async (req, res) => {
    const { username, email, password } = req.body;

    const response = await pool.query('INSERT INTO users (username, email, password) VALUES ($1, $2, $3) RETURNING id', [username, email, password]);

    res.json ({
        message: 'User registered successfully',
        userId: response.rows[0].id
    })
});
app.post('/signin', async (req, res) => {
    const { username, email, password } = req.body;

    const response = await pool.query('SELECT * FROM users WHERE username = $1 AND email = $2 AND password = $3', [username, email, password]);
    const userExists = response.rows[0];
    if(!userExists) {
        return res.status(403).json({ message: 'Invalid credentials' });
    }
    const token = jwt.sign({userId: userExists.id}, 'secret_key', { expiresIn: '1h' });
    res.json({ token });
});



app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});