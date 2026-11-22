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
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
class UserIsolationIntegrationTest {

    @LocalServerPort
    private int port;

    @Autowired
    private TestRestTemplate restTemplate;

    @Autowired
    private VerificationCodeRepository verificationCodeRepository;

    @MockitoBean
    private AuthEmailService authEmailService;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Test
    void userBCannotAccessOrMutateUserAResources() throws Exception {
        String base = "http://localhost:" + port + "/api/v1";
        String tokenA = registerVerifyLogin(base, ApiTestSupport.uniqueEmail("usera"), "PasswordA1!");
        String tokenB = registerVerifyLogin(base, ApiTestSupport.uniqueEmail("userb"), "PasswordB1!");

        // Category owned by A
        String catName = "CatA-" + java.util.UUID.randomUUID().toString().substring(0, 8);
        ResponseEntity<String> catCreate = restTemplate.postForEntity(
            base + "/categories",
            new HttpEntity<>("""
                {"name":"%s","type":"EXPENSE"}
                """.formatted(catName), ApiTestSupport.authHeaders(tokenA)),
            String.class
        );
        assertThat(catCreate.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        long categoryId = objectMapper.readTree(catCreate.getBody()).get("id").asLong();

        ResponseEntity<String> catByB = restTemplate.exchange(
            base + "/categories/" + categoryId,
            HttpMethod.PUT,
            new HttpEntity<>("""
                {"name":"Hacked","type":"EXPENSE"}
                """, ApiTestSupport.authHeaders(tokenB)),
            String.class
        );
        assertThat(catByB.getStatusCode().is4xxClientError()).isTrue();

        // Saving goal owned by A
        ResponseEntity<String> goalCreate = restTemplate.postForEntity(
            base + "/saving-goals",
            new HttpEntity<>("""
                {"title":"Meta A","targetAmount":1000,"status":"ACTIVE"}
                """, ApiTestSupport.authHeaders(tokenA)),
            String.class
        );
        assertThat(goalCreate.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        long goalId = objectMapper.readTree(goalCreate.getBody()).get("id").asLong();

        ResponseEntity<String> goalByB = restTemplate.exchange(
            base + "/saving-goals/" + goalId,
            HttpMethod.GET,
            new HttpEntity<>(ApiTestSupport.authHeaders(tokenB)),
            String.class
        );
        assertThat(goalByB.getStatusCode().is4xxClientError()).isTrue();

        ResponseEntity<String> goalDeleteByB = restTemplate.exchange(
            base + "/saving-goals/" + goalId,
            HttpMethod.DELETE,
            new HttpEntity<>(ApiTestSupport.authHeaders(tokenB)),
            String.class
        );
        assertThat(goalDeleteByB.getStatusCode().is4xxClientError()).isTrue();

        // Group owned/created by A
        ResponseEntity<String> groupCreate = restTemplate.postForEntity(
            base + "/groups",
            new HttpEntity<>("""
                {"title":"Grupo A","currencyCode":"ARS"}
                """, ApiTestSupport.authHeaders(tokenA)),
            String.class
        );
        assertThat(groupCreate.getStatusCode().is2xxSuccessful()).isTrue();
        JsonNode groupBody = objectMapper.readTree(groupCreate.getBody());
        long groupId = groupBody.get("id").asLong();

        ResponseEntity<String> groupByB = restTemplate.exchange(
            base + "/groups/" + groupId,
            HttpMethod.GET,
            new HttpEntity<>(ApiTestSupport.authHeaders(tokenB)),
            String.class
        );
        assertThat(groupByB.getStatusCode().is4xxClientError()).isTrue();
    }

    private String registerVerifyLogin(String base, String email, String password) throws Exception {
        ResponseEntity<String> register = restTemplate.postForEntity(
            base + "/auth/register",
            new HttpEntity<>("""
                {"name":"Test","lastname":"User","email":"%s"}
                """.formatted(email), ApiTestSupport.jsonHeaders()),
            String.class
        );
        assertThat(register.getStatusCode().is2xxSuccessful())
            .as("register failed: %s %s", register.getStatusCode(), register.getBody())
            .isTrue();
        String code = verificationCodeRepository
            .findFirstByEmailIgnoreCaseAndPurposeOrderByCreatedAtDesc(email, VerificationPurpose.REGISTRATION)
            .orElseThrow()
            .getCode();
        ResponseEntity<String> verify = restTemplate.postForEntity(
            base + "/auth/verify",
            new HttpEntity<>("""
                {"email":"%s","code":"%s","password":"%s","passwordConfirm":"%s"}
                """.formatted(email, code, password, password), ApiTestSupport.jsonHeaders()),
            String.class
        );
        assertThat(verify.getStatusCode().is2xxSuccessful())
            .as("verify failed: %s %s", verify.getStatusCode(), verify.getBody())
            .isTrue();
        ResponseEntity<String> login = restTemplate.postForEntity(
            base + "/auth/login",
            new HttpEntity<>("""
                {"email":"%s","password":"%s"}
                """.formatted(email, password), ApiTestSupport.jsonHeaders()),
            String.class
        );
        assertThat(login.getStatusCode())
            .as("login failed: %s %s", login.getStatusCode(), login.getBody())
            .isEqualTo(HttpStatus.OK);
        return objectMapper.readTree(login.getBody()).get("token").asText();
    }
}
