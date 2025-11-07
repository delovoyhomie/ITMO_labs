package ru.rmntim.web.labwork2.controllers;

import java.io.IOException;

import jakarta.json.bind.JsonbBuilder;
import jakarta.servlet.ServletException;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import ru.rmntim.web.labwork2.repository.PointRepository;

@WebServlet("/points")
public class PointsServlet extends HttpServlet {
    @Override
    protected void doGet(HttpServletRequest req, HttpServletResponse resp) throws ServletException, IOException {
        processRequest(req, resp);
    }

    private void processRequest(HttpServletRequest request, HttpServletResponse response)
            throws IOException, ServletException {
        response.setContentType("application/json;charset=UTF-8");
        response.setCharacterEncoding("UTF-8");

        var bean = (PointRepository) request.getSession().getAttribute("bean");
        if (bean == null) {
            response.getWriter().write("[]");
            return;
        }

        var json = JsonbBuilder.create().toJson(bean.getPoints());
        response.getWriter().write(json);
    }
}
