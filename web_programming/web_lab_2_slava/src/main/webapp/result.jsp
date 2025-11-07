<%@ page import="ru.rmntim.web.labwork2.repository.PointRepository" %>
<%@ page import="ru.rmntim.web.labwork2.models.Point" %>
<%@ page contentType="text/html; charset=UTF-8" pageEncoding="UTF-8" %>
<!doctype html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Результаты проверки</title>
    <link rel="stylesheet" href="styles/reset.css">
    <link rel="stylesheet" href="styles/main.css">
</head>
<body>
<header class="navbar">
    <div class="brand">
        <h1>Лабораторная №2</h1>
        <p>Якименко Владислав · группа P3213 · вариант HTTP GET</p>
    </div>
    <a href="https://github.com/delovoyhomie" target="_blank" rel="noreferrer" id="github">GitHub</a>
</header>
<main class="container single">
    <section class="panel wide results-panel">
        <h2>Результаты проверки</h2>
        <table id="result-table">
            <thead>
            <tr>
                <th>X</th>
                <th>Y</th>
                <th>R</th>
                <th>Попадание</th>
            </tr>
            </thead>
            <tbody>
            <%
                PointRepository repo = (PointRepository) session.getAttribute("bean");
                if (repo != null) {
                    for (Point point : repo.getPoints()) {
            %>
            <tr>
                <td><%= point.x() %></td>
                <td><%= point.y() %></td>
                <td><%= point.r() %></td>
                <td><%= point.isInside() ? "попадание" : "мимо" %></td>
            </tr>
            <%
                    }
                }
            %>
            </tbody>
        </table>
        <div class="actions">
            <a class="ghost-button" href="index.jsp">Вернуться на форму</a>
        </div>
    </section>
</main>
<footer id="copyright">
    © 2024 · WTFPL
</footer>
</body>
</html>
