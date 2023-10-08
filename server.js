var express = require('express');
var app = express();
const port = 3000;

var mysql = require('mysql');


app.use(express.json())

app.get('/register',(req,res)=>{
    res.send("Hello world");
})

if (require.main === module) {
    app.listen(port);
}
