
package Cibertec.pe.repository;

import Cibertec.pe.entity.Cliente;
import org.springframework.data.jpa.repository.JpaRepository;

public interface IClienteRepository
        extends JpaRepository<Cliente, Integer> {
}
