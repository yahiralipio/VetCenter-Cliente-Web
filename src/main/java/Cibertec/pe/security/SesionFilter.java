package Cibertec.pe.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;

import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Component
public class SesionFilter extends OncePerRequestFilter {

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {

        String ruta = request.getServletPath();
        String metodo = request.getMethod();

        // Los archivos HTML, CSS y JavaScript no pasan
        // por el filtro de autenticacion.
        if (!ruta.startsWith("/api/")) {
            return true;
        }

        // Inicio de sesion y registro publico.
        if (ruta.equals("/api/auth/login")
                || ruta.equals("/api/auth/registro")) {
            return true;
        }

        // Permitir activar cuentas sin iniciar sesion.
        if (ruta.equals("/api/activacion/activar")
                && metodo.equalsIgnoreCase("POST")) {
            return true;
        }

        // Los demas endpoints requieren una sesion.
        return false;
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain)
            throws ServletException, IOException {

        HttpSession sesion = request.getSession(false);

        if (sesion == null
                || sesion.getAttribute("usuarioId") == null) {

            response.setStatus(
                    HttpServletResponse.SC_UNAUTHORIZED
            );

            response.setContentType(
                    "application/json;charset=UTF-8"
            );

            response.getWriter().write(
                    "{\"mensaje\":\"Debes iniciar sesion\"}"
            );

            return;
        }

        filterChain.doFilter(request, response);
    }
}
