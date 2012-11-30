var FILLS = {"design": "#A0B3DB", "programming": "#69CD7C"};
var TIME_FILLS = {"design": "#3B5998", "programming": "#0B7920"};
var ARC_RAD = 23;
var CIRCLE_RAD = 30;
var VERT_CENTER = 310;

var graph = {"paper": null, "nodes": null};

graph.testgraph = [{"health": 3000, "wave": 0, "out": [2], "class": "design"},
                 {"health": 3000, "wave": 0, "out": [2, 3], "class": "programming"},
                 {"health": 3000, "wave": 1, "out": [4, 5, 6], "class": "design"},
                 {"health": 3000, "wave": 1, "out": [], "class": "design"},
                 {"health": 3000, "wave": 2, "out": [], "class": "programming"},
                 {"health": 3000, "wave": 2, "out": [7], "class": "design"},
                 {"health": 3000, "wave": 2, "out": [8], "class": "design"},
                 {"health": 3000, "wave": 3, "out": [], "class": "design"},
                 {"health": 3000, "wave": 3, "out": [], "class": "design"},
                 ];


                 
graph.init = function(graph_json) {
    graph.paper = Raphael(200, 100, 720, 400);
    
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
};

graph.makeNode = function(x, y, type) {
    var node = graph.paper.circle(x, y, CIRCLE_RAD);
    
    //Styling
    node.attr({"fill": FILLS[type],
                "stroke": "#F8F8F8",
                "stroke-width": 6});
    node.glow({'width': 1, 'offsetx': 1, 'offsety': 1});
    
    return node;
}
   
// Adds some completion to the total completion amount   
// This doesn't update the animation
graph.buildNode = function(id, amount) {
   var node = graph.nodes[id][1];
   node.data('completion', node.data('completion') + amount);
}
    
graph.makeTimer = function(x, y, type, health) {
    var timer = graph.paper.path().attr({
        "stroke": TIME_FILLS[type],
        "stroke-width": 8,
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
    var amount = timer.data("completion");   
    if (amount >= timer.data("health")) {
        timer.animate({
            "stroke-width": 27,
            arc: [timer.data("cx"), timer.data("cy"), amount, timer.data("health"), ARC_RAD/1.8]
        }, 500, "<>");
        var node = nodes[id][0];
        
        window.setTimeout(function () {node.animate({"r": CIRCLE_RAD+5, "stroke-width": 0}, 500, "bounce");}, 500);
        
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
    
graph.generate = function(node_data) {
    //Node format: array of 
    //                  {"health": x, "reqs": [1, 2, 3], "out": [1, 2, 3]}
    var wavelengths = [];
    graph.node_data = node_data;
    for (x in node_data)
    {
        if (wavelengths[node_data[x]['wave']] == undefined)
            wavelengths[node_data[x]['wave']] = 1;
        else
            wavelengths[node_data[x]['wave']] += 1;
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
        var posx = 50 + 100 * node['wave'];
        var posy = VERT_CENTER - (50 * wavelengths[node['wave']]) + 100 * waves_occupied[node['wave']];
        
        var nodeobj = graph.makeNode(posx, posy, node['class']);
        nodeobj.data("id", x);
        nodeobj.click(function () {
           ui.nodeClicked(this.data("id"));
        });
        
        var timerobj = graph.makeTimer(posx, posy, node['class'], node['health']);
        timerobj.data("id", x);
        timerobj.click(function () {
           ui.nodeClicked(this.data("id"));
        });
        
        waves_occupied[node['wave']]++;
        nodes[x] = [nodeobj, timerobj]; 
        timerobj.data("completion", 2800);
    }
    
    //Generate edges
    for (x in node_data) 
    {
        var fromNode = nodes[x][0];
        for (y in node_data[x]['out'])
        {
            var toNode = nodes[node_data[x]['out'][y]][0];
            graph.makeEdge(fromNode, toNode);
        }
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
            console.log(x + " -> "+ outnodes[n]);
        }
    }
    
    graph.nodes = nodes;
}