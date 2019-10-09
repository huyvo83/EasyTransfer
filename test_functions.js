app.post('/submitName', function(req, res){	
	console.log('/submitName receive');
    var firstname = req.body.firstname; //received input 1 from client side
    var lastname = req.body.lastname; //received input 1 from client side
	var phonenumber = req.body.phonenumber; //received input 1 from client side
	//add user to the list
	console.log("firstname is: " + firstname);
	console.log("lastname is: " + lastname);
	console.log("phonenumber is: " + phonenumber);
	writeUserData(phonenumber, firstname, lastname, res);

});

app.post('/checkNode', function(req, res){	
	console.log('/checkNode receive');
	var phonenumber = req.body.phonenumber; //received input 1 from client side
	//add user to the list
	console.log("phonenumber is: " + phonenumber);
	let readNode = checkNode();
	readNode.then(function(data){				
		console.log("########");		
		data.forEach(function(childSnapShot){
			//let chatId = childSnapShot.key;
			let eachId = readId(childSnapShot.key);
			eachId.then(function(data2){
				console.log("data2.timestamp is : " + data2.timestamp);	
				res.end();
			},function(err){
				console.log(err);							
				res.end();
			});
		});
	},function(err){
		console.log(err);
	})
});

app.post('/checkName', function(req, res){	
	console.log('/checkName receive');
	var phonenumber = req.body.phonenumber; //received input 1 from client side
	//add user to the list
	console.log("phonenumber is: " + phonenumber);
	let readData = readId2(phonenumber,res);
	readData.then(function(data){		
		console.log("data.verified is: " + data.verified);	
	},function(err){
		console.log(err);
	});
	
	//readId2(phonenumber,res);
	console.log("end");	
});

app.post('/deleteNumber', function(req, res){	
	console.log('/deleteNumber receive');
	var phonenumber = req.body.phonenumber; //received input 1 from client side
	//add user to the list
	console.log("phonenumber is: " + phonenumber);
	let readData = readId2(phonenumber,res);
	readData.then(function(data){		
		console.log("deleting phonenumber :" + phonenumber );	
		chatIdRef.child(phonenumber).remove();
		res.end();		
	},function(err){
		console.log(err);
		res.end();
	});

	//readId2(phonenumber,res);
	console.log("end");	
});
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
