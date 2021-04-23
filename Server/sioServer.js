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

	function onPlayerDeleted(sid){
		//this deletes the player from storage
		storage.onDisconnect(storage.socketForSession(sid));

		//emit cleanup message to others
		socket.broadcast.emit('onPlayerLeft', sid);
		console.log(`onPlayerLeft sessionId: ${sid}`);
	}

	socket.on('disconnect', ()=>{
		onPlayerDeleted(storage.sessionForSocket(socket));
	});

	//Replication

	//echo message to all other clients
	//data should have sid-aid identifier so it know where to
	//get forwarded to
	//e.g. rep object would likely be {'aid':'3-Widget2', 'data':{}}
	socket.on('replicate', data =>{
		if(debugReplicationStream){
			console.dir(data, { depth:null});
		}
		socket.broadcast.emit('onReplicatedData', data);
	});

	//should be requested on startup
	socket.on('newPlayer', (playerStartupData, callback=()=>{}) =>{
		//map userid to socket lookup for later
		const sid = storage.onNewPlayer(playerStartupData, socket);

		console.log(`newPlayer joined: ${playerStartupData.UserloginId}(${socket.id}) as ${sid}`);

		//return the session user id to the caller
		callback(sid);

		//This will trigger the player to spawn a new actor with ownership
		//which will emit a newActor message from them

		//multicast full startup data with sid
		socket.broadcast.emit('onPlayerJoined', storage.playerForSession(sid));

		//Todo: broadcast other already present players latest data
	});

	//remote delete, force someone off typically the 'disconnect variant will be called'
	socket.on('deletePlayer', (sid, callback=()=>{})=>{
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

	socket.on('newActor', (newActorData, callback=()=>{}) =>{
		//store latest data in actor map
		const aid = storage.newActor(newActorData);
		newActorData.actorId = aid;

		console.log('new Actor: ' + aid);

		//return unique actor id to initial caller
		callback(aid);

		//this message spawns the actors with defined extra meta data
		//{ aid, data: {} }
		socket.broadcast.emit('onNewActor', newActorData);
	});

	socket.on('deleteActor', deleteActorData =>{
		//store latest data in actor map
		storage.deleteActor(deleteActorData);

		//emit cleanup message to others
		//typically only { actorSessionUniqueId }
		socket.broadcast.emit('onDeleteActor', deleteActorData);
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
