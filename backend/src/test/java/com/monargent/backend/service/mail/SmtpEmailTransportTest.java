package com.monargent.backend.service.mail;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import jakarta.mail.internet.MimeMessage;
import org.junit.jupiter.api.Test;
import org.springframework.mail.javamail.JavaMailSender;

class SmtpEmailTransportTest {

    @Test
    void send_delegatesToJavaMailSender() {
        JavaMailSender mailSender = mock(JavaMailSender.class);
        MimeMessage mimeMessage = mock(MimeMessage.class);
        when(mailSender.createMimeMessage()).thenReturn(mimeMessage);

        SmtpEmailTransport transport = new SmtpEmailTransport(mailSender);
        transport.send("to@example.com", "from@example.com", "Subject", "plain", "<p>html</p>");

        verify(mailSender).send(mimeMessage);
    }

    @Test
    void send_failure_throwsRuntimeException() {
        JavaMailSender mailSender = mock(JavaMailSender.class);
        MimeMessage mimeMessage = mock(MimeMessage.class);
        when(mailSender.createMimeMessage()).thenReturn(mimeMessage);
        org.mockito.Mockito.doThrow(new RuntimeException("smtp"))
            .when(mailSender).send(any(MimeMessage.class));

        SmtpEmailTransport transport = new SmtpEmailTransport(mailSender);

        org.assertj.core.api.Assertions.assertThatThrownBy(() ->
            transport.send("to@example.com", "from@example.com", "Subject", "plain", "<p>html</p>")
        ).isInstanceOf(RuntimeException.class).hasMessageContaining("SMTP mail send failed");
    }
}
