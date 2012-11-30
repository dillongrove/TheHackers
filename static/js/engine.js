


function getTime() { return ((new Date()).getTime() / 1000); };

var GAME_SPEED = 500; //ms

//States for the hackers
var STATE_IDLE = "idle";
var STATE_SLEEP = "sleep";
var STATE_ACTIVE = "active";

//Comparison tools
var ENERGY_EXHAUSTED = 0;

var FOOD_ENERGY_GAIN = {"coffee": 12, "pizza": 6, "soda": 3};

//Increases/drops per tick
var ENERGY_ACTIVE_DRAIN = 0.3;
var ENERGY_PARASITIC_DRAIN = ENERGY_ACTIVE_DRAIN / 10.0;
var ENERGY_SLEEP_GAIN = 1.5*ENERGY_ACTIVE_DRAIN;


var engine = {
                gameOver: false,
                progress: [0, 0], //TODO: Set this from the server
                hackers: null
             };

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

engine.feed_hacker = function(hacker_id, food) {
    console.log("Fed hacker "+hacker_id);
    var energy_gain = FOOD_ENERGY_GAIN[food];
    engine.hackers[hacker_id]['stats']['energy'] = 
        Math.min(engine.hackers[hacker_id]['base']['energy'], 
                engine.hackers[hacker_id]['stats']['energy'] + energy_gain);
};  

engine.assign_to_node = function(hacker_id, node_id) {
    //console.log("Assigning "+hacker_id+" to "+node_id);
    var hacker = engine.hackers[hacker_id];
    
    if (hacker['stats']['active_node']) {
        activeNode = hacker['stats']['active_node']
        graph.activity[activeNode]--;
        graph.updateActivity(activeNode);
    }
    
    if (node_id == undefined || node_id == null || 
        (engine.unused_dependencies[node_id] && engine.unused_dependencies[node_id].length > 0))
    {
        
    
        hacker['state'] = STATE_IDLE;
        hacker['stats']['active_node'] = null;
        return;
    }
    else
    {
        graph.activity[node_id]++;
        graph.updateActivity(node_id);
    }
    
    
    //Don't do anything if too tired or sleeping
    if (hacker['stats']['energy'] < ENERGY_EXHAUSTED) {
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
            var depIndex = engine.unused_dependencies[children[c]].indexOf(""+node_id);
            if (depIndex == -1)
                continue;
            engine.unused_dependencies[children[c]].splice(depIndex, 1);
            
            //Reveal hidden (now workable) nodes
            console.log(engine.unused_dependencies);
            if (engine.unused_dependencies[children[c]].length == 0)
                graph.revealNode(children[c]);
        }
        
        //TODO: send progress to server
        var progress_index = engine.users.indexOf(USER);
        console.log(progress_index);
        engine.progress[progress_index] = Math.max(engine.progress[progress_index], graph.node_data[node_id]['wave']/graph.max_wave * 100);
        console.log("Progress:" +engine.progress[progress_index]);
        $.get('/hackathon/node_done/' + Math.floor(engine.progress[progress_index]), {}, function(data) {
            console.log(data);
        });
    }
    ui.playPop();
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
    ui.updateClasses();
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
    
    engine.unused_dependencies = jQuery.extend(true, {}, graph.dependencies);
    
    engine.update(); //Start updating
};



