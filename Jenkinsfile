pipeline {
    agent any

    parameters {
        string(name: 'REGISTRY_OWNER', defaultValue: 'your-username', description: 'GHCR owner/user/org (lowercase)')
        string(name: 'IMAGE_TAG', defaultValue: 'latest', description: 'Docker image tag')
    }

    tools {
        maven 'Maven-3.9'
        jdk 'JDK-17'
    }

    environment {
        GITHUB_TOKEN = credentials('github-token')
    }

    stages {
        stage('Init') {
            steps {
                script {
                    env.GHCR_REPO = "ghcr.io/${params.REGISTRY_OWNER}/gocomet"
                }
                echo "GHCR_REPO=${env.GHCR_REPO}"
            }
        }

        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Maven Build') {
            steps {
                dir('backend') {
                    script {
                        if (isUnix()) {
                            sh 'mvn clean package -DskipTests'
                        } else {
                            bat 'mvn clean package -DskipTests'
                        }
                    }
                }
            }
        }

        stage('Run Tests') {
            steps {
                dir('backend') {
                    script {
                        if (isUnix()) {
                            sh 'mvn test'
                        } else {
                            bat 'mvn test'
                        }
                    }
                }
            }
            post {
                always {
                    junit testResults: 'backend/target/surefire-reports/*.xml', allowEmptyResults: true
                }
            }
        }

        stage('Docker Build') {
            steps {
                script {
                    if (isUnix()) {
                        sh "docker build -t ${GHCR_REPO}/backend:${params.IMAGE_TAG} ./backend"
                        sh "docker build -t ${GHCR_REPO}/frontend:${params.IMAGE_TAG} ./frontend"
                    } else {
                        bat "docker build -t ${GHCR_REPO}/backend:${params.IMAGE_TAG} ./backend"
                        bat "docker build -t ${GHCR_REPO}/frontend:${params.IMAGE_TAG} ./frontend"
                    }
                }
            }
        }

        stage('Push to GHCR') {
            steps {
                script {
                    if (isUnix()) {
                        sh "echo ${GITHUB_TOKEN} | docker login ghcr.io -u ${params.REGISTRY_OWNER} --password-stdin"
                        sh "docker push ${GHCR_REPO}/backend:${params.IMAGE_TAG}"
                        sh "docker push ${GHCR_REPO}/frontend:${params.IMAGE_TAG}"
                    } else {
                        bat "echo %GITHUB_TOKEN% | docker login ghcr.io -u ${params.REGISTRY_OWNER} --password-stdin"
                        bat "docker push ${GHCR_REPO}/backend:${params.IMAGE_TAG}"
                        bat "docker push ${GHCR_REPO}/frontend:${params.IMAGE_TAG}"
                    }
                }
            }
        }

        stage('Deploy with Docker Compose') {
            steps {
                script {
                    if (isUnix()) {
                        sh '/usr/local/bin/docker-compose down'
                        sh '/usr/local/bin/docker-compose up -d --build'
                    } else {
                        bat 'docker-compose down'
                        bat 'docker-compose up -d --build'
                    }
                }
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
