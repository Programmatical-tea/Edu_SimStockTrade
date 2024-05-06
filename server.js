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

// Pool is created asynchronously
createUnixSocketPool().then((res)=>(pool = res));

// 4. Configure Middleware with app.use('urlpath', 'callback = middleware functions, array of them, etc')
app.use(express.json()); // allows for parsing of JSON request body

// ? First write all of it in server.js, then organize with filesystem.

// MySQL templates
// What Databases are there?
// investors_data (kakao_id, name, owned_capital, owned_stock, total_assets, ranking, 피터팬, MoA, RSEY)
// company_data (kakao_id, name, current_stock_price, fluctuation, numberof_shares, total_assets, ranking)
// company_trades_eachquarter (name, 1_buy, 1_sell, 1_net, 1_price, 2_buy, 2_sell, 2_net, 2_price, 3-1_buy, 3-1_sell, 3-1_net, 3-1_price, 3-2_buy, 3-2_sell, 3-2_net, 3-2_price, 4_buy, 4_sell, 4_net, 4_price, sum)
// current_quarter_trades (피터팬_buy, 피터팬_sell, MoA_buy, MoA_sell, RSEY_buy, RSEY_sell)

var inv_data = "investors_data"
var com_data = "company_data"
var com_trade_eq = "company_trades_eachquarter"
var cur_q_trade = "current_quarter_trades"

var SQL_insert_inv_data = 'INSERT INTO `investors_data` (kakao_id, name, owned_capital, owned_stock, total_assets, ranking) VALUES (?,?,?,?,?,?)'
const SQL_insert_com_data = 'INSERT INTO `company_data` (kakao_id, name, current_stock_price, fluctuation, numberof_shares, total_assets, ranking) VALUES (?,?,?,?,?,?,?)'


///////// Scenario 1: Register //////////

/*
function insert_into_investors_data(connection, kakao_id, name, owned_capital, owned_stock, total_assets, ranking){
  // Returns a Promise. (database query)
  // Inserts data only in specified columns
  return connection.query(, 
  [kakao_id,name,owned_capital,owned_stock,total_assets,ranking], (err,res,fields) => {
    if(err) throw err;
  })
}*/

async function Query_with_SQLstring(connection, sqlstring, values){
  // Returns a Promise (Database Query)
  // Inserts data only in specified columns
  // Values must be taken in as an array
  return connection.query(sqlstring, values, (err, res, fields) => {
    if(err) throw err;
    return res;
  })
}

function Kakao_plaintext_response(message){
  return {
    "version": "2.0",
    "template": {
        "outputs": [
            {
                "simpleText": {
                    "text": message
                }
            }
        ]
    }
}
}

/*function get_columns_db(db){
  // Works only for MySQL Databases!
  return `SHOW COLUMNS FROM ${db}`
}*/

app.post('/register', (req,res) => {
  // Read The JSON to see if it is 기업 or 투자
  // req.body["action"]["params"]["team_name"]["value"] = "투자자" or "기업체"
  
  // If the Game has Already started, take no more.
  // res.status(200).send(Kakao_plaintext_response("게임이 이미 시작했습니다. 관리자에게 문의하시기 바랍니다."));
  
  // For each case, Get a connection from the pool and perform the query the necessary strings.
  
  if (req.body["action"]["detailParams"]["team_name"]["value"] === "기업체"){
    // Get connnection
    pool.getConnection((err, connection) => {
      if(err) throw err;
      // Use the connection!
      // Changing tables company_data, company_trades_eachquarter, current_quarter_trades
      const kakao_id = req.body["userRequest"]["user"]["id"]
      const name = req.body["action"]["detailParams"]["my_name"]["value"]
      //Query_with_SQLstring(connection, SQL_insert_com_data, ) // Insert row into company data
      temp = Query_with_SQLstring(connection,SQL_insert_com_data,new Array(kakao_id,name,10000,0,0,0,1))//.then((res)=>{temp = res})
      //Query_with_SQLstring(connection, ) // Insert row into company_trades
      //Query_with_SQLstring(connection, ) // Insert row into company_quarter_trades

      connection.release();
    });
    res.status(200).send(Kakao_plaintext_response(`성공적으로 등록되었습니다! 반갑습니다 ${req.body["action"]["detailParams"]["my_name"]["value"]} 님!`));
  }
})




//////// Test Code //////////

// Test1, when receive a post JSON body, add a random row to investors_data, then respond with a copy of the request 02.05 Success
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

// Test 2



if (require.main === module) {
    app.listen(port);
}