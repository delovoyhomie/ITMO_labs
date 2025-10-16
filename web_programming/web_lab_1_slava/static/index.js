"use strict";

const LIMITS = {
    x: [-4, -3, -2, -1, 0, 1, 2, 3, 4],
    y: { min: -3, max: 5 },
    r: { min: 1, max: 4 }
};

const state = {
    x: null,
    y: null,
    yRaw: null,
    r: null,
    rRaw: null
};

const form = document.getElementById("hit-form");
const hint = document.getElementById("form-hint");
const resultsBody = document.querySelector("#results tbody");
const storageKey = "lab1-results";
const clearButton = document.getElementById("clear-storage");
const submitButton = form.querySelector('button[type="submit"]');

const showError = (msg) => {
    hint.hidden = false;
    hint.textContent = msg;
};

const clearError = () => {
    hint.hidden = true;
    hint.textContent = "";
};

const validateState = () => {
    if (typeof state.x !== "number" || !LIMITS.x.includes(state.x)) {
        throw new Error("Выберите X из допустимого диапазона");
    }
    if (typeof state.y !== "number" || Number.isNaN(state.y) || state.y < LIMITS.y.min || state.y > LIMITS.y.max) {
        throw new Error("Y должен быть числом в диапазоне [-3; 5]");
    }
    if (typeof state.r !== "number" || Number.isNaN(state.r) || state.r < LIMITS.r.min || state.r > LIMITS.r.max) {
        throw new Error("R должен быть числом в диапазоне [1; 4]");
    }
};

const persistRecord = (record) => {
    const history = JSON.parse(localStorage.getItem(storageKey) ?? "[]");
    history.push(record);
    localStorage.setItem(storageKey, JSON.stringify(history));
};

const renderRow = (record) => {
    const row = document.createElement("tr");
    const rowCells = [
        record.x,
        record.y,
        record.r,
        record.result,
        record.time,
        record.exec
    ];
    rowCells.forEach((value) => {
        const cell = row.insertCell(-1);
        cell.textContent = value;
    });
    resultsBody.appendChild(row);
};

const clearHistory = () => {
    localStorage.removeItem(storageKey);
    resultsBody.innerHTML = "";
};

const restoreHistory = () => {
    const history = JSON.parse(localStorage.getItem(storageKey) ?? "[]");
    history.forEach(renderRow);
};

const updateValidationState = () => {
    try {
        validateState();
        submitButton.disabled = false;
        clearError();
        drawCanvas();
    } catch (err) {
        submitButton.disabled = true;
        if (state.x === null && state.y === null && (state.r === null || state.r === undefined)) {
            clearError();
        } else {
            showError(err.message);
        }
    }
};

const xButtons = Array.from(document.querySelectorAll('#x-buttons button[data-value]')); // assumes markup updated
const hiddenX = document.getElementById("x-input");
xButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
        xButtons.forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        state.x = Number(btn.dataset.value);
        hiddenX.value = state.x;
        updateValidationState();
    });
});

const defaultBtn = document.querySelector('#x-buttons button[data-value="0"]');
if (defaultBtn) {
    defaultBtn.click();
}

const yInput = document.getElementById("y-input");
yInput.addEventListener("input", (event) => {
    const value = event.target.value.trim().replace(",", ".");
    state.yRaw = value === "" ? null : value;
    if (value === "") {
        state.y = null;
        clearError();
        submitButton.disabled = true;
        drawCanvas();
        return;
    }
    state.y = Number(value);
    if (Number.isNaN(state.y)) {
        showError("Y должен быть числом");
        submitButton.disabled = true;
        return;
    }
    updateValidationState();
});

yInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
        event.preventDefault();
        form.requestSubmit();
    }
});

const rInput = document.getElementById("r-input");
const initialR = rInput.value.trim().replace(",", ".");
state.rRaw = initialR === "" ? null : initialR;
state.r = initialR === "" ? null : Number(initialR);
rInput.addEventListener("input", (event) => {
    const value = event.target.value.trim().replace(",", ".");
    state.rRaw = value === "" ? null : value;
    if (value === "") {
        state.r = null;
        clearError();
        submitButton.disabled = true;
        drawCanvas();
        return;
    }
    state.r = Number(value);
    if (Number.isNaN(state.r) || state.r <= 0) {
        showError("R должен быть положительным числом");
        submitButton.disabled = true;
        return;
    }
    updateValidationState();
});

rInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
        event.preventDefault();
        form.requestSubmit();
    }
});

const canvas = document.getElementById("area-canvas");
const ctx = canvas.getContext("2d");
const SCALE = 60;
const ORIGIN = { x: canvas.width / 2, y: canvas.height / 2 };
const POINT_RADIUS = 4;

let lastPlottedPoint = null;

const toX = (x) => ORIGIN.x + x * SCALE;
const toY = (y) => ORIGIN.y - y * SCALE;

