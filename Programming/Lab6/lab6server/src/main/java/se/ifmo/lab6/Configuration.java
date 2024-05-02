package se.ifmo.lab6;

import java.util.Optional;

public class Configuration {
    // 1313 - default port, if not set via env
    public static final int SERVER_PORT;
    public static final String SERVER_ADDRESS = "localhost";

    // log properties
    public static final boolean ALLOW_LOGGING = System.getenv().getOrDefault("logging", "false").equals("true");

    static {
        SERVER_PORT = Optional.ofNullable(System.getenv("server_port"))
                .map(Integer::parseInt)
                .orElse(1313);
    }

}
