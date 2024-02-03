// 1. Initialize module dependencies (eg. require express)
const express = require('express');
const app = express();

// 2. Config useful global variables with app.set('name','value')
const port = 8080;

// 3. Configure DatabasePool?
'use strict';
const mysql = require('promise-mysql');
// createUnixSocketPool initializes a Unix socket connection pool for
// a Cloud SQL instance of MySQL.
const createUnixSocketPool = async config => {
  return mysql.createPool({
    user: 'root', // e.g. 'my-db-user'
    password: 'root', // e.g. 'my-db-password'
    database: 'simstock', // e.g. 'my-database'
    socketPath: '/cloudsql/edusimstocktrade:asia-northeast3:simstock', // e.g. '/cloudsql/project:region:instance'
    // Specify additional properties here.
    ...config,
  });
};
var pool = createUnixSocketPool();

function getConnection(callback){
    pool.getConnection((err,conn) => {
        if(!err) {
            callback(conn);
        }
    });
}

// 4. Configure Middleware with app.use('urlpath', 'callback = middleware functions, array of them, etc')
app.use(express.json()); // allows for parsing of JSON request body

// ? First write all of it in server.js, then organize with filesystem.

//////// Test Code //////////

// Test1, when receive a post JSON body, add a random row to investors_data, then respond with a copy of the request
var temp = [];

app.post('/test', (req,res) => {
    temp = req.body // Already parsed because of line 34
    getConnection((conn)=>{
        conn.query('INSERT INTO investors_data VALUES (`권우혁`, 1, 2, 3, 4, 5, 6, 7);');
        conn.release();
    });
    res.send(JSON.stringify(temp));
})
app.get('/',(req,res)=>{
    res.send(temp);
})

/////////////////////////////

if (require.main === module) {
    app.listen(port);
}