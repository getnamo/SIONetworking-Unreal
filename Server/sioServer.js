/**
	Generic replication server for custom networking using socket.io.
	Not a robust setup, more of a PoC/R&D
*/

const app = require('express')();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const util = require('util');

//For now we destruct the whole class, todo: wrap up the functionality as a class
let { storage } = require('./storage.js');

/*
userSocketMap,
	socketUserMap,
	playerMap,
	actorMap,
	clients,
	lidMap, 
	requestNewId 
*/

const port = 3001;
const debugReplicationStream = true;

io.on('connection', socket =>{

	//track connected clients via log
	storage.onConnection(socket);
	clients.push(socket.id);

	function onPlayerDeleted(sid){
		//this deletes the player from storage
		storage.onDisconnect(storage.socketForSession(sid));

		//emit cleanup message to others
		socket.broadcast.emit('onPlayerLeft', sid);
		console.log('onPlayerLeft', sid);
	}

	socket.on('disconnect', ()=>{
		onPlayerDeleted(storage.sessionForSocket(socket));
	});

	//Replication

	//echo message to all other clients
	//data should have sid-aid identifier so it know where to
	//get forwarded to
	socket.on('replicate', data =>{
		if(debugReplicationStream){
			console.dir(data, { depth:null});
		}
		socket.broadcast.emit('onReplicatedData', data);
	});

	//should be requested on startup
	socket.on('newPlayer', (playerStartupData, callback) =>{
		//map userid to socket lookup for later
		const sid = storage.onNewPlayer(playerStartupData, socket);

		console.log(`newPlayer joined: ${playerStartupData.loginId}(${socket.id}) as ${sid}`);

		//return the session user id to the caller
		callback(sid);

		//multicast full startup data with sid
		socket.broadcast.emit('onPlayerJoined', playerForSession(sid));
	});

	//remote delete, force someone off typically the 'disconnect variant will be called'
	socket.on('deletePlayer', (sid, callback)=>{
		let forcedSocket = storage.socketForSession(sid);
		onPlayerDeleted(sid);

		if(forcedSocket){
			forcedSocket.disconnect();
			callback(true);
		}
		else{
			callback(false);
		}
	});

	socket.on('newActor', actorStartupData =>{
		//store latest data in actor map
		actorMap[actorStartupData.sessionId + '-' + actorStartupData.actorId] = actorStartupData;

		socket.broadcast.emit('onNewActor', actorStartupData);
	});

	socket.on('deleteActor', actorCleanupData =>{
		//store latest data in actor map
		delete actorMap[actorStartupData.sessionId + '-' + actorStartupData.actorId];

		//emit cleanup message to others
		socket.broadcast.emit('onDeleteActor', actorCleanupData);
	});

	//End Replication

	//Voice - temp todo: switch to separate service
	socket.on('replicateVoice', voiceData =>{
		socket.broadcast.emit('onVoice', voiceData);
	});
	//End Voice

	//Script Replication
	socket.on('syncScript', scriptData =>{
		//should be {path, content}
		if(scriptData.path){
			console.log(scriptData.path, ' script got updated. Rebroadcasting');
			socket.broadcast.emit('onScriptUpdated', scriptData);
		}
	})
});


http.listen(port, function(){
	console.log('listening on *:' + port);
});
