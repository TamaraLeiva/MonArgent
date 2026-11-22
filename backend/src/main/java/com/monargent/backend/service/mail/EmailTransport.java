package com.monargent.backend.service.mail;

public interface EmailTransport {

    void send(String to, String from, String subject, String plainText, String htmlContent);
}
