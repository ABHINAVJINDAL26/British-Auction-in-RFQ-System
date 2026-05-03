# British Auction RFQ System — Java Edition

A production-grade real-time RFQ auction platform where Buyers create auctions and Suppliers compete with live bids.

---

## Overview

This project implements a British auction workflow for freight RFQs with:

- Role-based access for Buyer and Supplier
- Real-time bid updates via WebSocket (STOMP)
- Automatic extension rules near close time
- Hard cap forced close protection
- Live ranking and activity timeline

---

## Tech Stack

| Layer | Node.js (Old) | Java (New) |
|---|---|---|
| Backend | Node.js + Express | Java 17 + Spring Boot 3 |
| ORM | Prisma | Spring Data JPA + Hibernate |
| Build Tool | npm | Maven |
| Database | PostgreSQL | PostgreSQL |
| Real-time | Socket.IO | Spring WebSocket (STOMP) |
| Auth | JWT (custom) | JWT + Spring Security |
| Scheduler | node-cron (30s) | Spring @Scheduled |
| Frontend | React + Vite + Tailwind | React + Vite + Tailwind (unchanged) |

---

## Project Structure

```text
british-auction-java/
├── backend/                          # Spring Boot Application
│   ├── Dockerfile
│   ├── pom.xml                       # Maven build config
│   └── src/
│       └── main/
│           ├── java/com/auction/
│           │   ├── AuctionApplication.java
│           │   ├── config/
│           │   │   ├── SecurityConfig.java       # JWT + Spring Security
│           │   │   └── WebSocketConfig.java      # STOMP config
│           │   ├── controller/
│           │   │   ├── AuthController.java
│           │   │   ├── RfqController.java
│           │   │   └── BidController.java
│           │   ├── service/
│           │   │   ├── BidService.java
│           │   │   ├── AuctionScheduler.java     # @Scheduled (30s cron)
│           │   │   └── ExtensionEngine.java      # Trigger logic
│           │   ├── model/
│           │   │   ├── User.java
│           │   │   ├── Rfq.java
│           │   │   ├── Bid.java
│           │   │   └── AuctionEvent.java
│           │   ├── repository/
│           │   │   ├── UserRepository.java
│           │   │   ├── RfqRepository.java
│           │   │   └── BidRepository.java
│           │   └── websocket/
│           │       └── AuctionWebSocketHandler.java
│           └── resources/
│               └── application.yml
├── frontend/                         # React App (unchanged from Node version)
│   ├── Dockerfile
│   └── src/
├── docker-compose.yml                # Backend + Frontend + PostgreSQL
├── Jenkinsfile                       # Jenkins CI/CD Pipeline
└── .github/
    └── workflows/
        └── ci-cd.yml                 # GitHub Actions Pipeline
```

---

## Core Business Rules

- Bid starts only after Bid Start Time.
- Bid close can extend based on trigger configuration.
- Trigger window is calculated from current bid close time.
- Forced close time is a hard cap and cannot be crossed.
- Only latest bid per supplier participates in ranking.
- Extension check runs immediately on bid submit.

---

## Trigger Types

| Trigger | Description |
|---|---|
| `BID_RECEIVED` | Any valid bid in trigger window can extend |
| `ANY_RANK_CHANGE` | Any rank movement in trigger window can extend |
| `L1_RANK_CHANGE` | Only top rank change in trigger window can extend |

---

## Real-time WebSocket Events (STOMP Topics)

| Event | STOMP Destination |
|---|---|
| bid:new | `/topic/auction/{rfqId}/bid` |
| auction:time-extended | `/topic/auction/{rfqId}/time` |
| auction:status-changed | `/topic/auction/{rfqId}/status` |
| rfq:created | `/topic/rfq/created` |
| rfq:status-changed | `/topic/rfq/{rfqId}/status` |

---

## DevOps Tools Used

| Tool | Purpose |
|---|---|
| **Docker** | Containerize backend and frontend |
| **Dockerfile** | Custom image for Spring Boot JAR and React/Nginx |
| **Docker Compose** | Run all 3 services together (backend, frontend, postgres) |
| **Docker Volumes** | Persist PostgreSQL data |
| **Docker Networking** | Internal bridge network between services |
| **Docker Hub / GHCR** | Push built images from CI pipeline |
| **Maven** | Build, test, package Spring Boot app; dockerfile-maven-plugin for image |
| **GitHub Actions** | Auto build + test + push image on every git push |
| **Jenkins** | Full CI/CD pipeline via Jenkinsfile |

---

## Maven Build (pom.xml highlights)

```xml
<groupId>com.auction</groupId>
<artifactId>british-auction</artifactId>
<version>1.0.0</version>
<packaging>jar</packaging>

<dependencies>
  <!-- Spring Boot -->
  <dependency>spring-boot-starter-web</dependency>
  <dependency>spring-boot-starter-data-jpa</dependency>
  <dependency>spring-boot-starter-websocket</dependency>
  <dependency>spring-boot-starter-security</dependency>

  <!-- Database -->
  <dependency>postgresql</dependency>

  <!-- JWT -->
  <dependency>jjwt-api</dependency>

  <!-- Testing -->
  <dependency>spring-boot-starter-test</dependency>
</dependencies>

<plugins>
  <!-- Package as JAR -->
  <plugin>spring-boot-maven-plugin</plugin>

  <!-- Unit tests via Surefire -->
  <plugin>maven-surefire-plugin</plugin>

  <!-- Build Docker image from Maven -->
  <plugin>dockerfile-maven-plugin</plugin>
</plugins>
```

---

## Backend Dockerfile

