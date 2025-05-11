package com.hospital.chat.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.util.Date;

@Document(collection = "chatmessages")
public class ChatMessage {
    @Id
    private String id;
    private String sender;
    private String senderName;
    private String senderType; // doctor or patient
    private String content;
    private Date timestamp;

    // Constructors, getters, and setters
    public ChatMessage() {
        this.timestamp = new Date();
    }

    public ChatMessage(String sender, String senderName, String senderType, String content) {
        this.sender = sender;
        this.senderName = senderName;
        this.senderType = senderType;
        this.content = content;
        this.timestamp = new Date();
    }

    // Getters and setters
    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getSender() { return sender; }
    public void setSender(String sender) { this.sender = sender; }
    public String getSenderName() { return senderName; }
    public void setSenderName(String senderName) { this.senderName = senderName; }
    public String getSenderType() { return senderType; }
    public void setSenderType(String senderType) { this.senderType = senderType; }
    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }
    public Date getTimestamp() { return timestamp; }
    public void setTimestamp(Date timestamp) { this.timestamp = timestamp; }
}