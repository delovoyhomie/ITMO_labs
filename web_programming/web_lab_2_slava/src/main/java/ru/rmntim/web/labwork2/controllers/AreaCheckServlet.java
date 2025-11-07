package ru.rmntim.web.labwork2.controllers;

import jakarta.json.bind.JsonbBuilder;
import jakarta.servlet.ServletException;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import ru.rmntim.web.labwork2.models.Point;
import ru.rmntim.web.labwork2.repository.PointRepository;

import java.io.IOException;
import java.util.HashMap;
import java.util.Map;

@WebServlet("/calculate")
public class AreaCheckServlet extends HttpServlet {
    @Override
    protected void doGet(HttpServletRequest request, HttpServletResponse response)
            throws IOException, ServletException {
        processRequest(request, response);
    }

    @Override
    public void doPost(HttpServletRequest request, HttpServletResponse response) throws IOException, ServletException {
        processRequest(request, response);
    }

    private void processRequest(HttpServletRequest request, HttpServletResponse response)
            throws IOException, ServletException {
        try {
            boolean wantsJson = "ajax".equals(request.getParameter("mode"));
            var x = Double.parseDouble(request.getParameter("x").trim());
            var y = Double.parseDouble(request.getParameter("y").replace(',', '.').trim());
            var r = Double.parseDouble(request.getParameter("r").replace(',', '.').trim());

            var point = new Point(x, y, r);

            var session = request.getSession();
            var bean = (PointRepository) session.getAttribute("bean");
            if (bean == null) {
                bean = new PointRepository();
                session.setAttribute("bean", bean);
            }
            bean.addPoint(point);

            if (wantsJson) {
                response.setContentType("application/json;charset=UTF-8");
                response.setCharacterEncoding("UTF-8");
                Map<String, Object> payload = new HashMap<>();
                payload.put("latest", point);
                payload.put("points", bean.getPoints());
                var json = JsonbBuilder.create().toJson(payload);
                response.getWriter().write(json);
                return;
            }

            request.getRequestDispatcher("./result.jsp").forward(request, response);
        } catch (NumberFormatException | NullPointerException | IllegalStateException e) {
            request.getRequestDispatcher("./index.jsp").forward(request, response);
        }
    }
}
