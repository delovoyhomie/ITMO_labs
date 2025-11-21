window.onload = updateClock;

function updateClock() {
    let dt = new Date();
    let time = dt.getHours() + ":" + ((dt.getMinutes() < 10) ? ("0" + dt.getMinutes()) : dt.getMinutes()) + ":" + ((dt.getSeconds() < 10) ? ("0" + dt.getSeconds()) : dt.getSeconds());
    let date = ((dt.getDate() < 10) ? ("0" + dt.getDate()) : dt.getDate()) + "-" + ((dt.getMonth() + 1 < 10) ? ("0" + (dt.getMonth() + 1)) : (dt.getMonth() + 1)) + "-" + dt.getFullYear();

    document.getElementById("clock-time").innerText = time;
    document.getElementById("clock-date").innerText = date;
    setTimeout(updateClock, 8000);
}
