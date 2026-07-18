const mongoose = require('mongoose');

mongoose.connect('')

const UserSchema = new mongoose.Schema({
    username: {type: String, required: true, unique: true},
    password: {type: String, required: true}
})

const TodoSchema = new mongoose.Schema({
    userId: {type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true},
    title: {type: String, required: true},
    description: {type: String, required: true}
})

const userModel = mongoose.model('users', UserSchema);
const todoModel = mongoose.model('todos', TodoSchema);


module.exports = {userModel, todoModel};

