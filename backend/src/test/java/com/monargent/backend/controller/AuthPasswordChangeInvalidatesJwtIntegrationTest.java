package com.monargent.backend.controller;

import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.monargent.backend.enums.VerificationPurpose;
import com.monargent.backend.repository.VerificationCodeRepository;
import com.monargent.backend.service.AuthEmailService;
import com.monargent.backend.support.ApiTestSupport;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
class AuthPasswordChangeInvalidatesJwtIntegrationTest {

    @LocalServerPort
    private int port;

    @Autowired
    private TestRestTemplate restTemplate;

    @Autowired
    private VerificationCodeRepository verificationCodeRepository;

    @MockitoBean
    private AuthEmailService authEmailService;

    private final ObjectMapper objectMapper = new ObjectMapper();

    private static HttpHeaders bearerJsonHeaders(String token) {
        HttpHeaders headers = ApiTestSupport.jsonHeaders();
        headers.setBearerAuth(token);
        return headers;
    }

    @Test
    void oldJwtReturns401AfterPasswordChange_andUserCanAuthenticateWithNewPassword() throws Exception {
        String baseUrl = "http://localhost:" + port + "/api/v1";
        String email = ApiTestSupport.uniqueEmail("jwt-invalidation");
        String initialPassword = "Strong1!";
        String newPassword = "NewStrong1!";

        HttpHeaders json = ApiTestSupport.jsonHeaders();
        restTemplate.postForEntity(
            baseUrl + "/auth/register",
            new HttpEntity<>("""
                {"name":"Ana","lastname":"Perez","email":"%s"}
                """.formatted(email), json),
            String.class
        );

        String code = verificationCodeRepository
            .findFirstByEmailIgnoreCaseAndPurposeOrderByCreatedAtDesc(email, VerificationPurpose.REGISTRATION)
            .orElseThrow()
            .getCode();

        restTemplate.postForEntity(
            baseUrl + "/auth/verify",
            new HttpEntity<>("""
                {"email":"%s","code":"%s","password":"%s","passwordConfirm":"%s"}
                """.formatted(email, code, initialPassword, initialPassword), json),
            String.class
        );

        ResponseEntity<String> login = restTemplate.postForEntity(
            baseUrl + "/auth/login",
            new HttpEntity<>("""
                {"email":"%s","password":"%s"}
                """.formatted(email, initialPassword), json),
            String.class
        );
        assertThat(login.getStatusCode()).isEqualTo(HttpStatus.OK);
        String oldToken = objectMapper.readTree(login.getBody()).get("token").asText();
        assertThat(oldToken).isNotBlank();

        ResponseEntity<String> meBefore = restTemplate.exchange(
            baseUrl + "/auth/me",
            HttpMethod.GET,
            new HttpEntity<>(bearerJsonHeaders(oldToken)),
            String.class
        );
        assertThat(meBefore.getStatusCode()).isEqualTo(HttpStatus.OK);

        ResponseEntity<String> changePassword = restTemplate.postForEntity(
            baseUrl + "/auth/change-password",
            new HttpEntity<>("""
                {"currentPassword":"%s","newPassword":"%s","passwordConfirm":"%s"}
                """.formatted(initialPassword, newPassword, newPassword), bearerJsonHeaders(oldToken)),
            String.class
        );
        assertThat(changePassword.getStatusCode()).isEqualTo(HttpStatus.OK);

        ResponseEntity<String> meWithOldToken = restTemplate.exchange(
            baseUrl + "/auth/me",
            HttpMethod.GET,
            new HttpEntity<>(bearerJsonHeaders(oldToken)),
            String.class
        );
        assertThat(meWithOldToken.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);

        ResponseEntity<String> loginWithNewPassword = restTemplate.postForEntity(
            baseUrl + "/auth/login",
            new HttpEntity<>("""
                {"email":"%s","password":"%s"}
                """.formatted(email, newPassword), json),
            String.class
        );
        assertThat(loginWithNewPassword.getStatusCode()).isEqualTo(HttpStatus.OK);
        JsonNode body = objectMapper.readTree(loginWithNewPassword.getBody());
        String newToken = body.get("token").asText();
        assertThat(newToken).isNotBlank();
        assertThat(newToken).isNotEqualTo(oldToken);

        ResponseEntity<String> meWithNewToken = restTemplate.exchange(
            baseUrl + "/auth/me",
            HttpMethod.GET,
            new HttpEntity<>(bearerJsonHeaders(newToken)),
            String.class
        );
        assertThat(meWithNewToken.getStatusCode()).isEqualTo(HttpStatus.OK);
    }
}
