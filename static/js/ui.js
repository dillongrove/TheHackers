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
            else
                $(this).html(hacker['stats'][id]);
        });
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
        HACKER_SELECTED = "";
        $(this).removeClass('selected');
    } else {
        HACKER_SELECTED = $(this).data('id');
        $(".hacker").removeClass('selected');
        $(this).addClass('selected');
    }
});

$(".action").click(function() {
    // Set hacker start_time to current time
})