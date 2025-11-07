/**
 * Handles form submission: validates data and delegates to the controller.
 * @param ev {SubmitEvent}
 */
function handleSubmit(ev) {
    ev.preventDefault();

    /** @type {HTMLDivElement} */
    const errorDiv = document.getElementById("error");

    try {
        const data = new FormData(ev.target);
        const values = Object.fromEntries(data.entries());
        validateInput(values);
        errorDiv.hidden = true;
        errorDiv.innerText = "";
        HTMLFormElement.prototype.submit.call(ev.target);
    } catch (e) {
        errorDiv.hidden = false;
        errorDiv.innerText = e.message;
    }
}

/**
 * Parses input values and checks for validity.
 * @param values {Record<string, string>} Raw input values
 * @throws {Error} If input values are invalid
 */
function validateInput(values) {
    if (!values.x) {
        throw new Error("Необходимо выбрать координату X");
    }
    const x = Number(values.x.replace(",", "."));
    if (Number.isNaN(x) || x < -4 || x > 4) {
        throw new Error("X должен быть числом в диапазоне [-4; 4]");
    }

    if (!values.y) {
        throw new Error("Введите координату Y");
    }
    const y = Number(values.y.replace(",", "."));
    if (Number.isNaN(y) || y < -5 || y > 3) {
        throw new Error("Y должен быть числом в диапазоне [-5; 3]");
    }

    if (!values.r) {
        throw new Error("Выберите радиус R");
    }
    const r = Number(values.r);
    if (!VALID_RS.has(r)) {
        throw new Error(`R должен быть одним из [${[...VALID_RS].join(", ")}]`);
    }
}

function clearRSelection() {
    document
        .querySelectorAll("#r-buttons button[data-value]")
        .forEach((btn) => btn.classList.remove("active"));
    const hidden = document.getElementById("r-input");
    if (hidden) {
        hidden.value = "";
    }
    if (typeof redrawArea === "function") {
        redrawArea();
    }
}

function setupRButtons() {
    const buttons = document.querySelectorAll("#r-buttons button[data-value]");
    const hidden = document.getElementById("r-input");
    buttons.forEach((button) => {
        button.addEventListener("click", () => {
            const alreadyActive = button.classList.contains("active");
            clearRSelection();
            if (!alreadyActive) {
                button.classList.add("active");
                hidden.value = button.dataset.value;
            }
            if (typeof redrawArea === "function") {
                redrawArea();
            }
        });
    });
    clearRSelection();
}

document.addEventListener("DOMContentLoaded", () => {
    /** @type {HTMLFormElement} */
    const form = document.getElementById("data-form");
    form.addEventListener("submit", handleSubmit);
    setupRButtons();
    initCanvas();
});
