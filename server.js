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

createUnixSocketPool().then((res)=>(pool = res));

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
        conn.query('INSERT INTO investors_data (name, owned_capital, owned_stock, total_assets, ranking, 피터팬, MoA, RSEY) VALUES ("권우혁", 1, 2, 3, 4, 5, 6, 7)',(err,res,fields) => {
            if(err) throw err;
            temp = res;
        });
        conn.release();
    });
    const responseBody = {
        version: "2.0",
        template: {
          outputs: [
            {
              simpleImage: {
                imageUrl: "https://t1.daumcdn.net/friends/prod/category/M001_friends_ryan2.jpg",
                altText: "hello I'm Ryan"
              }
            }
          ]
        }
      };
    res.status(200).send(responseBody);
})
app.get('/',(req,res)=>{
    res.send(temp);
})

/////////////////////////////

if (require.main === module) {
    app.listen(port);
}