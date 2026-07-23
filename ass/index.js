const express = require('express');
const env = require('dotenv');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
const app = express();
const bcrypt = require('bcrypt');
const z = require('zod');
const authMiddleware = require('./authMiddleware');

env.config();
const port = process.env.PORT;

app.use(express.json());

const pool = new Pool({
    connectionString: process.env.DATABASE_URL
});

//pool.connect();

const signupSchema = z.object({
    username: z.string().min(3).max(20),
    password: z.string().min(6).max(20)
});
const loginSchema = z.object({
    username: z.string().min(3).max(20),
    password: z.string().min(6).max(20)
});
const transferSchema = z.object({
    accId: z.coerce.number().int().positive(),
    amount: z.coerce.number().positive()
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
    const acc = await pool.query('INSERT INTO account (userid, balance) VALUES ($1, $2)', [user.rows[0].id, 0]);
    res.json ({
        message: 'User registered successfully',
        userid : user.rows[0].id
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
    const isPasswordValid = await bcrypt.compare(password, userExists.rows[0].password);
    if(!isPasswordValid) {
        return res.status(403).json({ message: 'Invalid credentials' });
    }
    const token = jwt.sign({userid: userExists.rows[0].id}, process.env.JWT_SECRET, { expiresIn: '1h' });
    res.json({ message: 'Login successful', token });
});
app.post("/transfer", authMiddleware, async (req, res) => {
    const { success, data, error } = transferSchema.safeParse(req.body);

    if (!success) {
        return res.status(400).json({
            message: "Invalid input",
            errors: error.issues
        });
    }

    const { accId, amount } = data;
    const userid = req.userid;

    const client = await pool.connect();

    try {
        await client.query("BEGIN");

        // Lock sender account
        const senderResult = await client.query(
            `SELECT id, balance
             FROM account
             WHERE userid = $1
             FOR UPDATE`,
            [userid]
        );

        if (senderResult.rows.length === 0) {
            await client.query("ROLLBACK");
            return res.status(404).json({
                message: "Sender account not found"
            });
        }

        const sender = senderResult.rows[0];

        // Prevent self-transfer
        if (sender.id === accId) {
            await client.query("ROLLBACK");
            return res.status(400).json({
                message: "Cannot transfer money to yourself"
            });
        }

        // Lock receiver account
        const receiverResult = await client.query(
            `SELECT id
             FROM account
             WHERE id = $1
             FOR UPDATE`,
            [accId]
        );

        if (receiverResult.rows.length === 0) {
            await client.query("ROLLBACK");
            return res.status(404).json({
                message: "Receiver account not found"
            });
        }

        // Check balance
        if (sender.balance < amount) {
            await client.query("ROLLBACK");
            return res.status(400).json({
                message: "Insufficient balance"
            });
        }

        // Deduct from sender
        await client.query(
            `UPDATE account
             SET balance = balance - $1
             WHERE id = $2`,
            [amount, sender.id]
        );

        // Credit receiver
        await client.query(
            `UPDATE account
             SET balance = balance + $1
             WHERE id = $2`,
            [amount, accId]
        );

        // Fetch updated sender balance
        const updatedBalance = await client.query(
            `SELECT balance
             FROM account
             WHERE id = $1`,
            [sender.id]
        );

        await client.query("COMMIT");

        return res.status(200).json({
            message: "Transfer successful",
            transferredAmount: amount,
            remainingBalance: updatedBalance.rows[0].balance
        });

    } catch (err) {
        await client.query("ROLLBACK");
        console.error(err);

        return res.status(500).json({
            message: "Internal server error"
        });
    } finally {
        client.release();
    }
});

// read endpoints
app.get('/view-balance', authMiddleware, async (req, res) => {
    const userid = req.userid;
    const balance = await pool.query('SELECT balance FROM account WHERE userid = $1', [userid]);
    if(balance.rows.length === 0) {
        return res.status(404).json({ message: 'User not found' });
    }
    res.json({ balance: balance.rows[0].balance });
});
app.get('/view-user', authMiddleware, async (req, res) => {
    const userid = req.userid;
    const username = await pool.query('SELECT username FROM users WHERE id = $1', [userid]);
    res.json({ username: username.rows[0].username });
});
app.get('/view-all-users', authMiddleware, async (req, res) => {
    const allUsers = await pool.query('SELECT username FROM users');
    res.json({ users: allUsers.rows });
});

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
