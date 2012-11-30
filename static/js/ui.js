var PROGRESS = 0;
var HACKER_SELECTED = null;

var ui = {};
ui.nodeClicked = function(id) {
    if (HACKER_SELECTED == null) return;
    ui.playClick2(); 
    engine.assign_to_node(HACKER_SELECTED, id);
}

ui.playClick = function() {
    document.getElementById("soundeffect").src = "/static/sound/click.wav";
    document.getElementById("soundeffect").play();
};

ui.playClick2 = function() {
    document.getElementById("soundeffect3").src = "/static/sound/click.wav";
    document.getElementById("soundeffect3").play();
};

ui.playPop = function() {
    document.getElementById("soundeffect2").src = "/static/sound/pop.wav";
    document.getElementById("soundeffect2").play();
};

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
            $(".focus.statbar").html(hacker['stats']['focus']);
            $(".teamwork.statbar").html(hacker['base']['teamwork']);

            make_stat_bar($(".energy.statbar"), hacker['base']['energy']);
            make_stat_bar($(".productivity.statbar"), 1.5*hacker['base']['productivity']);
            make_stat_bar($(".focus.statbar"), 100);
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

    
}

$(".monitor, .head_back, .seat").click(function() {
    ui.playClick();
    var id = $(this).attr("id");
    var index = parseInt(id[id.length - 1]) - 1;
    HACKER_SELECTED = USER_HACKERS[index]
    var hacker = engine.hackers[HACKER_SELECTED];
    $(".head_back").removeClass('selected');
    $("#head_back"+(index+1)).addClass('selected');
    $(".selected_char_pic").attr('src', "/static/images/hackers/" + hacker['imgset'] + "front.png");
});

$(document).keypress(function(event) {
    ui.playClick();
    console.log(event.which);
    if ( event.which >= 49 && event.which <= 52 ) {// 49=1, 52=4
        event.preventDefault();
        var hacker_num = event.which -= 49;
        $("[data-id='" + USER_HACKERS[hacker_num] +"']").click();
    }    
});
