package com.monargent.backend.service.impl;

import com.monargent.backend.enums.AuthEmailType;
import com.monargent.backend.exception.EmailSendException;
import com.monargent.backend.service.AuthEmailService;
import com.monargent.backend.service.mail.EmailTransport;
import java.util.Arrays;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuthEmailServiceImpl implements AuthEmailService {

    private final EmailTransport emailTransport;
    private final Environment environment;

    @Value("${spring.mail.properties.mail.smtp.from:noreply@monargent.app}")
    private String fromAddress;

    @Value("${app.auth.expose-codes-in-log:false}")
    private boolean exposeCodesInLog;

    @Override
    public void sendAuthCodeEmail(String toEmail, String code, AuthEmailType type, int expirationMinutes) {
        try {
            String subject = resolveSubject(type);
            String plainText = buildPlainTextBody(code, type, expirationMinutes);
            String htmlBody = buildHtmlBody(code, type, expirationMinutes);
            emailTransport.send(toEmail, fromAddress, subject, plainText, htmlBody);
            log.info("Auth email ({}) sent to {}", type, toEmail);
        } catch (Exception ex) {
            boolean prodProfile = Arrays.stream(environment.getActiveProfiles()).anyMatch("prod"::equalsIgnoreCase);
            String technicalReason = sanitizeTechnicalReason(ex.getMessage());
            if (exposeCodesInLog && !prodProfile) {
                log.warn(
                    "No se pudo enviar correo de autenticación ({}). Motivo técnico: {}. Código expuesto solo por flag dev.",
                    type,
                    technicalReason
                );
            } else {
                log.warn("No se pudo enviar correo de autenticación ({}). Motivo técnico: {}", type, technicalReason);
            }
            log.debug("Detalle técnico de envío de correo omitido al cliente", ex);
            throw new EmailSendException(
                "No se pudo enviar el correo de verificación. Verificá la configuración de correo o intentá más tarde.",
                ex
            );
        }
    }

    private String resolveSubject(AuthEmailType type) {
        return switch (type) {
            case REGISTRATION -> "MonArgent — Verificá tu cuenta";
            case REGISTRATION_RESEND -> "MonArgent — Nuevo código de verificación";
            case PASSWORD_RESET -> "MonArgent — Restablecer contraseña";
        };
    }

    private String resolveHeading(AuthEmailType type) {
        return switch (type) {
            case REGISTRATION -> "Verificá tu cuenta";
            case REGISTRATION_RESEND -> "Nuevo código de verificación";
            case PASSWORD_RESET -> "Restablecé tu contraseña";
        };
    }

    private String resolveIntro(AuthEmailType type) {
        return switch (type) {
            case REGISTRATION ->
                "Gracias por registrarte en MonArgent. Ingresá el siguiente código para completar tu registro:";
            case REGISTRATION_RESEND ->
                "Solicitaste un nuevo código. Usalo para continuar con tu registro:";
            case PASSWORD_RESET ->
                "Recibimos una solicitud para restablecer tu contraseña. Ingresá este código para continuar:";
        };
    }

    private String resolveExpiryText(int expirationMinutes) {
        return expirationMinutes == 1 ? "1 minuto" : expirationMinutes + " minutos";
    }

    private String buildPlainTextBody(String code, AuthEmailType type, int expirationMinutes) {
        String expiryText = resolveExpiryText(expirationMinutes);
        return """
            MonArgent
            %s

            %s

            Tu código: %s

            Este código vence en %s.

            SEGURIDAD
            - Si no fuiste vos quien solicitó este código, ignorá este mensaje.
            - No compartas este código con nadie.
            - MonArgent nunca te pedirá tu contraseña por email.

            Saludos,
            el equipo de MonArgent
            """.formatted(resolveHeading(type), resolveIntro(type), code, expiryText);
    }

    private String buildHtmlBody(String code, AuthEmailType type, int expirationMinutes) {
        String intro = MonargentEmailTemplate.escapeHtml(resolveIntro(type));
        String bodyContent = """
            <p style="margin:0 0 28px;font-size:15px;line-height:1.65;color:#475569;">%s</p>
            %s
            """.formatted(intro, MonargentEmailTemplate.buildCodeBox(code, resolveExpiryText(expirationMinutes)));

        return MonargentEmailTemplate.buildEmailWithExtraSection(
            resolveHeading(type),
            bodyContent,
            MonargentEmailTemplate.buildSecuritySection()
        );
    }

    private String sanitizeTechnicalReason(String message) {
        if (message == null || message.isBlank()) {
            return "sin detalle técnico";
        }
        String sanitized = message.replaceAll("[\\r\\n\\t]+", " ").replaceAll("\\s{2,}", " ").trim();
        sanitized = sanitized.replaceAll("[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}", "[redacted-email]");
        sanitized = sanitized.replaceAll("(?i)(api[-_ ]?key|authorization|token)\\s*[:=]\\s*\\S+", "$1=[redacted]");
        int maxLength = 500;
        if (sanitized.length() > maxLength) {
            return sanitized.substring(0, maxLength);
        }
        return sanitized;
    }
}
