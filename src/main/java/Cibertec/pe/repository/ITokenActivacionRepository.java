
package Cibertec.pe.repository;

import Cibertec.pe.entity.TokenActivacion;

import jakarta.persistence.LockModeType;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface ITokenActivacionRepository
        extends JpaRepository<TokenActivacion, Integer> {

    Optional<TokenActivacion> findByTokenHash(String tokenHash);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
           SELECT t
           FROM TokenActivacion t
           WHERE t.tokenHash = :tokenHash
           """)
    Optional<TokenActivacion> buscarTokenParaActivar(
            @Param("tokenHash") String tokenHash
    );
}
