package com.auction.controller;

import com.auction.config.JwtUtil;
import com.auction.model.User;
import com.auction.repository.UserRepository;
import org.springframework.dao.DataIntegrityViolationException;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;

    @PostMapping("/signup")
    public ResponseEntity<?> signup(@RequestBody SignupRequest request) {
        String validationError = validateSignupRequest(request);
        if (validationError != null) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("error", validationError));
        }

        String normalizedEmail = normalizeEmail(request.getEmail());
        String normalizedRole = normalizeRole(request.getRole());

        if (userRepository.findByEmail(normalizedEmail).isPresent()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("error", "Email already exists"));
        }

        User user = User.builder()
                .name(request.getName().trim())
                .email(normalizedEmail)
                .passwordHash(passwordEncoder.encode(request.getPassword()))
                .role(normalizedRole)
                .company(trimToNull(request.getCompany()))
                .carrierName(trimToNull(request.getCarrierName()))
                .build();

        try {
            userRepository.save(user);
        } catch (DataIntegrityViolationException exception) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("error", "Email already exists"));
        }

        String token = jwtUtil.generateToken(user.getId(), user.getEmail(), user.getRole());

        Map<String, Object> response = new HashMap<>();
        response.put("token", token);
        response.put("user", user);

        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest request) {
        String validationError = validateLoginRequest(request);
        if (validationError != null) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("error", validationError));
        }

        Optional<User> userOpt = userRepository.findByEmail(normalizeEmail(request.getEmail()));

        if (userOpt.isEmpty() || !passwordEncoder.matches(request.getPassword(), userOpt.get().getPasswordHash())) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Invalid credentials"));
        }

        User user = userOpt.get();
        String token = jwtUtil.generateToken(user.getId(), user.getEmail(), user.getRole());

        Map<String, Object> response = new HashMap<>();
        response.put("token", token);
        response.put("user", user);

        return ResponseEntity.ok(response);
    }

    @GetMapping("/me")
    public ResponseEntity<?> getMe(@RequestAttribute("userId") String userId) {
        Optional<User> userOpt = userRepository.findById(userId);
        if (userOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "User not found"));
        }
        return ResponseEntity.ok(userOpt.get());
    }

    @Data
    static class SignupRequest {
        private String name;
        private String email;
        private String password;
        private String role;
        private String company;
        private String carrierName;
    }

    @Data
    static class LoginRequest {
        private String email;
        private String password;
    }

    private String normalizeEmail(String email) {
        if (email == null) {
            return null;
        }
        return email.trim().toLowerCase();
    }

    private String normalizeRole(String role) {
        if (role == null || role.trim().isEmpty()) {
            return "SUPPLIER";
        }
        return role.trim().toUpperCase();
    }

    private String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private String validateSignupRequest(SignupRequest request) {
        if (request == null) {
            return "Request body is missing";
        }
        if (request.getName() == null || request.getName().trim().isEmpty()) {
            return "Name is required";
        }
        if (request.getEmail() == null || request.getEmail().trim().isEmpty()) {
            return "Email is required";
        }
        if (request.getPassword() == null || request.getPassword().trim().isEmpty()) {
            return "Password is required";
        }
        if (request.getCompany() == null || request.getCompany().trim().isEmpty()) {
            return "Company name is required";
        }
        return null;
    }

    private String validateLoginRequest(LoginRequest request) {
        if (request == null) {
            return "Request body is missing";
        }
        if (request.getEmail() == null || request.getEmail().trim().isEmpty()) {
            return "Email is required";
        }
        if (request.getPassword() == null || request.getPassword().trim().isEmpty()) {
            return "Password is required";
        }
        return null;
    }
}
