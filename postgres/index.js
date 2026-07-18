const express = require('express');
const app = express();
const port = 3000;
const authMiddleware = require('./authMiddleware');


app.use(express.json());

app.post('/signup', (req, res) => {});
app.post('/signin', (req, res) => {});



app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});