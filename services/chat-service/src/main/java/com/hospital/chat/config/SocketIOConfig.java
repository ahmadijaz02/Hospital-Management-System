package com.hospital.chat.config;

import com.corundumstudio.socketio.Configuration;
import com.corundumstudio.socketio.SocketIOServer;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.stereotype.Component;

@Component
public class SocketIOConfig {

    @Value("${server.port}")
    private int serverPort;

    @Bean
    public SocketIOServer socketIOServer() {
        Configuration config = new Configuration();
        config.setHostname("localhost");
        // Use a different port for Socket.IO to avoid conflicts with Spring Boot's HTTP port (5001)
        config.setPort(5002); 
        config.setAllowCustomRequests(true);
        // Enable WebSocket transport
        config.getSocketConfig().setReuseAddress(true);

        SocketIOServer server = new SocketIOServer(config);
        return server;
    }
}