const drawAxes = (R) => {
    ctx.save();
    ctx.strokeStyle = "#333";
    ctx.fillStyle = "#333";
    ctx.lineWidth = 1;

    ctx.beginPath();
    ctx.moveTo(20, toY(0));
    ctx.lineTo(canvas.width - 22, toY(0));
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(canvas.width - 22, toY(0));
    ctx.lineTo(canvas.width - 28, toY(0) - 4);
    ctx.lineTo(canvas.width - 28, toY(0) + 4);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(toX(0), canvas.height - 18);
    ctx.lineTo(toX(0), 18);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(toX(0), 18);
    ctx.lineTo(toX(0) - 4, 24);
    ctx.lineTo(toX(0) + 4, 24);
    ctx.closePath();
    ctx.fill();

    ctx.font = "12px system-ui, sans-serif";
    ctx.fillStyle = "#333";
    ctx.textAlign = "center";
    ctx.strokeStyle = "#777";
    const ticks = [-R, -R / 2, R / 2, R];
    ticks.forEach((value) => {
        ctx.beginPath();
        ctx.moveTo(toX(value), toY(0) - 3);
        ctx.lineTo(toX(value), toY(0) + 3);
        ctx.stroke();
        ctx.fillText(value === -R ? "-R" : value === -R / 2 ? "-R/2" : value === R / 2 ? "R/2" : "R", toX(value), toY(0) + 16);

        ctx.beginPath();
        ctx.moveTo(toX(0) - 3, toY(value));
        ctx.lineTo(toX(0) + 3, toY(value));
        ctx.stroke();
        ctx.textAlign = "right";
        ctx.fillText(value === -R ? "-R" : value === -R / 2 ? "-R/2" : value === R / 2 ? "R/2" : "R", toX(0) - 6, toY(value) + 4);
        ctx.textAlign = "center";
    });

    ctx.restore();
};

const drawPoint = (point) => {
    ctx.save();
    const hitStatus = point.hit;
    if (hitStatus === true) {
        ctx.fillStyle = "#2eb872";
    } else if (hitStatus === false) {
        ctx.fillStyle = "#e53935";
    } else {
        ctx.fillStyle = "#333";
    }
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(toX(point.x), toY(point.y), POINT_RADIUS, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
};

const drawCanvas = () => {
    const raw = rInput.value.trim().replace(",", ".");
    const R = Number(raw);
    const radius = Number.isFinite(state.r) && state.r > 0 ? state.r : Number.isFinite(R) && R > 0 ? R : 1;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#2d8cff";

    // Rectangle Q3: x in [-R/2, 0], y in [-R, 0]
    const rx = toX(-radius / 2);
    const ry = toY(0);
    const rw = toX(0) - rx;
    const rh = toY(-radius) - toY(0);
    ctx.fillRect(rx, ry, rw, rh);

    // Quarter circle sector in quadrant I with centre at (0,0)
    ctx.beginPath();
    ctx.moveTo(toX(0), toY(0));
    ctx.arc(toX(0), toY(0), (radius / 2) * SCALE, -Math.PI, -Math.PI / 2, false);
    ctx.closePath();
    ctx.fill();

    // Triangle in quadrant I: (R/2, R/2) -> (R, 0) -> (R/2, 0)
    ctx.beginPath();
    ctx.moveTo(toX(0), toY(radius / 2));
    ctx.lineTo(toX(radius), toY(0));
    ctx.lineTo(toX(0), toY(0));
    ctx.closePath();
    ctx.fill();

    drawAxes(radius);

    if (lastPlottedPoint) {
        drawPoint(lastPlottedPoint);
    }
};

restoreHistory();
drawCanvas();
clearError();
submitButton.disabled = true;

form.addEventListener("submit", async (event) => {
    event.preventDefault();
    try {
        validateState();
        clearError();
    } catch (err) {
        showError(err.message);
        return;
    }

    const query = new URLSearchParams({
        x: state.x.toString(),
        y: state.yRaw ?? state.y.toString(),
        r: state.rRaw ?? state.r.toString()
    }).toString();

    let response;
    try {
        response = await fetch(`/fcgi-bin/app.jar?${query}`, { cache: "no-store" });
    } catch (err) {
        showError("Сервер недоступен. Проверьте подключение.");
        lastPlottedPoint = {
            x: state.x,
            y: state.y,
            hit: null
        };
        drawCanvas();
        return;
    }

    const record = {
        x: state.x.toString(),
        y: state.yRaw ?? state.y.toString(),
        r: state.rRaw ?? state.r.toString(),
        result: "ошибка",
        time: "—",
        exec: "—"
    };

    if (response.ok) {
        try {
            const payload = await response.json();
            record.time = new Date(payload.meta.timestamp).toLocaleString();
            record.exec = `${payload.meta.processingNanos} ns`;
            record.result = payload.hit ? "попадание" : "мимо";
            lastPlottedPoint = {
                x: state.x,
                y: state.y,
                hit: payload.hit === true
            };
        } catch (err) {
            showError("Не удалось разобрать ответ сервера.");
            return;
        }
    } else {
        const payload = await response.json().catch(() => null);
        record.time = payload?.error?.timestamp ?? new Date().toISOString();
        record.result = payload?.error?.message ?? "ошибка";
        lastPlottedPoint = {
            x: state.x,
            y: state.y,
            hit: null
        };
    }

    persistRecord(record);
    renderRow(record);
    drawCanvas();
});

if (clearButton) {
    clearButton.addEventListener("click", () => {
        clearHistory();
        lastPlottedPoint = null;
        updateValidationState();
        drawCanvas();
    });
}

restoreHistory();
