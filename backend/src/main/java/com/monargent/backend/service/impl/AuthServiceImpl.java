package com.monargent.backend.service.impl;

import com.monargent.backend.dto.auth.AuthResponse;
import com.monargent.backend.dto.auth.ChangePasswordRequest;
import com.monargent.backend.dto.auth.ForgotPasswordRequest;
import com.monargent.backend.dto.auth.LoginRequest;
import com.monargent.backend.dto.auth.RegisterRequest;
import com.monargent.backend.dto.auth.ResendCodeRequest;
import com.monargent.backend.dto.auth.ResetPasswordRequest;
import com.monargent.backend.dto.auth.UpdateProfileRequest;
import com.monargent.backend.dto.auth.VerifyCodeRequest;
import com.monargent.backend.entity.User;
import com.monargent.backend.entity.VerificationCode;
import com.monargent.backend.enums.AuthEmailType;
import com.monargent.backend.enums.VerificationPurpose;
import com.monargent.backend.exception.DuplicateEmailException;
import com.monargent.backend.exception.InvalidCredentialsException;
import com.monargent.backend.exception.InvalidRequestException;
import com.monargent.backend.exception.InvalidVerificationCodeException;
import com.monargent.backend.exception.UserNotFoundException;
import com.monargent.backend.exception.UserNotVerifiedException;
import com.monargent.backend.exception.VerificationCodeExpiredException;
import com.monargent.backend.repository.UserRepository;
import com.monargent.backend.repository.VerificationCodeRepository;
import com.monargent.backend.service.AuthEmailService;
import com.monargent.backend.service.AuthService;
import com.monargent.backend.service.CurrentUserService;
import com.monargent.backend.service.GroupOnboardingService;
import com.monargent.backend.service.JwtService;
import com.monargent.backend.service.RateLimitService;
import com.monargent.backend.utils.VerificationCodeUtils;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Locale;

