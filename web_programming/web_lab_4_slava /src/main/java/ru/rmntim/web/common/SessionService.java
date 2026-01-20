package ru.rmntim.web.common;

import jakarta.servlet.http.HttpSession;
import org.springframework.stereotype.Service;
import ru.rmntim.web.auth.User;
import ru.rmntim.web.auth.UserRepository;

@Service
public class SessionService {
    public static final String SESSION_USER_ID = "USER_ID";

    private final UserRepository userRepository;

    public SessionService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    public void attachUser(HttpSession session, User user) {
        session.setAttribute(SESSION_USER_ID, user.getId());
    }

    public User requireUser(HttpSession session) {
        Object userId = session.getAttribute(SESSION_USER_ID);
        if (!(userId instanceof Long)) {
            throw new UnauthorizedException("Authentication required");
        }
        return userRepository.findById((Long) userId)
                .orElseThrow(() -> new UnauthorizedException("Authentication required"));
    }
}
