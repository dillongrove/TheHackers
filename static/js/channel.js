var channel = {};
channel.disconnected = false;
var loadTimeout = null;

channel.init = function() {
    try{
        var channel_instance = new goog.appengine.Channel(TOKEN);
        var socket = channel_instance.open();
        socket.onopen = function(){channel.onConnect()};
        socket.onmessage = function(msg){channel.onMessage(msg.data)};
        socket.onerror = function(err) {console.log(err);};
        socket.onclose = function(){channel.onDisconnect()};
    }
    catch(ex){console.log("SocketIO Error: "+ex); }

    loadTimeout = setTimeout(function () {
        $("#connection_failure").show();
    }, 10000);
}

channel.onConnect = function() {
    clearTimeout(loadTimeout);
    console.log('Connected');
}

channel.onMessage = function(msg) {
    var args = jQuery.parseJSON(msg);
    console.log(msg);
    if (args.success === "match found") {
        window.location = "/hackathon";
    }
    else if (100 in args.progress)
    {
        alert("Hackathon was won!");
    }
}

channel.onDisconnect = function() {
    console.log("Websocket disconnected, reconnecting...");
}

channel.quit = function(){
    if (typeof sock !== 'undefined')
        sock.close();
    sock=null;
}