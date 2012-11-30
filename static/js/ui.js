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
        if (hackerid === HACKER_SELECTED) {
            $("#current_task").html(hacker['state'].charAt(0).toUpperCase() + hacker['state'].slice(1));
            $(".energy.statbar").html(hacker['stats']['energy']);
            $(".productivity.statbar").html(hacker['stats']['productivity']);
            $(".teamwork.statbar").html(hacker['stats']['teamwork']);

            make_stat_bar($(".energy.statbar"), hacker['base']['energy']);
            make_stat_bar($(".productivity.statbar"), 1.5*hacker['base']['productivity']);
            make_stat_bar($(".teamwork.statbar"), 100);
        }
    });
}

ui.updateMonitors = function() {
    $(".monitor").each(function(i, elem) {
        var hacker = engine.hackers[USER_HACKERS[i]];
        $(elem).attr("class", "monitor");
        if (hacker.talents.length > 0)
            $(elem).addClass(hacker.talents[0].toLowerCase()); //Add class
        $(elem).addClass(hacker['state']);
    });
}

ui.init = function(user) {
    hacker_ids = [];
    for (hackerid in USER_HACKERS)
        hacker_ids.push(hackerid);

    //Add hacker ids to all monitors
    console.log("Hacker ids");
    console.log(hacker_ids);
    $(".monitor").each(function(i, elem) {
        $(this).data("hacker", hacker_ids[i]);
    });
}

$(".hacker").click(function() {
    if ($(this).data('id') === HACKER_SELECTED) { // if clicking again, deselect
        HACKER_SELECTED = null;
        $(this).removeClass('selected');
    } else {
        HACKER_SELECTED = $(this).data('id');
        var hacker = engine.hackers[HACKER_SELECTED];
        $(".hacker").removeClass('selected');
        $(this).addClass('selected');
        $("#selected_char_pic").attr('src', hacker['imgset']);
    }
    console.log("Selected "+HACKER_SELECTED);
});

$(".action").click(function() {
    // Set hacker start_time to current time
})
