const express = require('express');
const app = express();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const z = require('zod');
const port = 3000;
const authMiddleware = require('./authMiddleware');
const { Pool } = require('pg');
const pool  = new Pool({
    connectionString: ''
})
// pool.connect()

app.use(express.json());

const signupSchema = z.object({
    username: z.string().min(3).max(20),
    email: z.string().email(),
    password: z.string().min(6).max(20)
});

app.post('/signup', async (req, res) => {
    const {data, success, error} = signupSchema.safeParse(req.body);
    if(!success) {
        return res.status(402 ).json({ message: 'Invalid input', error: error.errors });
    }
    const username = data.username;
    const email = data.email;
    const password = data.password;
    const hashedpassword = await bcrypt.hash(password, 10);

    const response = await pool.query('INSERT INTO users (username, email, password) VALUES ($1, $2, $3) RETURNING id', [username, email, hashedpassword]);

    res.json ({
        message: 'User registered successfully',
        userId: response.rows[0].id
    })
});
app.post('/signin', async (req, res) => {
    const { username, email} = req.body;
    const password = req.body.password;

    const response = await pool.query('SELECT * FROM users WHERE username = $1 AND email = $2', [username, email]);
    const userExists = response.rows[0];
    if(!userExists) {
        return res.status(403).json({ message: 'Invalid credentials' });
    }
    const isPasswordValid = await bcrypt.compare(password, userExists.password);
    if(!isPasswordValid) {
        return res.status(403).json({ message: 'Invalid credentials' });
    }
    const token = jwt.sign({userId: userExists.id}, 'secret_key', { expiresIn: '1h' });
    res.json({ token });
});



app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});