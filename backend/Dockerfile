# Stage 1: Build
FROM eclipse-temurin:24-jdk-alpine AS build
WORKDIR /app

# Install necessary tools
RUN apk add --no-cache bash

# Copy gradle wrapper and build files
COPY gradlew .
COPY gradle gradle
COPY build.gradle.kts .
COPY settings.gradle.kts .

# Grant execution rights to the gradle wrapper
RUN chmod +x gradlew

# Pre-download dependencies to leverage Docker cache
RUN ./gradlew dependencies --no-daemon || true

# Copy the source code
COPY src src

# Build the application
RUN ./gradlew bootJar --no-daemon

# Stage 2: Runtime
FROM eclipse-temurin:24-jre-alpine
WORKDIR /app

# Create a non-root user for security
RUN addgroup -S spring && adduser -S spring -G spring
USER spring:spring

# Copy the jar file from the build stage
# Assuming only one jar is produced by bootJar
COPY --from=build /app/build/libs/*.jar app.jar

EXPOSE 8080

# Run the application
ENTRYPOINT ["java", "-jar", "app.jar"]
