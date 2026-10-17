package Cibertec.pe.config;

import Cibertec.pe.entity.Usuario;
import Cibertec.pe.repository.IUsuarioRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Component;

@Component
public class DataInitializer implements CommandLineRunner {

    private final IUsuarioRepository usuarioRepository;

    public DataInitializer(IUsuarioRepository usuarioRepository) {
        this.usuarioRepository = usuarioRepository;
    }

    @Override
    public void run(String... args) throws Exception {

        String correoAdmin = "admin@vetcenter.com";
        String passwordAdmin = "AdminVet2026!";


        if (usuarioRepository.findByCorreo(correoAdmin).isEmpty()) {

            Usuario admin = new Usuario();
            admin.setNombres("Administrador Principal");
            admin.setCorreo(correoAdmin);
            admin.setPassword(new BCryptPasswordEncoder().encode(passwordAdmin));
            admin.setRol("ADMIN");
            admin.setActivo(true);
            admin.setClienteId(null);

            usuarioRepository.save(admin);

            System.out.println("Admin por defecto registrado correctamente.");
        } else {
            System.out.println("El admin por defecto ya existe en el sistema.");
        }
    }
}