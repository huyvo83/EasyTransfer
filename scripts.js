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
	console.log("error in sending, try sending message");
	sendMessage(telegram_url_message, reply +'\n File is not supported by Telegram, temporary link provided: \n'+ file_url , chat_id, res);
  });
}


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


function writeUserData(phonenumber, firstname, lastname, res) {	
	dataRef.child(phonenumber).set({
		phonenumber: phonenumber,
		firstname: firstname,
		lastname : lastname
	}, function(error) {
    if (error) {
      console.log("Failed to create data");
    } else {
        console.log("Successfull");
    }
	res.end();
  });
}

function readId2(chat_id, res){
	console.log("readId2: " + chat_id);
	return new Promise(function(resolve,reject){
		chatIdRef.child(chat_id).once('value').then(snapshot => {
			if (snapshot.exists()) {
				console.log("found node");		
				resolve(snapshot.val());
			}
			else{
				console.log("cannot find any chat_id");
				reject(Error("It broke"));
			}
			res.end();	
		});		
	});	
}

function deleteChatId(){
	console.log("deleteChatId");
	let current_time = new Date().getTime();
	console.log("current_time is :" + current_time);
	return new Promise(function(resolve, reject){
		chatIdRef.once('value').then(snapshot =>{			
			snapshot.forEach(function(childSnapShot){				
				let childId = readId(childSnapShot.key);
				console.log("foreach chat_id : " + childSnapShot.key);
				childId.then(function(getTimeStamp){
					if ((current_time - getTimeStamp.timestamp) > 180000) {
						console.log("deleting chat_id : " + childSnapShot.key);
						chatIdRef.child(childSnapShot.key).remove();							
					}
				}).then(function(){
					return ;
				});
			});	
		});
	});	
}


function checkNode(){
	console.log("checking node in database");
	return new Promise(function(resolve, reject){
		chatIdRef.once('value').then(snapshot =>{
			if (snapshot.exists()){				
				console.log("found node");	
				console.log("number of child is :" + snapshot.numChildren());
				resolve(snapshot);				
			}
			else{
				console.log("something wrong");
				reject(Error("It broke"));				
			}			
		});		
	});
}