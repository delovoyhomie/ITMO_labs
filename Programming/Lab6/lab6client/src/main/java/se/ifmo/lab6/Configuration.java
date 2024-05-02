package se.ifmo.lab6;

import java.util.Optional;

public class Configuration {
    // 1313 - default port, if not set via env
    public static final int SERVER_PORT;
    public static final String SERVER_ADDRESS = "localhost";

    // client properties
    public static final int CLIENT_RECONNECT_DELAY = 10; // in seconds
    public static final int CLIENT_MAX_CONNECTION_TRIES = 10;

    static {
        SERVER_PORT = Optional.ofNullable(System.getenv("server_port"))
                .map(Integer::parseInt)
                .orElse(1313);
    }
}
