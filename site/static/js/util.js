// generate a static stat bar in the given div (using the # in the div)
function make_stat_bar(div, out_of) {
    var percent = parseInt(parseFloat(div.html()) * 100 / out_of);
    var bar = $("<div class='bar_outer'></div>");
    bar.append("<div class='bar_inner' style='width:" + percent +"%'></div>");
    bar.append("<div class='bar_inner blank' style='width:" + (100 - percent) +"%'></div>");
    div.html(bar);
}

// ==== Random generation functions
function generate_int(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}
// generates an int distributed around the range
// adapted from http://nicholaswellcome.com/content/generating-normally-distributed-random-numbers-javascript
function generate_normal_int(min, max) {
    var u1 = Math.random();
    var u2 = Math.random();
    var r = Math.sqrt(-2*Math.log(u1))*Math.cos(2*Math.PI*u2); // distributed between -4 and 4, with outliers
    // let's make it distributed between min and max, without outliers
    if (r > 4) r = 4;
    if (r < -4) r = -4;
    r += 4;
    r = (r/8) * (max - min) + min;
    return Math.round(r);
}

// generates a valid-looking random name!
function generate_name() {
    return fake_names[generate_int(0, fake_names.length - 1)];
}
// selects a random class
function generate_class() {
    var classes = ['Programming', 'Design', 'Business'];
    return classes[generate_int(0, classes.length - 1)];
}

// ==== Other helper functions
// return a shallow copy of the object
function clone(x) {
    if (x.constructor == Array) {
        var r = [];
        for (var i=0,n=x.length; i<n; i++)
            r.push(clone(x[i]));
        return r;
    }
    return x;
}

// returns the average of the list
function list_average(list) {
    var total = 0;
    for (var i = 0; i < list.length; i ++) {
        total += list[i];
    }
    return total / list.length;
}

// rounds the number to n places
function round_to_place(number, places) {
    return Math.round(number * Math.pow(100, places)) / Math.pow(100, places);
}