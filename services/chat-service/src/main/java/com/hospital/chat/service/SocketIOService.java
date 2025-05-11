package com.hospital.chat.service;

import com.corundumstudio.socketio.SocketIOClient;
import com.corundumstudio.socketio.SocketIOServer;
import com.corundumstudio.socketio.annotation.OnConnect;
import com.corundumstudio.socketio.annotation.OnDisconnect;
import com.corundumstudio.socketio.annotation.OnEvent;
import com.hospital.chat.security.JwtUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import javax.annotation.PostConstruct;
import javax.annotation.PreDestroy;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class SocketIOService {

    @Autowired
    private SocketIOServer socketIOServer;

    @Autowired
    private JwtUtil jwtUtil;

    // Store online users (id -> userData)
    private final Map<String, Map<String, Object>> onlineUsers = new ConcurrentHashMap<>();
    // Map client sessions to user IDs
    private final Map<String, String> sessionToUserId = new ConcurrentHashMap<>();

    @PostConstruct
    public void start() {
        socketIOServer.start();
        System.out.println("Socket.IO server started on port 5002");
    }

    @PreDestroy
    public void stop() {
        socketIOServer.stop();
        System.out.println("Socket.IO server stopped");
    }

    @OnConnect
    public void onConnect(SocketIOClient client) {
        System.out.println("Client connected: " + client.getSessionId());
        // Extract token from query parameters (e.g., ?token=...)
        String token = client.getHandshakeData().getSingleUrlParam("token");
        if (token != null) {
            if (jwtUtil.validateToken(token)) {
                System.out.println("Client authenticated with token: " + token);
            } else {
                client.disconnect();
                System.out.println("Invalid token, client disconnected: " + client.getSessionId());
                return;
            }
        } else {
            client.disconnect();
            System.out.println("No token provided, client disconnected: " + client.getSessionId());
            return;
        }
    }

    @OnDisconnect
    public void onDisconnect(SocketIOClient client) {
        String userId = sessionToUserId.remove(client.getSessionId().toString());
        if (userId != null) {
            onlineUsers.remove(userId);
            broadcastOnlineUsers();
        }
        System.out.println("Client disconnected: " + client.getSessionId());
    }

    @OnEvent("join")
    public void onJoin(SocketIOClient client, Map<String, Object> userData) {
        String userId = userData.get("id").toString();
        sessionToUserId.put(client.getSessionId().toString(), userId);
        onlineUsers.put(userId, userData);
        System.out.println("User joined: " + userData);
        broadcastOnlineUsers();
    }

    @OnEvent("sendMessage")
    public void onSendMessage(SocketIOClient client, Map<String, Object> messageData) {
        // Broadcast the message to all clients
        System.out.println("Received message: " + messageData);
        socketIOServer.getBroadcastOperations().sendEvent("message", messageData);
    }

    private void broadcastOnlineUsers() {
        // Convert onlineUsers map to a list for broadcasting
        socketIOServer.getBroadcastOperations().sendEvent("onlineUsers", onlineUsers.values());
    }
}