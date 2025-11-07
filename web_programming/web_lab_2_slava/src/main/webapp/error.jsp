<%@ page contentType="text/html; charset=UTF-8" pageEncoding="UTF-8" %>
<%@ page isErrorPage="true" %>
<!doctype html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Ошибка ввода</title>
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
    <section class="panel error-panel">
        <h2>Ошибка запроса</h2>
        <p><%= request.getAttribute("error") %></p>
        <div class="actions">
            <a class="ghost-button" href="index.jsp">Вернуться к форме</a>
        </div>
    </section>
</main>
<footer id="copyright">
    © 2024 · WTFPL
</footer>
</body>
</html>
