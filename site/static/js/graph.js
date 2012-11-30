var testgraph = [{"health": 3000, "wave": 0, "out": [2], "class": "design"},
                 {"health": 3000, "wave": 0, "out": [2, 3], "class": "programming"},
                 {"health": 3000, "wave": 1, "out": [4, 5, 6], "class": "design"},
                 {"health": 3000, "wave": 1, "out": [], "class": "design"},
                 {"health": 3000, "wave": 2, "out": [], "class": "programming"},
                 {"health": 3000, "wave": 2, "out": [7], "class": "design"},
                 {"health": 3000, "wave": 2, "out": [8], "class": "design"},
                 {"health": 3000, "wave": 3, "out": [], "class": "design"},
                 {"health": 3000, "wave": 3, "out": [], "class": "design"},
                 ];

var paper = null;
function initGraph(graph_json) {
    var paper = Raphael(100, 100, 720, 400);
    
    //Used to declare arcs
    paper.customAttributes.arc = function (xloc, yloc, value, total, R) {
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
    
    var nodes = generateGraph(graph_json);
   
};

var FILLS = {"design": "#A0B3DB", "programming": "#69CD7C"};
var TIME_FILLS = {"design": "#3B5998", "programming": "#0B7920"};
var ARC_RAD = 23;
var CIRCLE_RAD = 30;
var VERT_CENTER = 310;

function makeNode(x, y, type) {
    var node = paper.circle(x, y, CIRCLE_RAD);
    
    //Styling
    node.attr({"fill": FILLS[type],
                "stroke": "#F8F8F8",
                "stroke-width": 6});
    node.glow({'width': 1, 'offsetx': 1, 'offsety': 1});
    
    return node;
}
    
function makeTimer(x, y, type, health) {
    var timer = paper.path().attr({
        "stroke": TIME_FILLS[type],
        "stroke-width": 8,
        arc: [x, y, 0, 100, ARC_RAD]
    }).data({"cx": x, "cy": y}).toFront();
    timer.data({"completion": 0, "health": health});
    return timer
}

function updateTimer(id, amount) {
    var timer = nodes[id][1];
    timer.data("completion", amount);   
    if (amount >= timer.data("health")) {
        timer.animate({
            "stroke-width": 27,
            arc: [timer.data("cx"), timer.data("cy"), amount, timer.data("health"), ARC_RAD/1.8]
        }, 500, "<>");
        var node = nodes[id][0];
        
        window.setTimeout(function () {node.animate({"r": CIRCLE_RAD+5, "stroke-width": 0}, 500, "bounce");}, 500);
        
    }
    else {
        timer.animate({
            arc: [timer.data("cx"), timer.data("cy"), amount, timer.data("health"), ARC_RAD]
        }, 500, "linear");
    }
}


function makeEdge(fromNode, toNode) {
    var start = [fromNode.attrs.cx, fromNode.attrs.cy];
    var end = [toNode.attrs.cx, toNode.attrs.cy];
    var pathcmd = "M"+start[0]+" "+start[1]+"L"+end[0]+" "+end[1];
    var edge = paper.path(pathcmd).attr({"stroke": "#AAAAAA", "stroke-width": 3}).toBack();
}
    
function generateGraph(node_data) {
    //Node format: array of 
    //                  {"health": x, "reqs": [1, 2, 3], "out": [1, 2, 3]}
    var wavelengths = [];
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
    
    for (x in node_data)
    {
        var node = node_data[x];
        var posx = 50 + 100 * node['wave'];
        var posy = VERT_CENTER - (50 * wavelengths[node['wave']]) + 100 * waves_occupied[node['wave']];
        
        var nodeobj = makeNode(posx, posy, node['class']);
        nodeobj.data("id", x);
        nodeobj.click(function () {
           active_id = this.data("id"); 
        });
        
        var timerobj = makeTimer(posx, posy, node['class'], node['health']);
        timerobj.data("id", x);
        timerobj.click(function () {
           active_id = this.data("id"); 
        });
        
        waves_occupied[node['wave']]++;
        nodes[x] = [nodeobj, timerobj];            
    }
    
    //Generate edges
    for (x in node_data) 
    {
        var fromNode = nodes[x][0];
        for (y in node_data[x]['out'])
        {
            var toNode = nodes[node_data[x]['out'][y]][0];
            makeEdge(fromNode, toNode);
        }
    }
    
    return nodes;
}