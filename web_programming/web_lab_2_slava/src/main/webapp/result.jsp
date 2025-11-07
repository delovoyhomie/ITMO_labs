<%@ page import="ru.rmntim.web.labwork2.repository.PointRepository" %>
<%@ page import="ru.rmntim.web.labwork2.models.Point" %>
<%@ page import="java.util.Locale" %>
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
    <a href="https://github.com/delovoyhomie/ITMO_labs/tree/main/web_programming/web_lab_2_slava" target="_blank" rel="noreferrer" id="github">GitHub</a>
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
