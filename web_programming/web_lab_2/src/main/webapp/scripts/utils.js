const VALID_XS = new Set([-4, -3, -2, -1, 0, 1, 2, 3, 4]);
const VALID_RS = new Set([1, 1.5, 2, 2.5, 3]);

/**
 * Gets R value
 * @returns {number} R multiplied by 100
 * @throws {Error} If no R is checked or multiple Rs are checked (should be impossible but why not)
 */
function getR() {
    const hidden = document.getElementById("r-input");
    if (!hidden || hidden.value.trim() === "") {
        throw new Error("Сначала выберите значение R");
    }
    const value = Number(hidden.value);
    if (!VALID_RS.has(value)) {
        throw new Error(`R должен быть одним из [${[...VALID_RS].join(", ")}]`);
    }
    return value;
}

/**
 * Checks that only one X checkbox is checked.
 * @param self {HTMLInputElement}
 * @returns {boolean}
 */
function checkX(self) {
    document
        .querySelectorAll("input[type='checkbox'][name='x']")
        .forEach((checkbox) => (checkbox.checked = false));
    self.checked = true;
}
