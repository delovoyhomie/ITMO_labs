let SCALE_FACTOR = 100;
let currentPoints = [];

/**
 * Initializes graph canvas
 */
async function initCanvas() {
    /** @type {HTMLCanvasElement} */
    const canvas = document.getElementById("graph");
    /** @type {CanvasRenderingContext2D} */
    const ctx = canvas.getContext("2d");

    canvas.addEventListener("click", onCanvasClick);

    try {
        const resp = await fetch("points");
        if (!resp.ok) {
            throw new Error("Failed to fetch points");
        }

        currentPoints = await resp.json();
        window.redrawArea = () => drawShape(ctx, canvas, currentPoints);
        drawShape(ctx, canvas, currentPoints);
    } catch (e) {
        currentPoints = [];
        window.redrawArea = () => drawShape(ctx, canvas, currentPoints);
        drawShape(ctx, canvas, currentPoints);
    }
}

function onCanvasClick(event) {
    /** @type {HTMLCanvasElement} */
    const canvas = document.getElementById("graph");
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const canvasX = (event.clientX - rect.left) * scaleX;
    const canvasY = (event.clientY - rect.top) * scaleY;
    const xDom = canvasX - canvas.width / 2;
    const yDom = canvas.height / 2 - canvasY;

    try {
        const r = getR();
        const scale = (canvas.width / 2) / r;
        const x = xDom / scale;
        const y = yDom / scale;
        sendPoint(x, y, r);
    } catch (e) {
        /** @type {HTMLDivElement} */
        const errorDiv = document.getElementById("error");
        errorDiv.hidden = false;
        errorDiv.innerText = e.message;
    }
}

function sendPoint(x, y, r) {
    /** @type {HTMLFormElement} */
    const form = document.getElementById("data-form");

    const snappedCandidate = [...VALID_XS].find(
        (candidate) => Math.abs(candidate - x) < 1e-6
    );
    const valueToSend = snappedCandidate ?? x;

    const targetCheckbox = document.querySelector(
        `#xs input[type="checkbox"][value="${valueToSend}"]`
    );
    if (targetCheckbox) {
        checkX(targetCheckbox);
    } else {
        /** @type {HTMLInputElement} */
        const customX = document.getElementById("custom-x");
        customX.value = valueToSend.toString();
        customX.disabled = false;
        checkX(customX);
    }

    form["y"].value = y.toString();
    form["r"].value = r;

    form.submit();
}

/**
 * Draws graph on canvas
 * @param ctx {CanvasRenderingContext2D}
 * @param canvas {HTMLCanvasElement}
 * @param points {{x: number, y: number, r: number}[]}
 */
function drawShape(ctx, canvas, points) {
    const r = getCurrentR();
    const scale = (canvas.width / 2) / r;
    SCALE_FACTOR = scale;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.scale(1, -1);

    ctx.fillStyle = "rgb(51 153 255)";

    // Rectangle
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-SCALE_FACTOR, 0);
    ctx.lineTo(-SCALE_FACTOR, -SCALE_FACTOR / 2);
    ctx.lineTo(0, -SCALE_FACTOR / 2);
    ctx.closePath();
    ctx.fill();

    // Triangle (0,0) -> (-R/2,0) -> (0,R/2)
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-SCALE_FACTOR / 2, 0);
    ctx.lineTo(0, SCALE_FACTOR / 2);
    ctx.closePath();
    ctx.fill();

    // Quarter circle
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, SCALE_FACTOR / 2, 0, -Math.PI / 2, true);
    ctx.closePath();
    ctx.fill();

    // Axis
    ctx.strokeStyle = "white";
    ctx.beginPath();
    ctx.moveTo(-canvas.width / 2, 0);
    ctx.lineTo(canvas.width / 2, 0);
    ctx.moveTo(0, -canvas.height / 2);
    ctx.lineTo(0, canvas.height / 2);
    ctx.stroke();

    ctx.fillStyle = "white";

    points.forEach((point) => {
        const { x, y } = point;
        ctx.beginPath();
        ctx.arc(x * SCALE_FACTOR, y * SCALE_FACTOR, 5, 0, Math.PI * 2);
        ctx.fill();
    });

    ctx.scale(1, -1);
    ctx.fillStyle = "white";
    ctx.font = "12px monospace";
    ctx.fillText("R", SCALE_FACTOR, -6);
    ctx.fillText("R/2", SCALE_FACTOR / 2, -6);
    ctx.fillText("-R/2", -SCALE_FACTOR / 2, -6);
    ctx.fillText("-R", -SCALE_FACTOR, -6);

    ctx.fillText("R", 6, -SCALE_FACTOR);
    ctx.fillText("R/2", 6, -SCALE_FACTOR / 2);
    ctx.fillText("-R/2", 6, SCALE_FACTOR / 2);
    ctx.fillText("-R", 6, SCALE_FACTOR);

    ctx.translate(-canvas.width / 2, -canvas.height / 2);
}
function getCurrentR() {
    const hidden = document.getElementById("r-input");
    const value = Number(hidden?.value);
    if (!value || Number.isNaN(value)) {
        return 1;
    }
    return value;
}
