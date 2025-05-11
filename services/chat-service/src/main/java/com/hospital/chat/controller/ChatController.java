package com.hospital.chat.controller;

import com.hospital.chat.model.ChatMessage;
import com.hospital.chat.repository.ChatMessageRepository;
import com.hospital.chat.security.JwtUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/chat")
@CrossOrigin(origins = "http://localhost:3000", allowCredentials = "true")
public class ChatController {

    @Autowired
    private ChatMessageRepository chatMessageRepository;

    @Autowired
    private JwtUtil jwtUtil;

    @GetMapping("/messages")
    public ResponseEntity<?> getMessages(@RequestHeader("Authorization") String authorizationHeader) {
        try {
            String token = authorizationHeader.split(" ")[1];
            if (token == null || !jwtUtil.validateToken(token)) {
                return ResponseEntity.status(401).body("{\"success\": false, \"message\": \"Invalid token\"}");
            }

            List<ChatMessage> messages = chatMessageRepository.findAllByOrderByTimestampDesc();
            messages.sort((m1, m2) -> m1.getTimestamp().compareTo(m2.getTimestamp())); // Chronological order
            return ResponseEntity.ok("{\"success\": true, \"data\": " + messages + "}");
        } catch (Exception e) {
            return ResponseEntity.status(500).body("{\"success\": false, \"message\": \"Error fetching messages\"}");
        }
    }
}