```dockerfile
# Stage 1: Build with Maven
FROM maven:3.9.6-eclipse-temurin-17 AS builder
WORKDIR /app
COPY pom.xml .
COPY src ./src
RUN mvn clean package -DskipTests

# Stage 2: Run the JAR
FROM eclipse-temurin:17-jre-alpine
WORKDIR /app
COPY --from=builder /app/target/british-auction-1.0.0.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
```

---

## Frontend Dockerfile

```dockerfile
# Stage 1: Build React App
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Stage 2: Serve with Nginx
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
```

---

## Docker Compose

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: auction_db
      POSTGRES_USER: auction_user
      POSTGRES_PASSWORD: secret
    volumes:
      - pgdata:/var/lib/postgresql/data
    networks:
      - auction-net

  backend:
    build: ./backend
    ports:
      - "8080:8080"
    environment:
      SPRING_DATASOURCE_URL: jdbc:postgresql://postgres:5432/auction_db
      SPRING_DATASOURCE_USERNAME: auction_user
      SPRING_DATASOURCE_PASSWORD: secret
      JWT_SECRET: your_jwt_secret_here
    depends_on:
      - postgres
    networks:
      - auction-net

  frontend:
    build: ./frontend
    ports:
      - "80:80"
    depends_on:
      - backend
    networks:
      - auction-net

volumes:
  pgdata:

networks:
  auction-net:
    driver: bridge
```

---

## GitHub Actions (ci-cd.yml)

```yaml
name: CI/CD Pipeline

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  build-and-push:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Set up JDK 17
        uses: actions/setup-java@v4
        with:
          java-version: '17'
          distribution: 'temurin'

      - name: Cache Maven dependencies
        uses: actions/cache@v3
        with:
          path: ~/.m2
          key: ${{ runner.os }}-maven-${{ hashFiles('**/pom.xml') }}

      - name: Build with Maven
        run: mvn clean package -DskipTests
        working-directory: backend

      - name: Run Tests
        run: mvn test
        working-directory: backend

      - name: Login to GHCR
        uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Build and Push Backend Image
        uses: docker/build-push-action@v5
        with:
          context: ./backend
          push: true
          tags: ghcr.io/${{ github.repository }}/backend:latest

      - name: Build and Push Frontend Image
        uses: docker/build-push-action@v5
        with:
          context: ./frontend
          push: true
          tags: ghcr.io/${{ github.repository }}/frontend:latest
```

---

## Jenkinsfile

```groovy
pipeline {
    agent any

    tools {
        maven 'Maven-3.9'
        jdk 'JDK-17'
    }

    environment {
        GHCR_REPO = 'ghcr.io/your-username/british-auction'
        GITHUB_TOKEN = credentials('github-token')
    }

    stages {
        stage('Checkout') {
            steps {
                git branch: 'main', url: 'https://github.com/your-username/british-auction-java'
            }
        }

        stage('Maven Build') {
            steps {
                dir('backend') {
                    sh 'mvn clean package -DskipTests'
                }
            }
        }

        stage('Run Tests') {
            steps {
                dir('backend') {
                    sh 'mvn test'
                }
            }
            post {
                always {
                    junit 'backend/target/surefire-reports/*.xml'
                }
            }
        }

        stage('Docker Build') {
            steps {
                sh 'docker build -t ${GHCR_REPO}/backend:latest ./backend'
                sh 'docker build -t ${GHCR_REPO}/frontend:latest ./frontend'
            }
        }

        stage('Push to GHCR') {
            steps {
                sh 'echo $GITHUB_TOKEN | docker login ghcr.io -u your-username --password-stdin'
                sh 'docker push ${GHCR_REPO}/backend:latest'
                sh 'docker push ${GHCR_REPO}/frontend:latest'
            }
        }

        stage('Deploy with Docker Compose') {
            steps {
                sh 'docker compose down'
                sh 'docker compose pull'
                sh 'docker compose up -d'
            }
        }
    }

    post {
        success {
            echo 'Pipeline succeeded! Auction system deployed.'
        }
        failure {
            echo 'Pipeline failed. Check logs above.'
        }
    }
}
```

---

## How to Run Locally

### Option 1: Docker Compose (Recommended)

```bash
# Clone the repo
git clone https://github.com/your-username/british-auction-java
cd british-auction-java

# Start all services
docker compose up --build

# App will be available at:
# Frontend: http://localhost:80
# Backend API: http://localhost:8080
```

### Option 2: Manual (Development)

```bash
# Terminal 1 - Start PostgreSQL
docker run -d \
  -e POSTGRES_DB=auction_db \
  -e POSTGRES_USER=auction_user \
  -e POSTGRES_PASSWORD=secret \
  -p 5432:5432 postgres:15

# Terminal 2 - Start Backend
cd backend
mvn spring-boot:run

# Terminal 3 - Start Frontend
cd frontend
npm install
npm run dev

# Frontend: http://localhost:5173
# Backend: http://localhost:8080
```

---

## Runtime Flow

1. Buyer creates RFQ with auction config via REST API.
2. Supplier submits bids within active bid window.
3. `BidService` recalculates ranks and logs auction events.
4. `ExtensionEngine` evaluates trigger type and updates close time.
5. Spring WebSocket (STOMP) broadcasts updates to all connected clients.
6. `AuctionScheduler` runs every 30 seconds — transitions DRAFT → ACTIVE → CLOSED / FORCE_CLOSED.

---

## CV Description (Ready to Use)

> Developed a production-grade British Auction RFQ platform in Java Spring Boot with real-time bidding via Spring WebSocket (STOMP). Built complete DevOps pipeline: Maven for build automation, Docker & Docker Compose for containerization (3-service architecture), GitHub Actions for CI/CD with automated testing and image push to GHCR, and Jenkins for deployment pipeline with Freestyle and Declarative pipeline support.
