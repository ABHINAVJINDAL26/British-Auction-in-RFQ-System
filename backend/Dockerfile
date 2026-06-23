# Stage 1: Build with Java 25 and Maven
FROM eclipse-temurin:25-jdk-jammy AS builder
WORKDIR /app
RUN apt-get update \
	&& apt-get install -y maven \
	&& rm -rf /var/lib/apt/lists/*
COPY pom.xml .
COPY src ./src
RUN mvn clean package -DskipTests

# Stage 2: Run the JAR
FROM eclipse-temurin:25-jre-jammy
WORKDIR /app
COPY --from=builder /app/target/british-auction-1.0.0.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
