pipeline {
    agent any

    stages {
        stage('Clone Backend Repo') {
            steps {
                git branch: 'main', url: 'https://github.com/nazeerbasha949/Internal-BE1.git'
            }
        }

        stage('Install Dependencies') {
            steps {
                sh 'npm install'
            }
        }

        stage('Run Backend') {
            steps {
                sh 'pm2 delete all || true'
                sh 'pm2 start server.js '
            }
        }
    }
}
