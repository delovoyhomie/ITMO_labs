package ru.rmntim.web.config;

import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import ru.rmntim.web.auth.User;
import ru.rmntim.web.auth.UserRepository;

@Component
public class DataInitializer implements CommandLineRunner {
    private static final String DEFAULT_USER = "student";
    private static final String DEFAULT_PASSWORD = "student";

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public DataInitializer(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public void run(String... args) {
        if (!userRepository.existsByUsername(DEFAULT_USER)) {
            String hash = passwordEncoder.encode(DEFAULT_PASSWORD);
            userRepository.save(new User(DEFAULT_USER, hash));
        }
    }
}
