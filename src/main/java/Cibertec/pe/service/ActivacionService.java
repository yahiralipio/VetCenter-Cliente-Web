package Cibertec.pe.service;

import Cibertec.pe.entity.TokenActivacion;
import Cibertec.pe.entity.Usuario;
import Cibertec.pe.repository.ITokenActivacionRepository;
import Cibertec.pe.repository.IUsuarioRepository;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.transaction.PlatformTransactionManager;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.HexFormat;
import java.util.Locale;

@Service
public class ActivacionService {

    private final IUsuarioRepository usuarioRepository;
    private final ITokenActivacionRepository tokenRepository;
    private final CorreoService correoService;
    private final TransactionTemplate transactionTemplate;

    private final BCryptPasswordEncoder encoder =
            new BCryptPasswordEncoder();

    private final SecureRandom secureRandom =
            new SecureRandom();

    @Value("${vetcenter.activacion.expiracion-horas:24}")
    private long expiracionHoras;

    public ActivacionService(
            IUsuarioRepository usuarioRepository,
            ITokenActivacionRepository tokenRepository,
            CorreoService correoService,
            PlatformTransactionManager transactionManager) {

        this.usuarioRepository = usuarioRepository;
        this.tokenRepository = tokenRepository;
        this.correoService = correoService;
        this.transactionTemplate =
                new TransactionTemplate(transactionManager);
    }

    private String generarToken() {
        byte[] bytes = new byte[32];
        secureRandom.nextBytes(bytes);

        return Base64.getUrlEncoder()
                .withoutPadding()
                .encodeToString(bytes);
    }

    private String calcularHash(String token) {
        try {
            MessageDigest digest =
                    MessageDigest.getInstance("SHA-256");

            byte[] hash = digest.digest(
                    token.getBytes(StandardCharsets.UTF_8)
            );

            return HexFormat.of().formatHex(hash);

        } catch (Exception e) {
            throw new IllegalStateException(
                    "No se pudo generar el hash del token", e
            );
        }
    }

    private String normalizarCorreo(String correo) {
        if (correo == null || correo.isBlank()) {
            throw new IllegalArgumentException(
                    "El correo es obligatorio"
            );
        }

        return correo.trim().toLowerCase(Locale.ROOT);
    }

    public String crearInvitacion(
            Integer clienteId,
            String nombres,
            String correo) {

        if (clienteId == null || clienteId <= 0) {
            throw new IllegalArgumentException(
                    "El identificador del cliente no es valido"
            );
        }

        if (nombres == null || nombres.isBlank()) {
            throw new IllegalArgumentException(
                    "El nombre es obligatorio"
            );
        }

        String correoNormalizado = normalizarCorreo(correo);

        // Primero guardar usuario y token en MySQL.
        // La transaccion termina antes de llamar a Gmail.
        String tokenOriginal = transactionTemplate.execute(status -> {

            if (usuarioRepository.existsByCorreo(correoNormalizado)) {
                throw new IllegalStateException(
                        "Ya existe una cuenta con este correo"
                );
            }

            Usuario usuario = new Usuario();

            usuario.setNombres(nombres.trim());
            usuario.setCorreo(correoNormalizado);
            usuario.setPassword(null);
            usuario.setRol("CLIENTE");
            usuario.setClienteId(clienteId);
            usuario.setActivo(false);

            usuario = usuarioRepository.save(usuario);

            String token = generarToken();

            TokenActivacion invitacion = new TokenActivacion();

            invitacion.setUsuario(usuario);
            invitacion.setTokenHash(calcularHash(token));
            invitacion.setFechaExpiracion(
                    LocalDateTime.now().plusHours(expiracionHoras)
            );
            invitacion.setUtilizado(false);

            tokenRepository.save(invitacion);

            return token;
        });

        if (tokenOriginal == null) {
            throw new IllegalStateException(
                    "No se pudo preparar la invitacion"
            );
        }

        // Gmail se ejecuta despues de confirmar los datos.
        correoService.enviarInvitacion(
                correoNormalizado,
                nombres.trim(),
                tokenOriginal
        );

        return "Invitacion enviada correctamente";
    }

    public String reenviarInvitacion(String correo) {

        String correoNormalizado = normalizarCorreo(correo);

        // Generar un token nuevo sin crear otro usuario.
        String tokenOriginal = transactionTemplate.execute(status -> {

            Usuario usuario = usuarioRepository
                    .findByCorreo(correoNormalizado)
                    .orElseThrow(() -> new IllegalArgumentException(
                            "No existe una cuenta con este correo"
                    ));

            if (!"CLIENTE".equals(usuario.getRol())) {
                throw new IllegalStateException(
                        "Esta cuenta no admite invitaciones"
                );
            }

            if (Boolean.TRUE.equals(usuario.getActivo())) {
                throw new IllegalStateException(
                        "La cuenta ya se encuentra activa"
                );
            }

            String token = generarToken();

            TokenActivacion invitacion = new TokenActivacion();

            invitacion.setUsuario(usuario);
            invitacion.setTokenHash(calcularHash(token));
            invitacion.setFechaExpiracion(
                    LocalDateTime.now().plusHours(expiracionHoras)
            );
            invitacion.setUtilizado(false);

            tokenRepository.save(invitacion);

            return token;
        });

        if (tokenOriginal == null) {
            throw new IllegalStateException(
                    "No se pudo preparar el reenvio"
            );
        }

        Usuario usuario = usuarioRepository
                .findByCorreo(correoNormalizado)
                .orElseThrow();

        correoService.enviarInvitacion(
                correoNormalizado,
                usuario.getNombres(),
                tokenOriginal
        );

        return "Invitacion reenviada correctamente";
    }

    @Transactional
    public String activarCuenta(
            String token,
            String password) {

        if (token == null || token.isBlank()) {
            throw new IllegalArgumentException(
                    "El token de activacion es obligatorio"
            );
        }

        if (password == null || password.length() < 8) {
            throw new IllegalArgumentException(
                    "La contraseña debe tener al menos 8 caracteres"
            );
        }

        String hash = calcularHash(token);

        TokenActivacion invitacion = tokenRepository
                .buscarTokenParaActivar(hash)
                .orElseThrow(() -> new IllegalArgumentException(
                        "El enlace de activacion no es valido"
                ));

        if (Boolean.TRUE.equals(invitacion.getUtilizado())) {
            throw new IllegalStateException(
                    "Este enlace ya fue utilizado"
            );
        }

        if (!LocalDateTime.now().isBefore(
                invitacion.getFechaExpiracion())) {

            throw new IllegalStateException(
                    "El enlace de activacion ha expirado"
            );
        }

        Usuario usuario = invitacion.getUsuario();

        if (Boolean.TRUE.equals(usuario.getActivo())) {
            throw new IllegalStateException(
                    "Esta cuenta ya se encuentra activa"
            );
        }

        usuario.setPassword(encoder.encode(password));
        usuario.setActivo(true);

        invitacion.setUtilizado(true);

        usuarioRepository.save(usuario);
        tokenRepository.save(invitacion);

        return "Cuenta activada correctamente";
    }
}
