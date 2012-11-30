


function getTime() { return ((new Date()).getTime() / 1000); };

var GAME_SPEED = 500; //ms

//States for the hackers
var STATE_IDLE = "idle";
var STATE_SLEEP = "sleep";
var STATE_ACTIVE = "active";

//Comparison tools
var ENERGY_TIRED = 10;
var ENERGY_EXHAUSTED = 5;

//Increases/drops per tick
var ENERGY_ACTIVE_DRAIN = 1;
var ENERGY_PARASITIC_DRAIN = ENERGY_ACTIVE_DRAIN / 10.0;
var ENERGY_SLEEP_GAIN = 2*ENERGY_ACTIVE_DRAIN;


var engine = {
                gameOver: false,
                progress: [0, 0], //TODO: Set this from the server
                hackers: null
             };

//TEST DATA
engine.DEMO_HACKERS = [{"first_name": "Nancy", "last_name": "Mitchell", "id": "257", "base": {"teamwork": 57, "energy": 20, "productivity": 62}}, {"first_name": "Betty", "last_name": "Woods", "id": "258", "base": {"teamwork": 59, "energy": 51, "productivity": 43}}, {"first_name": "Deangelo", "last_name": "Gonzalez", "id": "259", "base": {"teamwork": 23, "energy": 62, "productivity": 54}}, {"first_name": "John", "last_name": "Clark", "id": "260", "base": {"teamwork": 46, "energy": 44, "productivity": 49}}, {"first_name": "Shawn", "last_name": "Gomez", "id": "261", "base": {"teamwork": 53, "energy": 31, "productivity": 43}}, {"first_name": "Jason", "last_name": "Davis", "id": "262", "base": {"teamwork": 32, "energy": 40, "productivity": 76}}, {"first_name": "Amy", "last_name": "Tritt", "id": "263", "base": {"teamwork": 64, "energy": 52, "productivity": 54}}, {"first_name": "Charles", "last_name": "Minix", "id": "264", "base": {"teamwork": 57, "energy": 41, "productivity": 43}}];
             
//Update all hackers - their stats
//and chip away at the nodes they're working on
engine.update_hackers = function() {
    for (i in engine.hackers) {
        hacker = engine.hackers[i];
        
        //Update energy
        if (hacker['state'] == STATE_ACTIVE)
            hacker['stats']['energy'] -= ENERGY_ACTIVE_DRAIN;
        else if (hacker['state'] == STATE_IDLE) 
            hacker['stats']['energy'] -= ENERGY_PARASITIC_DRAIN;
        else if (hacker['state'] == STATE_SLEEP)
            hacker['stats']['energy'] = Math.min(hacker['stats']['energy'] + ENERGY_SLEEP_GAIN, hacker['base']['energy']);
        
        
        if (hacker['state'] != STATE_SLEEP) {
            //If REALLY tired, set to sleep
            if (hacker['stats']['energy'] < ENERGY_EXHAUSTED) {
                if (hacker['stats']['active_node']) engine.assign_to_node(i, null);
                hacker['state'] = STATE_SLEEP; //TODO: Warn the player
            }
            //If too tired, put to idle 
            else if (hacker['stats']['energy'] < ENERGY_TIRED) {
                if (hacker['stats']['active_node']) engine.assign_to_node(i, null);
                hacker['state'] = STATE_IDLE; //TODO: Warn the player
            }
        }
        
        
        
        //Update focus
        if (hacker['stats']['active_node'] != null) {
            var work_time = getTime() - hacker['stats']['work_start']; //Seconds since start
            hacker['stats']['focus'] = 100*(1.0 - Math.pow(16, -work_time/60.0)); //Gets damn close to 100% by 60 seconds of work.
        
            //Update productivity
            hacker['stats']['productivity'] = hacker['base']['productivity'] * (100 + hacker['stats']['energy'] + hacker['stats']['focus']) / 200;
            
            //Performance hit if not affinity
            if (hacker['talents'].length == 0 ||
                hacker['talents'][0].toLowerCase() != graph.node_data[hacker['stats']['active_node']]['class'])
            {
                hacker['stats']['productivity'] *= 0.5;
            }
            
            //Update their active node
            graph.buildNode(hacker['stats']['active_node'], hacker['stats']['productivity']);
        }
        else {
            hacker['stats']['focus'] = 0;
            hacker['stats']['work_start'] = null;
            hacker['stats']['productivity'] = 0;
        }
        
    }
};

