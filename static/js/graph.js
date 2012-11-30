var FILLS = {"design": "#A0B3DB", "programming": "#69CD7C", "mvp": "#EAC117", "finish": "#EAC117", "business": "#CF6465"};
var TIME_FILLS = {"design": "#3B5998", "programming": "#0B7920", "mvp": "#C7A317", "finish": "#C7A317", "business": "#A02422"};
var ARC_RAD = 13;
var CIRCLE_RAD = 18;
var CIRCLE_COLLAPSED = 5;
var VERT_CENTER = 128;

var graph = {"paper": null, "nodes": null};

graph.testgraph = [{"health": 3000, "wave": 0, "out": [2], "class": "design"},
                 {"health": 3000, "wave": 0, "out": [2, 3], "class": "programming"},
                 {"health": 3000, "wave": 1, "out": [4, 5, 6], "class": "design"},
                 {"health": 3000, "wave": 1, "out": [], "class": "design"},
                 {"health": 3000, "wave": 2, "out": [], "class": "programming"},
                 {"health": 3000, "wave": 2, "out": [7], "class": "design"},
                 {"health": 3000, "wave": 2, "out": [8], "class": "business"},
                 {"health": 3000, "wave": 3, "out": [], "class": "design"},
                 {"health": 3000, "wave": 3, "out": [9], "class": "business"},
                 {"health": 3000, "wave": 4, "out": [10, 11], "class": "mvp"},
                 {"health": 3000, "wave": 5, "out": [12], "class": "design"},
                 {"health": 3000, "wave": 5, "out": [13], "class": "programming"},
                 {"health": 3000, "wave": 6, "out": [14, 15], "class": "programming"},
                 {"health": 3000, "wave": 6, "out": [15], "class": "design"},
                 {"health": 3000, "wave": 7, "out": [], "class": "business"},
                 {"health": 3000, "wave": 7, "out": [16], "class": "business"},
                 {"health": 3000, "wave": 8, "out": [], "class": "finish"},
                 ];


                 
graph.init = function(graph_json) {
    graph.paper = Raphael($("#screen_inner").get(0), 576, 256);
    
    //Used to declare arcs
    graph.paper.customAttributes.arc = function (xloc, yloc, value, total, R) {
        if (value >= total) value = total;
        var alpha = 360 / total * value,
            a = (90 - alpha) * Math.PI / 180,
            x = xloc + R * Math.cos(a),
            y = yloc - R * Math.sin(a),
            path;
        if (total == value) {
            path = [
                ["M", xloc, yloc - R],
                ["A", R, R, 0, 1, 1, xloc - 0.01, yloc - R]
            ];
        } else {
            path = [
                ["M", xloc, yloc - R],
                ["A", R, R, 0, +(alpha > 180), 1, x, y]
            ];
        }
        return {
            path: path
        };
    };
    
    graph.generate(graph_json);
    
    for (x in graph.node_data)
        if (graph.node_data[x]["wave"] == 0)
            graph.revealNode(x);
};

graph.makeNode = function(x, y, type) {
    var node = graph.paper.circle(x, y, CIRCLE_RAD);
    
    //Styling
    node.attr({"fill": FILLS[type],
                "stroke": "#F8F8F8",
                "stroke-width": 4});
    
    node.mouseover(function() {
        node.attr("stroke", node.attr("fill"));
    }).mouseout(function() {
        node.attr("stroke", "#F8F8F8");
    });
    
    return node;
}
   
// Adds some completion to the total completion amount   
// This doesn't update the animation
graph.buildNode = function(id, amount) {
   var node = graph.nodes[id][1];
   node.data('completion', node.data('completion') + amount);
}
    
graph.revealNode = function(id) {
    console.log("Revealing node "+id);
    var node = graph.nodes[id];
    node[0].show();
    node[1].show();
    node[2].show();
    node[3].show();
    
    //Generate edges
    for (y in graph.dependencies[id])
    {   
        console.log("Marking edge from "+id+" to "+graph.dependencies[id][y]);
        var fromNode = graph.nodes[graph.dependencies[id][y]][0];
        graph.makeEdge(fromNode, node[0]);
    }
}
    
graph.makeTimer = function(x, y, type, health) {
    var timer = graph.paper.path().attr({
        "stroke": TIME_FILLS[type],
        "stroke-width": 6,
        arc: [x, y, 0, 100, ARC_RAD]
    }).data({"cx": x, "cy": y}).toFront();
    timer.data({"completion": 0, "health": health});
    return timer
}

graph.updateNodes = function() {
    for (id in graph.nodes)
        graph.updateNode(id);
}

