var PROGRESS = 0;
var HACKER_SELECTED = null;

var ui = {};
ui.nodeClicked = function(id) {
    if (HACKER_SELECTED == null) return;
    engine.assign_to_node(HACKER_SELECTED, id);
}

ui.updateVisualStats = function() {
    $(".hacker").each(function() {
        var hackerid = $(this).data("id");
        var hacker = engine.hackers[hackerid];
        $(this).children().each(function() {
            var id = $(this).attr("id");
            if (id == "state")                    
                $(this).html(hacker['state']);
            else if (id == "teamwork")
                $(this).html(hacker['base']['teamwork']);
            else if (id == "talents")
                $(this).html(hacker['talents'].join(", "));
            else
                $(this).html(hacker['stats'][id]);
        });
    });
}

ui.updateMonitors = function() {
    $(".monitor").each(function(i, elem) {
        var hacker = engine.hackers[$(this).data("hacker")];
        $(elem).attr("class", "monitor");
        $(elem).addClass(hacker.talents[0].toLowerCase()); //Add class
        $(elem).addClass(hacker['state']);
    });
}

ui.init = function(user) {
    hacker_ids = [];
    for (hackerid in HACKERS)
        hacker_ids.push(hackerid);
        
    //Add hacker ids to all monitors
    $(".monitor").each(function(i, elem) {
        $(this).data("hacker", hacker_ids[i]);
    });
}

$("#complete_node").click(function() {
    PROGRESS += 10;
    $.get('/hackathon/node_done/' + PROGRESS, {}, function(data) {
        console.log(data);
    });
});

$(".hacker").click(function() {
    if ($(this).data('id') === HACKER_SELECTED) { // if clicking again, deselect
        HACKER_SELECTED = null;
        $(this).removeClass('selected');
    } else {
        HACKER_SELECTED = $(this).data('id');
        $(".hacker").removeClass('selected');
        $(this).addClass('selected');
    }
    console.log("Selected "+HACKER_SELECTED);
});

$(".action").click(function() {
    // Set hacker start_time to current time
})

