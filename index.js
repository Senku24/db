const express = require('express');
const middleware = require('./middleware');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

const { userModel, todoModel}= require('./models');

const app = express();
const port = 3000;
app.use(express.json());

// let userId = 1;
// let todoId = 1;
// let todos = [];
// let users = [];


app.post('/signup', async (req, res) => {
    const { username, password } = req.body;

    //const userExists = users.find(user => user.username === username);
    const userExists = await userModel.findOne({ username: username});
    if(userExists) {
        return res.status(400).json({ message: 'User already exists' });
    }
    //users.push({ username, password, userId: userId++});
    const newUser = new userModel({ username, password });
    await newUser.save();
    res.status(201).json({ message: 'User created successfully' , user: newUser._id});
});
app.post('/signin', async (req, res) => {
    const { username, password } = req.body;
    const user = await userModel.findOne({ username, password });//test pass
    if(!user) {
        return res.status(400).json({ message: 'Invalid credentials' });
    }
    const token = jwt.sign({ userId: user._id }, 'nix123');
    res.json({ "message": "Signin successful", token });

});
app.post('/todo',middleware, async (req, res) => {
    const userId = req.userId;
    const title = req.body.title;
    const description = req.body.description;
    const newTodo =await  new todoModel({ userId, title, description });
    await newTodo.save();
    res.status(201).json({ message: 'Todo created successfully' });
});

app.get('/todo',middleware, async(req, res) => {
    const userId = req.userId;
    const userTodos = await todoModel.find({ userId });
    res.json(userTodos);
});

app.delete('/todo/:id',middleware, async (req, res) => {
    const userId = req.userId;
    const todoId = req.params.id;
    const todo = await todoModel.findOneAndDelete({ _id: todoId, userId });
    if(!todo) {
        return res.status(404).json({ message: 'Todo not found' });
    }
    res.json({ message: 'Todo deleted successfully' });
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
