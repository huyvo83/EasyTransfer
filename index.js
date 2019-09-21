var express = require("express");
var app = express();
var bodyParser = require("body-parser");
require("dotenv").config();
const axios = require("axios");
var path = require('path');
var verified_user = [];
var all_user = [];
var count_message = 0;

let telegram_url_message = "https://api.telegram.org/bot" + process.env.TELEGRAM_API_TOKEN +"/sendMessage";
let telegram_url_doc = "https://api.telegram.org/bot" + process.env.TELEGRAM_API_TOKEN +"/sendDocument";
let openWeatherUrl = process.env.OPENWEATHER_API_URL;
let acceptCommand = ['hi','id','hello'];
let ErrorInDoc = '';
app.use(bodyParser.json());
app.use(
  bodyParser.urlencoded({
    extended: true
  })
);

app.post('/start_bot', function(req, res) {
  const { message } = req.body;
  var initalize_user;
  let reply = "Hi, your id is: ";  
  initalize_user = all_user.indexOf(message.chat.id.toString());
  count_message = count_message + 1;
  console.log('all_user[0]:'+ all_user.length);
  console.log(all_user[0]);
  console.log('message.chat.id is:' + message.chat.id);
  console.log("Count message = " + count_message);
  console.log('initalize_user = ' + initalize_user);
  if (typeof message.text ==="undefined"){
     console.log("text object is empty");
	 console.log(message);
	 return res.end();
  }
  else if(acceptCommand.indexOf(message.text.toLowerCase()) !== -1)	    
	{
		replyMessage(telegram_url_message, reply + message.chat.id, message, res);
	} 
  else if(initalize_user !== -1 && message.text.toLowerCase().includes('y'))
	{
			console.log('create verified = \'Y\'');
			verified_user[initalize_user].verified = 'Y';
			return res.end();
	}
   else{
	   console.log('log here, last else');	   
		return res.end();
  }

});

app.use(express.static(path.resolve('./public')));
app.get('/', function(request, response){
	response.sendFile(path.resolve('./public/index.html'));
	console.log('create index.html');
	
});

//sending verify message to user
app.post('/verify', function(req, res){	
	console.log('/verify part');
    var chat_id = req.body.chat_id.toString(); //received input 1 from client side
    var user_text = 'Do you want to receieve message from EasyTransfer ?';	
	var user_info = {};
	user_info.verify_sent = 'Y';	
	user_info.verified = 'N';
	user_info.chat_id = chat_id;	
    console.log('telegram_url_doc is: ' + telegram_url_doc);

	//add user to the list
	if(all_user.indexOf(chat_id) === -1){		
		console.log('not found user in user array, add to array');
		all_user.push(chat_id);	
		verified_user = [];
		verified_user.push(user_info);
		console.log(all_user[0]);
		console.log(verified_user[0].verify_sent);
		console.log(verified_user[0].verified);
	}
	//if user already in the list
	else{
		console.log('Found user - Do nothing');	
	}		
//	verified_user.push(user_info);

	sendMessage(telegram_url_message, user_text, chat_id, res);			
	
});

app.post('/check_verify', function(req, res){	
    var chat_id = req.body.chat_id.toString(); //received input 1 from client side
	var user_idx = all_user.indexOf(chat_id);
	console.log('/check_verify part');
	console.log(all_user);
	console.log('chat_id in check_verify is: ' + chat_id);
	console.log('user_idx is: ' + user_idx);
	if (user_idx !== -1)
	{
		if (verified_user[user_idx].verified =='Y')
		{
			//found user in all_user log
			console.log('Verified success');
			res.sendStatus(200);	
			
			//return res.end();
		}
		else{
			res.status(400);
			return res.end();
		}
	}		
	else{
		res.status(400);
		return res.end();
	}
});

//sending message or attached document to user
app.post('/send', function(req, res){	
    var chat_id = req.body.chat_id; //received input 1 from client side
    var user_text = req.body.user_text; //received input 2 from client side	
	var url = req.body.url;
    console.log('chat_id is: ' + chat_id);
    console.log('user_text is: ' + user_text);
	console.log('url is: ' + url);
	console.log('url.length is:' + url.length);
	if (url.length == 0)
	{
		console.log('going to send message');
		sendMessage(telegram_url_message, user_text, chat_id, res);
	}
	else
	{
		console.log('going to send document');
		sendDoc(telegram_url_doc, user_text, chat_id, url, res);
		console.log('after send document');
	}	
});

//function to reply message
function replyMessage(url, reply, message, res) {
  axios.post(url, {
    chat_id: message.chat.id,
    text: reply
  }).then(response => {
    console.log("Message posted");
    console.log(message);
	return res.end();
    //res.end("ok");
  })
  .catch(error =>{
    console.log(error);
  });
}

//function to sendMessage to telegram
function sendMessage(url, reply, chat_id, res) {
	console.log("in sendmessage");
  axios.post(url, {
    chat_id: chat_id,
    text: reply
  }).then(response => {
    console.log("Message posted");    
    res.end("ok");
  })
  .catch(error =>{
    throw error;
  });
}

//function to send attached document
function sendDoc(url, reply, chat_id, file_url, res) {
	console.log("in sendDoc");
  axios.post(url, {
    chat_id: chat_id,
    caption: reply,	
	document: file_url
  }).then(response => {
    console.log("Message posted");    
    res.end("ok");
  }).catch(error =>{
	sendMessage(telegram_url_message, reply +'\n File is not supported by Telegram, temporary link provided: \n'+ file_url , chat_id, res);
  });
}

app.listen(3000, function() {
  console.log('Telegram app listening on port 3000!')
})