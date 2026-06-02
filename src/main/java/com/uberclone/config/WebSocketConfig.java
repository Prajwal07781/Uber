package com.uberclone.config;

import com.uberclone.websocket.RideWebSocketHandler;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.socket.config.annotation.EnableWebSocket;
import org.springframework.web.socket.config.annotation.WebSocketConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketHandlerRegistry;

@Configuration
@EnableWebSocket
public class WebSocketConfig implements WebSocketConfigurer {
    private final RideWebSocketHandler rideWebSocketHandler;

    public WebSocketConfig(RideWebSocketHandler rideWebSocketHandler) {
        this.rideWebSocketHandler = rideWebSocketHandler;
    }

    @Override
    public void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {
        registry.addHandler(rideWebSocketHandler, "/ws/rides")
                .setAllowedOrigins("*");
    }
}
