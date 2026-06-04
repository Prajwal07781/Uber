package com.uberclone.repository;

import com.uberclone.model.AppUser;
import com.uberclone.model.Role;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface AppUserRepository extends JpaRepository<AppUser, Long> {
    List<AppUser> findByRole(Role role);
    Optional<AppUser> findByPhoneAndRole(String phone, Role role);
    boolean existsByPhoneAndRole(String phone, Role role);
}
