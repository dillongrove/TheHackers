var PROGRESS = 0;
var HACKER_SELECTED = "";

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