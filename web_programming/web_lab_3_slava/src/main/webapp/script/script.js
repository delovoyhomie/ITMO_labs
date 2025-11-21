const CENTER = 150;
const SCALE = 30;
const graph = document.getElementById('graph');
const clickCatcher = document.getElementById('click_catcher');

const hiddenX = document.getElementById("hidden-form:graph-x");
const hiddenY = document.getElementById("hidden-form:graph-y");
const hiddenR = document.getElementById("hidden-form:graph-r");

const HIT_COLOR = '#5ae8c2';
const MISS_COLOR = '#ff6b6b';
const MARKER_STROKE = '#b7c9d9';

clickCatcher.addEventListener('mousemove', evt => {
    const coords = toCoords(evt);
    drawOMarker(coords.x, coords.y);

    hiddenX.value = coords.x;
    hiddenY.value = coords.y;
    hiddenR.value = getR();
});

clickCatcher.addEventListener('mouseleave', deleteOMarker);

clickCatcher.addEventListener('click', () => {
    document.getElementById("hidden-form:graph-send").click();
});

function handleSlide() {
    hiddenR.value = getR();
    redrawFigure(hiddenR.value);
    deleteOMarker();
}

function getR() {
    const widget = PF("widget_main_form_superSlider");
    if (widget) {
        return widget.getValue();
    }
    return Number(document.getElementById("main-form:options").value || 0);
}

function toCoords(evt) {
    const rect = clickCatcher.getBoundingClientRect();
    const x = (evt.clientX - rect.left - graph.width.baseVal.value / 2) / SCALE;
    const y = (graph.height.baseVal.value / 2 - (evt.clientY - rect.top)) / SCALE;
    return {
        x: Math.round(x * 1000) / 1000,
        y: Math.round(y * 1000) / 1000
    };
}

function drawOMarker(x, y) {
    deleteOMarker();

    const circle = document.createElementNS("http://www.w3.org/2000/svg", 'circle');
    circle.setAttributeNS(null, 'cx', (CENTER + x * SCALE).toString());
    circle.setAttributeNS(null, 'cy', (CENTER - y * SCALE).toString());
    circle.setAttributeNS(null, 'r', '12');
    circle.setAttributeNS(null, 'stroke', MARKER_STROKE);
    circle.setAttributeNS(null, 'stroke-width', '6');
    circle.setAttributeNS(null, 'fill', 'none');
    circle.setAttributeNS(null, 'opacity', '0.9');
    circle.style.pointerEvents = 'none';
    circle.id = "selected_pos";
    graph.appendChild(circle);
}

function deleteOMarker() {
    const circle = document.getElementById('selected_pos');
    if (circle !== null) circle.parentElement.removeChild(circle);
}

function drawDot(x, y, checked) {
    const circle = document.createElementNS("http://www.w3.org/2000/svg", 'circle');
    circle.setAttributeNS(null, 'cx', (CENTER + x * SCALE).toString());
    circle.setAttributeNS(null, 'cy', (CENTER - y * SCALE).toString());
    circle.setAttributeNS(null, 'r', '5');
    circle.classList.add("littleDot");

    if (checked) {
        circle.setAttributeNS(null, 'fill', HIT_COLOR);
    } else {
        circle.setAttributeNS(null, 'fill', MISS_COLOR);
    }
    circle.style.pointerEvents = 'none';
    graph.appendChild(circle);
}

function redrawFigure(scale) {
    const rect = document.getElementById("figure-square");
    rect.setAttributeNS(null, 'x', (CENTER - scale * SCALE).toString());
    rect.setAttributeNS(null, 'y', (CENTER - scale * SCALE).toString());
    rect.setAttributeNS(null, 'width', (scale * SCALE).toString());
    rect.setAttributeNS(null, 'height', (scale * SCALE).toString());

    const triangle = document.getElementById("figure-triangle");
    triangle.setAttributeNS(
        null,
        'points',
        `${CENTER} ${CENTER} ${CENTER - scale * SCALE} ${CENTER} ${CENTER} ${CENTER + scale * SCALE}`
    );

    const circle = document.getElementById("figure-arc");
    const radius = (scale * SCALE) / 2;
    circle.setAttributeNS(
        null,
        'd',
        `M ${CENTER} ${CENTER} L ${CENTER + radius} ${CENTER} A ${radius} ${radius} 0 0 0 ${CENTER} ${CENTER - radius} Z`
    );

    updateTicks(scale);
}

function updateTicks(scale) {
    const ticks = [
        {id: 'tick-x-r', label: 'tick-x-r-label', axis: 'x', factor: 1},
        {id: 'tick-x-half', label: 'tick-x-half-label', axis: 'x', factor: 0.5},
        {id: 'tick-x-r-neg', label: 'tick-x-r-neg-label', axis: 'x', factor: -1},
        {id: 'tick-x-half-neg', label: 'tick-x-half-neg-label', axis: 'x', factor: -0.5},
        {id: 'tick-y-r', label: 'tick-y-r-label', axis: 'y', factor: 1},
        {id: 'tick-y-half', label: 'tick-y-half-label', axis: 'y', factor: 0.5},
        {id: 'tick-y-r-neg', label: 'tick-y-r-neg-label', axis: 'y', factor: -1},
        {id: 'tick-y-half-neg', label: 'tick-y-half-neg-label', axis: 'y', factor: -0.5},
    ];

    ticks.forEach(({id, label, axis, factor}) => {
        const line = document.getElementById(id);
        const text = document.getElementById(label);
        if (!line || !text) return;

        if (axis === 'x') {
            const x = CENTER + factor * scale * SCALE;
            line.setAttributeNS(null, 'x1', x.toString());
            line.setAttributeNS(null, 'x2', x.toString());
            line.setAttributeNS(null, 'y1', (CENTER - 6).toString());
            line.setAttributeNS(null, 'y2', (CENTER + 6).toString());
            text.setAttributeNS(null, 'x', (x - 8).toString());
            text.setAttributeNS(null, 'y', (CENTER + 20).toString());
        } else {
            const y = CENTER - factor * scale * SCALE;
            line.setAttributeNS(null, 'y1', y.toString());
            line.setAttributeNS(null, 'y2', y.toString());
            line.setAttributeNS(null, 'x1', (CENTER - 6).toString());
            line.setAttributeNS(null, 'x2', (CENTER + 6).toString());
            text.setAttributeNS(null, 'x', (CENTER + 10).toString());
            text.setAttributeNS(null, 'y', (y + 4).toString());
        }
    });
}
