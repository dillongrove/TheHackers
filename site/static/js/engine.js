
//TEST DATA
var HACKERS = [{'base': {'energy': 4L, 'reliability': 3L, 'productivity': 6L}, 'name': u'Celine Jones', 'id': datastore_types.Key.from_path(u'Hacker', 244L, _app=u'dev~hackulator-app')}, {'base': {'energy': 6L, 'reliability': 6L, 'productivity': 4L}, 'name': u'James Erikson', 'id': datastore_types.Key.from_path(u'Hacker', 249L, _app=u'dev~hackulator-app')}, {'base': {'energy': 4L, 'reliability': 5L, 'productivity': 4L}, 'name': u'Myrtle McAllister', 'id': datastore_types.Key.from_path(u'Hacker', 250L, _app=u'dev~hackulator-app')}, {'base': {'energy': 4L, 'reliability': 6L, 'productivity': 6L}, 'name': u'Carrie Dardar', 'id': datastore_types.Key.from_path(u'Hacker', 251L, _app=u'dev~hackulator-app')}, {'base': {'energy': 6L, 'reliability': 5L, 'productivity': 6L}, 'name': u'Sherri Brunk', 'id': datastore_types.Key.from_path(u'Hacker', 252L, _app=u'dev~hackulator-app')}, {'base': {'energy': 5L, 'reliability': 5L, 'productivity': 5L}, 'name': u'Nila Sallee', 'id': datastore_types.Key.from_path(u'Hacker', 253L, _app=u'dev~hackulator-app')}, {'base': {'energy': 7L, 'reliability': 6L, 'productivity': 7L}, 'name': u'Blanca Daggett', 'id': datastore_types.Key.from_path(u'Hacker', 254L, _app=u'dev~hackulator-app')}, {'base': {'energy': 6L, 'reliability': 6L, 'productivity': 5L}, 'name': u'Joel Magnus', 'id': datastore_types.Key.from_path(u'Hacker', 255L, _app=u'dev~hackulator-app')}];

var NODES = null; //Get from generated graph on init.

function getTime() { return ((new Date()).getTime() / 1000); };

var GAME_SPEED = 500; //ms

//States for the hackers
var STATE_IDLE = "idle";
var STATE_SLEEP = "sleep";
var STATE_ACTIVE = "active";

//Increases/drops per tick
var ENERGY_DRAIN_RATE = 0.05;
var SLEEP_RATE = 0.1;


var engine = {
                gameOver: false,
                progress: [0, 0], //TODO: Set this from the server
             };

//Update all hackers - their stats
//and chip away at the nodes they're working on
engine.update_hackers = function() {
    for (i in HACKERS) {
        hacker = HACKERS[i];
        
        //Update energy
        if (hacker['state'] == STATE_ACTIVE)
            hacker['stats']['energy'] -= ENERGY_DRAIN_RATE;
        
        //Update productivity
        hacker['stats']['productivity'] = hacker['base']['productivity'] * (100 + hacker['stats']['energy'] + hacker['stats']['focus']) / 200;
        
        //Update focus
        if (hacker['stats']['active_node'] != null) {
            var work_time = hacker['stats']['work_start'] - getTime(); //Seconds since start
            hacker['stats']['focus'] = 1.0 - Math.pow(16, -work_time/60.0); //Gets damn close to 100% by 60 seconds of work.
        
            //Update their active node
            var node = engine.nodes[hacker['stats']['active_node']];
            node.data('health', node.data('health') - hacker['stats']['productivity']);
        }
        else {
            hacker['stats']['focus'] = 0;
            hacker['stats']['work_start'] = null;
        }
        
    }
}

//Greys out finished nodes, deassigns hackers, and
//reveals new nodes!
engine.update_nodes = function() {
    for (i in engine.nodes) {
        var node = engine.nodes[i];
        if (node.data('completion') > node.data("health")) //make hackers of completed nodes idle
        {
            var node_hackers = null; //TODO: Get hackers hacking this node
            
            for (j in node_hackers)
                hackers[node_hackers]['stats']['active_node'] = null;
        }
        
        //TODO: Update health ticker
    }
}

//Called async every tick... updates EVERYTHING
engine.update = function() {
    engine.update_hackers();
    engine.update_nodes();
    
    if (!gameOver)
        setTimer(update, engine.GAME_SPEED);
}

engine.start = function(nodes) {
    //Set hacker stats
    for (i in HACKERS) {
        hacker = HACKERS[i];
        hacker["stats"] = {"energy": hacker['base']['energy'],
                           "reliability": hacker['base']['reliability'],
                           "focus": 0.0,
                           "productivity": hacker['base']['productivity'],
                           "work_start": null,
                           "active_node": null};
        hacker["state"] = STATE_IDLE;
    }
    
    engine.nodes = nodes;

    engine.update(); //Start updating
}



