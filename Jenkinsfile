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
