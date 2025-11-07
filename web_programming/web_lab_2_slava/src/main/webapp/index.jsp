<%@ page import="ru.rmntim.web.labwork2.repository.PointRepository" %>
<%@ page import="ru.rmntim.web.labwork2.models.Point" %>
<%@ page import="java.util.Locale" %>
<%@ page contentType="text/html; charset=UTF-8" pageEncoding="UTF-8" %>
<!doctype html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ЛР 2 · Проверка точки</title>
    <link rel="stylesheet" href="styles/reset.css">
    <link rel="stylesheet" href="styles/main.css">
    <script src="scripts/utils.js" defer></script>
    <script src="scripts/index.js" defer></script>
    <script src="scripts/canvas.js" defer></script>
</head>
<body>
<header class="navbar">
    <div class="brand">
        <h1>Лабораторная №2</h1>
        <p>Якименко Владислав · группа P3213 · вариант 1724</p>
    </div>
    <a href="https://github.com/delovoyhomie/ITMO_labs/tree/main/web_programming/web_lab_2_slava" target="_blank" rel="noreferrer" id="github">GitHub</a>
</header>
<main class="container">
    <section class="panel input-panel">
        <h2>Параметры точки</h2>
        <p class="hint">Координаты передаются через ControllerServlet методом GET. Все проверки сохраняются в HTTP-сессии.</p>
        <div id="error" hidden></div>
        <form action="${pageContext.request.contextPath}/controller" method="get" id="data-form" autocomplete="off">
            <fieldset class="control-group" id="xs">
                <legend>Координата X</legend>
                <div class="grid-buttons">
                    <label><input type="checkbox" name="x" value="-4" onclick="checkX(this)"><span>-4</span></label>
                    <label><input type="checkbox" name="x" value="-3" onclick="checkX(this)"><span>-3</span></label>
                    <label><input type="checkbox" name="x" value="-2" onclick="checkX(this)"><span>-2</span></label>
                    <label><input type="checkbox" name="x" value="-1" onclick="checkX(this)"><span>-1</span></label>
                    <label><input type="checkbox" name="x" value="0" onclick="checkX(this)"><span>0</span></label>
                    <label><input type="checkbox" name="x" value="1" onclick="checkX(this)"><span>1</span></label>
                    <label><input type="checkbox" name="x" value="2" onclick="checkX(this)"><span>2</span></label>
                    <label><input type="checkbox" name="x" value="3" onclick="checkX(this)"><span>3</span></label>
                    <label><input type="checkbox" name="x" value="4" onclick="checkX(this)"><span>4</span></label>
                </div>
            </fieldset>
            <input type="hidden" name="x" id="x-hidden">

            <label class="control-group" for="y">
                <span>Координата Y (от -5 до 3)</span>
                <input type="text" id="y" name="y" placeholder="например, 1.7" required>
            </label>

            <fieldset class="control-group" id="rs">
                <legend>Радиус R</legend>
                <div class="grid-buttons" id="r-buttons">
                    <button type="button" data-value="1">1</button>
                    <button type="button" data-value="1.5">1.5</button>
                    <button type="button" data-value="2">2</button>
                    <button type="button" data-value="2.5">2.5</button>
                    <button type="button" data-value="3">3</button>
                </div>
                <input type="hidden" name="r" id="r-input">
            </fieldset>

            <div class="actions">
                <button type="submit">Проверить</button>
                <a class="ghost-button" href="result.jsp">История</a>
            </div>
        </form>
    </section>

    <section class="panel canvas-panel">
        <h2>Область</h2>
        <div class="canvas-wrapper">
            <canvas id="graph" width="600" height="600" aria-label="Изображение области"></canvas>
        </div>
        <p class="hint">Щёлкните по графику при выбранном R, чтобы отправить точку.</p>
    </section>

    <section class="panel wide results-panel">
        <h2>Последние проверки</h2>
        <table id="result-table">
            <thead>
            <tr>
                <th>X</th>
                <th>Y</th>
                <th>R</th>
                <th>Попадание</th>
            </tr>
            </thead>
            <tbody id="history-body">
            <%
                PointRepository repo = (PointRepository) session.getAttribute("bean");
                if (repo != null) {
                    for (Point point : repo.getPoints()) {
            %>
            <tr>
                <td><%= String.format(Locale.US, "%.4f", point.x()) %></td>
                <td><%= String.format(Locale.US, "%.4f", point.y()) %></td>
                <td><%= String.format(Locale.US, "%.4f", point.r()) %></td>
                <td><%= point.isInside() ? "попадание" : "мимо" %></td>
            </tr>
            <%
                    }
                }
            %>
            </tbody>
        </table>
        <form class="actions" action="${pageContext.request.contextPath}/clear-history" method="post">
            <button type="submit" class="ghost-button">Очистить историю</button>
        </form>
    </section>
</main>
<footer id="copyright">
    © 2024 · WTFPL
</footer>
</body>
</html>
