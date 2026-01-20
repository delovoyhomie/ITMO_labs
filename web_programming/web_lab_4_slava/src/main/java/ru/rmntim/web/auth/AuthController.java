package ru.rmntim.web.auth;

import jakarta.servlet.http.HttpSession;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import ru.rmntim.web.auth.dto.AuthResponse;
import ru.rmntim.web.auth.dto.LoginRequest;
import ru.rmntim.web.common.SessionService;

@RestController
@RequestMapping("/api/auth")
public class AuthController {
    private final AuthService authService;
    private final SessionService sessionService;

    public AuthController(AuthService authService, SessionService sessionService) {
        this.authService = authService;
        this.sessionService = sessionService;
    }

    @PostMapping("/login")
    public AuthResponse login(@RequestBody LoginRequest request, HttpSession session) {
        User user = authService.authenticate(request.getUsername(), request.getPassword());
        sessionService.attachUser(session, user);
        return new AuthResponse(user.getUsername());
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout(HttpSession session) {
        session.invalidate();
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/me")
    public AuthResponse me(HttpSession session) {
        User user = sessionService.requireUser(session);
        return new AuthResponse(user.getUsername());
    }
}
