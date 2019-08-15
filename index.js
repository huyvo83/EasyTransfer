var express = require("express");
var app = express();
var bodyParser = require("body-parser");
require("dotenv").config();
const axios = require("axios");
app.use(bodyParser.json());
app.use(
  bodyParser.urlencoded({
    extended: true
  })
);
let telegram_url = "https://api.telegram.org/bot" + process.env.TELEGRAM_API_TOKEN +"/sendMessage";
let telegram_document = "https://api.telegram.org/bot" + process.env.TELEGRAM_API_TOKEN +"/sendDocument";

app.post("/start_bot", function(req, res) {
const { message } = req.body;
let reply = "Welcome to telegram weather bot";
let city_check = message.text.toLowerCase().indexOf('/');
if(message.text.toLowerCase().indexOf("Hi") !== -1){
    sendMessage(telegram_url,message,reply,res);
}else{
    reply = "request not understood, please review and try again.";
    sendMessage(telegram_url,message,reply,res);
    return res.end();
}
});

function sendMessage(url, message,reply,res){
axios.post(url, {`chat_id: message.chat.id,`
    text: reply
}).then(response => {
    console.log("Message posted");
    res.end("ok");
}).catch(error =>{
    console.log(error);
});
}