package ru.rmntim.web.labwork2.controllers;

import jakarta.servlet.ServletException;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import ru.rmntim.web.labwork2.models.Point;
import ru.rmntim.web.labwork2.repository.PointRepository;

import java.io.IOException;

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

            request.getRequestDispatcher("./result.jsp").forward(request, response);
        } catch (NumberFormatException | NullPointerException | IllegalStateException e) {
            request.getRequestDispatcher("./index.jsp").forward(request, response);
        }
    }
}
