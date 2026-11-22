package com.monargent.backend.service.impl;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.monargent.backend.enums.AuthEmailType;
import com.monargent.backend.exception.EmailSendException;
import com.monargent.backend.service.mail.EmailTransport;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.core.env.Environment;
import org.springframework.test.util.ReflectionTestUtils;

@ExtendWith(MockitoExtension.class)
class AuthEmailServiceImplTest {

    @Mock private EmailTransport emailTransport;
    @Mock private Environment environment;

    @InjectMocks
    private AuthEmailServiceImpl service;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(service, "fromAddress", "noreply@monargent.app");
        ReflectionTestUtils.setField(service, "exposeCodesInLog", false);
    }

    @Test
    void sendAuthCodeEmail_allTypes_success() {
        service.sendAuthCodeEmail("a@example.com", "123456", AuthEmailType.REGISTRATION, 10);
        service.sendAuthCodeEmail("a@example.com", "123456", AuthEmailType.REGISTRATION_RESEND, 1);
        service.sendAuthCodeEmail("a@example.com", "123456", AuthEmailType.PASSWORD_RESET, 5);

        verify(emailTransport, times(3)).send(eq("a@example.com"), eq("noreply@monargent.app"), anyString(), anyString(), anyString());
    }

    @Test
    void sendAuthCodeEmail_mailFailure_throwsControlledError() {
        doThrow(new RuntimeException("smtp down"))
            .when(emailTransport).send(anyString(), anyString(), anyString(), anyString(), anyString());
        when(environment.getActiveProfiles()).thenReturn(new String[] {"dev"});

        assertThrows(EmailSendException.class, () ->
            service.sendAuthCodeEmail("a@example.com", "999999", AuthEmailType.REGISTRATION, 10));
    }

    @Test
    void sendAuthCodeEmail_buildsExpectedSubjectAndContent() {
        service.sendAuthCodeEmail("a@example.com", "654321", AuthEmailType.REGISTRATION, 10);

        verify(emailTransport).send(
            eq("a@example.com"),
            eq("noreply@monargent.app"),
            eq("MonArgent — Verificá tu cuenta"),
            contains("Tu código: 654321"),
            contains("654321")
        );
    }
}
