
package Cibertec.pe.service;

import Cibertec.pe.client.ClienteSoapClient;
import Cibertec.pe.entity.Usuario;
import Cibertec.pe.repository.IUsuarioRepository;
import Cibertec.pe.soap.cliente.Cliente;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Locale;

@Service
public class UsuarioService {

    private final IUsuarioRepository usuarioRepo;
    private final ClienteSoapClient clienteSoapClient;

    private final BCryptPasswordEncoder encoder =
            new BCryptPasswordEncoder();

    public UsuarioService(
            IUsuarioRepository usuarioRepo,
            ClienteSoapClient clienteSoapClient) {

        this.usuarioRepo = usuarioRepo;
        this.clienteSoapClient = clienteSoapClient;
    }

    // ==========================================
    // 1. REGISTRO PUBLICO
    // ==========================================

    public String registrar(
            String nombres,
            String apellidos,
            String dni,
            String telefono,
            String correo,
            String password) {

        // ==========================================
        // VALIDACIONES DE CAMPOS OBLIGATORIOS
        // ==========================================

        if (vacio(nombres)) {
            return "Debes ingresar tus nombres";
        }

        if (vacio(apellidos)) {
            return "Debes ingresar tus apellidos";
        }

        if (vacio(dni)) {
            return "Debes ingresar tu DNI";
        }

        if (vacio(telefono)) {
            return "Debes ingresar tu telefono";
        }

        if (vacio(correo)) {
            return "Debes ingresar tu correo electronico";
        }

        // ==========================================
        // VALIDACION DE CONTRASEÑA
        // ==========================================

        if (password == null || password.isBlank()) {
            return "Debes ingresar una contraseña";
        }

        if (password.length() < 8) {
            return "La contraseña debe tener al menos 8 caracteres";
        }

        // ==========================================
        // VALIDACION DEL DNI
        // ==========================================

        String dniNormalizado = dni.trim();

        if (!dniNormalizado.matches("\\d{8}")) {
            return "El DNI debe contener exactamente 8 digitos";
        }

        // ==========================================
        // VALIDACION DEL TELEFONO
        // ==========================================

        String telefonoNormalizado = telefono.trim();

        if (!telefonoNormalizado.matches("\\d{9}")) {
            return "El telefono debe contener exactamente 9 digitos";
        }

        // ==========================================
        // VALIDACION DEL CORREO
        // ==========================================

        String correoNormalizado =
                correo.trim().toLowerCase(Locale.ROOT);

        if (!correoNormalizado.matches(
                "^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$")) {

            return "El correo electronico no es valido";
        }

        // ==========================================
        // VERIFICAR CORREO DUPLICADO
        // ==========================================

        if (usuarioRepo.existsByCorreo(correoNormalizado)) {
            return "El correo electronico ya esta registrado";
        }

        // ==========================================
        // CONSULTAR CLIENTES SOAP
        // ==========================================

        List<Cliente> clientes;

        try {

            clientes = clienteSoapClient.listarClientes();

        } catch (Exception e) {

            return "No se pudo conectar con el servicio SOAP de clientes";
        }

        if (clientes == null) {
            return "El servicio SOAP no devolvio la lista de clientes";
        }

        // ==========================================
        // EVITAR CLIENTES DUPLICADOS
        // ==========================================

        for (Cliente existente : clientes) {

            if (existente.getDni() != null
                    && dniNormalizado.equals(
                    existente.getDni().trim())) {

                return "Ya existe un cliente con este DNI. "
                        + "Solicita al administrador "
                        + "la activacion de tu cuenta";
            }

            if (existente.getCorreo() != null
                    && correoNormalizado.equalsIgnoreCase(
                    existente.getCorreo().trim())) {

                return "Ya existe un cliente con este correo. "
                        + "Solicita al administrador "
                        + "la activacion de tu cuenta";
            }
        }

        // ==========================================
        // CREAR CLIENTE SOAP
        // ==========================================

        Cliente cliente = new Cliente();

        cliente.setNombres(nombres.trim());
        cliente.setApellidos(apellidos.trim());
        cliente.setDni(dniNormalizado);
        cliente.setTelefono(telefonoNormalizado);
        cliente.setCorreo(correoNormalizado);

        Integer clienteId;

        try {

            clienteId =
                    clienteSoapClient.crearClienteConId(cliente);

        } catch (Exception e) {

            return "No se pudo crear el cliente "
                    + "en el servicio SOAP";
        }

        if (clienteId == null || clienteId <= 0) {

            return "El servicio SOAP no devolvio "
                    + "un identificador de cliente valido";
        }

        // ==========================================
        // CREAR USUARIO VINCULADO AL CLIENTE
        // ==========================================

        try {

            Usuario usuario = new Usuario();

            usuario.setNombres(nombres.trim());
            usuario.setCorreo(correoNormalizado);

            // Contraseña cifrada con BCrypt
            usuario.setPassword(
                    encoder.encode(password)
            );

            // Rol del usuario
            usuario.setRol("CLIENTE");

            // Cuenta activa
            usuario.setActivo(true);

            // Relacion con cliente SOAP
            usuario.setClienteId(clienteId);

            // Guardar usuario en MySQL
            usuarioRepo.saveAndFlush(usuario);

            return "Usuario registrado correctamente";

        } catch (Exception e) {

            // ======================================
            // COMPENSACION SI FALLA EL REGISTRO
            // ======================================

            try {

                clienteSoapClient.eliminarCliente(clienteId);

            } catch (Exception rollbackError) {

                System.err.println(
                        "No se pudo revertir el cliente SOAP "
                                + clienteId
                );
            }

            if (e instanceof DataIntegrityViolationException) {

                return "El correo electronico ya esta registrado";
            }

            return "No se pudo completar el registro. "
                    + "Contacta al administrador";
        }
    }

    // ==========================================
    // 2. AUTENTICACION
    // ==========================================

    public Usuario autenticar(
            String correo,
            String password) {

        if (vacio(correo) || vacio(password)) {
            return null;
        }

        String correoNormalizado =
                correo.trim().toLowerCase(Locale.ROOT);

        return usuarioRepo
                .findByCorreo(correoNormalizado)

                // Verificar cuenta activa
                .filter(usuario ->
                        Boolean.TRUE.equals(
                                usuario.getActivo()
                        ))

                // Verificar contraseña existente
                .filter(usuario ->
                        usuario.getPassword() != null
                                && !usuario.getPassword().isBlank())

                // Comparar contraseña con BCrypt
                .filter(usuario ->
                        encoder.matches(
                                password,
                                usuario.getPassword()
                        ))

                .orElse(null);
    }

    // ==========================================
    // 3. VALIDACION AUXILIAR
    // ==========================================

    private boolean vacio(String valor) {

        return valor == null || valor.isBlank();
    }
}
