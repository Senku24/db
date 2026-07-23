const express = require('express');
const env = require('dotenv');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
const app = express();
const bcrypt = require('bcrypt');
const z = require('zod');
const authMiddleware = require('./authMiddleware');
const port = process.env.PORT;

env.config();
app.use(express.json());

const pool = new Pool({
    connectionString: process.env.DATABASE_URL
});

pool.connect();

const signupSchema = z.object({
    username: z.string().min(3).max(20),
    password: z.string().min(6).max(20)
});
const loginSchema = z.object({
    username: z.string().min(3).max(20),
    password: z.string().min(6).max(20)
});

// create endpoints
app.post('/signup', async (req, res) => {
    const {data , success, error} = signupSchema.safeParse(req.body);
    if(!success) {
        return res.status(402).json({ message: 'Invalid input', error: error.errors });
    }
    const username = data.username;
    const password = data.password;
    const hashedPassword = await bcrypt.hash(password, 10);

    const userExists = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
    if(userExists.rows.length > 0) {
        return res.status(403).json({ message: 'User already exists' });
    }
    const user = await pool.query('INSERT INTO users (username, password) VALUES ($1, $2) RETURNING id', [username, hashedPassword]);

    res.json ({
        message: 'User registered successfully',
        userId : user.rows[0].id
    });
});
app.post('/login', async (req, res) => {
    const {data , success, error}= loginSchema.safeParse(req.body);
    if(!success) {
        return res.status(402).json({ message: 'Invalid input', error: error.errors });
    }
    const username = data.username;
    const password = data.password;

    const userExists = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
    if(userExists.rows.length === 0) {
        return res.status(403).json({ message: 'Invalid credentials' });
    }
    const isPasswordValid = await bcrypt.compare(password, userExists.password);
    if(!isPasswordValid) {
        return res.status(403).json({ message: 'Invalid credentials' });
    }
    const token = jwt.sign({userId: userExists.id}, process.env.JWT_SECRET, { expiresIn: '1h' });
    res.json({ message: 'Login successful', token });
});
app.post('/transfer', authMiddleware, async (req, res) => {});

// read endpoints
app.get('/view-balance', authMiddleware, async (req, res) => {});
app.get('/view-user', authMiddleware, async (req, res) => {});
app.get('/view-all-users', authMiddleware, async (req, res) => {});

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
