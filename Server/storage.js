/**
	Hold the current player and actor state of the server.
*/

const storage = ()=>{
	//lid == login id
	//sid == user session id (determined by server in current session)

	let idCounter = 0;

	//socket.io clients
	let clients = [];

	//login id (lid) => uid
	let lidSessionMap = {};

	//sid => socket
	let sessionSocketMap = {};
	let socketSessionMap = {};

	//sid => startup data
	let sessionPlayerMap = {};

	//sid-aid => startup data
	let actorMap = {};

	function resetAllData(){
		//array of socket.id
		clients = [];

		//maps
		loginSessionMap = {};
		sessionSocketMap = {};
		socketSessionMap = {};
		sessionPlayerMap = {};
		actorMap = {};

		idCounter = 0;
	}

	function requestNewUserId(){
		const newId = idCounter;
		idCounter++;
		return newId;
	}

	function onConnection(socket){
		clients.push(socket.id);
	}
	function onDisconnect(socket){
		clients.pop(socket.id);
	}

	function onNewPlayer(playerStartupData){
		loginUidMap[playerStartupData.loginId] = playerStartupData.userId;

		userSocketMap[playerStartupData.userId] = socket;
		socketUserMap[socket.id] = playerStartupData.userId;
		playerMap[playerStartupData.userId] = playerStartupData;
	}

	return {
		requestNewUserId,
		resetAllData,
		onConnection,
		onDisconnect
	}
}

//this will fill exports
exports.resetData();

exports.storage = storage();