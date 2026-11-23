package com.monargent.backend.service.mail;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import org.springframework.mail.javamail.JavaMailSender;

class MailTransportSelectionTest {

    private final ApplicationContextRunner contextRunner = new ApplicationContextRunner()
        .withBean(ObjectMapper.class, ObjectMapper::new)
        .withBean(JavaMailSender.class, () -> mock(JavaMailSender.class))
        .withUserConfiguration(SmtpEmailTransport.class, BrevoApiEmailTransport.class);

    @Test
    void defaultProvider_usesSmtpTransport() {
        contextRunner.run(context -> {
            assertThat(context).hasSingleBean(EmailTransport.class);
            assertThat(context.getBean(EmailTransport.class)).isInstanceOf(SmtpEmailTransport.class);
        });
    }

    @Test
    void smtpProvider_usesSmtpTransport() {
        contextRunner.withPropertyValues("app.mail.provider=smtp").run(context -> {
            assertThat(context).hasSingleBean(EmailTransport.class);
            assertThat(context.getBean(EmailTransport.class)).isInstanceOf(SmtpEmailTransport.class);
        });
    }

    @Test
    void brevoProvider_usesBrevoTransport() {
        contextRunner
            .withPropertyValues(
                "app.mail.provider=brevo",
                "brevo.api-key=test-key",
                "brevo.sender.email=noreply@monargent.app",
                "brevo.sender.name=MonArgent"
            )
            .run(context -> {
                assertThat(context).hasSingleBean(EmailTransport.class);
                assertThat(context.getBean(EmailTransport.class)).isInstanceOf(BrevoApiEmailTransport.class);
            });
    }

    @Test
    void brevoProvider_missingRequiredConfig_failsStartup() {
        contextRunner
            .withPropertyValues("app.mail.provider=brevo")
            .run(context -> assertThat(context).hasFailed());
    }
}
