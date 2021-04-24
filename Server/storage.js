const util = require('util');

/**
	Hold the current player and actor state of the server.

	lid == login id. Unique Hw or Login Id generated by client
	sid == user session id (determined by server in current session)
	socket == socket.io socket reference
	aid == actor id as determined by owner (sid-aid is unique identifier)
*/

const storage = ()=>{
	let sessionIdCounter = 0;	//unique way to id a user
	let actorIdCount = 0;	 	//unique way to id an actor

	//socket.io clients
	let clients = [];

	//login id (lid) => uid
	let loginSessionMap = {};

	//sid => socket
	let sessionSocketMap = {};
	let socketSessionMap = {};

	//sid => startup data
	let sessionPlayerMap = {};
	let sessionLoginMap = {};

	//aid => last data
	//sid-alid => aid
	let actorMap = {};
	let sessionActorMap = {};
	let actorSessionLocalToIdMap = {};

	function resetAllData(){
		//array of socket.id
		clients = [];

		//maps
		loginSessionMap = {};
		sessionSocketMap = {};
		socketSessionMap = {};
		sessionPlayerMap = {};
		sessionLoginMap = {};
		actorMap = {};
		sessionActorMap = {};	//user-Actor
		actorSessionLocalToIdMap = {};

		sessionIdCounter = 0;
		actorIdCount = 0;
	}

	function requestNewSessionId(){
		const newId = sessionIdCounter;
		sessionIdCounter++;
		return newId;
	}
	function requestNewActorId(){
		const newId = actorIdCount;
		actorIdCount++;
		return newId;
	}

	//playerStartupData = {userLoginId, (class, playerType)} 
	//where playertype == hardware form e.g. desktop/vr/mobile/observer
	function onNewPlayer(playerStartupData, socket){
		//get a new session id
		let sid = requestNewSessionId();
		playerStartupData.sessionId = sid;

		//map our login id to session id. NB: two users on same computers will clash here
		loginSessionMap[playerStartupData.userLoginId] = sid;

		//store sid<->session maps
		sessionSocketMap[sid] = socket;
		socketSessionMap[socket.id] = sid;
		sessionLoginMap[sid] = playerStartupData.userLoginId;

		//have a way to lookup player startup data

		//remove loginData, should only be visible to server via
		//sessionLoginMap
		delete playerStartupData.userLoginId;	
		sessionPlayerMap[sid] = playerStartupData;

		return sid;
	}

	function currentActors(socket){
		const sid = sessionForSocket(socket);

		//todo: filter

		return actorMap;
	}

	function sessionForSocket(socket){
		return socketSessionMap[socket.id];
	}

	function playerForSession(sid){
		return sessionPlayerMap[sid];
	}
	function socketForSession(sid){
		return sessionSocketMap[sid];
	}

	function onConnection(socket){
		clients.push(socket.id);
		const clientConnectedMsg = 'User connected ' + util.inspect(socket.id) + ', total: ' + clients.length;
		console.log(clientConnectedMsg);
		return clientConnectedMsg;
	}
	function deletePlayer(sid){
		delete sessionPlayerMap[sid];
		const playerSocket = sessionSocketMap[sid];
		delete sessionSocketMap[sid];
		const lid = sessionLoginMap[sid];
		delete sessionLoginMap[sid];
		delete loginSessionMap[lid];

		if(playerSocket){
			//loop through each actor and delete
			if(sessionActorMap[sid]){
				sessionActorMap[sid].forEach( actorData =>{
					deleteActor(actorData, playerSocket);
				});
				delete sessionActorMap[sid];
			}
			else{
				console.log(sid, ' has no sessionActorMap entry.');
			}

			delete socketSessionMap[playerSocket.id];
			
			return true;
		}
		return false;
	}
	function onDisconnect(socket){
		//remove player information
		const sid = sessionForSocket(socket);
		deletePlayer(sid);

		clients.pop(socket.id);
		const clientDisconnectedMsg = 'User disconnected ' + util.inspect(socket.id) + ', total: ' + clients.length;
		console.log(clientDisconnectedMsg);

		return clientDisconnectedMsg;
	}

	function newActor(newActorData, socket){
		//actorSessionUniqueId == sessionId-actorLocalId
		const actorId = requestNewActorId();

		actorSessionLocalToIdMap[newActorData.actorSessionUniqueId] = actorId;

		newActorData.actorId = actorId;
		actorMap[actorId] = newActorData;
		
		//add session => actor list so we can delete all session ones
		if(!sessionActorMap[sessionForSocket(socket)]){
			sessionActorMap[sessionForSocket(socket)] = [];
		}
		sessionActorMap[sessionForSocket(socket)].push(newActorData);

		return actorId;
	}
	function deleteActor(deleteActorData, socket){
		//emit cleanup message to others
		//typically only { actorClass, actorSessionUniqueId, actorId }
		socket.broadcast.emit('onDeleteActor', deleteActorData);

		delete actorMap[deleteActorData.actorId];

		console.log('actor deleted: ' + util.inspect(deleteActorData));
	}

	return {
		requestNewSessionId,
		resetAllData,
		onNewPlayer,
		sessionForSocket,
		newActor,
		playerForSession,
		socketForSession,
		onConnection,
		deletePlayer,
		onDisconnect,
		currentActors
	}
}

exports.storage = storage();