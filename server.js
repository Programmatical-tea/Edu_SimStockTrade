// 1. Initialize module dependencies (eg. require express)
const express = require('express');
const app = express();

// 2. Config useful global variables with app.set('name','value')
const port = 8080;

// 3. Configure DatabasePool?
'use strict';
const mysql = require('promise-mysql'); // Library for sending queries to my Database.
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


/* Initializing
DROP TABLE investors_data;
DROP TABLE
TRUNCATE TABLE


*/

// Flag
var Tradable = new Boolean(false)

// Common SQL
const SQL_kakao_inv_data = 'SELECT * FROM `investors_data` WHERE kakao_id = ?'
const SQL_kakao_com_data = 'SELECT * FROM `company_data` WHERE kakao_id = ?'

// Company SQL
const SQL_insert_com_data = 'INSERT INTO `company_data` (kakao_id, name, current_stock_price, fluctuation, numberof_shares, total_assets, ranking) VALUES (?,?,?,?,?,?,?)'
const SQL_insert_com_trades = 'INSERT INTO `company_trades_eachquarter` (name) VALUES (?)'
function SQL_insert_com_to_quarter(column){return `ALTER TABLE current_quarter_trades ADD ${column}_buy int NULL, ${column}_sell int NULL`}
function SQL_insert_com_to_investor(column){return `ALTER TABLE investors_data ADD COLUMN ${column} int NULL`}

// Investor SQL
const SQL_insert_inv_data = 'INSERT INTO `investors_data` (kakao_id, name, owned_capital, owned_stock, total_assets, ranking) VALUES (?,?,?,?,?,?)'
const SQL_insert_inv_to_quarter = 'INSERT INTO `current_quarter_trades` (name) VALUES (?)'

// Message 
function investors_data_string(values){
  // Values are inputted as object
  const investors_keys = Object.keys(values)
  return `${values[investors_keys[1]]} 님의 정보는 다음과 같습니다.
  
  현재 보유자본(KRW): ${values[investors_keys[2]]}
  현재 보유주식(KRW): ${values[investors_keys[3]]}
  
  총 자산(KRW): ${values[investors_keys[4]]}

  자산 순위: ${values[investors_keys[5]]}

  각 회사별 주식 수:
  ` + extra_investors(values, investors_keys);
}

function extra_investors(values, investors_keys){
  let temp_str = "각 회사별 주식 수: ";
  for(let i = 6; i < investors_keys.length; i++){
    temp_str += `
    ${investors_keys[i]} 주식: ${values[investors_keys[i]]}개`
  }
  return temp_str;
}

function company_data_string(values){
  const company_keys = Object.keys(values)
  temp.push(values);
  return `${values[company_keys[1]]} 님의 정보는 다음과 같습니다.
  
  현재 주가(KRW): ${values[company_keys[2]]}

  등락(KRW): ${values[company_keys[3]]}

  총 주식 수량: ${values[company_keys[4]]}

  총 자산: ${values[company_keys[5]]}

  자산 순위: ${values[company_keys[6]]}위
  `
}



// Common Function

