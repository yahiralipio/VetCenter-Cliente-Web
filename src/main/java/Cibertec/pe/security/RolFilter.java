
package Cibertec.pe.security;

import Cibertec.pe.entity.Usuario;
import Cibertec.pe.repository.IUsuarioRepository;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;

import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Optional;

@Component
@Order(2)
public class RolFilter extends OncePerRequestFilter {

    private final IUsuarioRepository usuarioRepository;

    public RolFilter(IUsuarioRepository usuarioRepository) {
        this.usuarioRepository = usuarioRepository;
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {

        String ruta = request.getServletPath();
        String metodo = request.getMethod();

        // Activación de cuentas
        if (ruta.equals("/api/activacion/activar")) {
            return true;
        }

        // Rutas que continúan siendo administrativas
        boolean rutasAdministrativas =
                ruta.equals("/api/clientes")
                        || ruta.startsWith("/api/clientes/")
                        || ruta.equals("/api/mascotas")
                        || ruta.startsWith("/api/mascotas/")
                        || ruta.equals("/api/citas")
                        || ruta.startsWith("/api/citas/")
                        || ruta.equals("/api/admin/usuarios")
                        || ruta.startsWith("/api/admin/usuarios/");

        // Productos: consulta para clientes,
        // gestión reservada a administradores.
        boolean rutaProductos =
                ruta.equals("/api/productos")
                        || ruta.startsWith("/api/productos/");

        // Medicamentos: consulta para clientes,
        // gestión reservada a administradores.
        boolean rutaMedicamentos =
                ruta.equals("/api/medicamentos")
                        || ruta.startsWith("/api/medicamentos/");

        boolean metodoEscritura =
                metodo.equalsIgnoreCase("POST")
                        || metodo.equalsIgnoreCase("PUT")
                        || metodo.equalsIgnoreCase("PATCH")
                        || metodo.equalsIgnoreCase("DELETE");

        boolean gestionProductos =
                rutaProductos
                        && (
                        metodoEscritura
                                || ruta.equals("/api/productos/admin/todos")
                                || ruta.startsWith("/api/productos/admin/")
                );

        boolean gestionMedicamentos =
                rutaMedicamentos && metodoEscritura;

        // El filtro de rol solo interviene cuando
        // se requieren permisos de administrador.
        return !(
                rutasAdministrativas
                        || gestionProductos
                        || gestionMedicamentos
        );
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain)
            throws ServletException, IOException {

        HttpSession sesion = request.getSession(false);

        // Verificar sesión
        if (sesion == null ||
                !(sesion.getAttribute("usuarioId") instanceof Integer)) {

            enviarError(
                    response,
                    401,
                    "Debes iniciar sesion"
            );
            return;
        }

        Integer usuarioId =
                (Integer) sesion.getAttribute("usuarioId");

        Optional<Usuario> encontrado =
                usuarioRepository.findById(usuarioId);

        // Verificar que la cuenta exista y esté activa
        if (encontrado.isEmpty() ||
                !Boolean.TRUE.equals(
                        encontrado.get().getActivo()
                )) {

            sesion.invalidate();

            enviarError(
                    response,
                    401,
                    "Cuenta no disponible"
            );
            return;
        }

        Usuario usuario = encontrado.get();

        // Solo administradores pueden ejecutar
        // operaciones protegidas.
        if (!"ADMIN".equalsIgnoreCase(usuario.getRol())) {

            enviarError(
                    response,
                    403,
                    "No tienes permisos administrativos"
            );
            return;
        }

        filterChain.doFilter(request, response);
    }

    private void enviarError(
            HttpServletResponse response,
            int estado,
            String mensaje) throws IOException {

        response.setStatus(estado);
        response.setContentType(
                "application/json;charset=UTF-8"
        );

        response.getWriter().write(
                "{\"mensaje\":\"" + mensaje + "\"}"
        );
    }
}
