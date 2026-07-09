const express = require('express');
const middleware = require('./middleware');
const jwt = require('jsonwebtoken');
const app = express();
const port = 3000;
app.use(express.json());

let userId = 1;
let todoId = 1;
let todos = [];
let users = [];


app.post('/signup', (req, res) => {
    const { username, password } = req.body;

    const userExists = users.find(user => user.username === username);
    if(userExists) {
        return res.status(400).json({ message: 'User already exists' });
    }
    users.push({ username, password, userId: userId++});
    res.status(201).json({ message: 'User created successfully' });
});
app.post('/signin', (req, res) => {
    const { username, password } = req.body;
    const user = users.find(user => user.username === username && user.password === password);
    if(!user) {
        return res.status(400).json({ message: 'Invalid credentials' });
    }
    const token = jwt.sign({ userId: user.userId }, 'nix123');
    res.json({ "message": "Signin successful", token });

});
app.post('/todo',middleware, (req, res) => {
    const userId = req.userId;
    const title = req.body.title;
    const description = req.body.description;
    const newTodo = { todoId: todoId++, userId, title, description };
    todos.push(newTodo);
    res.status(201).json({ message: 'Todo created successfully' });
});

app.get('/todo',middleware, (req, res) => {
    const userId = req.userId;
    const userTodos = todos.filter(todo => todo.userId === userId);
    res.json(userTodos);
});

app.delete('/todo/:id',middleware, (req, res) => {
    const userId = req.userId;
    const todoId = parseInt(req.params.id);
    const todoIndex = todos.findIndex(todo => todo.todoId === todoId && todo.userId === userId);
    if(todoIndex === -1) {
        return res.status(404).json({ message: 'Todo not found' });
    }
    todos.splice(todoIndex, 1);
    res.json({ message: 'Todo deleted successfully' });
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
