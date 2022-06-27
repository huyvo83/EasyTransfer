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
var OtpRef = database.ref('OTP/');

let telegram_url_message = "https://api.telegram.org/bot" + process.env.TELEGRAM_API_TOKEN +"/sendMessage";
let telegram_url_doc = "https://api.telegram.org/bot" + process.env.TELEGRAM_API_TOKEN +"/sendDocument";
let acceptCommand = ['hi','id','hello'];
app.use(bodyParser.json());
app.use(
  bodyParser.urlencoded({
    extended: true
  })
);

app.use(express.static(path.resolve('./public')));
app.get('/', function(request, response){
	response.sendFile(path.resolve('./public/index.html'));
	console.log('create index.html');
});

app.post('/start_bot', function(req, res) {
	const { message } = req.body;
	let reply = "Hi, your token is: ";    
	//let retrieveID = readId(message.chat.id); 
	(async() => {
		let getOtp = await getOtpforChatId(message.chat.id);	
		console.log('getOtp is : ' + getOtp);    
		count_message = count_message + 1;
		console.log('message.chat.id is:' + message.chat.id);
		console.log("Count message = " + count_message);

		if (typeof message.text ==="undefined"){
			console.log("text object is empty");
			console.log(message);
			return res.end();
		}
		else if(acceptCommand.indexOf(message.text.toLowerCase()) !== -1)	    
		{
			replyMessage(telegram_url_message, reply + getOtp, message, res);
		} 
		else{   
			return res.end();
		}
	})();	
	
});


//sending message or attached document to user
app.post('/send', function(req, res){	
    var token = req.body.token; //received input 1 from client side
    var user_text = req.body.user_text; //received input 2 from client side	
	var url = req.body.url;
//    console.log('token is: ' + token);
//    console.log('user_text is: ' + user_text);
//	  console.log('url is: ' + url);
//	  console.log('url.length is:' + url.length);
	(async() => {
		let chat_id = await checkToken(token);
		if (chat_id === ''){
			res.status(404).send('Not found');        // HTTP status 404: NotFound	
		}
		else{
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
		}		
	})();
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
	console.log('in sendMessage');
  axios.post(url, {
    chat_id: chat_id,
    text: reply
  }).then(response => {
    console.log("Message posted");    
    res.end("ok");
  })
  .catch(error =>{
	console.log('error in sendMessage');
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


//Testing web service using checkToken function
app.post('/checkToken', function(req, res){	
    var token = req.body.token; //received input 1 from client side		    
	(async() => {
		let tokenStatus = await checkToken(token);
		console.log('tokenStatus is : ' + tokenStatus);
		if(tokenStatus === ''){
			console.log('inside tokenStatus==null');
		}
		else{
			console.log('else part tokenStatus==null');

		}
		return res.end();
	})();		
});

function checkToken(token){
	return new Promise(function(resolve, reject){
		let isTokenValid = false;
		let chat_id = ''
		let current_time = new Date().getTime();
		OtpRef.once('value').then(snapshot => {
			isTokenValid = snapshot.hasChild(token);
			if (isTokenValid === true ){
				//check if token is expired after 2hr
				if (current_time - snapshot.child(token).child('timestamp').val() > 7200000) {
					isTokenValid = false
					console.log("deleting token : " + snapshot.child(token).key);
					OtpRef.child(token).remove();							
				}
				else{
					chat_id = snapshot.child(token).child('chat_id').val();
				}
			}
		}).then(function(){
			resolve(chat_id);
		});		
	});	
}

//Testing web service using checkNode function
app.post('/checkNode', function(req, res){	
    var phonenumber = req.body.phonenumber; //received input 1 from client side		
    //console.log('phonenumber is: ' + phonenumber);	
	checkChatId(phonenumber,res);
	
});

async function checkChatId(phonenumber,res){
	let getOtp = await getOtpforChatId(phonenumber);	
	console.log('getOtp is : ' + getOtp);
	return res.end();
	
}

async function getOtpforChatId(chat_id){
	try {
		let newOtp = await generateOtp();				
		let isChatIdExist = await checkDuplicateId(chat_id);	
//		console.log('isChatIdExist is : ' + isChatIdExist);				
		await OtpRef.child(newOtp).set({
					chat_id: chat_id,
					timestamp: new Date().getTime()
					}, function(error){
						if(error){
//							console.log("Failed to create data");						
						}
						else{
//							console.log("Successfull create data");
						}		
					});	
		return newOtp;	
	} catch(err){
		console.log(err);
	}		
}

function checkDuplicateId(chat_id){	
	let foundDuplicate = false;
	return new Promise(function(resolve, reject){
		OtpRef.once('value').then(snapshot =>{
            snapshot.forEach(function(childSnapShot){				
                let eachOtp = readOtp(childSnapShot.key);				
                eachOtp.then(function(getChatId){			
					if(chat_id == getChatId.chat_id){
						console.log("Found matched chat_id");
						foundDuplicate = true;
						OtpRef.child(childSnapShot.key).remove();						
					}
					else{
						//console.log("Not match with" + getChatId.chat_id);						
					}
                }).then(function(){
					resolve(foundDuplicate) ;
				});
            });
        });		
	});
}

function generateOtp(){		
	return new Promise(function(resolve, reject){
		let matchOtp = true;			
		OtpRef.once('value').then(snapshot =>{			
			do{
				let randomKey = uniqueKey(6);									
				matchOtp = snapshot.hasChild(randomKey);				
				if(matchOtp == false){					
					resolve(randomKey);
				}
				else{
					console.log('randomKey is dupplicate: ' + randomKey);			
					//reject(Error("duplicate randomKey"));
				}
			}
			while(matchOtp == true);			
		});								
	});	
}

function readOtp(chat_id){	
	console.log("receive chat_id in readId: " + chat_id);
	return new Promise(function(resolve,reject){
		OtpRef.child(chat_id).once('value').then(snapshot => {
			if (snapshot.exists()) {
				//console.log(snapshot.val());
				//console.log("found node");
				resolve(snapshot.val());		
			}
			else{
				//console.log("something wrong");
				reject(Error("No id in database"));
			}			
		});				
	});
}


// Get unique key by generating random number and map with index of the array
function uniqueKey(keyLength) {

	let characters = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';

	let randstring = '';

    for (let i = 0; i < keyLength; i++) {

        randstring = randstring + characters.charAt(rand(0, characters.length));
    }

    return randstring;
}


// Return random number in range of min and max
function rand(min, max){
    if(min == 0){
        return Math.floor(Math.random() * (max+1)) ;
    }else{
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }
}

app.listen(3000, function() {
  console.log('Telegram app listening on port 3000!')
})