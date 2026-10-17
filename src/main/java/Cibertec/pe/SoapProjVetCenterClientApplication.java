
package Cibertec.pe;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class SoapProjVetCenterClientApplication {

	public static void main(String[] args) {
		SpringApplication.run(SoapProjVetCenterClientApplication.class, args);
		System.out.println("Cliente SOAP VetCenter iniciado correctamente")
		;System.out.println("http://localhost:8091/admin.html");
	}
}