function Query_with_SQLstring(connection, sqlstring, values = []){
  // Returns a Promise (Database Query)
  // Inserts data only in specified columns
  // Values must be taken in as an array
  // Its an async function, to utilze the res, use .then((res)=>{}). 
  return new Promise((resolve, reject) => {
    connection.query(sqlstring, values, (err, res) => {
      if(err) throw err;
      else resolve(res);
    })
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


///////// Scenario 1: Register //////////

var temp = new Array();

app.post('/register', (req,res) => {  // 서버URL/register 로 HTTP POST 리퀘스트를 받았을때, 아래 코드를 실행해라 라는 조건문임. 
  // HTTP POST를 읽는 이유는 Kakao bot에서 API로 보내는 리퀘스트가 POST 이기 때문이다. 이건 카카오톡 스킬 관련된 문서에 나와있음.
  // API는 간단하게 HTTP 요청을 받고 답변을 리턴하는 서버. 

  // Read The JSON to see if it is 기업 or 투자
  // req.body["action"]["params"]["team_name"]["value"] = "투자자" or "기업체"
  
  // If the Game has Already started, take no more.
  // res.status(200).send(Kakao_plaintext_response("게임이 이미 시작했습니다. 관리자에게 문의하시기 바랍니다."));
  
  // For each case, Get a connection from the pool and perform the query the necessary strings.
  if (Tradable == True){
    res.status(200).send(Kakao_plaintext_response(`게임이 진행중인 동안에는 등록할 수 없습니다.`));
  }
  else if (req.body["action"]["detailParams"]["team_name"]["value"] === "기업체"){ // 카카오톡 봇이 서버에게 주는 "방금 사용자가 보낸 카톡에 대한 정보" 는 JSON 형식으로 주어진다. 
    // 그 JSON에서 team_name이라는 엔티티 값을 읽는다.
    // 만약에 team_name이 "기업체" 이라면 아래 코드를 실행한다는 조건문임.

    // Get connnection
    pool.getConnection((err, connection) => { 
      // promise-mysql이라는 라이브러리가 있음. 거기서 따온 예시인데, DB랑 연결된 POOL 에서 Connection을 가져오는 함수이다.
      // connection은 DB랑 소통할 수 있는 통로 같은 거다.
      // POOL은 여러개의 Connection이 떠다니는 연못 같은거고, 안쓰이고 있을땐 Pool안에 있다가, 이 함수를 통해서 connection 하나를 Pool에서 꺼내고
      // 그 Connection을 통해서 Query를 보낸 다음
      // 해야 하는 모든 Query를 전달하고 나서 connection을 다시 pool로 돌려놓는다.

      if(err) throw err; // 만약 connection을 가져오는데 실패하면, 에러가 생겻다고 선언. 어떤 에러가 생겼는지 LOG에 적는다.

      // Use the connection!
      // Changing tables company_data, company_trades_eachquarter, current_quarter_trades
      const kakao_id = req.body["userRequest"]["user"]["id"] // 사용자 고유의 카카오톡id가 JSON 내부에 이 위치에 있다. 쓰기편하라고 이렇게 변수에 저장을 함.
      const name = req.body["action"]["detailParams"]["my_name"]["value"] // Making these lines makes debugging easier

      Query_with_SQLstring(connection, SQL_kakao_com_data, new Array(kakao_id)).then((result) => {
        temp.push(result); // testing
        if (result.length != 0){ // result is an array of objects
          temp.push(Query_with_SQLstring(connection, SQL_kakao_com_data, new Array(kakao_id)))
          res.status(200).send(Kakao_plaintext_response(`이미 등록이 되어있는 계정입니다.`));
        } else {
          Query_with_SQLstring(connection,SQL_insert_com_data,new Array(kakao_id,name,10000,0,0,0,1)) // Insert row into company_data // 커넥션을 가지고 query 3개를 보낸다.  
          .then((result) => {Query_with_SQLstring(connection,SQL_insert_com_trades,new Array(name))}) // Insert row into company_trades
          .then((result) => {Query_with_SQLstring(connection,SQL_insert_com_to_investor(name))}) // Insert column into investors_data
          .then((result) => {Query_with_SQLstring(connection,SQL_insert_com_to_quarter(name))})
          .then((result) => {
            res.status(200).send(Kakao_plaintext_response(`성공적으로 등록되었습니다! 반갑습니다 ${req.body["action"]["detailParams"]["my_name"]["value"]} 님!`));
            // 성공적으로 등록이 되었으면 카카오톡 답변을 카카오톡이 이해할수 있는 형식에 맞춰서 보낸다.
            temp.push("Getconnection3")
            connection.release()
            // 그리고 마지막으로 더이상 connection을 안쓸 것이니 pool로 돌려보낸다.
          })
          .catch((err) => {
            // 만약에 에러가 발생했다면 실패 했다고 전달함. 그리고 에러를 LOG에 적는다.
            res.status(200).send(Kakao_plaintext_response(`등록에 실패 했습니다. 관리자에게 연락해주세요.`));
            console.log(err)
          })
        }
      })

    });

    temp.push("GetConnection1");
  }

  else if (req.body["action"]["detailParams"]["team_name"]["value"] === "투자자"){ 

    pool.getConnection((err, connection) => { 

      if(err) throw err; 
      const kakao_id = req.body["userRequest"]["user"]["id"] // 사용자 고유의 카카오톡id가 JSON 내부에 이 위치에 있다. 쓰기편하라고 이렇게 변수에 저장을 함.
      const name = req.body["action"]["detailParams"]["my_name"]["value"] // Making these lines makes debugging easier

      Query_with_SQLstring(connection, SQL_kakao_inv_data, new Array(kakao_id)).then((result) => {
        temp.push(result); // testing
        if (result.length != 0){ // result is an array of objects
          temp.push(Query_with_SQLstring(connection, SQL_kakao_inv_data, new Array(kakao_id)))
          res.status(200).send(Kakao_plaintext_response(`이미 등록이 되어있는 계정입니다.`));
        } else {
          Query_with_SQLstring(connection,SQL_insert_inv_data,new Array(kakao_id,name,3000000,0,3000000,1)) // Insert row into investors_data // 커넥션을 가지고 query 3개를 보낸다.  
          .then((result) => {Query_with_SQLstring(connection,SQL_insert_inv_to_quarter,new Array(name))}) // Insert row into current quarter
          .then((result) => {
            res.status(200).send(Kakao_plaintext_response(`성공적으로 등록되었습니다! 반갑습니다 ${req.body["action"]["detailParams"]["my_name"]["value"]} 님!`));
            // 성공적으로 등록이 되었으면 카카오톡 답변을 카카오톡이 이해할수 있는 형식에 맞춰서 보낸다.
            temp.push("Getconnection3")
            connection.release()
            // 그리고 마지막으로 더이상 connection을 안쓸 것이니 pool로 돌려보낸다.
          })
          .catch((err) => {
            // 만약에 에러가 발생했다면 실패 했다고 전달함. 그리고 에러를 LOG에 적는다.
            res.status(200).send(Kakao_plaintext_response(`등록에 실패 했습니다. 관리자에게 연락해주세요.`));
            console.log(err)
          })
        }
      })

    })
  } 
});

///////// Scenario 2: Information //////////

app.post('/information', (req,res) => {

  // Create a Connection
  pool.getConnection((err, connection) => {

    const kakao_id = req.body["userRequest"]["user"]["id"]

    Query_with_SQLstring(connection, SQL_kakao_inv_data, new Array(kakao_id))
    .then((result) => {
      if(result.length != 0) {
        // Investor
        res.status(200).send(Kakao_plaintext_response(investors_data_string(result[0])));
      } else {
        Query_with_SQLstring(connection, SQL_kakao_com_data, new Array(kakao_id)).then((result)=>{
          if(result.length != 0) {
            // Company
            temp.push(result);
            temp.push(Date.now());
            res.status(200).send(Kakao_plaintext_response(company_data_string(result[0])));
          }
          else {
            res.status(200).send(Kakao_plaintext_response("등록이 되어있지 않은 계정입니다."));
          }
        })
      }
    })
  })

})

///////// Scenario 3: Timer //////////
const first_quarter_time_start = new Date("2024-05-27T21:47:00");
const first_quarter_time_end = new Date("2024-05-27T21:54:00");

function Time_Check(){
  setTimeout(()=>{
    if(Date.now() > first_quarter_time_start && Date.now() < first_quarter_time_end){
      Tradable = true;
      Time_Check();
    } else {
      Tradable = false;
      Time_Check();
    }
  }, 1000)
}

Time_Check();

//////// Test Code //////////

// Test1, when receive a post JSON body, add a random row to investors_data, then respond with a copy of the request 02.05 Success

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

app.get('/stop', (req,res)=>{

})

/////////////////////////////

// Test 2



if (require.main === module) {
    app.listen(port);
}