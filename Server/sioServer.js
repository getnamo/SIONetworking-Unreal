/**
Generic replication server for custom networking using socket.io.
*/

const app = require('express')();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const util = require('util');
const port = 3001;

let clients = [];

//uid => socket
let userSocketMap = {};
let socketUserMap = {};
//uid => startup data
let playerMap = {};

//uid-aid => startup data
let actorMap = {};


io.on('connection', (socket) =>{

	//track connected clients via log
	clients.push(socket.id);
	const clientConnectedMsg = 'User connected ' + util.inspect(socket.id) + ', total: ' + clients.length;
	console.log(clientConnectedMsg);

	function playerCleanup(playerCleanupData){
		//cleanup data
		delete playerMap[playerCleanupData.userId];
		let playerSocket = userSocketMap[playerCleanupData.userId];
		delete userSocketMap[playerCleanupData.userId];
		delete socketUserMap[playerSocket.id];

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
	socket.on('replicate', (data)=>{
		console.dir(data, { depth:null});
		socket.broadcast.emit('onReplicatedData', data);
	});

	//should be requested on startup
	socket.on('newPlayer', (playerStartupData)=>{
		//map userid to socket lookup for later
		userSocketMap[playerStartupData.userId] = socket;
		socketUserMap[socket.id] = playerStartupData.userId;
		playerMap[playerStartupData.userId] = playerStartupData;

		console.log('newPlayer joined: ' + playerStartupData.userId + `(${socket.id})`);
		console.log(playerMap);

		socket.broadcast.emit('onPlayerJoined', playerStartupData);
	});

	socket.on('deletePlayer', playerCleanup);

	socket.on('newActor', (actorStartupData)=>{
		//store latest data in actor map
		actorMap[actorStartupData.userId + '-' + actorStartupData.actorId] = actorStartupData;

		socket.broadcast.emit('onNewActor', actorStartupData);
	});

	socket.on('deleteActor', (actorCleanupData)=>{
		//store latest data in actor map
		delete actorMap[actorStartupData.userId + '-' + actorStartupData.actorId];

		//emit cleanup message to others
		socket.broadcast.emit('onDeleteActor', actorCleanupData);
	});

	//End Replication

	//Voice - temp todo: switch to separate service
	socket.on('replicateVoice', (voiceData)=>{
		socket.broadcast.emi('onVoice', voiceData);
	});
	//End Voice
});


http.listen(port, function(){
	console.log('listening on *:' + port);
});