@Service
@RequiredArgsConstructor
@Transactional
@Slf4j
public class AuthServiceImpl implements AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JwtService jwtService;
    private final GroupOnboardingService groupOnboardingService;
    private final AuthEmailService authEmailService;
    private final VerificationCodeRepository verificationCodeRepository;
    private final CurrentUserService currentUserService;
    private final RateLimitService rateLimitService;

    @Value("${auth.verification.expiration-minutes:10}")
    private int verificationExpirationMinutes;

    @Value("${app.rate-limit.enabled:true}")
    private boolean rateLimitEnabled;

    @Value("${app.rate-limit.account.auth.max:10}")
    private int accountAuthMax;

    @Value("${app.rate-limit.account.auth.window-seconds:900}")
    private int accountAuthWindowSeconds;

    @Override
    public AuthResponse register(RegisterRequest request) {
        String email = normalizeEmail(request.getEmail());
        checkAccountRateLimit("register", email);
        String name = request.getName() == null ? "" : request.getName().trim();

        if (userRepository.existsByEmailIgnoreCase(email)) {
            throw new DuplicateEmailException("El correo ya está registrado");
        }

        if (name.isBlank()) {
            throw new InvalidRequestException("El nombre es obligatorio");
        }

        List<VerificationCode> oldCodes = verificationCodeRepository.findByEmailIgnoreCaseAndPurpose(
            email, VerificationPurpose.REGISTRATION);
        if (!oldCodes.isEmpty()) {
            verificationCodeRepository.deleteAll(oldCodes);
        }

        String code = VerificationCodeUtils.generateVerificationCode();
        authEmailService.sendAuthCodeEmail(email, code, AuthEmailType.REGISTRATION, verificationExpirationMinutes);

        NameParts parts = splitFullName(name);

        VerificationCode verificationCode = VerificationCode.builder()
                .email(email)
                .code(code)
                .verified(false)
                .purpose(VerificationPurpose.REGISTRATION)
                .name(parts.firstName())
                .lastname(parts.lastName())
                .createdAt(LocalDateTime.now())
                .expiration(LocalDateTime.now().plusMinutes(verificationExpirationMinutes))
                .build();
        verificationCodeRepository.save(verificationCode);

        return AuthResponse.builder()
                .email(email)
                .verified(false)
            .message("Te enviamos un código de verificación. Completá la verificación para crear tu contraseña y finalizar el registro.")
                .build();
    }

    @Override
    public AuthResponse login(LoginRequest request) {
        String email = normalizeEmail(request.getEmail());
        checkAccountRateLimit("login", email);
        User user = userRepository.findByEmailIgnoreCase(email)
            .orElseThrow(() -> new InvalidCredentialsException(
                "Correo o contraseña incorrectos. Verificá que el email esté bien escrito."));

        if (!user.isVerified()) {
            throw new UserNotVerifiedException("La cuenta no está verificada. Completá la verificación por correo.");
        }

        try {
            authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(email, request.getPassword())
            );
        } catch (AuthenticationException ex) {
            throw new InvalidCredentialsException(
                "Correo o contraseña incorrectos. Verificá que el email esté bien escrito.");
        }

        String token = jwtService.generateToken(user);

        return toAuthResponse(user, token, "Inicio de sesión exitoso");
    }

    @Override
    public void verify(VerifyCodeRequest request) {
        String email = normalizeEmail(request.getEmail());
        checkAccountRateLimit("verify", email);

        if (userRepository.existsByEmailIgnoreCase(email)) {
            throw new DuplicateEmailException("El correo ya está registrado");
        }

        VerificationCode v = verificationCodeRepository
            .findFirstByEmailIgnoreCaseAndCodeAndPurpose(email, request.getCode(), VerificationPurpose.REGISTRATION)
                .orElseThrow(() -> new InvalidVerificationCodeException("Código de verificación inválido"));

        if (v.getExpiration() == null || v.getExpiration().isBefore(LocalDateTime.now())) {
            throw new VerificationCodeExpiredException("El código de verificación venció");
        }

        if (!request.getPassword().equals(request.getPasswordConfirm())) {
            throw new InvalidRequestException("Las contraseñas no coinciden");
        }

        NameParts parts = splitFullName(
            (v.getName() == null || v.getName().isBlank()) ? "Usuario" : v.getName()
        );

        User user = User.builder()
                .name(parts.firstName())
                .lastname(parts.lastName())
                .email(email)
                .password(passwordEncoder.encode(request.getPassword()))
                .verified(true)
                .build();

        userRepository.save(user);
        groupOnboardingService.onUserRegistered(user);
        log.info("User registered and verified: {}", user.getEmail());

        List<VerificationCode> oldCodes = verificationCodeRepository.findByEmailIgnoreCaseAndPurpose(
            email, VerificationPurpose.REGISTRATION);
        if (!oldCodes.isEmpty()) {
            verificationCodeRepository.deleteAll(oldCodes);
        }
    }

    @Override
    public AuthResponse requestPasswordReset(ForgotPasswordRequest request) {
        String email = normalizeEmail(request.getEmail());
        checkAccountRateLimit("forgot-password", email);
        String genericMessage = "Si el correo está registrado, te enviamos un código de recuperación.";

        if (!userRepository.existsByEmailIgnoreCase(email)) {
            return AuthResponse.builder()
                .email(email)
                .verified(false)
                .message(genericMessage)
                .build();
        }

        List<VerificationCode> oldCodes = verificationCodeRepository.findByEmailIgnoreCaseAndPurpose(
            email, VerificationPurpose.PASSWORD_RESET);
        if (!oldCodes.isEmpty()) {
            verificationCodeRepository.deleteAll(oldCodes);
        }

        String code = VerificationCodeUtils.generateVerificationCode();
        authEmailService.sendAuthCodeEmail(email, code, AuthEmailType.PASSWORD_RESET, verificationExpirationMinutes);

        VerificationCode verificationCode = VerificationCode.builder()
            .email(email)
            .code(code)
            .verified(false)
            .purpose(VerificationPurpose.PASSWORD_RESET)
            .createdAt(LocalDateTime.now())
            .expiration(LocalDateTime.now().plusMinutes(verificationExpirationMinutes))
            .build();
        verificationCodeRepository.save(verificationCode);

        return AuthResponse.builder()
            .email(email)
            .verified(false)
            .message(genericMessage)
            .build();
    }

    @Override
    public void confirmPasswordReset(ResetPasswordRequest request) {
        String email = normalizeEmail(request.getEmail());
        checkAccountRateLimit("reset-password", email);

        User user = userRepository.findByEmailIgnoreCase(email)
            .orElseThrow(() -> new UserNotFoundException("No hay una cuenta asociada a este correo"));

        VerificationCode verificationCode = verificationCodeRepository
            .findFirstByEmailIgnoreCaseAndCodeAndPurpose(email, request.getCode(), VerificationPurpose.PASSWORD_RESET)
            .orElseThrow(() -> new InvalidVerificationCodeException("Código de verificación inválido"));

        if (verificationCode.getExpiration() == null
            || verificationCode.getExpiration().isBefore(LocalDateTime.now())) {
            throw new VerificationCodeExpiredException("El código de verificación venció");
        }

        if (!request.getPassword().equals(request.getPasswordConfirm())) {
            throw new InvalidRequestException("Las contraseñas no coinciden");
        }

        user.setPassword(passwordEncoder.encode(request.getPassword()));
        user.setTokenVersion(user.getTokenVersion() + 1);
        userRepository.save(user);

        List<VerificationCode> oldCodes = verificationCodeRepository.findByEmailIgnoreCaseAndPurpose(
            email, VerificationPurpose.PASSWORD_RESET);
        if (!oldCodes.isEmpty()) {
            verificationCodeRepository.deleteAll(oldCodes);
        }

        log.info("Password reset completed for {}", email);
    }

    @Override
    public void resendCode(ResendCodeRequest request) {
        String email = normalizeEmail(request.getEmail());
        checkAccountRateLimit("resend-code", email);

        if (userRepository.existsByEmailIgnoreCase(email)) {
            return;
        }

        VerificationCode pending = verificationCodeRepository
            .findFirstByEmailIgnoreCaseAndPurposeOrderByCreatedAtDesc(email, VerificationPurpose.REGISTRATION)
                .orElse(null);
        if (pending == null) {
            return;
        }

        String code = VerificationCodeUtils.generateVerificationCode();
        authEmailService.sendAuthCodeEmail(email, code, AuthEmailType.REGISTRATION_RESEND, verificationExpirationMinutes);

        List<VerificationCode> oldCodes = verificationCodeRepository.findByEmailIgnoreCaseAndPurpose(
            email, VerificationPurpose.REGISTRATION);
        if (!oldCodes.isEmpty()) {
            verificationCodeRepository.deleteAll(oldCodes);
        }

        VerificationCode verificationCode = VerificationCode.builder()
                .email(email)
                .code(code)
                .verified(false)
                .purpose(VerificationPurpose.REGISTRATION)
                .name(pending.getName())
                .lastname(pending.getLastname())
                .createdAt(LocalDateTime.now())
                .expiration(LocalDateTime.now().plusMinutes(verificationExpirationMinutes))
                .build();

        verificationCodeRepository.save(verificationCode);
    }

    @Override
    public void changePassword(ChangePasswordRequest request) {
        User user = currentUserService.getCurrentUser();

        if (!passwordEncoder.matches(request.getCurrentPassword(), user.getPassword())) {
            throw new InvalidCredentialsException("La contraseña actual no es correcta.");
        }

        if (!request.getNewPassword().equals(request.getPasswordConfirm())) {
            throw new InvalidRequestException("Las contraseñas no coinciden.");
        }

        user.setPassword(passwordEncoder.encode(request.getNewPassword()));
        user.setTokenVersion(user.getTokenVersion() + 1);
        userRepository.save(user);
    }

    @Override
    public AuthResponse updateProfile(UpdateProfileRequest request) {
        User user = currentUserService.getCurrentUser();
        if (request.getName() != null && !request.getName().isBlank()) {
            NameParts parts = splitFullName(request.getName());
            user.setName(parts.firstName());
            user.setLastname(parts.lastName());
        }
        if (request.getMpAlias() != null && !request.getMpAlias().isBlank()) {
            user.setMpAlias(request.getMpAlias().trim());
        }
        userRepository.save(user);
        return toAuthResponse(user, null, "Perfil actualizado.");
    }

    @Override
    public AuthResponse toAuthResponse(User user, String token, String message) {
        return AuthResponse.builder()
            .email(user.getEmail())
            .name(buildDisplayName(user))
            .mpAlias(user.getMpAlias())
            .verified(user.isVerified())
            .token(token)
            .message(message)
            .build();
    }

    private record NameParts(String firstName, String lastName) {}

    private NameParts splitFullName(String fullName) {
        if (fullName == null || fullName.isBlank()) {
            return new NameParts("Usuario", "");
        }
        String trimmed = fullName.trim();
        int spaceIdx = trimmed.indexOf(' ');
        if (spaceIdx > 0) {
            return new NameParts(
                trimmed.substring(0, spaceIdx).trim(),
                trimmed.substring(spaceIdx + 1).trim()
            );
        }
        return new NameParts(trimmed, "");
    }

    /** Evita duplicados tipo "Tami Leiva Tami Leiva" por datos legacy en BD. */
    private String buildDisplayName(User user) {
        String first = user.getName() == null ? "" : user.getName().trim();
        String last = user.getLastname() == null ? "" : user.getLastname().trim();
        if (last.isEmpty()) {
            return first;
        }
        if (first.equalsIgnoreCase(last)) {
            return first;
        }
        if (first.toLowerCase(Locale.ROOT).endsWith(" " + last.toLowerCase(Locale.ROOT))) {
            return first;
        }
        if (last.toLowerCase(Locale.ROOT).startsWith(first.toLowerCase(Locale.ROOT) + " ")) {
            return last;
        }
        return (first + " " + last).trim();
    }

    private void checkAccountRateLimit(String action, String email) {
        if (!rateLimitEnabled || email == null || email.isBlank()) {
            return;
        }
        String key = "account:" + action + ":" + hashKey(normalizeEmail(email));
        rateLimitService.checkLimit(key, accountAuthMax, accountAuthWindowSeconds);
    }

    private String hashKey(String value) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hashed = digest.digest(value.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hashed, 0, 16);
        } catch (NoSuchAlgorithmException ex) {
            return Integer.toHexString(value.hashCode());
        }
    }

    private String normalizeEmail(String email) {
        return email.toLowerCase(Locale.ROOT).trim();
    }
}