engine.assign_to_node = function(hacker_id, node_id) {
    console.log("Assigning "+hacker_id+" to "+node_id);
    var hacker = engine.hackers[hacker_id];
    
    var activeCount = null;
    var node = null;
    if (node_id == undefined || node_id == null || 
        (engine.unused_dependencies[node_id] && engine.unused_dependencies[node_id].length > 0))
    {
        if (hacker['stats']['active_node']) {
            node = graph.nodes[hacker['stats']['active_node']];
            console.log(node[0]);
            activeCount = parseInt(node[0].data("activity"));
            console.log("ActiveCount:"+activeCount);
            activeCount--;
        }
    
        hacker['state'] = STATE_IDLE;
        hacker['stats']['active_node'] = null;
        return;
    }
    else
    {
        node = graph.nodes[node_id];
        activeCount = parseInt(node[0].data("activity"));
        activeCount++;
    }
    
    //Set active user count
    node[0].data("activity", activeCount);
    if (node[0].data("activity") > 0)
        node[3].attr("text", activeCount);
    else
        node[3].attr("text", " ");
    
    //Don't do anything if too tired or sleeping
    if (hacker['stats']['energy'] < ENERGY_TIRED) {
        //TODO: Warn the user
        return;
    }
    
    hacker['state'] = STATE_ACTIVE;
    hacker['stats']['active_node'] = node_id;
    hacker['stats']['work_start'] = getTime();
    
};

engine.node_completed = function(node_id) {
    for (i in engine.hackers) {
        var hacker = engine.hackers[i];
        if (hacker['stats']['active_node'] != node_id) continue;
        engine.assign_to_node(i, null); //Deassign this user
        
        //Remove used dependencies
        var children = graph.node_data[node_id]['out'];
        for (c in children) {
            var depIndex = engine.unused_dependencies[children[c]].indexOf(node_id);
            engine.unused_dependencies[children[c]].splice(depIndex, 1);
        }
        
        //TODO: Reveal hidden (now workable) nodes
        
        
        //TODO: send progress to server
        var progress_index = engine.users.indexOf(USER);
        console.log(progress_index);
        engine.progress[progress_index] = Math.max(engine.progress[progress_index], graph.node_data[node_id]['wave']/graph.max_wave * 100);
        $.get('/hackathon/node_done/' + engine.progress[progress_index], {}, function(data) {
            console.log(data);
        });
    }
};

//Updates node stats. UI updates are done in graph
engine.update_nodes = function() {
    for (i in engine.nodes) {
        var node = graph.nodes[i][1];
        if (node.data('completion') > node.data("health")) //make hackers of completed nodes idle
        {
            var node_hackers = null; //TODO: Get hackers hacking this node
            
            for (j in node_hackers)
                hackers[node_hackers]['stats']['active_node'] = null;
        }
    }
};

//Called async every tick... updates EVERYTHING
engine.update = function() {
    engine.update_hackers();
    engine.update_nodes();
    ui.updateVisualStats();
    ui.updateMonitors();
    graph.updateNodes();
    if (!engine.gameOver)
        window.setTimeout(engine.update, GAME_SPEED);
};

engine.start = function(nodes, hackers, users) {
    //Set hacker stats
    engine.hackers = hackers;
    engine.users = users;
    for (i in engine.hackers) {
        hacker = engine.hackers[i];
        
        hacker["stats"] = {"energy": hacker['base']['energy'],
                           "reliability": hacker['base']['reliability'],
                           "focus": 0.0,
                           "productivity": hacker['base']['productivity'],
                           "work_start": null,
                           "active_node": null};
        hacker["state"] = STATE_IDLE;
    }
    
    engine.unused_dependencies = graph.dependencies;
    
    engine.update(); //Start updating
};



