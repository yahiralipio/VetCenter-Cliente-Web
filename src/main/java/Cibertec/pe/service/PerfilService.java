package Cibertec.pe.service;

import Cibertec.pe.client.ClienteSoapClient;
import Cibertec.pe.entity.Usuario;
import Cibertec.pe.repository.IUsuarioRepository;
import Cibertec.pe.soap.cliente.Cliente;

import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

import org.springframework.stereotype.Service;

@Service
public class PerfilService {

    private final IUsuarioRepository usuarioRepository;
    private final ClienteSoapClient clienteSoapClient;
    private final BCryptPasswordEncoder encoder =
            new BCryptPasswordEncoder();

    public PerfilService(
            IUsuarioRepository usuarioRepository,
            ClienteSoapClient clienteSoapClient) {

        this.usuarioRepository = usuarioRepository;
        this.clienteSoapClient = clienteSoapClient;
    }

    // ==========================================
    // 1. ACTUALIZAR DATOS PERSONALES
    // ==========================================

    public String actualizarPerfil(
            Integer usuarioId,
            String nombres,
            String apellidos,
            String telefono) {

        // VALIDAR CAMPOS OBLIGATORIOS
        if (nombres == null || nombres.isBlank()) {
            return "Debes ingresar tus nombres";
        }

        if (apellidos == null || apellidos.isBlank()) {
            return "Debes ingresar tus apellidos";
        }

        if (telefono == null ||
                !telefono.trim().matches("\\d{9}")) {
            return "El telefono debe contener exactamente 9 digitos";
        }

        // BUSCAR USUARIO
        Usuario usuario = usuarioRepository
                .findById(usuarioId)
                .orElse(null);

        if (usuario == null) {
            return "No se encontro el usuario";
        }

        if (!"CLIENTE".equalsIgnoreCase(usuario.getRol())) {
            return "No tienes permisos para actualizar este perfil";
        }

        Integer clienteId = usuario.getClienteId();

        if (clienteId == null) {
            return "Tu cuenta no tiene un cliente asociado";
        }

        // CONSULTAR CLIENTE SOAP
        Cliente cliente;

        try {
            cliente = clienteSoapClient.buscarCliente(clienteId);
        } catch (Exception e) {
            return "No se pudo consultar el servicio SOAP";
        }

        if (cliente == null) {
            return "No se encontro el cliente asociado";
        }

        // CONSERVAR LOS DATOS ANTERIORES
        String nombresAnteriores = cliente.getNombres();
        String apellidosAnteriores = cliente.getApellidos();
        String telefonoAnterior = cliente.getTelefono();

        // ACTUALIZAR DATOS PERSONALES
        cliente.setNombres(nombres.trim());
        cliente.setApellidos(apellidos.trim());
        cliente.setTelefono(telefono.trim());

        // GUARDAR EN SOAP
        try {
            String resultado = clienteSoapClient
                    .actualizarCliente(clienteId, cliente);

            if (resultado == null ||
                    !resultado.trim().equalsIgnoreCase(
                            "Cliente actualizado correctamente")) {

                return "No se pudo confirmar la actualizacion SOAP: "
                        + resultado;
            }

        } catch (Exception e) {
            return "Error al actualizar los datos del cliente";
        }

        // SINCRONIZAR NOMBRE EN TBL_USUARIO
        try {
            usuario.setNombres(nombres.trim());
            usuarioRepository.saveAndFlush(usuario);

        } catch (Exception e) {

            // INTENTAR RESTAURAR LOS DATOS ANTERIORES
            try {
                cliente.setNombres(nombresAnteriores);
                cliente.setApellidos(apellidosAnteriores);
                cliente.setTelefono(telefonoAnterior);

                clienteSoapClient.actualizarCliente(
                        clienteId,
                        cliente
                );

            } catch (Exception rollbackError) {
                System.err.println(
                        "No se pudo restaurar el cliente SOAP: "
                                + clienteId
                );
            }

            return "No se pudo sincronizar el perfil. "
                    + "Verifica los datos antes de reintentar";
        }

        return "Perfil actualizado correctamente";
    }


    // ==========================================
    // 2. CAMBIAR CONTRASEÑA
    // ==========================================

    public String cambiarPassword(
            Integer usuarioId,
            String passwordActual,
            String passwordNueva,
            String confirmarPassword) {

        if (usuarioId == null) {
            return "Debes iniciar sesion";
        }

        if (passwordActual == null || passwordActual.isBlank()) {
            return "Ingresa tu contraseña actual";
        }

        if (passwordNueva == null || passwordNueva.isBlank()) {
            return "Ingresa una nueva contraseña";
        }

        if (passwordNueva.length() < 8) {
            return "La nueva contraseña debe tener al menos 8 caracteres";
        }

        if (!passwordNueva.equals(confirmarPassword)) {
            return "Las nuevas contraseñas no coinciden";
        }

        Usuario usuario = usuarioRepository.findById(usuarioId)
                .orElse(null);

        if (usuario == null ||
                !Boolean.TRUE.equals(usuario.getActivo())) {
            return "La cuenta no existe o esta desactivada";
        }

        if (!"CLIENTE".equalsIgnoreCase(usuario.getRol())) {
            return "No tienes permisos para cambiar esta contraseña";
        }

        if (usuario.getPassword() == null ||
                usuario.getPassword().isBlank()) {
            return "Tu cuenta no tiene una contraseña configurada";
        }

        if (!encoder.matches(
                passwordActual,
                usuario.getPassword())) {
            return "La contraseña actual es incorrecta";
        }

        if (encoder.matches(
                passwordNueva,
                usuario.getPassword())) {
            return "La nueva contraseña debe ser diferente de la actual";
        }

        usuario.setPassword(encoder.encode(passwordNueva));
        usuarioRepository.saveAndFlush(usuario);

        return "Contraseña actualizada correctamente";
    }

}
