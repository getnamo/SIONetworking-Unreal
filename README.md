# SIONetworking
Simple echo networking using [Socket.IO Client](https://github.com/getnamo/socketio-client-ue4) and [Global Event System](https://github.com/getnamo/global-event-system-ue4) plugins with [socket.io](https://socket.io/). Allows a multiplayer system that doesn't depend on Unreal's replication system. 

Not likely to be bandwidth optimal, but useful in very custom use cases or where server compute weight, flexibility, and complexity is important.

## Basics

1. Install dependencies in ```Server``` folder via ```npm i```
2. Start server via ```node sioServer```
3. Obtain your Server address
4. Launch your project and drag in ```Content/Replication/SIONetworkCoreActor``` in your map of choice. Set server endpoint in your socket.io client component to match the server you launched (default is ```http://localhost:3001```)
5. Add a SIONetworkComponent to a player pawn. Enable ```IsUserComponent``` in defaults.
6. Your actor's movements will now replicate when you begin play. You may wish to subscribe to ```OnReplicationSync``` via ```ReplicationExtraData``` and adjust movement mode to e.g. custom for synced actor.