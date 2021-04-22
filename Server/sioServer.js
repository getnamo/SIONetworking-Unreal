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

io.on('connection', socket =>{

	//track connected clients via log
	clients.push(socket.id);
	const clientConnectedMsg = 'User connected ' + util.inspect(socket.id) + ', total: ' + clients.length;
	console.log(clientConnectedMsg);

	function playerCleanup(playerCleanupData){
		//cleanup data
		delete playerMap[playerCleanupData.userId];
		let playerSocket = userSocketMap[playerCleanupData.userId];
		delete userSocketMap[playerCleanupData.userId];

		if(playerSocket){
			delete socketUserMap[playerSocket.id];
		}

		//emit cleanup message to others
		socket.broadcast.emit('onPlayerLeft', playerCleanupData);
		console.log('onPlayerLeft', playerCleanupData);
		console.log(playerMap);
	};

	socket.on('disconnect', ()=>{
		clients.pop(socket.id);
		const clientDisconnectedMsg = 'User disconnected ' + util.inspect(socket.id) + ', total: ' + clients.length;
		//io.emit(chatMessageEvent, clientDisconnectedMsg);
		console.log(clientDisconnectedMsg);

		let cleanupData = {'userId': socketUserMap[socket.id]};
		playerCleanup(cleanupData);
	});

	//Replication

	//echo message to all other clients
	socket.on('replicate', data =>{
		console.dir(data, { depth:null});
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

	socket.on('deletePlayer', playerCleanup);

	socket.on('newActor', actorStartupData =>{
		//store latest data in actor map
		actorMap[actorStartupData.userId + '-' + actorStartupData.actorId] = actorStartupData;

		socket.broadcast.emit('onNewActor', actorStartupData);
	});

	socket.on('deleteActor', actorCleanupData =>{
		//store latest data in actor map
		delete actorMap[actorStartupData.userId + '-' + actorStartupData.actorId];

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
