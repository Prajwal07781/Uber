package com.uberclone.websocket;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.uberclone.service.TokenService;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;
import org.springframework.web.util.UriComponentsBuilder;

import java.io.IOException;
import java.net.URI;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class RideWebSocketHandler extends TextWebSocketHandler {
    private final ObjectMapper objectMapper;
    private final TokenService tokenService;
    private final Set<WebSocketSession> sessions = ConcurrentHashMap.newKeySet();

    public RideWebSocketHandler(ObjectMapper objectMapper, TokenService tokenService) {
        this.objectMapper = objectMapper;
        this.tokenService = tokenService;
    }

    @Override
    public void afterConnectionEstablished(WebSocketSession session) throws Exception {
        try {
            URI uri = session.getUri();
            String token = uri == null ? "" : UriComponentsBuilder.fromUri(uri).build().getQueryParams().getFirst("token");
            TokenService.TokenClaims claims = tokenService.verify(token);
            session.getAttributes().put("authUserId", claims.userId());
            session.getAttributes().put("authRole", claims.role().name());
            sessions.add(session);
            send(session, Map.of("type", "CONNECTED", "message", "Live ride updates connected"));
        } catch (RuntimeException exception) {
            session.close(CloseStatus.NOT_ACCEPTABLE.withReason("Invalid token"));
        }
    }

    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage message) throws Exception {
        JsonNode payload = objectMapper.readTree(message.getPayload());
        if ("PING".equals(payload.path("type").asText())) {
            send(session, Map.of("type", "PONG"));
        }
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) {
        sessions.remove(session);
    }

    public void broadcast(Object payload) {
        sessions.removeIf(session -> !session.isOpen());
        for (WebSocketSession session : sessions) {
            try {
                send(session, payload);
            } catch (IOException exception) {
                sessions.remove(session);
            }
        }
    }

    private void send(WebSocketSession session, Object payload) throws IOException {
        session.sendMessage(new TextMessage(objectMapper.writeValueAsString(payload)));
    }
}