//Does animation stuff
graph.updateNode = function(id) {
    var timer = nodes[id][1];
    if (timer.data("completed")) return
    
    var amount = timer.data("completion");   
    if (amount >= timer.data("health")) {
        timer.data("completed", true);
        timer.animate({
            "stroke-width": 18,
            arc: [timer.data("cx"), timer.data("cy"), amount, timer.data("health"), ARC_RAD/1.5]
        }, 150, "<>");
        var node = nodes[id][0];
        
        window.setTimeout(function () {node.animate({"r": CIRCLE_RAD+3, "stroke-width": 0}, 150, "bounce");}, 150);
        
        window.setTimeout(function () { 
            node.animate({"r": CIRCLE_COLLAPSED}, 150, "linear");
            timer.animate({
                "stroke-width": 7,
                arc: [timer.data("cx"), timer.data("cy"), amount, timer.data("health"), CIRCLE_COLLAPSED/1.7]
            }, 150, "<>");
            nodes[id][2].remove();
        }, 300);
        
        engine.node_completed(id);
    }
    else {
        timer.animate({
            arc: [timer.data("cx"), timer.data("cy"), amount, timer.data("health"), ARC_RAD]
        }, 500, "linear");
    }
}


graph.makeEdge = function(fromNode, toNode) {
    var start = [fromNode.attrs.cx, fromNode.attrs.cy];
    var end = [toNode.attrs.cx, toNode.attrs.cy];
    var pathcmd = "M"+start[0]+" "+start[1]+"L"+end[0]+" "+end[1];
    var edge = graph.paper.path(pathcmd).attr({"stroke": "#AAAAAA", "stroke-width": 3}).toBack();
}
    
graph.updateActivity = function(node_id) {
    var activity = graph.activity[node_id];
    if (activity == 0 || graph.nodes[node_id][1].data("completed"))
        activity = "";
    graph.nodes[node_id][3].attr("text", activity);
}
    
graph.generate = function(node_data) {
    //Node format: array of 
    //                  {"health": x, "reqs": [1, 2, 3], "out": [1, 2, 3]}
    var wavelengths = [];
    graph.node_data = node_data;
    graph.activity = [];
    graph.max_wave = 0;
    for (x in node_data)
    {
        if (wavelengths[node_data[x]['wave']] == undefined)
            wavelengths[node_data[x]['wave']] = 1;
        else
            wavelengths[node_data[x]['wave']] += 1;
            
        graph.max_wave = Math.max(node_data[x]['wave'], graph.max_wave);
        graph.activity[x] = 0;
    }
    
    //Generate nodes
    nodes = [];
    var waves_occupied = [];
    for (i = 0; i < wavelengths.length; i++)
        waves_occupied[i] = 0;
    
    //Generate nodes
    for (x in node_data)
    {
        var node = node_data[x];
        var posx = 50 + 60 * node['wave'];
        var posy = VERT_CENTER - (20 * wavelengths[node['wave']]) + 65 * waves_occupied[node['wave']];
        
        var nodeobj = graph.makeNode(posx, posy, node['class']);
        nodeobj.data({"id": x, "activity": 0});
        nodeobj.click(function () {
           ui.nodeClicked(this.data("id"));
        });
        var glowobj = nodeobj.glow({'width': 1, 'offsetx': 1, 'offsety': 1, 'fill': true});
        
        var timerobj = graph.makeTimer(posx, posy, node['class'], node['health']);
        timerobj.data("id", x);
        timerobj.click(function () {
           ui.nodeClicked(this.data("id"));
        });
        timerobj.mouseover(function() {
            var nodeobj = graph.nodes[this.data("id")][0];
            nodeobj.attr("stroke", nodeobj.attr("fill"));
        }).mouseout(function() {
            graph.nodes[this.data("id")][0].attr("stroke", "#F8F8F8");
        });
        
        var textobj = graph.paper.text(posx+20, posy-20, " ");
        textobj.data("id", x);
        
        //MVP Only - display text
        var innerText = null;
        if (node['class'] == "mvp")
             innerText = graph.paper.text(posx, posy, "MVP")
        else if (node['class'] == "finish")
             innerText = graph.paper.text(posx, posy, "END")
        
        if (innerText) {
            innerText.data("id", x);
            innerText.click(function() {
                ui.nodeClicked(this.data("id"));
            });
        }
        
        waves_occupied[node['wave']]++;
        nodes[x] = [nodeobj, timerobj, glowobj, textobj]; 
        if (node['class'] != "mvp" && node['class'] != "finish")
        {
            nodeobj.hide();
            timerobj.hide();
            glowobj.hide();
            textobj.hide();
        }
        
        //TODO: For demo. Remove this
        timerobj.data("completion", 2800);
    }
    
    //Generate dependencies
    graph.dependencies = {};
    for (x in node_data)
    {
        var outnodes = node_data[x]['out'];
        for (n in outnodes)
        {
            if (graph.dependencies[outnodes[n]] === undefined)
                graph.dependencies[outnodes[n]] = [];
            graph.dependencies[outnodes[n]].push(x);
            //console.log(x + " -> "+ outnodes[n]);
        }
    }
    
    graph.nodes = nodes;
}