const express = require("express");
const app = express();
const bodyParser = require("body-parser");
require("dotenv").config();
const axios = require("axios");
const path = require('path');
const Promise = require('promise');

var count_message = 0;
var firebase = require("firebase-admin");
var serviceAccount = require("./ServiceAccount.json");

firebase.initializeApp({
  credential: firebase.credential.cert(serviceAccount),
  databaseURL: "https://easytransfer-5d450.firebaseio.com"
});
	
var database = firebase.database();
var dataRef = database.ref('phonenumber/');
var chatIdRef = database.ref('chat_id/');

let telegram_url_message = "https://api.telegram.org/bot" + process.env.TELEGRAM_API_TOKEN +"/sendMessage";
let telegram_url_doc = "https://api.telegram.org/bot" + process.env.TELEGRAM_API_TOKEN +"/sendDocument";
let acceptCommand = ['hi','id','hello'];
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
  let retrieveID = readId(message.chat.id);  
  retrieveID.then(function(data){
	  initalize_user = 1;
  },function(err){
	  initalize_user = -1;	  	 
  });
  count_message = count_message + 1;
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
			updateStatus(message.chat.id);
			return res.end();
	}
   else{   
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
    var user_text = 'Do you want to receive message from EasyTransfer ?';
	//var chat_id2 = req.body.chat_id.toString();	
	let retrieveID = readId(chat_id);
	retrieveID.then(function(data){
		//found user in database - no need to add user again
	},function(err){
		//no chat_id in database, create one
		console.log("create chatID in database");
		createID(chat_id);			
	});	
	sendMessage(telegram_url_message, user_text, chat_id, res);			
});

app.post('/check_verify', function(req, res){
    var chat_id = req.body.chat_id.toString(); //received input 1 from client side
	console.log('chat_id in check_verify is: ' + chat_id);
	let retrieveID = readId(chat_id);
	retrieveID.then(function(data){
		if(data.verified == '1'){
			console.log('Verified success');
			res.sendStatus(200);
		}
		else{
			res.status(400);
			return res.end();
		}		
	},function(err){
			console.log("readId cannot find chatID in database");
			res.status(400);
			return res.end();
	});
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
		console.log('Sending message');
		sendMessage(telegram_url_message, user_text, chat_id, res);
	}
	else
	{
		console.log('Sending Doc');
		sendDoc(telegram_url_doc, user_text, chat_id, url, res);
	}	
});


//Cron job to delete chat_id has been in database for over 2hrs
app.post('/cronJob', function(req, res){	
	console.log('/cronJob');
	let readNode = deleteChatId();
	readNode.then(function(data){				
		res.end();
	});
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
  axios.post(url, {
    chat_id: chat_id,
    caption: reply,	
	document: file_url
  }).then(response => {
    console.log("Message posted");    
    res.end("ok");
  }).catch(error =>{
	console.log("error in sending, try sending message");
	sendMessage(telegram_url_message, reply +'\n File is not supported by Telegram, temporary link provided: \n'+ file_url , chat_id, res);
  });
}

//Checking and return chat_id status
function readId(chat_id){	
	console.log("receive chat_id in readId: " + chat_id);
	return new Promise(function(resolve,reject){
		chatIdRef.child(chat_id).once('value').then(snapshot => {
			if (snapshot.exists()) {
				console.log(snapshot.val());
				console.log("found node");
				resolve(snapshot.val());		
			}
			else{
				console.log("something wrong");
				reject(Error("No id in database"));
			}			
		});				
	});
}

//Create chat_id child
function createID(chat_id){
		chatIdRef.child(chat_id).set({
			chat_id: chat_id,
			verified: '0',
			timestamp: new Date().getTime()
		}, function(error){
				if(error){
					console.log("Failed to create data");						
				}
				else{
					console.log("Successfull create data");
				}		
			});		
}

//Update verified status to 1
function updateStatus(chat_id){
	chatIdRef.child(chat_id).update({
		verified: '1',
		timestamp: new Date().getTime()
	}, function(error){
			if(error){
				console.log("Failed to update data");						
			}
			else{
				console.log("chat_id1 is: " + chat_id + " #.");
				console.log("Successfull update data");
			}		
		});		
}
app.listen(3000, function() {
  console.log('Telegram app listening on port 3000!')
})