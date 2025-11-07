package ru.rmntim.web.labwork2.controllers;

import jakarta.servlet.ServletException;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import java.io.IOException;
import java.util.Set;
import java.util.stream.Collectors;
import java.util.stream.DoubleStream;

@WebServlet("/controller")
public class ControllerServlet extends HttpServlet {
    private static final String ERROR_MSG = "Incorrect data provided: %s";

    private static final Set<Double> ALLOWED_R = DoubleStream
            .iterate(1, i -> i <= 3, i -> i + .5)
            .boxed().collect(Collectors.toSet());
    private static final double MIN_X = -4.0;
    private static final double MAX_X = 4.0;
    private static final double MIN_Y = -5.0;
    private static final double MAX_Y = 3.0;

    @Override
    protected void doGet(HttpServletRequest request, HttpServletResponse response)
            throws IOException, ServletException {
        processRequest(request, response);
    }

    @Override
    protected void doPost(HttpServletRequest request, HttpServletResponse response)
            throws IOException, ServletException {
        processRequest(request, response);
    }

    private void processRequest(HttpServletRequest request, HttpServletResponse response)
            throws IOException, ServletException {
        try {
            var x = request.getParameter("x");
            var y = request.getParameter("y");
            var r = request.getParameter("r");

            if (x == null || y == null || r == null) {
                request.getRequestDispatcher("./index.jsp").forward(request, response);
                return;
            }

            if (x.isEmpty() || y.isEmpty() || r.isEmpty()) {
                request.setAttribute("error", String.format(ERROR_MSG, "x, y, and r must not be empty"));
                request.getRequestDispatcher("./error.jsp").forward(request, response);
                return;
            }

            var dx = Double.parseDouble(x.replace(',', '.').trim());
            if (dx < MIN_X || dx > MAX_X) {
                request.setAttribute("error",
                        String.format(ERROR_MSG,
                                String.format("x must be between %.1f and %.1f", MIN_X, MAX_X)));
                request.getRequestDispatcher("./error.jsp").forward(request, response);
                return;
            }

            var dy = Double.parseDouble(y.replace(',', '.').trim());
            var dr = Double.parseDouble(r.replace(',', '.').trim());

            if (!ALLOWED_R.contains(dr)) {
                request.setAttribute("error", String.format(ERROR_MSG, "r must be in " + ALLOWED_R));
                request.getRequestDispatcher("./error.jsp").forward(request, response);
                return;
            }

            if (dy < MIN_Y || dy > MAX_Y) {
                request.setAttribute("error",
                        String.format(ERROR_MSG, String.format("y must be in [%.1f, %.1f]", MIN_Y, MAX_Y)));
                request.getRequestDispatcher("./error.jsp").forward(request, response);
                return;
            }

            request.getRequestDispatcher("./calculate").forward(request, response);
        } catch (NumberFormatException | NullPointerException e) {
            request.setAttribute("error", e.toString());
            request.getRequestDispatcher("./error.jsp").forward(request, response);
        }
    }

}
